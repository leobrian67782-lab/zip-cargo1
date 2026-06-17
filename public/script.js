// ===== PAGE LOADER =====
// Loader is now handled inline in <head> for immediate display before paint
// Progress bar — scroll-based
(function(){
  window.addEventListener('scroll', function(){
    var bar = document.getElementById('progressBar');
    if(bar) bar.style.width = (window.scrollY / (document.body.scrollHeight - innerHeight) * 100) + '%';
  });
})();

// ===== NAVBAR SCROLL =====
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) {
    // On homepage — transparent until scrolled past hero
    const isHome = document.querySelector('.hero');
    if (isHome) {
      nav.classList.toggle('scrolled', window.scrollY > 80);
    } else {
      nav.classList.add('scrolled');
    }
  }
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
const navOverlay = document.getElementById('navOverlay');

function openMenu() {
  navLinks.classList.add('open');
  hamburger.classList.add('open');
  navOverlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  navLinks.classList.remove('open');
  hamburger.classList.remove('open');
  if (navOverlay) navOverlay.classList.remove('show');
  document.body.style.overflow = '';
}

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    if (navLinks.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close when clicking a link
  navLinks.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', closeMenu));

  // Close when clicking overlay
  if (navOverlay) {
    navOverlay.addEventListener('click', closeMenu);
  }

  // Close on escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
  });
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
    <div style="display:flex;flex-direction:column;align-items:center;padding:52px 20px;gap:18px;font-family:'Outfit',sans-serif;background:white;border-radius:16px;box-shadow:0 8px 32px rgba(13,31,53,.1);">
      <div style="position:relative;width:80px;height:80px;">
        <div style="position:absolute;inset:0;border-radius:50%;border:4px solid #f0f4f8;"></div>
        <div style="position:absolute;inset:0;border-radius:50%;border:4px solid transparent;border-top-color:#e8820c;animation:zcSpin .85s linear infinite;"></div>
        <div style="position:absolute;inset:10px;border-radius:50%;background:linear-gradient(135deg,#0d1f35,#1a3a5c);display:flex;align-items:center;justify-content:center;">
          <i class="fa-solid fa-satellite-dish" style="color:#e8820c;font-size:18px;"></i></div></div>
      <div style="text-align:center;">
        <div style="font-weight:800;color:#0d1f35;font-size:1rem;">Locating your shipment...</div>
        <div style="font-size:.85rem;color:#64748b;margin-top:6px;">Searching for <strong style="color:#e8820c;">\${input}</strong></div>
      </div>
      <div style="display:flex;gap:6px;">
        <div style="width:8px;height:8px;border-radius:50%;background:#e8820c;animation:zcBounce .6s ease-in-out infinite;"></div>
        <div style="width:8px;height:8px;border-radius:50%;background:#e8820c;animation:zcBounce .6s ease-in-out .15s infinite;"></div>
        <div style="width:8px;height:8px;border-radius:50%;background:#e8820c;animation:zcBounce .6s ease-in-out .3s infinite;"></div>
      </div>
    </div>`;

  if (!document.getElementById('zcSpinStyle')) {
    const st = document.createElement('style'); st.id = 'zcSpinStyle';
    st.textContent = '@keyframes zcSpin{to{transform:rotate(360deg)}} @keyframes zcBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}'; document.head.appendChild(st);
  }

  try {
    const res = await fetch(`/api/shipments/track/${encodeURIComponent(input)}`);
    if (btn) { btn.disabled = false; btn.innerHTML = 'Track Now'; }
    result.style.cssText = '';

    if (!res.ok) {
      result.className = '';
      result.innerHTML = `<div style="background:white;border-radius:16px;padding:40px 24px;text-align:center;box-shadow:0 8px 32px rgba(13,31,53,.1);">
        <div style="width:64px;height:64px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
          <i class="fa-solid fa-circle-xmark" style="color:#ef4444;font-size:1.8rem;"></i></div>
        <h3 style="color:#0d1f35;font-size:1.1rem;margin-bottom:8px;font-family:'Outfit',sans-serif;">Shipment Not Found</h3>
        <p style="color:#64748b;font-size:.9rem;margin-bottom:20px;">No results for <strong style="color:#e8820c;">\${input}</strong>.<br>Please check your tracking number and try again.</p>
        <a href="contact.html" style="display:inline-flex;align-items:center;gap:8px;background:#0d1f35;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:.85rem;">
          <i class="fa-solid fa-headset"></i> Contact Support</a></div>`;
      const ms = document.getElementById('trackMapSection');
      if (ms) ms.style.display = 'none';
      return;
    }

    const s = await res.json();
    renderTrackingResult(s, result);
    showRouteMap(s.origin, s.dest, s.location || s.origin, s.status);
  } catch (err) {
    if (btn) { btn.disabled = false; btn.innerHTML = 'Track Now'; }
    result.className = '';
    result.innerHTML = `<div style="background:white;border-radius:16px;padding:40px 24px;text-align:center;box-shadow:0 8px 32px rgba(13,31,53,.1);">
      <div style="width:64px;height:64px;background:#fff7ed;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
        <i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b;font-size:1.8rem;"></i></div>
      <h3 style="color:#0d1f35;font-size:1.1rem;margin-bottom:8px;font-family:'Outfit',sans-serif;">Service Unavailable</h3>
      <p style="color:#64748b;font-size:.9rem;margin-bottom:20px;">Could not reach the tracking service. Please try again.</p>
      <button onclick="trackShipment()" style="display:inline-flex;align-items:center;gap:8px;background:#e8820c;color:white;padding:10px 20px;border-radius:8px;border:none;cursor:pointer;font-weight:700;font-size:.85rem;font-family:'Outfit',sans-serif;">
        <i class="fa-solid fa-rotate-right"></i> Try Again</button></div>`;
  }
}

function renderTrackingResult(s, result) {

  // ── Inject animations once ────────────────────────────────────────────────
  if (!document.getElementById('zcTrackStyles')) {
    var st = document.createElement('style');
    st.id = 'zcTrackStyles';
    st.textContent = [
      '@keyframes zcFadeUp   { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }',
      '@keyframes zcSlideIn  { from { opacity:0; transform:translateX(-18px); } to { opacity:1; transform:translateX(0); } }',
      '@keyframes zcPop      { 0%{transform:scale(.7);opacity:0} 70%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }',
      '@keyframes zcPulse    { 0%,100%{box-shadow:0 0 0 0 rgba(232,130,12,.45)} 50%{box-shadow:0 0 0 8px rgba(232,130,12,0)} }',
      '@keyframes zcBarFill  { from{width:0} to{width:var(--w)} }',
      '@keyframes zcTruckRun { 0%{transform:translateX(-6px)} 50%{transform:translateX(4px)} 100%{transform:translateX(-6px)} }',
      '@keyframes zcPlaneFly { 0%{transform:translateX(-4px) translateY(2px)} 50%{transform:translateX(4px) translateY(-2px)} 100%{transform:translateX(-4px) translateY(2px)} }',
      '@keyframes zcBlink    { 0%,100%{opacity:1} 50%{opacity:.35} }',
      '@keyframes zcRowIn    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }',
      '.zc-fadein  { animation: zcFadeUp  .5s ease both; }',
      '.zc-slidein { animation: zcSlideIn .4s ease both; }',
      '.zc-pop     { animation: zcPop     .45s cubic-bezier(.34,1.56,.64,1) both; }',
    ].join('');
    document.head.appendChild(st);
  }

  // ── Status config ─────────────────────────────────────────────────────────
  var statusMap = {
    'Pending':          { bg:'#fff8e1', color:'#92610a', icon:'fa-hourglass-half',          bar:'#f59e0b', pulse:false },
    'In Transit':       { bg:'#e0f2fe', color:'#075985', icon:'fa-paper-plane',             bar:'#0ea5e9', pulse:false },
    'Out for Delivery': { bg:'#dcfce7', color:'#14532d', icon:'fa-truck-fast',              bar:'#22c55e', pulse:true  },
    'Delivered':        { bg:'#d1fae5', color:'#065f46', icon:'fa-circle-check',            bar:'#10b981', pulse:false },
    'On Hold':          { bg:'#fee2e2', color:'#7f1d1d', icon:'fa-hand',                   bar:'#ef4444', pulse:false }
  };
  var sc = statusMap[s.status] || { bg:'#fff8e1', color:'#92610a', icon:'fa-hourglass-half', bar:'#f59e0b', pulse:false };

  // ── Step config — realistic logistics icons ───────────────────────────────
  var steps      = ['Pending', 'In Transit', 'Out for Delivery', 'Delivered'];
  var stepLabels = ['Order Placed', 'In Transit', 'Out for Delivery', 'Delivered'];
  var stepIcons  = ['fa-file-circle-check', 'fa-plane-up', 'fa-truck-fast', 'fa-house-circle-check'];
  var stepAnims  = ['', 'zcPlaneFly', 'zcTruckRun', ''];
  var curIdx     = s.status === 'On Hold' ? -1 : steps.indexOf(s.status);

  // ── Progress steps HTML ───────────────────────────────────────────────────
  var stepsHTML = '';
  for (var i = 0; i < steps.length; i++) {
    var done   = curIdx >= 0 && i <= curIdx;
    var active = i === curIdx;
    var lineW  = (curIdx >= 0 && i < curIdx) ? '100%' : '0%';
    var lineHTML = '';
    if (i < steps.length - 1) {
      lineHTML = '<div style="position:absolute;top:22px;left:50%;width:100%;height:3px;background:#e5e7eb;z-index:0;">'
               + '<div style="height:100%;width:' + lineW + ';background:linear-gradient(90deg,#27ae60,#10b981);border-radius:2px;transition:width .8s ease;"></div>'
               + '</div>';
    }
    var outerBg  = done ? (active ? 'linear-gradient(135deg,#e8820c,#f59e0b)' : 'linear-gradient(135deg,#27ae60,#10b981)') : '#f1f5f9';
    var iconCol  = done ? 'white' : '#cbd5e1';
    var ringStyle = active ? 'outline:3px solid rgba(232,130,12,.3);outline-offset:3px;' : '';
    var animStyle = (active && stepAnims[i]) ? 'animation:' + stepAnims[i] + ' 1.6s ease-in-out infinite;' : '';
    var pulseStyle = active ? 'animation:zcPulse 1.8s ease-in-out infinite;' : '';
    var delay = 'animation-delay:' + (i * 0.1) + 's;';
    stepsHTML += '<div class="zc-pop" style="display:flex;flex-direction:column;align-items:center;flex:1;position:relative;z-index:1;' + delay + '">'
              + lineHTML
              + '<div style="width:44px;height:44px;border-radius:50%;z-index:1;background:' + outerBg + ';display:flex;align-items:center;justify-content:center;' + ringStyle + pulseStyle + '">'
              + '<i class="fa-solid ' + stepIcons[i] + '" style="font-size:16px;color:' + iconCol + ';' + animStyle + '"></i>'
              + '</div>'
              + '<div style="font-size:.6rem;text-align:center;margin-top:9px;line-height:1.4;max-width:66px;'
              + 'color:' + (active ? '#0d1f35' : (done ? '#374151' : '#94a3b8')) + ';'
              + 'font-weight:' + (active ? '700' : (done ? '600' : '400')) + ';">'
              + stepLabels[i] + '</div>'
              + '</div>';
  }

  // ── Timeline ──────────────────────────────────────────────────────────────
  var rawTimeline = s.timeline || [];
  var dedupedTimeline = rawTimeline.filter(function(t, i) {
    if (i === 0) return true;
    var prev = rawTimeline[i - 1];
    return !(t.status === prev.status && Math.abs(new Date(t.timestamp) - new Date(prev.timestamp)) < 60000);
  });

  var tlIconMap = {
    'Pending':          { dot:'#f59e0b', icon:'fa-hourglass-half',    label:'Order received and pending dispatch' },
    'In Transit':       { dot:'#0ea5e9', icon:'fa-paper-plane',        label:'Shipment picked up and in transit'   },
    'Out for Delivery': { dot:'#22c55e', icon:'fa-truck-fast',         label:'Out for final delivery'              },
    'Delivered':        { dot:'#10b981', icon:'fa-house-circle-check', label:'Successfully delivered'              },
    'On Hold':          { dot:'#ef4444', icon:'fa-hand',               label:'Shipment placed on hold'             }
  };

  var reversed = dedupedTimeline.slice().reverse();
  var tlItems  = '';
  for (var j = 0; j < reversed.length; j++) {
    var t       = reversed[j];
    var tsc     = tlIconMap[t.status] || { dot:'#e8820c', icon:'fa-circle-dot', label:'' };
    var isFirst = j === 0;
    var isLast  = j === reversed.length - 1;
    var dotBg      = isFirst ? tsc.dot : '#f8fafc';
    var dotBorder  = isFirst ? tsc.dot : '#e2e8f0';
    var dotIconCol = isFirst ? 'white'  : '#94a3b8';
    var textCol    = isFirst ? '#0d1f35' : '#475569';
    var connector  = isLast ? '' : '<div style="width:2px;min-height:20px;background:linear-gradient(to bottom,#e2e8f0,#f1f5f9);margin:2px 0;flex:1;"></div>';
    var locHTML    = t.location ? '<div style="font-size:.73rem;color:#64748b;margin-top:3px;display:flex;align-items:center;gap:4px;"><i class="fa-solid fa-location-dot" style="font-size:9px;color:#e8820c;"></i>' + t.location + '</div>' : '';
    var noteHTML   = t.note     ? '<div style="font-size:.71rem;color:#94a3b8;margin-top:3px;font-style:italic;">' + t.note + '</div>' : '';
    var dateStr    = new Date(t.timestamp).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'});
    var timeStr    = new Date(t.timestamp).toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'});
    var rowDelay   = 'animation-delay:' + (j * 0.08) + 's;';
    tlItems += '<div class="zc-slidein" style="display:flex;gap:14px;align-items:flex-start;' + rowDelay + '">'
             + '<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:36px;">'
             + '<div style="width:36px;height:36px;border-radius:50%;background:' + dotBg + ';border:2px solid ' + dotBorder + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
             + '<i class="fa-solid ' + tsc.icon + '" style="font-size:13px;color:' + dotIconCol + ';"></i>'
             + '</div>' + connector + '</div>'
             + '<div style="padding-bottom:' + (isLast ? '0' : '18px') + ';flex:1;min-width:0;">'
             + '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:4px;">'
             + '<div style="font-size:.84rem;font-weight:700;color:' + textCol + ';">' + t.status + '</div>'
             + '<div style="font-size:.68rem;color:#94a3b8;text-align:right;">' + dateStr + ' &bull; ' + timeStr + '</div>'
             + '</div>'
             + locHTML + noteHTML
             + '</div></div>';
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  var date = s.date || new Date(s.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});
  function fmt(v) { return v ? parseFloat(v).toLocaleString() : '\u2014'; }

  function cell(label, icon, val, rightSide) {
    var border = rightSide ? 'border-left:1px solid #f1f5f9;' : '';
    return '<div style="flex:1;min-width:120px;padding:14px 18px;' + border + '">'
         + '<div style="display:flex;align-items:center;gap:5px;font-size:.58rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px;font-weight:600;">'
         + '<i class="fa-solid ' + icon + '" style="color:#e8820c;font-size:11px;"></i>' + label
         + '</div>'
         + '<div style="font-size:.9rem;font-weight:700;color:#0d1f35;">' + val + '</div>'
         + '</div>';
  }

  // Contact chips
  function chip(icon, val) {
    return '<div style="display:flex;align-items:center;gap:6px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:5px 10px;font-size:.72rem;color:#475569;margin-top:6px;width:100%;box-sizing:border-box;min-width:0;overflow:hidden;">'
         + '<i class="fa-solid ' + icon + '" style="color:#e8820c;font-size:9px;flex-shrink:0;"></i>'
         + '<span style="word-break:break-all;min-width:0;flex:1;">' + val + '</span>'
         + '</div>';
  }
  var sPhoneHTML = s.sPhone ? chip('fa-phone', s.sPhone) : '';
  var sEmailHTML = s.sEmail ? chip('fa-envelope', s.sEmail) : '';
  var rPhoneHTML = s.rPhone ? chip('fa-phone', s.rPhone) : '';
  var rEmailHTML = s.rEmail ? chip('fa-envelope', s.rEmail) : '';

  // On Hold banner
  var onHoldAlert = s.status === 'On Hold'
    ? '<div style="margin-top:14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:10px;font-size:.82rem;color:#991b1b;font-weight:600;">'
    + '<div style="width:32px;height:32px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
    + '<i class="fa-solid fa-hand" style="color:#ef4444;"></i></div>'
    + '<div><div>Shipment on hold</div><div style="font-weight:400;font-size:.76rem;color:#b91c1c;margin-top:2px;">Please contact our support team for assistance.</div></div>'
    + '</div>'
    : '';

  // Live location strip
  var locStrip = s.location
    ? '<div style="padding:11px 22px;background:linear-gradient(90deg,#fffbf0,#fff);border-bottom:1px solid #fde68a;display:flex;align-items:center;gap:10px;">'
    + '<div style="width:28px;height:28px;border-radius:50%;background:#fef3c7;display:flex;align-items:center;justify-content:center;flex-shrink:0;animation:zcBlink 2s ease-in-out infinite;">'
    + '<i class="fa-solid fa-location-crosshairs" style="color:#d97706;font-size:12px;"></i></div>'
    + '<div><div style="font-size:.6rem;color:#92400e;font-weight:600;text-transform:uppercase;letter-spacing:.6px;">Live Location</div>'
    + '<div style="font-size:.82rem;font-weight:700;color:#0d1f35;">' + s.location + '</div></div>'
    + '</div>'
    : '';

  // Timeline section
  var tlSection = tlItems
    ? '<div style="padding:20px 22px;border-bottom:1px solid #f1f5f9;background:white;">'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:18px;">'
    + '<div style="width:28px;height:28px;border-radius:8px;background:#fff7ed;display:flex;align-items:center;justify-content:center;">'
    + '<i class="fa-solid fa-list-check" style="color:#e8820c;font-size:13px;"></i></div>'
    + '<div style="font-size:.7rem;color:#0d1f35;font-weight:700;text-transform:uppercase;letter-spacing:.8px;">Tracking History</div>'
    + '</div>' + tlItems + '</div>'
    : '';

  var lastUpdated = new Date().toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'});
  var statusPulse = sc.pulse ? 'animation:zcBlink 1.5s ease-in-out infinite;' : '';

  // ── Final render ──────────────────────────────────────────────────────────
  result.className = 'track-result success';
  result.innerHTML =
    '<div class="zc-fadein" style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(13,31,53,.18);font-family:\'Outfit\',sans-serif;max-width:700px;margin:0 auto;">'

    // gradient top bar
    + '<div style="height:5px;background:linear-gradient(90deg,' + sc.bar + ',' + sc.bar + '99);"></div>'

    // ── HEADER ──
    + '<div style="background:linear-gradient(135deg,#0d1f35 70%,#1a3a5c);padding:22px 24px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;">'
    + '<div>'
    + '<div style="font-size:.58rem;color:#4a6a88;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;font-weight:600;">Tracking Number</div>'
    + '<div style="font-size:1.2rem;font-weight:800;color:white;letter-spacing:2px;font-family:monospace;">' + s.tracking + '</div>'
    + '<div style="font-size:.72rem;color:#4a6a88;margin-top:6px;display:flex;align-items:center;gap:5px;">'
    + '<i class="fa-regular fa-calendar-days" style="font-size:10px;"></i> Created ' + date + '</div>'
    + '</div>'
    + '<div style="background:' + sc.bg + ';color:' + sc.color + ';padding:10px 18px;border-radius:30px;font-weight:700;font-size:.82rem;display:flex;align-items:center;gap:8px;white-space:nowrap;' + statusPulse + '">'
    + '<i class="fa-solid ' + sc.icon + '"></i> ' + s.status
    + '</div></div>'

    // ── PROGRESS ──
    + '<div style="padding:24px 22px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
    + '<div style="font-size:.6rem;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Shipment Progress</div>'
    + '<div style="font-size:.75rem;font-weight:700;color:' + sc.bar + ';">' + (s.status === 'Delivered' ? '100% Delivered' : s.status === 'On Hold' ? 'On Hold' : curIdx >= 0 ? Math.round(((curIdx + 1) / steps.length) * 100) + '% Complete' : 'Pending') + '</div>'
    + '</div>'
    + '<div style="background:#e5e7eb;border-radius:50px;height:6px;margin-bottom:20px;overflow:hidden;">'
    + '<div style="height:100%;border-radius:50px;background:linear-gradient(90deg,' + sc.bar + ',#f59e0b);width:' + (s.status === 'Delivered' ? 100 : s.status === 'On Hold' ? 20 : curIdx >= 0 ? Math.round(((curIdx + 1) / steps.length) * 100) : 5) + '%;transition:width 1.2s ease;"></div>'
    + '</div>'
    + '<div style="display:flex;align-items:flex-start;">' + stepsHTML + '</div>'
    + onHoldAlert
    + '</div>'

    // ── ROUTE ──
    + '<div class="zc-fadein" style="padding:16px 20px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;gap:10px;background:white;animation-delay:.15s;">'
    + '<div style="flex:1;min-width:0;">'
    + '<div style="font-size:.55rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px;font-weight:600;">Origin</div>'
    + '<div style="display:flex;align-items:center;gap:6px;">'
    + '<div style="width:28px;height:28px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
    + '<i class="fa-solid fa-warehouse" style="color:#16a34a;font-size:11px;"></i></div>'
    + '<div style="font-size:.88rem;font-weight:700;color:#0d1f35;word-break:break-word;line-height:1.3;">' + s.origin + '</div>'
    + '</div></div>'

    + '<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;padding:0 4px;">'
    + '<i class="fa-solid fa-angles-right" style="color:#e8820c;font-size:.9rem;"></i>'
    + '</div>'

    + '<div style="flex:1;min-width:0;text-align:right;">'
    + '<div style="font-size:.55rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px;font-weight:600;">Destination</div>'
    + '<div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;">'
    + '<div style="font-size:.88rem;font-weight:700;color:#0d1f35;word-break:break-word;line-height:1.3;min-width:0;flex:1;">' + s.dest + '</div>'
    + '<div style="width:28px;height:28px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
    + '<i class="fa-solid fa-flag-checkered" style="color:#ef4444;font-size:11px;"></i></div>'
    + '</div></div></div>'

    // live location
    + locStrip

    // ── SENDER / RECIPIENT ──
    + '<div class="zc-fadein" style="display:flex;flex-wrap:wrap;border-bottom:1px solid #f1f5f9;animation-delay:.2s;">'
    + '<div style="flex:1;min-width:0;width:50%;padding:18px 20px;border-right:1px solid #f1f5f9;overflow:hidden;box-sizing:border-box;">'
    + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">'
    + '<div style="width:26px;height:26px;border-radius:8px;background:#f0f9ff;display:flex;align-items:center;justify-content:center;">'
    + '<i class="fa-solid fa-user-tie" style="color:#0ea5e9;font-size:11px;"></i></div>'
    + '<div style="font-size:.6rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;font-weight:600;">Sender</div>'
    + '</div>'
    + '<div style="font-weight:700;color:#0d1f35;font-size:.9rem;word-break:break-word;">' + (s.sName || '&mdash;') + '</div>'
    + sPhoneHTML + sEmailHTML
    + '</div>'
    + '<div style="flex:1;min-width:0;width:50%;padding:18px 20px;overflow:hidden;box-sizing:border-box;">'
    + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">'
    + '<div style="width:26px;height:26px;border-radius:8px;background:#f0fdf4;display:flex;align-items:center;justify-content:center;">'
    + '<i class="fa-solid fa-user-check" style="color:#16a34a;font-size:11px;"></i></div>'
    + '<div style="font-size:.6rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;font-weight:600;">Recipient</div>'
    + '</div>'
    + '<div style="font-weight:700;color:#0d1f35;font-size:.9rem;word-break:break-word;">' + (s.rName || '&mdash;') + '</div>'
    + rPhoneHTML + rEmailHTML
    + '</div></div>'

    // ── SHIPMENT DETAILS ──
    + '<div class="zc-fadein" style="border-bottom:1px solid #f1f5f9;animation-delay:.25s;">'
    + '<div style="padding:14px 24px 0;display:flex;align-items:center;gap:7px;">'
    + '<div style="width:26px;height:26px;border-radius:8px;background:#fff7ed;display:flex;align-items:center;justify-content:center;">'
    + '<i class="fa-solid fa-box-open" style="color:#e8820c;font-size:11px;"></i></div>'
    + '<div style="font-size:.6rem;color:#0d1f35;text-transform:uppercase;letter-spacing:.8px;font-weight:700;">Shipment Details</div>'
    + '</div>'
    + '<div style="display:flex;flex-wrap:wrap;">'
    + cell('Service',       'fa-shipping-fast', s.service || '&mdash;', false)
    + cell('Est. Delivery', 'fa-calendar-check', s.eta    || '&mdash;', true)
    + '</div>'
    + '<div style="display:flex;flex-wrap:wrap;border-top:1px solid #f1f5f9;">'
    + cell('Package Weight','fa-scale-balanced', s.weight ? fmt(s.weight) + ' kg' : '&mdash;', false)
    + cell('Shipment Type', 'fa-tags',           s.service || '&mdash;',                        true)
    + '</div>'
    + '</div>'

    // timeline
    + tlSection

    // ── FOOTER ──
    + '<div style="padding:14px 24px;background:#f8fafc;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;border-top:1px solid #f1f5f9;">'
    + '<div style="display:flex;align-items:center;gap:8px;">'
    + '<div style="width:28px;height:28px;border-radius:8px;background:#0d1f35;display:flex;align-items:center;justify-content:center;">'
    + '<i class="fa-solid fa-bolt" style="color:#e8820c;font-size:12px;"></i></div>'
    + '<div><div style="font-size:.78rem;font-weight:800;color:#0d1f35;">ZipCargo</div>'
    + '<div style="font-size:.6rem;color:#94a3b8;">Global Logistics</div></div>'
    + '</div>'
    + '<div style="font-size:.67rem;color:#cbd5e1;display:flex;align-items:center;gap:4px;">'
    + '<i class="fa-regular fa-clock" style="font-size:10px;"></i> Updated ' + lastUpdated
    + '</div>'
    + '</div>'
    + '</div>';

  // ── Animate rows in after render ──────────────────────────────────────────
  setTimeout(function() {
    var rows = result.querySelectorAll('.zc-fadein, .zc-pop, .zc-slidein');
    rows.forEach(function(el) { el.style.animationPlayState = 'running'; });
  }, 10);
}


document.getElementById('trackInput')?.addEventListener('keypress', e => {
  if (e.key === 'Enter') trackShipment();
});

// ===== ROUTE MAP =====
function showRouteMap(origin, dest, currentLocation, status) {
  const ms = document.getElementById('trackMapSection'); if (!ms) return;
  ms.style.display = 'block';
  ms.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  document.getElementById('trackMapStatus').textContent = 'Locating cities…';
  Promise.all([geocode(origin), geocode(dest), geocode(currentLocation)])
    .then(([o, d, c]) => {
      if (!o || !d) { document.getElementById('trackMapStatus').textContent = 'Could not locate cities.'; return; }
      initRouteMap(o, d, c || o, origin, dest, currentLocation, status);
    })
    .catch(() => { document.getElementById('trackMapStatus').textContent = 'Map could not be loaded.'; });
}

function geocode(p) {
  if (!p) return Promise.resolve(null);

  // Expand common US state abbreviations so geocoder finds the right place
  const stateMap = {
    'AL':'Alabama','AK':'Alaska','AZ':'Arizona','AR':'Arkansas','CA':'California',
    'CO':'Colorado','CT':'Connecticut','DE':'Delaware','FL':'Florida','GA':'Georgia',
    'HI':'Hawaii','ID':'Idaho','IL':'Illinois','IN':'Indiana','IA':'Iowa',
    'KS':'Kansas','KY':'Kentucky','LA':'Louisiana','ME':'Maine','MD':'Maryland',
    'MA':'Massachusetts','MI':'Michigan','MN':'Minnesota','MS':'Mississippi','MO':'Missouri',
    'MT':'Montana','NE':'Nebraska','NV':'Nevada','NH':'New Hampshire','NJ':'New Jersey',
    'NM':'New Mexico','NY':'New York','NC':'North Carolina','ND':'North Dakota','OH':'Ohio',
    'OK':'Oklahoma','OR':'Oregon','PA':'Pennsylvania','RI':'Rhode Island','SC':'South Carolina',
    'SD':'South Dakota','TN':'Tennessee','TX':'Texas','UT':'Utah','VT':'Vermont',
    'VA':'Virginia','WA':'Washington','WV':'West Virginia','WI':'Wisconsin','WY':'Wyoming',
    'DC':'Washington DC'
  };

  // Replace state abbreviations: "Madison WI" → "Madison, Wisconsin, USA"
  let q = p.trim();
  q = q.replace(/([A-Z]{2})/g, (match) => stateMap[match] ? stateMap[match] : match);

  // If it looks like a US location (has a known state name), append USA for precision
  const usStates = Object.values(stateMap);
  const hasUSState = usStates.some(s => q.toLowerCase().includes(s.toLowerCase()));
  if (hasUSState && !q.toLowerCase().includes('usa') && !q.toLowerCase().includes('united states')) {
    q = q + ', USA';
  }

  return fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=1`,
    { headers: { 'Accept-Language': 'en' } }
  )
    .then(r => r.json())
    .then(d => d && d.length ? { lat: +d[0].lat, lng: +d[0].lon } : null)
    .catch(() => null);
}

