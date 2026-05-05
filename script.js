// ===== SHARED STORAGE KEY =====
var ZC_SHIPMENTS_KEY = 'zc_shipments';
var ZC_INQUIRIES_KEY = 'zc_inquiries';

// ===== PAGE LOADER =====
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('loader');
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 700);
    }
  }, 1500);
});

// ===== NAVBAR SCROLL =====
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);

  const bar = document.getElementById('progressBar');
  if (bar) {
    const progress = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
    bar.style.width = progress + '%';
  }

  const btn = document.getElementById('backToTop');
  if (btn) btn.classList.toggle('visible', window.scrollY > 400);

  let current = '';
  document.querySelectorAll('section[id]').forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
  });
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.classList.toggle('nav-active', link.getAttribute('href') === '#' + current);
  });
});

// ===== BACK TO TOP =====
document.getElementById('backToTop')?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => navLinks.classList.remove('open'))
  );
}

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// ===== PARTICLES =====
function createParticles() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
  hero.prepend(canvas);
  const ctx = canvas.getContext('2d');
  let W = canvas.width  = hero.offsetWidth;
  let H = canvas.height = hero.offsetHeight;
  const dots = Array.from({ length: 55 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    r: Math.random() * 2 + 0.5,
    dx: (Math.random() - 0.5) * 0.4,
    dy: (Math.random() - 0.5) * 0.4,
    alpha: Math.random() * 0.5 + 0.15
  }));
  (function draw() {
    ctx.clearRect(0, 0, W, H);
    dots.forEach(d => {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(232,130,12,${d.alpha})`;
      ctx.fill();
      d.x += d.dx; d.y += d.dy;
      if (d.x < 0 || d.x > W) d.dx *= -1;
      if (d.y < 0 || d.y > H) d.dy *= -1;
    });
    dots.forEach((a, i) => dots.slice(i + 1).forEach(b => {
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < 110) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(232,130,12,${0.07 * (1 - dist / 110)})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }));
    requestAnimationFrame(draw);
  })();
  window.addEventListener('resize', () => {
    W = canvas.width  = hero.offsetWidth;
    H = canvas.height = hero.offsetHeight;
  });
}
createParticles();

// ===== HERO ROTATING HEADLINES =====
const heroTitle = document.querySelector('.hero h1');
if (heroTitle) {
  const lines = [
    'Ship Smarter.<br/>Deliver Faster.',
    'Fast. Reliable.<br/>Worldwide.',
    'Your Cargo.<br/>Our Priority.',
    'Global Reach.<br/>Local Care.'
  ];
  let idx = 0;
  setInterval(() => {
    idx = (idx + 1) % lines.length;
    heroTitle.style.opacity = '0';
    heroTitle.style.transform = 'translateY(20px)';
    setTimeout(() => {
      heroTitle.innerHTML = lines[idx];
      heroTitle.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      heroTitle.style.opacity = '1';
      heroTitle.style.transform = 'translateY(0)';
    }, 500);
  }, 4000);
}

// ===== ANIMATED COUNTERS =====
function animateCounter(el, target, suffix, isDecimal) {
  let start = 0;
  const duration = 2500;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) {
      el.textContent = (isDecimal ? target.toFixed(1) : Math.floor(target).toLocaleString()) + suffix;
      clearInterval(timer);
    } else {
      el.textContent = (isDecimal ? start.toFixed(1) : Math.floor(start).toLocaleString()) + suffix;
    }
  }, 16);
}

let countersStarted = false;
const statsSection  = document.querySelector('.stats');
if (statsSection) {
  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !countersStarted) {
      countersStarted = true;
      document.querySelectorAll('.stat-item h2').forEach(el => {
        const target  = parseFloat(el.dataset.target);
        const suffix  = el.dataset.suffix || '';
        const decimal = el.dataset.decimal === 'true';
        animateCounter(el, target, suffix, decimal);
      });
    }
  }, { threshold: 0.5 }).observe(statsSection);
}

// ===== SCROLL REVEAL =====
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll(
  '.animate-fade, .animate-slide, .animate-card, .reveal, .reveal-left, .reveal-right'
).forEach(el => revealObserver.observe(el));

// ===== TRACKING =====
// Map container reference (for route display)
let leafletMap = null;
let routeLayer = null;

function trackShipment() {
  const input     = document.getElementById('trackInput').value.trim();
  const result    = document.getElementById('trackResult');

  // Always read fresh from localStorage
  const shipments = JSON.parse(localStorage.getItem(ZC_SHIPMENTS_KEY) || '[]');

  if (!input) {
    result.className = 'track-result error';
    result.innerHTML = 'Please enter a tracking number.';
    return;
  }

  const s = shipments.find(s => s.tracking.toLowerCase() === input.toLowerCase());

  if (!s) {
    result.className = 'track-result error';
    result.innerHTML = `No shipment found for <strong>${input}</strong>. Please check your tracking number and try again.`;
    // Hide map if visible
    const mapSection = document.getElementById('trackMapSection');
    if (mapSection) mapSection.style.display = 'none';
    return;
  }

  const statusConfig = {
    'Pending':          { bg:'#fff3cd', color:'#856404', icon:'fa-clock' },
    'In Transit':       { bg:'#cce5ff', color:'#004085', icon:'fa-plane' },
    'Out for Delivery': { bg:'#d4edda', color:'#155724', icon:'fa-truck' },
    'Delivered':        { bg:'#d4edda', color:'#155724', icon:'fa-circle-check' },
    'On Hold':          { bg:'#f8d7da', color:'#721c24', icon:'fa-triangle-exclamation' }
  };
  const sc = statusConfig[s.status] || statusConfig['Pending'];

  const steps      = ['Pending', 'In Transit', 'Out for Delivery', 'Delivered'];
  const stepLabels = ['Order Placed', 'Picked Up', 'Out for Delivery', 'Delivered'];
  const stepIcons  = ['fa-box', 'fa-plane-departure', 'fa-truck', 'fa-circle-check'];
  const currentIdx = steps.indexOf(s.status);

  const stepsHTML = steps.map((step, i) => {
    const done   = i <= currentIdx && s.status !== 'On Hold';
    const active = i === currentIdx && s.status !== 'On Hold';
    const lineColor = (i < currentIdx && s.status !== 'On Hold') ? '#27ae60' : '#ddd';
    return `
      <div style="display:flex;flex-direction:column;align-items:center;flex:1;position:relative;">
        ${i < steps.length - 1 ? `<div style="position:absolute;top:18px;left:50%;width:100%;height:3px;background:${lineColor};z-index:0;"></div>` : ''}
        <div style="width:36px;height:36px;border-radius:50%;background:${done ? '#27ae60' : '#e0e0e0'};display:flex;align-items:center;justify-content:center;z-index:1;box-shadow:0 2px 8px rgba(0,0,0,0.12);">
          <i class="fa-solid ${stepIcons[i]}" style="font-size:14px;color:${done ? 'white' : '#aaa'};"></i>
        </div>
        <div style="font-size:0.68rem;text-align:center;margin-top:7px;color:${active ? '#0d1f35' : '#999'};font-weight:${active ? '700' : '400'};line-height:1.3;max-width:70px;">${stepLabels[i]}</div>
      </div>`;
  }).join('');

  result.className = 'track-result success';
  result.innerHTML = `
    <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.13);font-family:'Outfit',sans-serif;">

      <div style="background:#0d1f35;padding:22px 28px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-size:0.7rem;color:#7a9ab8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Tracking Number</div>
          <div style="font-size:1.25rem;font-weight:800;color:white;letter-spacing:1px;">${s.tracking}</div>
        </div>
        <div style="background:${sc.bg};color:${sc.color};padding:8px 18px;border-radius:30px;font-weight:700;font-size:0.88rem;display:flex;align-items:center;gap:7px;">
          <i class="fa-solid ${sc.icon}"></i> ${s.status}
        </div>
      </div>

      <div style="padding:22px 28px;background:#f9f8f5;border-bottom:1px solid #ebe8df;">
        <div style="font-size:0.68rem;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;font-weight:600;">Shipment Progress</div>
        <div style="display:flex;align-items:flex-start;">${stepsHTML}</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:18px 28px;border-bottom:1px solid #ebe8df;gap:10px;">
        <div>
          <div style="font-size:0.68rem;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Origin</div>
          <div style="font-size:1rem;font-weight:700;color:#0d1f35;display:flex;align-items:center;gap:6px;">
            <i class="fa-solid fa-circle-dot" style="color:#e8820c;font-size:12px;"></i> ${s.origin}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          <i class="fa-solid fa-arrow-right" style="color:#e8820c;font-size:1.2rem;"></i>
          <div style="font-size:0.65rem;color:#bbb;">Direct Route</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:0.68rem;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Destination</div>
          <div style="font-size:1rem;font-weight:700;color:#0d1f35;display:flex;align-items:center;justify-content:flex-end;gap:6px;">
            ${s.dest} <i class="fa-solid fa-location-dot" style="color:#e8820c;font-size:12px;"></i>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #ebe8df;">
        <div style="padding:16px 22px;border-right:1px solid #ebe8df;">
          <div style="font-size:0.65rem;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Sender</div>
          <div style="font-weight:700;color:#0d1f35;font-size:0.93rem;">${s.sName || '—'}</div>
          ${s.sPhone ? `<div style="font-size:0.8rem;color:#777;margin-top:2px;"><i class="fa-solid fa-phone" style="font-size:10px;"></i> ${s.sPhone}</div>` : ''}
        </div>
        <div style="padding:16px 22px;">
          <div style="font-size:0.65rem;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Recipient</div>
          <div style="font-weight:700;color:#0d1f35;font-size:0.93rem;">${s.rName}</div>
          ${s.rPhone ? `<div style="font-size:0.8rem;color:#777;margin-top:2px;"><i class="fa-solid fa-phone" style="font-size:10px;"></i> ${s.rPhone}</div>` : ''}
        </div>
        <div style="padding:16px 22px;border-right:1px solid #ebe8df;border-top:1px solid #ebe8df;">
          <div style="font-size:0.65rem;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Service</div>
          <div style="font-weight:700;color:#0d1f35;font-size:0.93rem;display:flex;align-items:center;gap:6px;">
            <i class="fa-solid fa-box" style="color:#e8820c;font-size:12px;"></i> ${s.service}
          </div>
        </div>
        <div style="padding:16px 22px;border-top:1px solid #ebe8df;">
          <div style="font-size:0.65rem;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Est. Delivery</div>
          <div style="font-weight:700;color:#0d1f35;font-size:0.93rem;display:flex;align-items:center;gap:6px;">
            <i class="fa-regular fa-calendar" style="color:#e8820c;font-size:12px;"></i> ${s.eta || '—'}
          </div>
        </div>
        ${s.weight ? `
        <div style="padding:16px 22px;border-right:1px solid #ebe8df;border-top:1px solid #ebe8df;">
          <div style="font-size:0.65rem;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Weight</div>
          <div style="font-weight:700;color:#0d1f35;font-size:0.93rem;"><i class="fa-solid fa-weight-hanging" style="color:#e8820c;font-size:12px;"></i> ${s.weight} kg</div>
        </div>` : ''}
        <div style="padding:16px 22px;border-top:1px solid #ebe8df;">
          <div style="font-size:0.65rem;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Current Location</div>
          <div style="font-weight:700;color:#0d1f35;font-size:0.93rem;display:flex;align-items:center;gap:6px;">
            <i class="fa-solid fa-map-pin" style="color:#e8820c;font-size:12px;"></i> ${s.location || s.origin}
          </div>
        </div>
      </div>

      <div style="padding:8px 24px 14px;text-align:center;font-size:0.74rem;color:#bbb;">
        <i class="fa-regular fa-clock"></i> Last updated: ${s.date} &nbsp;&bull;&nbsp; ZipCargo Logistics
      </div>
    </div>
  `;

  // Show route map
  showRouteMap(s.origin, s.dest, s.location || s.origin, s.status);
}

document.getElementById('trackInput')?.addEventListener('keypress', e => {
  if (e.key === 'Enter') trackShipment();
});

// ===== ROUTE MAP (OpenStreetMap + Leaflet - no API key needed) =====
function showRouteMap(origin, dest, currentLocation, status) {
  const mapSection = document.getElementById('trackMapSection');
  if (!mapSection) return;
  mapSection.style.display = 'block';
  mapSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Show loading state
  document.getElementById('trackMapStatus').textContent =
    `Plotting route: ${origin} → ${dest}`;

  // Geocode both cities using Nominatim (free, no key)
  Promise.all([
    geocode(origin),
    geocode(dest),
    geocode(currentLocation)
  ]).then(([originCoords, destCoords, currentCoords]) => {
    if (!originCoords || !destCoords) {
      document.getElementById('trackMapStatus').textContent =
        'Could not locate these cities on the map. Please use standard city names.';
      return;
    }

    initRouteMap(originCoords, destCoords, currentCoords || originCoords, origin, dest, currentLocation, status);
  }).catch(() => {
    document.getElementById('trackMapStatus').textContent =
      'Map route could not be loaded. Please check your connection.';
  });
}

function geocode(placeName) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1`;
  return fetch(url, { headers: { 'Accept-Language': 'en' } })
    .then(r => r.json())
    .then(data => {
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), name: data[0].display_name };
      }
      return null;
    })
    .catch(() => null);
}

