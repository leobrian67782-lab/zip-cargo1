// ===== PAGE LOADER =====
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('loader');
    if (loader) { loader.classList.add('hidden'); setTimeout(() => loader.remove(), 700); }
  }, 1500);
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
  const sc = {
    'Pending':          { bg:'#fff3cd', color:'#856404', icon:'fa-clock' },
    'In Transit':       { bg:'#cce5ff', color:'#004085', icon:'fa-plane' },
    'Out for Delivery': { bg:'#d4edda', color:'#155724', icon:'fa-truck' },
    'Delivered':        { bg:'#d4edda', color:'#155724', icon:'fa-circle-check' },
    'On Hold':          { bg:'#f8d7da', color:'#721c24', icon:'fa-triangle-exclamation' },
  }[s.status] || { bg:'#fff3cd', color:'#856404', icon:'fa-clock' };

  const steps      = ['Pending','In Transit','Out for Delivery','Delivered'];
  const stepLabels = ['Order Placed','Picked Up','Out for Delivery','Delivered'];
  const stepIcons  = ['fa-box','fa-plane-departure','fa-truck','fa-circle-check'];
  const curIdx     = steps.indexOf(s.status);

  const stepsHTML = steps.map((step,i) => {
    const done   = i<=curIdx && s.status!=='On Hold';
    const active = i===curIdx && s.status!=='On Hold';
    const lineColor = (i<curIdx && s.status!=='On Hold') ? '#27ae60' : '#ddd';
    return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;position:relative;">
      ${i<steps.length-1?`<div style="position:absolute;top:18px;left:50%;width:100%;height:3px;background:${lineColor};z-index:0;"></div>`:''}
      <div style="width:36px;height:36px;border-radius:50%;background:${done?'#27ae60':'#e0e0e0'};display:flex;align-items:center;justify-content:center;z-index:1;box-shadow:0 2px 8px rgba(0,0,0,.12);">
        <i class="fa-solid ${stepIcons[i]}" style="font-size:14px;color:${done?'white':'#aaa'};"></i></div>
      <div style="font-size:.68rem;text-align:center;margin-top:7px;color:${active?'#0d1f35':'#999'};font-weight:${active?'700':'400'};line-height:1.3;max-width:70px;">${stepLabels[i]}</div></div>`;
  }).join('');

  const tlItems = (s.timeline||[]).slice(-5).reverse().map(t => `
    <div style="display:flex;gap:12px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #f0ede5;">
      <div style="width:8px;height:8px;border-radius:50%;background:#e8820c;margin-top:5px;flex-shrink:0;"></div>
      <div><div style="font-size:.82rem;font-weight:700;color:#0d1f35;">${t.status}</div>
        <div style="font-size:.77rem;color:#888;">${t.location||''} &bull; ${new Date(t.timestamp).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
        ${t.note?`<div style="font-size:.75rem;color:#aaa;margin-top:2px;">${t.note}</div>`:''}</div></div>`).join('');

  const date = s.date || new Date(s.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});

  result.className = 'track-result success';
  result.innerHTML = `
    <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.13);font-family:'Outfit',sans-serif;">
      <div style="background:#0d1f35;padding:22px 28px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div><div style="font-size:.7rem;color:#7a9ab8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Tracking Number</div>
          <div style="font-size:1.25rem;font-weight:800;color:white;letter-spacing:1px;">${s.tracking}</div></div>
        <div style="background:${sc.bg};color:${sc.color};padding:8px 18px;border-radius:30px;font-weight:700;font-size:.88rem;display:flex;align-items:center;gap:7px;">
          <i class="fa-solid ${sc.icon}"></i> ${s.status}</div></div>
      <div style="padding:22px 28px;background:#f9f8f5;border-bottom:1px solid #ebe8df;">
        <div style="font-size:.68rem;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;font-weight:600;">Shipment Progress</div>
        <div style="display:flex;align-items:flex-start;">${stepsHTML}</div></div>
      <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:18px 28px;border-bottom:1px solid #ebe8df;gap:10px;">
        <div><div style="font-size:.68rem;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Origin</div>
          <div style="font-size:1rem;font-weight:700;color:#0d1f35;"><i class="fa-solid fa-circle-dot" style="color:#e8820c;font-size:12px;"></i> ${s.origin}</div></div>
        <div style="text-align:center;"><i class="fa-solid fa-arrow-right" style="color:#e8820c;font-size:1.2rem;"></i></div>
        <div style="text-align:right;"><div style="font-size:.68rem;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Destination</div>
          <div style="font-size:1rem;font-weight:700;color:#0d1f35;">${s.dest} <i class="fa-solid fa-location-dot" style="color:#e8820c;font-size:12px;"></i></div></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #ebe8df;">
        <div style="padding:16px 22px;border-right:1px solid #ebe8df;">
          <div style="font-size:.65rem;color:#999;text-transform:uppercase;margin-bottom:6px;">Sender</div>
          <div style="font-weight:700;color:#0d1f35;">${s.sName||'—'}</div>
          ${s.sPhone?`<div style="font-size:.8rem;color:#777;"><i class="fa-solid fa-phone" style="font-size:10px;"></i> ${s.sPhone}</div>`:''}</div>
        <div style="padding:16px 22px;">
          <div style="font-size:.65rem;color:#999;text-transform:uppercase;margin-bottom:6px;">Recipient</div>
          <div style="font-weight:700;color:#0d1f35;">${s.rName}</div>
          ${s.rPhone?`<div style="font-size:.8rem;color:#777;"><i class="fa-solid fa-phone" style="font-size:10px;"></i> ${s.rPhone}</div>`:''}</div>
        <div style="padding:16px 22px;border-right:1px solid #ebe8df;border-top:1px solid #ebe8df;">
          <div style="font-size:.65rem;color:#999;text-transform:uppercase;margin-bottom:6px;">Service</div>
          <div style="font-weight:700;color:#0d1f35;"><i class="fa-solid fa-box" style="color:#e8820c;font-size:12px;"></i> ${s.service}</div></div>
        <div style="padding:16px 22px;border-top:1px solid #ebe8df;">
          <div style="font-size:.65rem;color:#999;text-transform:uppercase;margin-bottom:6px;">Est. Delivery</div>
          <div style="font-weight:700;color:#0d1f35;"><i class="fa-regular fa-calendar" style="color:#e8820c;font-size:12px;"></i> ${s.eta||'—'}</div></div></div>
      ${tlItems ? `<div style="padding:18px 28px;border-bottom:1px solid #ebe8df;">
        <div style="font-size:.68rem;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;font-weight:600;">Recent Updates</div>
        ${tlItems}</div>` : ''}
      <div style="padding:8px 24px 14px;text-align:center;font-size:.74rem;color:#bbb;">
        <i class="fa-regular fa-clock"></i> ${date} &bull; ZipCargo Logistics</div></div>`;
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