// Great-circle arc between two points (works for any distance, including transoceanic)
function greatCircleArc(oC, dC, steps) {
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;
  const pts = [];
  const lat1 = toRad(oC.lat), lon1 = toRad(oC.lng);
  const lat2 = toRad(dC.lat), lon2 = toRad(dC.lng);
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const d = 2 * Math.asin(Math.sqrt(
      Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon2 - lon1) / 2), 2)
    ));
    if (d === 0) { pts.push([oC.lat, oC.lng]); continue; }
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    pts.push([toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), toDeg(Math.atan2(y, x))]);
  }
  return pts;
}

// Haversine distance in km
function haversineKm(a, b) {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lng - a.lng);
  const h = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

async function getBestRoute(oC, dC) {
  const distKm = haversineKm(oC, dC);
  // For short distances (< 2000 km) try OSRM road routing first
  if (distKm < 2000) {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${oC.lng},${oC.lat};${dC.lng},${dC.lat}?overview=full&geometries=geojson`;
      const data = await fetch(url).then(r => r.json());
      if (data.routes && data.routes[0]) {
        return { pts: data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]), type: 'road' };
      }
    } catch {}
  }
  // For long/international distances use great-circle arc
  const steps = Math.max(80, Math.floor(distKm / 50));
  return { pts: greatCircleArc(oC, dC, steps), type: 'arc' };
}

function initRouteMap(oC, dC, cC, oN, dN, cN, status) {
  const mapEl = document.getElementById('trackMap'); if (!mapEl) return;
  if (leafletMap) { leafletMap.remove(); leafletMap = null; }

  if (!window.L) {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = () => buildMap(oC, dC, cC, oN, dN, cN, status);
    document.head.appendChild(s);
  } else {
    buildMap(oC, dC, cC, oN, dN, cN, status);
  }
}

async function buildMap(oC, dC, cC, oN, dN, cN, status) {
  leafletMap = L.map('trackMap', { zoomControl: true, attributionControl: true });

  // Clean professional map tiles — OpenStreetMap Voyager (free, no API key, shows everything)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
    subdomains: ['a','b','c','d'],
    maxZoom: 19,
  }).addTo(leafletMap);

  // ── Pulse animation ──
  if (!document.getElementById('mapPulseStyle')) {
    const st = document.createElement('style'); st.id = 'mapPulseStyle';
    st.textContent = '@keyframes mapPulse{0%,100%{box-shadow:0 0 0 0 rgba(232,130,12,.7)}50%{box-shadow:0 0 0 12px rgba(232,130,12,0)}}';
    document.head.appendChild(st);
  }

  // ── Markers ──
  const mkrPin = (color, label) => L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
      <div style="background:${color};width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,.7);"></div>
      <div style="background:${color};color:white;font-size:9px;font-weight:800;padding:2px 7px;border-radius:4px;white-space:nowrap;font-family:'Outfit',sans-serif;letter-spacing:.5px;box-shadow:0 2px 8px rgba(0,0,0,.5);">${label}</div>
    </div>`,
    className: '', iconSize: [70, 40], iconAnchor: [11, 11]
  });

  const statusConfig = {
    'Delivered':        { icon: 'fa-circle-check',  color: '#16a34a', pulse: false },
    'In Transit':       { icon: 'fa-plane',          color: '#2563eb', pulse: true  },
    'Out for Delivery': { icon: 'fa-truck-fast',     color: '#7c3aed', pulse: true  },
    'Pending':          { icon: 'fa-clock',          color: '#f59e0b', pulse: false },
    'On Hold':          { icon: 'fa-circle-pause',   color: '#ef4444', pulse: false },
  };
  const sc = statusConfig[status] || { icon: 'fa-box', color: '#64748b', pulse: false };
  const pulseStyle = sc.pulse ? 'animation:mapPulse 1.6s ease-in-out infinite;' : '';

  const pkgIco = L.divIcon({
    html: `<div style="background:#e8820c;width:40px;height:40px;border-radius:50%;border:3px solid white;box-shadow:0 3px 16px rgba(232,130,12,.8);display:flex;align-items:center;justify-content:center;font-size:17px;${pulseStyle}"><i class='fa-solid ${sc.icon}' style='color:${sc.color};margin-right:5px;'></i></div>`,
    className: '', iconSize: [40, 40], iconAnchor: [20, 20]
  });

  L.marker([oC.lat, oC.lng], { icon: mkrPin('#22c55e', 'ORIGIN') })
    .addTo(leafletMap)
    .bindPopup(`<div style="font-family:'Outfit',sans-serif;font-weight:700;color:white;"> ${oN}</div>`);
  L.marker([dC.lat, dC.lng], { icon: mkrPin('#ef4444', 'DEST') })
    .addTo(leafletMap)
    .bindPopup(`<div style="font-family:'Outfit',sans-serif;font-weight:700;color:white;"> ${dN}</div>`);

  // ── Route ──
  document.getElementById('trackMapStatus').textContent = 'Calculating route…';
  const { pts, type } = await getBestRoute(oC, dC);

  // Progress ratio: how far along the route the package is
  const progressRatio = { 'Pending': 0.05, 'In Transit': 0.45, 'Out for Delivery': 0.85, 'Delivered': 1.0, 'On Hold': 0.25 }[status] ?? 0.1;
  const splitIdx = Math.min(Math.floor(progressRatio * (pts.length - 1)), pts.length - 2);

  // Full route dashed — remaining portion
  const remainingPts = pts.slice(splitIdx);
  if (remainingPts.length > 1) {
    L.polyline(remainingPts, { color: '#4a6a88', weight: 2, opacity: 0.6, dashArray: '8, 10' }).addTo(leafletMap);
  }

  // Travelled portion — glowing orange line
  const travelledPts = pts.slice(0, splitIdx + 1);
  if (travelledPts.length > 1) {
    L.polyline(travelledPts, { color: '#e8820c', weight: 10, opacity: 0.15 }).addTo(leafletMap); // glow
    L.polyline(travelledPts, { color: '#e8820c', weight: 3,  opacity: 1.0  }).addTo(leafletMap); // line
  }

  // Package position
  const same = Math.abs(cC.lat - oC.lat) < 0.05 && Math.abs(cC.lng - oC.lng) < 0.05;
  const pkgPt = same ? pts[splitIdx] : [cC.lat, cC.lng];

  L.marker(pkgPt, { icon: pkgIco, zIndexOffset: 1000 })
    .addTo(leafletMap)
    .bindPopup(`<div style="font-family:'Outfit',sans-serif;color:white;"><strong> Package</strong><br/>Status: ${status}${!same ? '<br/> ' + cN : ''}</div>`)
    .openPopup();

  // Fit map to all key points with good padding
  const bounds = L.latLngBounds([[oC.lat, oC.lng], [dC.lat, dC.lng], pkgPt]);
  leafletMap.fitBounds(bounds, { padding: [60, 60] });

  const routeType = type === 'road' ? 'Road route' : 'Flight path';
  document.getElementById('trackMapStatus').textContent = `${routeType}: ${oN} → ${dN}`;
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
    // POST to server — saves to DB and sends emails via Brevo (server-side)
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