function initRouteMap(originCoords, destCoords, currentCoords, originName, destName, currentName, status) {
  const mapEl = document.getElementById('trackMap');
  if (!mapEl) return;

  // Destroy existing map instance
  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }

  // Load Leaflet if not already loaded
  const loadLeaflet = new Promise((resolve) => {
    if (window.L) { resolve(); return; }
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(css);
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.onload = resolve;
    document.head.appendChild(script);
  });

  loadLeaflet.then(() => {
    const midLat = (originCoords.lat + destCoords.lat) / 2;
    const midLng = (originCoords.lng + destCoords.lng) / 2;

    leafletMap = L.map('trackMap').setView([midLat, midLng], 3);

    // Reliable OpenStreetMap tiles (always works, no API key needed)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: 'abc',
      maxZoom: 19
    }).addTo(leafletMap);

    // Draw curved route line using intermediate points
    const routePoints = buildCurvedRoute(originCoords, destCoords, 30);
    const polyline = L.polyline(routePoints, {
      color: '#e8820c',
      weight: 3,
      opacity: 0.9,
      dashArray: '8, 6'
    }).addTo(leafletMap);

    // Origin marker (green)
    const originIcon = L.divIcon({
      html: `<div style="background:#27ae60;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>`,
      className: '',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    // Destination marker (red)
    const destIcon = L.divIcon({
      html: `<div style="background:#e74c3c;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>`,
      className: '',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    // Current location marker (orange plane/truck)
    const statusIcon = status === 'Delivered' ? '✓' :
                       status === 'In Transit' ? '✈' :
                       status === 'Out for Delivery' ? '🚚' : '📦';

    const currentIcon = L.divIcon({
      html: `<div style="background:#e8820c;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 3px 12px rgba(232,130,12,0.6);display:flex;align-items:center;justify-content:center;font-size:14px;animation:pulse-map 2s infinite;">${statusIcon}</div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    L.marker([originCoords.lat, originCoords.lng], { icon: originIcon })
      .addTo(leafletMap)
      .bindPopup(`<strong style="color:#27ae60;">📍 Origin</strong><br/>${originName}`, { maxWidth: 200 });

    L.marker([destCoords.lat, destCoords.lng], { icon: destIcon })
      .addTo(leafletMap)
      .bindPopup(`<strong style="color:#e74c3c;">🎯 Destination</strong><br/>${destName}`, { maxWidth: 200 });

    // Only show current-location marker if it differs from origin/dest
    const sameAsOrigin = Math.abs(currentCoords.lat - originCoords.lat) < 0.01 && Math.abs(currentCoords.lng - originCoords.lng) < 0.01;
    if (!sameAsOrigin) {
      L.marker([currentCoords.lat, currentCoords.lng], { icon: currentIcon })
        .addTo(leafletMap)
        .bindPopup(`<strong style="color:#e8820c;">📡 Current Location</strong><br/>${currentName}`, { maxWidth: 200 })
        .openPopup();
    } else {
      // Place current marker at approximate midpoint of route based on status
      let progressRatio = 0.1;
      if (status === 'In Transit') progressRatio = 0.4;
      if (status === 'Out for Delivery') progressRatio = 0.8;
      if (status === 'Delivered') progressRatio = 1.0;

      const approxIdx = Math.floor(progressRatio * (routePoints.length - 1));
      const approxPos = routePoints[approxIdx];
      L.marker(approxPos, { icon: currentIcon })
        .addTo(leafletMap)
        .bindPopup(`<strong style="color:#e8820c;">📡 Package Location</strong><br/>Status: ${status}`, { maxWidth: 200 })
        .openPopup();
    }

    // Fit map to show all markers
    const bounds = L.latLngBounds([
      [originCoords.lat, originCoords.lng],
      [destCoords.lat, destCoords.lng]
    ]);
    leafletMap.fitBounds(bounds, { padding: [50, 50] });

    document.getElementById('trackMapStatus').textContent =
      `Route: ${originName} → ${destName}`;
  });
}

// Build a curved (great-circle approximation) route with N points
function buildCurvedRoute(from, to, steps) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Simple linear interpolation with a slight arc (bulge midpoint north/south)
    const lat = from.lat + (to.lat - from.lat) * t;
    const lng = from.lng + (to.lng - from.lng) * t;
    // Add a slight curve using sine
    const curvature = Math.sin(Math.PI * t) * 5; // degrees of arc
    points.push([lat + curvature * 0.3, lng]);
  }
  return points;
}

// ===== CONTACT FORM =====
// FIX: saves to localStorage so admin panel can read it
function submitForm(e) {
  e.preventDefault();
  const name    = document.getElementById('fname').value.trim();
  const email   = document.getElementById('femail').value.trim();
  const service = document.getElementById('fservice').value;
  const message = document.getElementById('fmessage').value.trim();
  if (!name || !email || !message) {
    alert('Please fill in all required fields.');
    return;
  }

  // Read current inquiries, push new one, save back
  const inquiries = JSON.parse(localStorage.getItem(ZC_INQUIRIES_KEY) || '[]');
  inquiries.push({
    name, email, service, message,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  });
  localStorage.setItem(ZC_INQUIRIES_KEY, JSON.stringify(inquiries));

  const form    = document.querySelector('.contact-form');
  const success = document.getElementById('formSuccess');
  form.style.display = 'none';
  success.style.display = 'block';
  setTimeout(() => {
    form.reset();
    form.style.display = 'flex';
    success.style.display = 'none';
  }, 6000);
}
// ===== HERO BACKGROUND SLIDESHOW =====
(function() {
  var slides     = document.querySelectorAll('.hero-slide');
  var dots       = document.querySelectorAll('.hero-dot');
  var current    = 0;
  var total      = slides.length;
  var autoTimer  = null;

  function goToSlide(idx) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (idx + total) % total;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  // Expose globally so onclick="goToSlide(n)" works
  window.goToSlide = goToSlide;

  function startAuto() {
    autoTimer = setInterval(function() {
      goToSlide(current + 1);
    }, 5000);
  }

  // Pause on dot click, resume after 10s
  dots.forEach(function(dot, i) {
    dot.addEventListener('click', function() {
      clearInterval(autoTimer);
      goToSlide(i);
      setTimeout(startAuto, 10000);
    });
  });

  if (total > 0) startAuto();
})();
