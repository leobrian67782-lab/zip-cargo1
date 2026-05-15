// ===== PAGE LOADER =====
document.body.classList.add('no-scroll');
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('loader');
    if (loader) {
      loader.classList.add('hidden');
      document.body.classList.remove('no-scroll');
      setTimeout(() => loader.remove(), 700);
    }
  }, 1800);
});

// ===== NAVBAR SCROLL =====
window.addEventListener('scroll', () => {
  document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 50);
  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = (window.scrollY / (document.body.scrollHeight - innerHeight)) * 100 + '%';
  document.getElementById('backToTop')?.classList.toggle('visible', window.scrollY > 400);
  let cur = '';
  document.querySelectorAll('section[id]').forEach(s => { if (scrollY >= s.offsetTop - 120) cur = s.id; });
  document.querySelectorAll('.nav-links a').forEach(a =>
    a.classList.toggle('nav-active', a.getAttribute('href') === '#' + cur));
});

document.getElementById('backToTop')?.addEventListener('click', () =>
  scrollTo({ top: 0, behavior: 'smooth' }));

// ===== HAMBURGER =====
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => navLinks.classList.remove('open')));
}

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function (e) {
    e.preventDefault();
    document.querySelector(this.getAttribute('href'))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  let W = canvas.width = hero.offsetWidth, H = canvas.height = hero.offsetHeight;
  const dots = Array.from({ length: 55 }, () => ({
    x: Math.random()*W, y: Math.random()*H,
    r: Math.random()*2+0.5, dx: (Math.random()-.5)*.4, dy: (Math.random()-.5)*.4,
    alpha: Math.random()*.5+.15
  }));
  (function draw() {
    ctx.clearRect(0,0,W,H);
    dots.forEach(d => {
      ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,Math.PI*2);
      ctx.fillStyle = `rgba(232,130,12,${d.alpha})`; ctx.fill();
      d.x += d.dx; d.y += d.dy;
      if(d.x<0||d.x>W) d.dx*=-1;
      if(d.y<0||d.y>H) d.dy*=-1;
    });
    dots.forEach((a,i) => dots.slice(i+1).forEach(b => {
      const dist = Math.hypot(a.x-b.x, a.y-b.y);
      if(dist<110){
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
        ctx.strokeStyle = `rgba(232,130,12,${.07*(1-dist/110)})`; ctx.lineWidth=.5; ctx.stroke();
      }
    }));
    requestAnimationFrame(draw);
  })();
  window.addEventListener('resize', () => {
    W = canvas.width = hero.offsetWidth; H = canvas.height = hero.offsetHeight;
  });
}
createParticles();

// ===== HERO HEADLINE ROTATION =====
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
    idx = (idx+1) % lines.length;
    heroTitle.style.cssText = 'opacity:0;transform:translateY(20px);transition:opacity .6s,transform .6s';
    setTimeout(() => {
      heroTitle.innerHTML = lines[idx];
      heroTitle.style.cssText = 'opacity:1;transform:translateY(0);transition:opacity .6s,transform .6s';
    }, 500);
  }, 4000);
}

// ===== COUNTERS =====
let countersStarted = false;
const statsSection  = document.querySelector('.stats');
if (statsSection) {
  new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting || countersStarted) return;
    countersStarted = true;
    document.querySelectorAll('.stat-item h2').forEach(el => {
      const target = parseFloat(el.dataset.target), suffix = el.dataset.suffix||'', dec = el.dataset.decimal==='true';
      let s = 0; const step = target/(2500/16);
      const t = setInterval(() => {
        s += step;
        if(s >= target){ el.textContent=(dec?target.toFixed(1):Math.floor(target).toLocaleString())+suffix; clearInterval(t); }
        else el.textContent=(dec?s.toFixed(1):Math.floor(s).toLocaleString())+suffix;
      }, 16);
    });
  }, { threshold: .5 }).observe(statsSection);
}