// ===== SUBSCRIPTION SECTION =====
let selectedPlan = 'basic';
const planPrices = { basic: '$2.99', premium: '$4.99' };

function selectPlan(plan) {
  selectedPlan = plan;
  document.getElementById('subPlan').value = plan;
  document.getElementById('subPriceLabel').textContent = planPrices[plan];

  document.querySelectorAll('.subscribe-plan').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.plan-select-btn').forEach(el => el.classList.remove('active'));

  const card = document.querySelector(`.subscribe-plan[data-plan="${plan}"]`);
  const btn  = card?.querySelector('.plan-select-btn');
  if (card) card.classList.add('selected');
  if (btn)  btn.classList.add('active');

  // Scroll to form
  document.querySelector('.subscribe-form-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function submitSubscription() {
  const tracking = document.getElementById('subTracking').value.trim();
  const name     = document.getElementById('subName').value.trim();
  const email    = document.getElementById('subEmail').value.trim();
  const phone    = document.getElementById('subPhone').value.trim();
  const plan     = document.getElementById('subPlan').value || 'basic';

  const errEl = document.getElementById('subscribeError');
  errEl.style.display = 'none';

  if (!tracking || !name || !email) {
    errEl.textContent = 'Please fill in tracking number, name and email.';
    errEl.style.display = 'flex';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errEl.textContent = 'Please enter a valid email address.';
    errEl.style.display = 'flex';
    return;
  }

  const btn = document.querySelector('.subscribe-submit-btn');
  btn.disabled = true;
  btn.innerHTML = 'Processing… <i class="fa-solid fa-spinner fa-spin"></i>';

  try {
    const res  = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracking, name, email, phone, plan }),
    });
    const data = await res.json();

    if (!res.ok) {
      errEl.textContent = data.error || 'Could not create subscription.';
      errEl.style.display = 'flex';
      return;
    }

    document.getElementById('subscribeForm').style.display = 'none';
    document.getElementById('subscribeSuccessMsg').textContent =
      `Subscription for ${data.tracking} created. Complete payment of ${planPrices[plan]} to activate your alerts.`;
    document.getElementById('subscribeSuccess').style.display = 'flex';

    // TODO: redirect to payment page when provider is ready:
    // if (data.paymentUrl) window.location.href = data.paymentUrl;

  } catch {
    errEl.textContent = 'Network error. Please try again.';
    errEl.style.display = 'flex';
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-lock"></i> Subscribe & Pay <span id="subPriceLabel">${planPrices[plan]}</span>`;
  }
}

