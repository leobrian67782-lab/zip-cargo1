// ============================================================
//  ZipCargo AI Chat Widget — Clean Fixed Version
// ============================================================
(function () {
  'use strict';

  // ── Styles ──────────────────────────────────────────────
  const css = `
    #zc-bubble {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      width: 60px !important;
      height: 60px !important;
      border-radius: 50% !important;
      background: linear-gradient(135deg, #e8820c, #cf6a00) !important;
      color: white !important;
      border: none !important;
      cursor: pointer !important;
      z-index: 999999 !important;
      box-shadow: 0 4px 20px rgba(232,130,12,.6) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 1.5rem !important;
      transition: transform .2s !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    #zc-bubble:hover { transform: scale(1.1) !important; }
    #zc-bubble .zc-badge {
      position: absolute;
      top: -4px; right: -4px;
      width: 20px; height: 20px;
      background: #ef4444;
      border-radius: 50%;
      border: 2px solid white;
      font-size: 10px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: sans-serif;
    }
    #zc-box {
      position: fixed !important;
      bottom: 96px !important;
      right: 24px !important;
      width: 340px !important;
      max-width: calc(100vw - 40px) !important;
      height: 480px !important;
      max-height: calc(100vh - 120px) !important;
      background: white !important;
      border-radius: 18px !important;
      box-shadow: 0 8px 40px rgba(0,0,0,.18) !important;
      z-index: 999998 !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      transition: opacity .2s, transform .25s !important;
      transform-origin: bottom right !important;
    }
    #zc-box.zc-hidden {
      opacity: 0 !important;
      transform: scale(0.85) translateY(10px) !important;
      pointer-events: none !important;
    }
    #zc-head {
      background: linear-gradient(135deg, #0d1f35, #1a3a5c);
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    #zc-head .zc-av {
      width: 38px; height: 38px;
      border-radius: 50%;
      background: linear-gradient(135deg,#e8820c,#f59e0b);
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; flex-shrink: 0;
    }
    #zc-head .zc-info { flex: 1; }
    #zc-head .zc-name { color: white; font-weight: 800; font-size: .9rem; font-family:'Outfit',sans-serif; }
    #zc-head .zc-status { color: #7a9ab8; font-size: .7rem; display:flex; align-items:center; gap:4px; margin-top:2px; }
    #zc-head .zc-dot { width:6px; height:6px; border-radius:50%; background:#22c55e; }
    #zc-close-btn {
      background: rgba(255,255,255,.1);
      border: none; color: white;
      width: 28px; height: 28px;
      border-radius: 50%;
      cursor: pointer;
      font-size: .85rem;
      display: flex; align-items:center; justify-content:center;
    }
    #zc-close-btn:hover { background: rgba(255,255,255,.2); }
    #zc-msgs {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: #f8fafc;
    }
    #zc-msgs::-webkit-scrollbar { width: 3px; }
    #zc-msgs::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }
    .zcm { display:flex; gap:8px; align-items:flex-end; }
    .zcm.u { flex-direction:row-reverse; }
    .zcm-av {
      width:26px; height:26px; border-radius:50%;
      background:linear-gradient(135deg,#e8820c,#f59e0b);
      display:flex; align-items:center; justify-content:center;
      font-size:.65rem; color:white; flex-shrink:0; font-weight:800;
    }
    .zcm-av.u { background:linear-gradient(135deg,#0d1f35,#1a3a5c); }
    .zcm-bbl {
      max-width:80%; padding:9px 13px; border-radius:14px;
      font-size:.83rem; line-height:1.55; font-family:'Outfit',sans-serif;
    }
    .zcm-bbl.b { background:white; color:#1e293b; border-bottom-left-radius:3px; box-shadow:0 1px 6px rgba(0,0,0,.07); border:1px solid #f1f5f9; }
    .zcm-bbl.u { background:linear-gradient(135deg,#e8820c,#cf6a00); color:white; border-bottom-right-radius:3px; }
    .zc-dots { display:flex; gap:4px; padding:4px 2px; }
    .zc-dots span { width:6px; height:6px; background:#cbd5e1; border-radius:50%; animation:zcDot .9s ease-in-out infinite; }
    .zc-dots span:nth-child(2){animation-delay:.15s}
    .zc-dots span:nth-child(3){animation-delay:.3s}
    @keyframes zcDot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
    .zc-qrs { padding:8px 12px 4px; display:flex; gap:5px; flex-wrap:wrap; background:#f8fafc; border-top:1px solid #f1f5f9; flex-shrink:0; }
    .zc-qr {
      background:white; border:1px solid #e2e8f0; color:#0d1f35;
      padding:4px 11px; border-radius:20px; font-size:.73rem; font-weight:600;
      cursor:pointer; font-family:'Outfit',sans-serif; transition:all .15s;
    }
    .zc-qr:hover { background:#e8820c; color:white; border-color:#e8820c; }
    #zc-foot {
      padding:10px 12px;
      display:flex; gap:8px; align-items:flex-end;
      background:white; border-top:1px solid #f1f5f9; flex-shrink:0;
    }
    #zc-inp {
      flex:1; border:1.5px solid #e2e8f0; border-radius:10px;
      padding:9px 12px; font-size:.83rem; font-family:'Outfit',sans-serif;
      resize:none; outline:none; max-height:80px; line-height:1.5; color:#1e293b;
    }
    #zc-inp:focus { border-color:#e8820c; }
    #zc-send-btn {
      width:38px; height:38px; border-radius:10px;
      background:linear-gradient(135deg,#e8820c,#cf6a00);
      color:white; border:none; cursor:pointer; font-size:.9rem;
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    #zc-send-btn:hover { opacity:.9; }
    #zc-send-btn:disabled { opacity:.4; cursor:not-allowed; }
    @media(max-width:480px){
      #zc-box { bottom:90px !important; right:12px !important; width:calc(100vw - 24px) !important; }
      #zc-bubble { bottom:20px !important; right:16px !important; }
    }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── DOM ──────────────────────────────────────────────────
  const bubble = document.createElement('button');
  bubble.id = 'zc-bubble';
  bubble.innerHTML = '<i class="fa-solid fa-comment-dots"></i><span class="zc-badge">1</span>';

  const box = document.createElement('div');
  box.id = 'zc-box';
  box.classList.add('zc-hidden');
  box.innerHTML = `
    <div id="zc-head">
      <div class="zc-av"><i class="fa-solid fa-bolt"></i></div>
      <div class="zc-info">
        <div class="zc-name">ZipCargo Assistant</div>
        <div class="zc-status"><span class="zc-dot"></span> Online · replies instantly</div>
      </div>
      <button id="zc-close-btn"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div id="zc-msgs"></div>
    <div class="zc-qrs" id="zc-qrs"></div>
    <div id="zc-foot">
      <textarea id="zc-inp" placeholder="Type your message…" rows="1"></textarea>
      <button id="zc-send-btn"><i class="fa-solid fa-paper-plane"></i></button>
    </div>
  `;

  document.body.appendChild(bubble);
  document.body.appendChild(box);

  // ── State ────────────────────────────────────────────────
  let open = false, busy = false;
  const history = []; // {role, content}

  // ── Toggle ───────────────────────────────────────────────
  function toggle() {
    open = !open;
    box.classList.toggle('zc-hidden', !open);
    const icon = bubble.querySelector('i');
    if (icon) icon.className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-comment-dots';
    const badge = bubble.querySelector('.zc-badge');
    if (badge) badge.remove();
    if (open && history.length === 0) showWelcome();
  }

  // ── Add message to UI ─────────────────────────────────────
  function addMsg(role, text) {
    const wrap = document.createElement('div');
    wrap.className = `zcm ${role === 'user' ? 'u' : ''}`;
    const av = document.createElement('div');
    av.className = `zcm-av ${role === 'user' ? 'u' : ''}`;
    av.innerHTML = role === 'user'
      ? '<i class="fa-solid fa-user" style="font-size:.6rem"></i>'
      : '<i class="fa-solid fa-bolt" style="font-size:.6rem"></i>';
    const bbl = document.createElement('div');
    bbl.className = `zcm-bbl ${role === 'user' ? 'u' : 'b'}`;
    bbl.innerHTML = text
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
      .replace(/\n/g,'<br>');
    wrap.appendChild(av);
    wrap.appendChild(bbl);
    document.getElementById('zc-msgs').appendChild(wrap);
    scroll();
    return wrap;
  }

  function addTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'zcm';
    wrap.innerHTML = `<div class="zcm-av"><i class="fa-solid fa-bolt" style="font-size:.6rem"></i></div><div class="zcm-bbl b"><div class="zc-dots"><span></span><span></span><span></span></div></div>`;
    document.getElementById('zc-msgs').appendChild(wrap);
    scroll();
    return wrap;
  }

  function setQRs(list) {
    const el = document.getElementById('zc-qrs');
    el.innerHTML = '';
    list.forEach(t => {
      const b = document.createElement('button');
      b.className = 'zc-qr'; b.textContent = t;
      b.onclick = () => send(t);
      el.appendChild(b);
    });
  }

  function scroll() {
    const m = document.getElementById('zc-msgs');
    m.scrollTop = m.scrollHeight;
  }

  // ── Welcome ──────────────────────────────────────────────
  function showWelcome() {
    const msg = `👋 **Welcome to ZipCargo!**\n\nI'm your logistics assistant. I can help you:\n• **Track a shipment** — share your tracking number\n• **Learn about our services** — air, sea, road, express\n• **Insurance & payments** — all fully refundable\n• **Get a quote** — we'll respond within 24 hours\n\nHow can I help you today?`;
    history.push({ role: 'assistant', content: msg });
    addMsg('assistant', msg);
    setQRs(['Track my shipment', 'Our services', 'Insurance info', 'Get a quote']);
  }

  // ── System prompt ────────────────────────────────────────
  function systemPrompt() {
    const ctx = (() => { try { return localStorage.getItem('zc_ai_context') || ''; } catch(e) { return ''; } })();
    return `You are the ZipCargo AI Assistant — professional, warm, and knowledgeable. You help customers of ZipCargo, a global freight company serving 150+ countries.

SERVICES: Air Freight, Sea Freight, Road Transport, Warehousing, Customs Clearance, Supply Chain, Express Delivery.
STATS: 99.8% on-time rate, 80,000+ deliveries/month, 15+ years experience, ISO 9001 certified.

INSURANCE & PAYMENTS — always mention when relevant:
- All insurance fees are FULLY REFUNDABLE if no claim is made
- All service payments follow ZipCargo's refund policy
- Encourage customers to insure their cargo — zero risk since they get the fee back if unused

TRACKING: When a customer gives a tracking number (ZC-YYYY-NNNNN), you will receive live shipment data and can explain status clearly.

STYLE: Keep replies short (2-4 sentences). Use line breaks. Be reassuring and solution-focused. Never say "I'm just an AI".

${ctx ? `\nSPECIAL INSTRUCTIONS (highest priority):\n${ctx}` : ''}`;
  }

  // ── Get tracking data ─────────────────────────────────────
  async function getShipment(tn) {
    try {
      const r = await fetch(`/api/shipments/track/${encodeURIComponent(tn.toUpperCase().trim())}`);
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }

  function extractTN(text) {
    const m = text.match(/\b(ZC[-\s]?\d{4}[-\s]?\d{3,6})\b/i);
    return m ? m[1].replace(/\s/g,'-').toUpperCase() : null;
  }

  function formatShipment(s) {
    const tl = (s.timeline||[]).slice(-3).map(t=>`  • ${t.status} — ${t.location||'N/A'}`).join('\n');
    return `\n\n[LIVE SHIPMENT DATA]\nTracking: ${s.tracking}\nStatus: ${s.status}\nFrom: ${s.sName} (${s.origin})\nTo: ${s.rName} (${s.dest})\nLocation: ${s.location||'N/A'}\nETA: ${s.eta||'TBD'}\nTimeline:\n${tl}`;
  }

  // ── Send to AI ───────────────────────────────────────────
  async function callAI(userText) {
    // Check for tracking number
    let extra = '';
    const tn = extractTN(userText);
    if (tn) {
      const data = await getShipment(tn);
      extra = data
        ? formatShipment(data)
        : `\n\n[Tracking number ${tn} not found. Tell the customer to double-check the number or contact support.]`;
    }

    const msgs = history.map(m => ({ role: m.role, content: m.content }));
    if (extra) msgs[msgs.length-1] = { role: 'user', content: userText + extra };

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: systemPrompt(), messages: msgs }),
    });

    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Error');
    return data.reply || '';
  }

  // ── Handle send ──────────────────────────────────────────
  async function send(text) {
    text = (text || document.getElementById('zc-inp').value).trim();
    if (!text || busy) return;

    document.getElementById('zc-inp').value = '';
    document.getElementById('zc-qrs').innerHTML = '';
    resize();

    history.push({ role: 'user', content: text });
    addMsg('user', text);

    busy = true;
    document.getElementById('zc-send-btn').disabled = true;
    const typing = addTyping();

    try {
      const reply = await callAI(text);
      typing.remove();
      history.push({ role: 'assistant', content: reply });
      addMsg('assistant', reply);

      // Smart quick replies
      const low = reply.toLowerCase();
      const qr = [];
      if (low.includes('track')) qr.push('Track another shipment');
      if (low.includes('quot') || low.includes('pric')) qr.push('Get a free quote');
      if (low.includes('insur')) qr.push('More about insurance');
      if (low.includes('contact') || low.includes('team')) qr.push('Contact support');
      if (!qr.length) qr.push('What services do you offer?', 'How does tracking work?');
      setQRs(qr.slice(0,3));

    } catch(e) {
      typing.remove();
      addMsg('assistant', 'I\'m currently unavailable. Please contact us directly:\n\n📧 info@zipcargo.com\n📞 Or visit our **Contact** page for a quick response.');
      setQRs(['Go to Contact page', 'Track my shipment']);
    } finally {
      busy = false;
      document.getElementById('zc-send-btn').disabled = false;
    }
  }

  function resize() {
    const t = document.getElementById('zc-inp');
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 80) + 'px';
  }

  // ── Events ───────────────────────────────────────────────
  bubble.addEventListener('click', toggle);
  document.getElementById('zc-close-btn').addEventListener('click', toggle);
  document.getElementById('zc-send-btn').addEventListener('click', () => send());
  document.getElementById('zc-inp').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  document.getElementById('zc-inp').addEventListener('input', resize);

  // Handle "Go to Contact page" quick reply
  document.getElementById('zc-qrs').addEventListener('click', e => {
    if (e.target.textContent === 'Go to Contact page') window.location.href = 'contact.html';
  });

})();
