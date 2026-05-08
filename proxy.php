<?php
/**
 * ZipCargo – JSONBin Proxy  (v2 – bulletproof edition)
 * =====================================================
 * Drop this file alongside index.html on your web server.
 *
 * FIXES in v2:
 *  - session_start() called FIRST, before any output or headers
 *  - Uses cURL instead of file_get_contents (works on all hosts)
 *  - CORS headers sent unconditionally (no origin mismatch block)
 *  - Credentials hashed with PASSWORD_DEFAULT for max compatibility
 *  - Rate-limit temp files use sys_get_temp_dir() with fallback
 */

// ── MUST BE FIRST: start session before any output ──────────────────────────
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 86400,       // 24 hours
        'path'     => '/',
        'secure'   => isset($_SERVER['HTTPS']),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

// ── CONFIG ───────────────────────────────────────────────────────────────────
define('JSONBIN_KEY',      '$2a$10$W1QgCI2lUG0iDnjaWSI0MOeg6/PWuAJqnQ9UcqGvxvyED89713Y.W');
define('JSONBIN_BASE',     'https://api.jsonbin.io/v3');
define('SHIPMENTS_BIN',    '69fbdb43adc21f119a6408ab');
define('INQUIRIES_BIN',    '69fbdbd4adc21f119a640d71');
define('SESSION_SECRET',   'zc_' . hash('sha256', 'zipcargo_secret_2026'));
define('CREDS_FILE',       __DIR__ . '/.zc_credentials');
define('RATE_LIMIT',       60);
define('RATE_WINDOW',      60);

// ── CORS & RESPONSE HEADERS (always send these) ──────────────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── RATE LIMITER ─────────────────────────────────────────────────────────────
function rate_ok(): bool {
    $ip  = preg_replace('/[^a-f0-9:]/', '', $_SERVER['REMOTE_ADDR'] ?? 'x');
    $dir = sys_get_temp_dir();
    if (!$dir || !is_writable($dir)) return true; // skip if tmp not writable
    $key  = $dir . '/zc_rl_' . md5($ip);
    $now  = time();
    $data = @file_get_contents($key);
    if ($data) {
        [$count, $reset] = array_pad(explode(',', $data, 2), 2, 0);
        if ($now < (int)$reset) {
            if ((int)$count >= RATE_LIMIT) return false;
            @file_put_contents($key, ((int)$count + 1) . ',' . $reset);
        } else {
            @file_put_contents($key, '1,' . ($now + RATE_WINDOW));
        }
    } else {
        @file_put_contents($key, '1,' . ($now + RATE_WINDOW));
    }
    return true;
}

if (!rate_ok()) {
    http_response_code(429);
    echo json_encode(['error' => 'Too many requests. Please wait a moment.']);
    exit;
}

// ── CREDENTIAL HELPERS ────────────────────────────────────────────────────────
function get_creds(): array {
    if (file_exists(CREDS_FILE)) {
        $d = json_decode(@file_get_contents(CREDS_FILE), true);
        if (is_array($d) && isset($d['user'], $d['pass'])) return $d;
    }
    return [
        'user' => 'admin',
        'pass' => password_hash('zipcargo2026', PASSWORD_DEFAULT),
    ];
}

function save_creds(array $c): void {
    @file_put_contents(CREDS_FILE, json_encode($c));
}

// ── ADMIN SESSION CHECK ───────────────────────────────────────────────────────
function require_admin(): void {
    if (empty($_SESSION['zc_admin']) || $_SESSION['zc_admin'] !== SESSION_SECRET) {
        http_response_code(403);
        echo json_encode(['error' => 'Unauthorized. Please log in again.']);
        exit;
    }
}