// ===== FAQ ACCORDION =====
function toggleFaq(btn) {
  const item   = btn.closest('.faq-item');
  const answer = item.querySelector('.faq-answer');
  const icon   = btn.querySelector('i');
  const isOpen = item.classList.contains('open');

  // Close all others in the same column
  btn.closest('.faq-col').querySelectorAll('.faq-item.open').forEach(el => {
    el.classList.remove('open');
    el.querySelector('.faq-answer').style.maxHeight = '0';
    el.querySelector('i').style.transform = 'rotate(0deg)';
  });

  if (!isOpen) {
    item.classList.add('open');
    answer.style.maxHeight = answer.scrollHeight + 'px';
    icon.style.transform = 'rotate(180deg)';
  }
}

// ===== MULTI-PAGE: Fix navbar on inner pages (always scrolled) =====
(function(){
  var path = window.location.pathname.split('/').pop() || 'index.html';
  var navbar = document.getElementById('navbar');
  // On non-home pages, keep navbar always scrolled (dark bg)
  if (path !== 'index.html' && path !== '') {
    if (navbar) navbar.classList.add('scrolled');
  }
})();

// ===== PAGE TRANSITION — fade out before navigating =====
document.addEventListener('click', function(e) {
  const link = e.target.closest('a');
  if (!link) return;
  const href = link.getAttribute('href');
  // Only handle local .html links, not anchors or external
  if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;
  if (link.target === '_blank') return;
  e.preventDefault();
  document.body.classList.add('page-leaving');
  setTimeout(() => { window.location.href = href; }, 250);
});