// ===== SCROLL REVEAL =====
const revObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('visible'); revObs.unobserve(e.target); } });
}, { threshold: .1 });
document.querySelectorAll('.animate-fade,.animate-slide,.animate-card,.reveal,.reveal-left,.reveal-right')
  .forEach(el => revObs.observe(el));

// ===== HERO SLIDESHOW =====
(function(){
  const slides = document.querySelectorAll('.hero-slide'), dots = document.querySelectorAll('.hero-dot');
  let cur = 0, timer = null;
  function go(idx){
    slides[cur].classList.remove('active'); dots[cur].classList.remove('active');
    cur = (idx+slides.length)%slides.length;
    slides[cur].classList.add('active'); dots[cur].classList.add('active');
  }
  window.goToSlide = go;
  function start(){ timer = setInterval(() => go(cur+1), 5000); }
  dots.forEach((d,i) => { d.addEventListener('click', () => { clearInterval(timer); go(i); setTimeout(start,10000); }); });
  if(slides.length) start();
})();

// ===== TRACKING — calls /api/shipments/track/:id =====
let leafletMap = null;

async function trackShipment() {
  const input  = document.getElementById('trackInput').value.trim();
  const result = document.getElementById('trackResult');
  const btn    = document.querySelector('.tracking-form button');

  if (!input) {
    result.className = 'track-result error';
    result.innerHTML = 'Please enter a tracking number.';
    return;
  }

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Tracking...'; }

  result.className = '';
  result.style.cssText = 'display:block;background:white;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.1)';
  result.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;padding:52px 20px;gap:18px;font-family:'Outfit',sans-serif;">
      <div style="position:relative;width:72px;height:72px;">
        <div style="position:absolute;inset:0;border-radius:50%;border:5px solid #e8f0f7;"></div>
        <div style="position:absolute;inset:0;border-radius:50%;border:5px solid transparent;border-top-color:#e8920a;animation:zcSpin .85s linear infinite;"></div>
        <div style="position:absolute;inset:11px;border-radius:50%;background:#0d1f35;display:flex;align-items:center;justify-content:center;">
          <i class="fa-solid fa-truck" style="color:#e8920a;font-size:18px;"></i></div></div>
      <div style="font-weight:700;color:#0d1f35;">Locating shipment…</div>
      <div style="font-size:.85rem;color:#7a9ab8;">Searching for <strong style="color:#0d1f35;">${input}</strong></div></div>`;

  if (!document.getElementById('zcSpinStyle')) {
    const st = document.createElement('style'); st.id = 'zcSpinStyle';
    st.textContent = '@keyframes zcSpin{to{transform:rotate(360deg)}}'; document.head.appendChild(st);
  }

  try {
    const res = await fetch(`/api/shipments/track/${encodeURIComponent(input)}`);
    if (btn) { btn.disabled = false; btn.innerHTML = 'Track Now'; }
    result.style.cssText = '';

    if (!res.ok) {
      result.className = 'track-result error';
      result.innerHTML = `No shipment found for <strong>${input}</strong>. Please check your tracking number and try again.`;
      const ms = document.getElementById('trackMapSection');
      if (ms) ms.style.display = 'none';
      return;
    }

    const s = await res.json();
    renderTrackingResult(s, result);
    showRouteMap(s.origin, s.dest, s.location || s.origin, s.status);
  } catch (err) {
    if (btn) { btn.disabled = false; btn.innerHTML = 'Track Now'; }
    result.className = 'track-result error';
    result.innerHTML = 'Service temporarily unavailable. Please try again.';
  }
}

function renderTrackingResult(s, result) {
  var statusMap = {
    'Pending':          { bg:'#fff3cd', color:'#856404', icon:'fa-clock',               bar:'#f0c040' },
    'In Transit':       { bg:'#dbeafe', color:'#1e40af', icon:'fa-plane',               bar:'#3b82f6' },
    'Out for Delivery': { bg:'#dcfce7', color:'#166534', icon:'fa-truck',               bar:'#22c55e' },
    'Delivered':        { bg:'#dcfce7', color:'#166534', icon:'fa-circle-check',        bar:'#16a34a' },
    'On Hold':          { bg:'#fee2e2', color:'#991b1b', icon:'fa-triangle-exclamation',bar:'#ef4444' }
  };
  var sc = statusMap[s.status] || { bg:'#fff3cd', color:'#856404', icon:'fa-clock', bar:'#f0c040' };

  // Progress steps
  var steps      = ['Pending','In Transit','Out for Delivery','Delivered'];
  var stepLabels = ['Order Placed','In Transit','Out for Delivery','Delivered'];
  var stepIcons  = ['fa-box-open','fa-plane-departure','fa-truck','fa-circle-check'];
  var curIdx     = s.status === 'On Hold' ? -1 : steps.indexOf(s.status);

  var stepsHTML = '';
  for (var i = 0; i < steps.length; i++) {
    var done   = curIdx >= 0 && i <= curIdx;
    var active = i === curIdx;
    var lineHTML = '';
    if (i < steps.length - 1) {
      var lineW = (curIdx >= 0 && i < curIdx) ? '100%' : '0%';
      lineHTML = '<div style="position:absolute;top:19px;left:50%;width:100%;height:3px;background:#e5e7eb;z-index:0;">'
               + '<div style="height:100%;width:' + lineW + ';background:#27ae60;"></div>'
               + '</div>';
    }
    var circleBg  = done ? (active ? '#e8820c' : '#27ae60') : '#e5e7eb';
    var iconColor = done ? 'white' : '#aaa';
    var shadow    = active ? '0 0 0 4px rgba(232,130,12,.25)' : '0 2px 6px rgba(0,0,0,.1)';
    var labelColor  = active ? '#0d1f35' : '#9ca3af';
    var labelWeight = active ? '700' : '500';
    stepsHTML += '<div style="display:flex;flex-direction:column;align-items:center;flex:1;position:relative;z-index:1;">'
              + lineHTML
              + '<div style="width:38px;height:38px;border-radius:50%;z-index:1;background:' + circleBg + ';display:flex;align-items:center;justify-content:center;box-shadow:' + shadow + ';">'
              + '<i class="fa-solid ' + stepIcons[i] + '" style="font-size:14px;color:' + iconColor + ';"></i>'
              + '</div>'
              + '<div style="font-size:.62rem;text-align:center;margin-top:8px;line-height:1.35;max-width:68px;color:' + labelColor + ';font-weight:' + labelWeight + ';">' + stepLabels[i] + '</div>'
              + '</div>';
  }

  // Deduplicate timeline
  var rawTimeline = s.timeline || [];
  var dedupedTimeline = rawTimeline.filter(function(t, i) {
    if (i === 0) return true;
    var prev = rawTimeline[i - 1];
    return !(t.status === prev.status && Math.abs(new Date(t.timestamp) - new Date(prev.timestamp)) < 60000);
  });

  // Build timeline HTML
  var statusDotMap = {
    'Pending':          { dot:'#f59e0b', icon:'fa-clock' },
    'In Transit':       { dot:'#3b82f6', icon:'fa-plane' },
    'Out for Delivery': { dot:'#22c55e', icon:'fa-truck' },
    'Delivered':        { dot:'#16a34a', icon:'fa-circle-check' },
    'On Hold':          { dot:'#ef4444', icon:'fa-triangle-exclamation' }
  };
  var reversed = dedupedTimeline.slice().reverse();
  var tlItems = '';
  for (var j = 0; j < reversed.length; j++) {
    var t = reversed[j];
    var tsc = statusDotMap[t.status] || { dot:'#e8820c', icon:'fa-circle-dot' };
    var isFirst = j === 0;
    var isLast  = j === reversed.length - 1;
    var dotBg   = isFirst ? tsc.dot + '22' : '#f3f4f6';
    var dotBorder = isFirst ? tsc.dot : '#e5e7eb';
    var dotIconColor = isFirst ? tsc.dot : '#9ca3af';
    var textColor = isFirst ? '#0d1f35' : '#374151';
    var connector = isLast ? '' : '<div style="width:2px;flex:1;min-height:16px;background:#e5e7eb;margin:3px 0;"></div>';
    var locHTML  = t.location ? '<div style="font-size:.75rem;color:#6b7280;margin-top:2px;"><i class="fa-solid fa-location-dot" style="font-size:10px;color:#e8820c;"></i> ' + t.location + '</div>' : '';
    var noteHTML = t.note    ? '<div style="font-size:.73rem;color:#9ca3af;margin-top:3px;font-style:italic;">' + t.note + '</div>' : '';
    var dateStr  = new Date(t.timestamp).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'});
    tlItems += '<div style="display:flex;gap:14px;align-items:flex-start;">'
             + '<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;">'
             + '<div style="width:34px;height:34px;border-radius:50%;background:' + dotBg + ';border:2px solid ' + dotBorder + ';display:flex;align-items:center;justify-content:center;">'
             + '<i class="fa-solid ' + tsc.icon + '" style="font-size:12px;color:' + dotIconColor + ';"></i>'
             + '</div>' + connector + '</div>'
             + '<div style="padding-bottom:' + (isLast ? '0' : '16px') + ';flex:1;">'
             + '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:4px;">'
             + '<div style="font-size:.83rem;font-weight:700;color:' + textColor + ';">' + t.status + '</div>'
             + '<div style="font-size:.7rem;color:#9ca3af;white-space:nowrap;">' + dateStr + '</div>'
             + '</div>' + locHTML + noteHTML + '</div></div>';
  }

  // Helpers
  var date = s.date || new Date(s.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});
  function fmt(v) { return v ? parseFloat(v).toLocaleString() : '\u2014'; }

  function cell(label, icon, val, noLeftBorder) {
    var border = noLeftBorder ? '' : 'border-right:1px solid #f0ede8;';
    return '<div style="flex:1;min-width:130px;padding:14px 16px;' + border + '">'
         + '<div style="font-size:.58rem;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px;font-weight:600;">'
         + '<i class="fa-solid ' + icon + '" style="color:#e8820c;margin-right:4px;font-size:9px;"></i>' + label
         + '</div>'
         + '<div style="font-size:.88rem;font-weight:700;color:#0d1f35;">' + val + '</div>'
         + '</div>';
  }

  // On Hold alert
  var onHoldAlert = s.status === 'On Hold'
    ? '<div style="margin-top:14px;background:#fee2e2;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:8px;font-size:.8rem;color:#991b1b;font-weight:600;"><i class="fa-solid fa-triangle-exclamation"></i> This shipment is currently on hold. Please contact support.</div>'
    : '';

  // Current location strip
  var locStrip = s.location
    ? '<div style="padding:10px 22px;background:#fffbf5;border-bottom:1px solid #ebe8df;display:flex;align-items:center;gap:8px;">'
    + '<i class="fa-solid fa-satellite-dish" style="color:#e8820c;font-size:12px;"></i>'
    + '<span style="font-size:.78rem;color:#6b7280;">Current location:</span>'
    + '<span style="font-size:.78rem;font-weight:700;color:#0d1f35;">' + s.location + '</span>'
    + '</div>'
    : '';

  // Sender email/phone extras
  var sPhoneHTML = s.sPhone ? '<div style="font-size:.75rem;color:#6b7280;margin-top:3px;"><i class="fa-solid fa-phone" style="font-size:9px;color:#e8820c;"></i> ' + s.sPhone + '</div>' : '';
  var sEmailHTML = s.sEmail ? '<div style="font-size:.72rem;color:#6b7280;margin-top:2px;"><i class="fa-solid fa-envelope" style="font-size:9px;color:#e8820c;"></i> ' + s.sEmail + '</div>' : '';
  var rPhoneHTML = s.rPhone ? '<div style="font-size:.75rem;color:#6b7280;margin-top:3px;"><i class="fa-solid fa-phone" style="font-size:9px;color:#e8820c;"></i> ' + s.rPhone + '</div>' : '';
  var rEmailHTML = s.rEmail ? '<div style="font-size:.72rem;color:#6b7280;margin-top:2px;"><i class="fa-solid fa-envelope" style="font-size:9px;color:#e8820c;"></i> ' + s.rEmail + '</div>' : '';


  // Timeline section
  var tlSection = tlItems
    ? '<div style="padding:18px 22px;border-bottom:1px solid #ebe8df;background:white;">'
    + '<div style="font-size:.6rem;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;font-weight:600;">'
    + '<i class="fa-solid fa-timeline" style="color:#e8820c;margin-right:5px;"></i>Tracking History</div>'
    + tlItems + '</div>'
    : '';

  var lastUpdated = new Date().toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'});

  result.className = 'track-result success';
  result.innerHTML =
    '<div style="background:white;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.14);font-family:\'Outfit\',sans-serif;max-width:700px;margin:0 auto;">'

    // colour bar
    + '<div style="height:4px;background:' + sc.bar + ';"></div>'

    // header
    + '<div style="background:#0d1f35;padding:20px 22px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">'
    + '<div>'
    + '<div style="font-size:.6rem;color:#7a9ab8;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:5px;">Tracking Number</div>'
    + '<div style="font-size:1.15rem;font-weight:800;color:white;letter-spacing:1.5px;">' + s.tracking + '</div>'
    + '<div style="font-size:.72rem;color:#4a6a88;margin-top:4px;"><i class="fa-regular fa-calendar" style="font-size:10px;"></i> Created ' + date + '</div>'
    + '</div>'
    + '<div style="background:' + sc.bg + ';color:' + sc.color + ';padding:9px 18px;border-radius:30px;font-weight:700;font-size:.82rem;display:flex;align-items:center;gap:7px;white-space:nowrap;">'
    + '<i class="fa-solid ' + sc.icon + '"></i> ' + s.status
    + '</div></div>'

    // progress
    + '<div style="padding:22px 22px 18px;background:#f9f8f5;border-bottom:1px solid #ebe8df;">'
    + '<div style="font-size:.6rem;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:18px;font-weight:600;">Shipment Progress</div>'
    + '<div style="display:flex;align-items:flex-start;">' + stepsHTML + '</div>'
    + onHoldAlert
    + '</div>'

    // route
    + '<div style="padding:18px 22px;border-bottom:1px solid #ebe8df;display:flex;align-items:center;justify-content:space-between;gap:10px;background:white;">'
    + '<div style="flex:1;">'
    + '<div style="font-size:.58rem;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px;font-weight:600;">Origin</div>'
    + '<div style="font-size:.95rem;font-weight:700;color:#0d1f35;"><i class="fa-solid fa-circle-dot" style="color:#27ae60;font-size:12px;margin-right:5px;"></i>' + s.origin + '</div>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex-shrink:0;">'
    + '<i class="fa-solid fa-arrow-right" style="color:#e8820c;font-size:1rem;"></i>'
    + '<div style="font-size:.55rem;color:#d1d5db;font-weight:500;letter-spacing:.5px;">ROUTE</div>'
    + '</div>'
    + '<div style="flex:1;text-align:right;">'
    + '<div style="font-size:.58rem;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px;font-weight:600;">Destination</div>'
    + '<div style="font-size:.95rem;font-weight:700;color:#0d1f35;">' + s.dest + '<i class="fa-solid fa-location-dot" style="color:#ef4444;font-size:12px;margin-left:5px;"></i></div>'
    + '</div></div>'

    // current location strip
    + locStrip

    // sender / recipient
    + '<div style="display:flex;flex-wrap:wrap;border-bottom:1px solid #ebe8df;">'
    + '<div style="flex:1;min-width:140px;padding:16px 22px;border-right:1px solid #f0ede8;">'
    + '<div style="font-size:.58rem;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px;margin-bottom:7px;font-weight:600;"><i class="fa-solid fa-user" style="color:#e8820c;font-size:9px;margin-right:4px;"></i>Sender</div>'
    + '<div style="font-weight:700;color:#0d1f35;font-size:.88rem;">' + (s.sName || '&mdash;') + '</div>'
    + sPhoneHTML + sEmailHTML
    + '</div>'
    + '<div style="flex:1;min-width:140px;padding:16px 22px;">'
    + '<div style="font-size:.58rem;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px;margin-bottom:7px;font-weight:600;"><i class="fa-solid fa-user-check" style="color:#e8820c;font-size:9px;margin-right:4px;"></i>Recipient</div>'
    + '<div style="font-weight:700;color:#0d1f35;font-size:.88rem;">' + (s.rName || '&mdash;') + '</div>'
    + rPhoneHTML + rEmailHTML
    + '</div></div>'

    // shipment details grid
    + '<div style="border-bottom:1px solid #ebe8df;">'
    + '<div style="padding:12px 22px 0;font-size:.6rem;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Shipment Details</div>'
    + '<div style="display:flex;flex-wrap:wrap;">'
    + cell('Service',      'fa-box',            s.service || '&mdash;', false)
    + cell('Est. Delivery','fa-calendar',        s.eta     || '&mdash;', true)
    + '</div>'
    + '<div style="display:flex;flex-wrap:wrap;border-top:1px solid #f0ede8;">'
    + cell('Weight',      'fa-weight-hanging', s.weight ? fmt(s.weight) + ' kg' : '&mdash;', true)
    + '</div>'
    + '</div>'

    // timeline
    + tlSection

    // footer
    + '<div style="padding:12px 22px;background:#f9f8f5;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">'
    + '<div style="display:flex;align-items:center;gap:6px;font-size:.72rem;color:#9ca3af;">'
    + '<i class="fa-solid fa-bolt" style="color:#e8820c;"></i>'
    + '<span style="font-weight:700;color:#0d1f35;">ZipCargo</span> Logistics</div>'
    + '<div style="font-size:.68rem;color:#bbb;">Last updated: ' + lastUpdated + '</div>'
    + '</div>'
    + '</div>';
}


document.getElementById('trackInput')?.addEventListener('keypress', e => {
  if (e.key === 'Enter') trackShipment();
});

// ===== ROUTE MAP =====
function showRouteMap(origin, dest, currentLocation, status) {
  const ms = document.getElementById('trackMapSection'); if(!ms) return;
  ms.style.display = 'block'; ms.scrollIntoView({ behavior:'smooth', block:'nearest' });
  document.getElementById('trackMapStatus').textContent = `Plotting route: ${origin} → ${dest}`;
  Promise.all([geocode(origin), geocode(dest), geocode(currentLocation)])
    .then(([o,d,c]) => {
      if(!o||!d){ document.getElementById('trackMapStatus').textContent='Could not locate cities.'; return; }
      initRouteMap(o, d, c||o, origin, dest, currentLocation, status);
    })
    .catch(() => { document.getElementById('trackMapStatus').textContent='Map could not be loaded.'; });
}

function geocode(p) {
  return fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(p)}&format=json&limit=1`,
    { headers:{'Accept-Language':'en'} })
    .then(r => r.json())
    .then(d => d&&d.length ? { lat:+d[0].lat, lng:+d[0].lon } : null)
    .catch(() => null);
}