// ── CURL HELPER (works on all shared hosts) ───────────────────────────────────
function jbin_request(string $method, string $bin_id, ?array $payload = null): ?array {
    if (!function_exists('curl_init')) {
        // cURL not available — fall back to file_get_contents
        $opts = ['http' => [
            'method'  => $method,
            'header'  => 'X-Master-Key: ' . JSONBIN_KEY . "\r\n" .
                         'Content-Type: application/json' . "\r\n",
            'content' => $payload ? json_encode($payload) : null,
            'timeout' => 15,
            'ignore_errors' => true,
        ]];
        $url  = JSONBIN_BASE . '/b/' . $bin_id . ($method === 'GET' ? '/latest' : '');
        $resp = @file_get_contents($url, false, stream_context_create($opts));
        return $resp ? json_decode($resp, true) : null;
    }

    $url = JSONBIN_BASE . '/b/' . $bin_id . ($method === 'GET' ? '/latest' : '');
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_HTTPHEADER     => [
            'X-Master-Key: ' . JSONBIN_KEY,
            'Content-Type: application/json',
        ],
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    if ($payload !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    }
    $resp = curl_exec($ch);
    $err  = curl_error($ch);
    curl_close($ch);
    if ($err || !$resp) return null;
    return json_decode($resp, true);
}

// ── REQUEST BODY ──────────────────────────────────────────────────────────────
$action = $_GET['action'] ?? '';
$body   = json_decode(@file_get_contents('php://input'), true) ?? [];

// ── ROUTER ────────────────────────────────────────────────────────────────────
switch ($action) {

    // PUBLIC — read shipments for tracking page
    case 'getShipments':
        $data = jbin_request('GET', SHIPMENTS_BIN);
        if ($data === null) {
            http_response_code(502);
            echo json_encode(['error' => 'Could not reach data store. Try again.']);
        } else {
            echo json_encode($data['record'] ?? []);
        }
        break;

    // PUBLIC — save contact form inquiry
    case 'saveInquiry':
        $inq = $body['inquiry'] ?? null;
        if (!$inq || empty($inq['name']) || empty($inq['email'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields.']);
            break;
        }
        foreach (['name','email','service','message'] as $f) {
            $inq[$f] = htmlspecialchars(strip_tags((string)($inq[$f] ?? '')), ENT_QUOTES);
        }
        $data = jbin_request('GET', INQUIRIES_BIN);
        $list = $data['record']['inquiries'] ?? [];
        $list[] = $inq;
        $ok = jbin_request('PUT', INQUIRIES_BIN, ['inquiries' => $list]);
        echo json_encode(['ok' => $ok !== null]);
        break;

    // ADMIN — login
    case 'adminLogin':
        $user  = trim($body['user'] ?? '');
        $pass  = $body['pass'] ?? '';
        $creds = get_creds();
        if ($user === $creds['user'] && password_verify($pass, $creds['pass'])) {
            $_SESSION['zc_admin'] = SESSION_SECRET;
            echo json_encode(['ok' => true]);
        } else {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Incorrect username or password.']);
        }
        break;

    // ADMIN — logout
    case 'adminLogout':
        session_destroy();
        echo json_encode(['ok' => true]);
        break;

    // ADMIN — get inquiries
    case 'getInquiries':
        require_admin();
        $data = jbin_request('GET', INQUIRIES_BIN);
        echo json_encode($data['record'] ?? []);
        break;

    // ADMIN — save shipments
    case 'saveShipments':
        require_admin();
        $shipments = $body['shipments'] ?? null;
        if (!is_array($shipments)) {
            http_response_code(400);
            echo json_encode(['error' => 'Bad payload.']);
            break;
        }
        $ok = jbin_request('PUT', SHIPMENTS_BIN, ['shipments' => $shipments]);
        echo json_encode(['ok' => $ok !== null]);
        break;

    // ADMIN — save inquiries
    case 'saveInquiries':
        require_admin();
        $inquiries = $body['inquiries'] ?? null;
        if (!is_array($inquiries)) {
            http_response_code(400);
            echo json_encode(['error' => 'Bad payload.']);
            break;
        }
        $ok = jbin_request('PUT', INQUIRIES_BIN, ['inquiries' => $inquiries]);
        echo json_encode(['ok' => $ok !== null]);
        break;

    // ADMIN — change password
    case 'changePassword':
        require_admin();
        $oldPass = $body['oldPass'] ?? '';
        $newPass = $body['newPass'] ?? '';
        $creds   = get_creds();
        if (!password_verify($oldPass, $creds['pass'])) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Current password is incorrect.']);
            break;
        }
        if (strlen($newPass) < 6) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'New password must be at least 6 characters.']);
            break;
        }
        $creds['pass'] = password_hash($newPass, PASSWORD_DEFAULT);
        save_creds($creds);
        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Unknown action: ' . htmlspecialchars($action)]);
}
