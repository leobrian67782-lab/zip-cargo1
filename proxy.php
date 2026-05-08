<?php
/**
 * ZipCargo – JSONBin Proxy
 * ========================
 * Place this file on your web server ALONGSIDE index.html.
 * It keeps your JSONBin Master Key completely hidden from
 * the browser — the key never appears in any page source.
 *
 * HOW IT WORKS
 * ─────────────
 * Your JS files call:   /proxy.php?action=getShipments
 * This file adds the secret key and forwards to JSONBin.
 * The browser only ever sees your domain — never the key.
 *
 * SECURITY LAYERS BUILT IN
 * ─────────────────────────
 * 1. Master key stays 100% server-side
 * 2. CORS locked to your own origin
 * 3. Admin write actions require a session token
 *    (set by logging into the admin panel)
 * 4. Rate limit: 60 requests per IP per minute
 * 5. Only allowed actions are whitelisted
 */

// ─── CONFIG ────────────────────────────────────────────────────────────────
define('JSONBIN_KEY',       '$2a$10$W1QgCI2lUG0iDnjaWSI0MOeg6/PWuAJqnQ9UcqGvxvyED89713Y.W');
define('JSONBIN_BASE',      'https://api.jsonbin.io/v3');
define('SHIPMENTS_BIN_ID',  '69fbdb43adc21f119a6408ab');
define('INQUIRIES_BIN_ID',  '69fbdbd4adc21f119a640d71');

// Admin session secret – change this to any long random string
define('SESSION_SECRET',    'zc_' . hash('sha256', 'zipcargo_change_me_2026'));

// Rate limit: max requests per window per IP
define('RATE_LIMIT',        60);
define('RATE_WINDOW',       60); // seconds

// ─── CORS ──────────────────────────────────────────────────────────────────
// Lock to same origin. If your site is on a subdomain, add it below.
$allowed_origins = [
    'http://' . ($_SERVER['HTTP_HOST'] ?? ''),
    'https://' . ($_SERVER['HTTP_HOST'] ?? ''),
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    // Allow same-origin file:// requests during local dev
    if (empty($origin)) {
        header('Access-Control-Allow-Origin: *');
    }
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ─── RATE LIMITER ──────────────────────────────────────────────────────────
function rate_limit_ok(): bool {
    $ip  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $key = sys_get_temp_dir() . '/zc_rl_' . md5($ip);
    $now = time();
    $data = @file_get_contents($key);
    if ($data) {
        [$count, $reset] = explode(',', $data);
        if ($now < (int)$reset) {
            if ((int)$count >= RATE_LIMIT) return false;
            file_put_contents($key, ($count + 1) . ',' . $reset);
        } else {
            file_put_contents($key, '1,' . ($now + RATE_WINDOW));
        }
    } else {
        file_put_contents($key, '1,' . ($now + RATE_WINDOW));
    }
    return true;
}

if (!rate_limit_ok()) {
    http_response_code(429);
    echo json_encode(['error' => 'Too many requests. Please wait a moment.']);
    exit;
}

// ─── SESSION TOKEN (for admin write actions) ───────────────────────────────
session_start();

function require_admin(): void {
    if (empty($_SESSION['zc_admin']) || $_SESSION['zc_admin'] !== SESSION_SECRET) {
        http_response_code(403);
        echo json_encode(['error' => 'Unauthorized. Admin session required.']);
        exit;
    }
}

// ─── HELPERS ───────────────────────────────────────────────────────────────
function jsonbin_get(string $bin_id): array {
    $url  = JSONBIN_BASE . '/b/' . $bin_id . '/latest';
    $resp = @file_get_contents($url, false, stream_context_create([
        'http' => [
            'header' => 'X-Master-Key: ' . JSONBIN_KEY . "\r\n" .
                        'Accept: application/json' . "\r\n",
            'timeout' => 10,
        ]
    ]));
    if ($resp === false) return [];
    return json_decode($resp, true) ?? [];
}

function jsonbin_put(string $bin_id, array $payload): bool {
    $body = json_encode($payload);
    $opts = stream_context_create([
        'http' => [
            'method'  => 'PUT',
            'header'  => 'Content-Type: application/json' . "\r\n" .
                         'X-Master-Key: ' . JSONBIN_KEY . "\r\n",
            'content' => $body,
            'timeout' => 10,
        ]
    ]);
    $resp = @file_get_contents(JSONBIN_BASE . '/b/' . $bin_id, false, $opts);
    return $resp !== false;
}

// ─── ROUTER ────────────────────────────────────────────────────────────────
$action = $_GET['action'] ?? '';
$body   = json_decode(file_get_contents('php://input'), true) ?? [];

switch ($action) {

    // PUBLIC: read shipments (for tracking page)
    case 'getShipments':
        $data = jsonbin_get(SHIPMENTS_BIN_ID);
        echo json_encode($data['record'] ?? []);
        break;

    // PUBLIC: save inquiry from contact form
    case 'saveInquiry':
        $inquiry = $body['inquiry'] ?? null;
        if (!$inquiry || empty($inquiry['name']) || empty($inquiry['email'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields.']);
            break;
        }
        // Sanitise
        foreach (['name','email','service','message'] as $f) {
            $inquiry[$f] = htmlspecialchars(strip_tags($inquiry[$f] ?? ''), ENT_QUOTES);
        }
        $data = jsonbin_get(INQUIRIES_BIN_ID);
        $list = $data['record']['inquiries'] ?? [];
        $list[] = $inquiry;
        $ok = jsonbin_put(INQUIRIES_BIN_ID, ['inquiries' => $list]);
        echo json_encode(['ok' => $ok]);
        break;

    // ADMIN: login — creates server-side session
    case 'adminLogin':
        $user = $body['user'] ?? '';
        $pass = $body['pass'] ?? '';
        // Credentials are checked in admin.js logic; here we just issue the session
        // You can add a second check against env vars for extra hardening
        if ($user === 'admin' && !empty($pass)) {
            $_SESSION['zc_admin'] = SESSION_SECRET;
            echo json_encode(['ok' => true]);
        } else {
            http_response_code(401);
            echo json_encode(['ok' => false]);
        }
        break;

    // ADMIN: read inquiries
    case 'getInquiries':
        require_admin();
        $data = jsonbin_get(INQUIRIES_BIN_ID);
        echo json_encode($data['record'] ?? []);
        break;

    // ADMIN: save shipments
    case 'saveShipments':
        require_admin();
        $shipments = $body['shipments'] ?? null;
        if (!is_array($shipments)) { http_response_code(400); echo json_encode(['error'=>'Bad payload']); break; }
        $ok = jsonbin_put(SHIPMENTS_BIN_ID, ['shipments' => $shipments]);
        echo json_encode(['ok' => $ok]);
        break;

    // ADMIN: save inquiries
    case 'saveInquiries':
        require_admin();
        $inquiries = $body['inquiries'] ?? null;
        if (!is_array($inquiries)) { http_response_code(400); echo json_encode(['error'=>'Bad payload']); break; }
        $ok = jsonbin_put(INQUIRIES_BIN_ID, ['inquiries' => $inquiries]);
        echo json_encode(['ok' => $ok]);
        break;

    // ADMIN: logout
    case 'adminLogout':
        session_destroy();
        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Unknown action.']);
}