// Fix blank page on browser back button — remove fade-out class immediately
window.addEventListener('pageshow', function(e) {
  document.body.classList.remove('page-leaving');
  document.body.style.opacity = '1';
  document.body.style.transform = 'none';
});

// ===== QUOTE WIZARD =====
let qwSelectedService = '';

function selectService(btn) {
  document.querySelectorAll('.qw-service-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  qwSelectedService = btn.dataset.value;
}

function qwNext(step) {
  if (step === 1) {
    if (!qwSelectedService) {
      document.getElementById('qwErr1').style.display = 'block';
      return;
    }
    document.getElementById('qwErr1').style.display = 'none';
    document.getElementById('fservice').value = qwSelectedService;
    qwGoTo(2);
  } else if (step === 2) {
    qwGoTo(3);
  }
}

function qwBack(step) {
  qwGoTo(step - 1);
}

function qwGoTo(step) {
  [1, 2, 3].forEach(n => {
    document.getElementById('qwp' + n)?.classList.toggle('active', n === step);
    const stepEl = document.getElementById('qws' + n);
    if (stepEl) {
      stepEl.classList.toggle('active', n === step);
      stepEl.classList.toggle('done', n < step);
    }
  });
}

async function qwSubmit() {
  const name    = document.getElementById('fname')?.value.trim();
  const email   = document.getElementById('femail')?.value.trim();
  const company = document.getElementById('fcompany')?.value.trim() || '';
  const service = document.getElementById('fservice')?.value || qwSelectedService;
  const phone   = document.getElementById('qwPhone')?.value.trim() || '';
  const origin  = document.getElementById('qwOrigin')?.value.trim() || '';
  const dest    = document.getElementById('qwDest')?.value.trim() || '';
  const cargo   = document.getElementById('qwCargo')?.value || '';
  const weight  = document.getElementById('qwWeight')?.value || '';
  const notes   = document.getElementById('qwNotes')?.value.trim() || '';

  if (!name || !email) {
    document.getElementById('qwErr3').style.display = 'block';
    return;
  }
  document.getElementById('qwErr3').style.display = 'none';

  // Build a rich message string for the DB / email
  const parts = [];
  if (service) parts.push(`Service: ${service}`);
  if (origin)  parts.push(`From: ${origin}`);
  if (dest)    parts.push(`To: ${dest}`);
  if (cargo)   parts.push(`Cargo type: ${cargo}`);
  if (weight)  parts.push(`Weight: ${weight}`);
  if (phone)   parts.push(`Phone: ${phone}`);
  if (notes)   parts.push(`Notes: ${notes}`);
  const message = parts.join('\n');

  document.getElementById('fmessage').value = message;

  const btn = document.getElementById('qwSubmitBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = 'Sending… <i class="fa-solid fa-spinner fa-spin"></i>'; }

  try {
    const res = await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, company, service, message }),
    });
    if (!res.ok) throw new Error('Server error');

    document.getElementById('quoteWizard').style.display = 'none';
    const success = document.getElementById('formSuccess');
    if (success) success.style.display = 'block';
  } catch {
    alert('Could not send your request. Please try again.');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = 'Send Quote Request <i class="fa-solid fa-paper-plane"></i>'; }
  }
}

// Pre-select service if coming from services page
(function() {
  const svc = sessionStorage.getItem('zc_selected_service');
  if (svc) {
    sessionStorage.removeItem('zc_selected_service');
    const btn = document.querySelector(`.qw-service-btn[data-value="${svc}"]`);
    if (btn) selectService(btn);
  }
})();