function initRouteMap(oC,dC,cC,oN,dN,cN,status){
  const mapEl = document.getElementById('trackMap'); if(!mapEl) return;
  if(leafletMap){ leafletMap.remove(); leafletMap=null; }
  new Promise(res => {
    if(window.L){ res(); return; }
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    s.onload=res; document.head.appendChild(s);
  }).then(() => {
    leafletMap = L.map('trackMap').setView([(oC.lat+dC.lat)/2,(oC.lng+dC.lng)/2], 3);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution:'© OpenStreetMap', subdomains:'abc', maxZoom:19 }).addTo(leafletMap);
    const pts = buildCurvedRoute(oC,dC,30);
    L.polyline(pts,{color:'#e8820c',weight:3,opacity:.9,dashArray:'8,6'}).addTo(leafletMap);
    const mkr = color => L.divIcon({ html:`<div style="background:${color};width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.5);"></div>`, className:'', iconSize:[16,16], iconAnchor:[8,8] });
    const statusIcon = status==='Delivered'?'✓':status==='In Transit'?'✈':status==='Out for Delivery'?'🚚':'📦';
    const curIco = L.divIcon({ html:`<div style="background:#e8820c;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 3px 12px rgba(232,130,12,.6);display:flex;align-items:center;justify-content:center;font-size:14px;">${statusIcon}</div>`, className:'', iconSize:[32,32], iconAnchor:[16,16] });
    L.marker([oC.lat,oC.lng],{icon:mkr('#27ae60')}).addTo(leafletMap).bindPopup(`<strong>📍 Origin</strong><br/>${oN}`);
    L.marker([dC.lat,dC.lng],{icon:mkr('#e74c3c')}).addTo(leafletMap).bindPopup(`<strong>🎯 Destination</strong><br/>${dN}`);
    const same = Math.abs(cC.lat-oC.lat)<.01 && Math.abs(cC.lng-oC.lng)<.01;
    if(!same){
      L.marker([cC.lat,cC.lng],{icon:curIco}).addTo(leafletMap).bindPopup(`<strong>📡 Current</strong><br/>${cN}`).openPopup();
    } else {
      const r = {'In Transit':.4,'Out for Delivery':.8,'Delivered':1.0}[status]||.1;
      const p = pts[Math.floor(r*(pts.length-1))];
      L.marker(p,{icon:curIco}).addTo(leafletMap).bindPopup(`<strong>📡 Package</strong><br/>Status: ${status}`).openPopup();
    }
    leafletMap.fitBounds(L.latLngBounds([[oC.lat,oC.lng],[dC.lat,dC.lng]]),{padding:[50,50]});
    document.getElementById('trackMapStatus').textContent = `Route: ${oN} → ${dN}`;
  });
}

function buildCurvedRoute(f,t,steps){
  const pts=[];
  for(let i=0;i<=steps;i++){
    const r=i/steps;
    pts.push([f.lat+(t.lat-f.lat)*r+Math.sin(Math.PI*r)*5*.3, f.lng+(t.lng-f.lng)*r]);
  }
  return pts;
}

// ===== CONTACT FORM — calls /api/inquiries =====
async function submitForm(e) {
  e.preventDefault();
  const name    = document.getElementById('fname').value.trim();
  const email   = document.getElementById('femail').value.trim();
  const company = document.getElementById('fcompany')?.value.trim() || '';
  const service = document.getElementById('fservice').value;
  const message = document.getElementById('fmessage').value.trim();
  if (!name || !email || !message) { alert('Please fill in all required fields.'); return; }

  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled=true; btn.innerHTML='Sending… <i class="fa-solid fa-spinner fa-spin"></i>'; }

  try {
    const res = await fetch('/api/inquiries', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, company, service, message }),
    });
    if (!res.ok) throw new Error('Server error');
    const form    = document.querySelector('.contact-form');
    const success = document.getElementById('formSuccess');
    form.style.display='none'; success.style.display='block';
    setTimeout(() => { form.reset(); form.style.display='flex'; success.style.display='none'; }, 6000);
  } catch {
    alert('Could not send message. Please try again.');
  } finally {
    if (btn) { btn.disabled=false; btn.innerHTML='Send Message <i class="fa-solid fa-paper-plane"></i>'; }
  }
}
