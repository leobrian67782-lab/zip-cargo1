// ============================================================
//  ZipCargo AI Chat — Powered by Google Gemini (Free)
// ============================================================
(function () {
  'use strict';

  const css = `
    #zc-bubble {
      position: fixed !important;
      bottom: 90px !important;
      right: 20px !important;
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
      bottom: 165px !important;
      right: 20px !important;
      width: 340px !important;
      max-width: calc(100vw - 40px) !important;
      height: 480px !important;
      max-height: calc(100vh - 180px) !important;
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
    .zc-av {
      width: 38px; height: 38px; border-radius: 50%;
      background: linear-gradient(135deg,#e8820c,#f59e0b);
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; flex-shrink: 0;
    }
    .zc-info { flex: 1; }
    .zc-name { color: white; font-weight: 800; font-size: .9rem; font-family:'Outfit',sans-serif; }
    .zc-status { color: #7a9ab8; font-size: .7rem; display:flex; align-items:center; gap:4px; margin-top:2px; }
    .zc-dot { width:6px; height:6px; border-radius:50%; background:#22c55e; animation:zcP 2s infinite; }
    @keyframes zcP{0%,100%{opacity:1}50%{opacity:.4}}
    #zc-close-btn {
      background: rgba(255,255,255,.1); border: none; color: white;
      width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
      font-size: .85rem; display: flex; align-items:center; justify-content:center;
    }
    #zc-close-btn:hover { background: rgba(255,255,255,.2); }
    #zc-msgs {
      flex: 1; overflow-y: auto; padding: 14px;
      display: flex; flex-direction: column; gap: 10px; background: #f8fafc;
    }
    #zc-msgs::-webkit-scrollbar { width: 3px; }
    #zc-msgs::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }
    .zcm { display:flex; gap:8px; align-items:flex-end; animation:zcIn .25s ease both; }
    .zcm.u { flex-direction:row-reverse; }
    @keyframes zcIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .zcm-av {
      width:26px; height:26px; border-radius:50%;
      background:linear-gradient(135deg,#e8820c,#f59e0b);
      display:flex; align-items:center; justify-content:center;
      font-size:.65rem; color:white; flex-shrink:0; font-weight:800;
    }
    .zcm-av.u { background:linear-gradient(135deg,#0d1f35,#1a3a5c); }
    .zcm-bbl {
      max-width:82%; padding:9px 13px; border-radius:14px;
      font-size:.83rem; line-height:1.6; font-family:'Outfit',sans-serif;
      word-break: break-word;
    }
    .zcm-bbl.b { background:white; color:#1e293b; border-bottom-left-radius:3px; box-shadow:0 1px 6px rgba(0,0,0,.07); border:1px solid #f1f5f9; }
    .zcm-bbl.u { background:linear-gradient(135deg,#e8820c,#cf6a00); color:white; border-bottom-right-radius:3px; }
    .zc-dots { display:flex; gap:4px; padding:4px 2px; }
    .zc-dots span { width:6px; height:6px; background:#cbd5e1; border-radius:50%; animation:zcD .9s ease-in-out infinite; }
    .zc-dots span:nth-child(2){animation-delay:.15s}
    .zc-dots span:nth-child(3){animation-delay:.3s}
    @keyframes zcD{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
    #zc-qrs {
      padding: 8px 10px 6px; display: flex; gap: 5px; flex-wrap: wrap;
      background: #f8fafc; border-top: 1px solid #f1f5f9; flex-shrink: 0;
    }
    .zc-qr {
      background: white; border: 1px solid #e2e8f0; color: #0d1f35;
      padding: 5px 11px; border-radius: 20px; font-size: .72rem; font-weight: 600;
      cursor: pointer; font-family: 'Outfit',sans-serif; transition: all .15s; white-space: nowrap;
    }
    .zc-qr:hover { background: #e8820c; color: white; border-color: #e8820c; }
    #zc-foot {
      padding: 10px 12px; display: flex; gap: 8px; align-items: flex-end;
      background: white; border-top: 1px solid #f1f5f9; flex-shrink: 0;
    }
    #zc-inp {
      flex: 1; border: 1.5px solid #e2e8f0; border-radius: 10px;
      padding: 9px 12px; font-size: .83rem; font-family: 'Outfit',sans-serif;
      resize: none; outline: none; max-height: 80px; line-height: 1.5; color: #1e293b;
    }
    #zc-inp:focus { border-color: #e8820c; }
    #zc-send-btn {
      width: 38px; height: 38px; border-radius: 10px;
      background: linear-gradient(135deg,#e8820c,#cf6a00);
      color: white; border: none; cursor: pointer; font-size: .9rem;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    #zc-send-btn:hover { opacity: .9; }
    #zc-send-btn:disabled { opacity: .4; cursor: not-allowed; }
    @media(max-width:480px){
      #zc-box { bottom:165px !important; right:10px !important; width:calc(100vw - 20px) !important; }
      #zc-bubble { bottom:90px !important; right:14px !important; }
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
    <div id="zc-qrs"></div>
    <div id="zc-foot">
      <textarea id="zc-inp" placeholder="Type your message…" rows="1"></textarea>
      <button id="zc-send-btn"><i class="fa-solid fa-paper-plane"></i></button>
    </div>
  `;

  document.body.appendChild(bubble);
  document.body.appendChild(box);

  // ── State ────────────────────────────────────────────────
  let open = false, busy = false;
  const history = [];

  // ── Toggle ───────────────────────────────────────────────
  function toggle() {
    open = !open;
    box.classList.toggle('zc-hidden', !open);
    const icon = bubble.querySelector('i');
    if (icon) icon.className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-comment-dots';
    const badge = bubble.querySelector('.zc-badge');
    if (badge) badge.remove();
    if (open && document.getElementById('zc-msgs').children.length === 0) {
      setTimeout(showWelcome, 200);
    }
  }

  // ── Messages ─────────────────────────────────────────────
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
      .replace(/\*(.*?)\*/g,'<em>$1</em>')
      .replace(/\n/g,'<br>');
    wrap.appendChild(av); wrap.appendChild(bbl);
    document.getElementById('zc-msgs').appendChild(wrap);
    scroll();
  }

  function addTyping() {
    const w = document.createElement('div');
    w.className = 'zcm'; w.id = 'zc-typing';
    w.innerHTML = `<div class="zcm-av"><i class="fa-solid fa-bolt" style="font-size:.6rem"></i></div><div class="zcm-bbl b"><div class="zc-dots"><span></span><span></span><span></span></div></div>`;
    document.getElementById('zc-msgs').appendChild(w);
    scroll();
  }

  function removeTyping() {
    const t = document.getElementById('zc-typing');
    if (t) t.remove();
  }

  function setQRs(list) {
    const el = document.getElementById('zc-qrs');
    el.innerHTML = '';
    (list || []).forEach(item => {
      const b = document.createElement('button');
      b.className = 'zc-qr';
      b.textContent = typeof item === 'string' ? item : item.label;
      b.onclick = () => {
        if (typeof item === 'object' && item.href) window.location.href = item.href;
        else send(typeof item === 'string' ? item : item.label);
      };
      el.appendChild(b);
    });
  }

  function scroll() {
    const m = document.getElementById('zc-msgs');
    m.scrollTop = m.scrollHeight;
  }

  // ── Shipment lookup ───────────────────────────────────────
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

  function formatShipmentMsg(s) {
    const emoji = {'Pending':'⏳','In Transit':'✈️','Out for Delivery':'🚚','Delivered':'✅','On Hold':'⚠️'}[s.status]||'📦';
    const tl = (s.timeline||[]).slice(-2).reverse().map(t=>`• ${t.status} — ${t.location||'N/A'}`).join('\n');
    return `${emoji} **Shipment: ${s.tracking}**\n\n**Status:** ${s.status}\n**From:** ${s.origin}\n**To:** ${s.dest}\n**Location:** ${s.location||'Updating...'}\n**Est. Delivery:** ${s.eta||'TBD'}\n**Service:** ${s.service}${tl?'\n\n**Recent Updates:**\n'+tl:''}`;
  }

  // ── Admin context ─────────────────────────────────────────
  function getCtx() {
    try { return localStorage.getItem('zc_ai_context')||''; } catch { return ''; }
  }

  // ── Gemini API call ───────────────────────────────────────
  async function callGemini(userMessage, shipmentData) {
    const GEMINI_KEY = window.ZC_GEMINI_KEY || '';
    if (!GEMINI_KEY) return null; // fallback to smart replies

    const ctx = getCtx();
    const systemContext = `You are the ZipCargo AI Assistant — a professional, friendly logistics support agent for ZipCargo, a global freight company.

ABOUT ZIPCARGO:
- Serves 150+ countries worldwide
- Services: Air Freight, Sea Freight, Road Transport, Warehousing, Customs Clearance, Supply Chain, Express Delivery
- 99.8% on-time rate, 80,000+ deliveries/month, 15+ years experience, ISO 9001 certified
- 24/7 customer support

INSURANCE & PAYMENTS — always mention when relevant:
- ALL insurance fees are FULLY REFUNDABLE if no claim is made
- ALL payments follow ZipCargo's refund policy
- Strongly encourage customers to insure cargo — zero risk, they get the fee back if nothing goes wrong

TRANSIT TIMES:
- Air Freight: 1-5 business days
- Sea Freight: 2-6 weeks  
- Road Transport: 1-10 days
- Express: Same day or next day

RESPONSE STYLE:
- Keep replies concise and professional (2-5 sentences normally)
- Use line breaks for readability
- Be warm and reassuring
- Never say "I'm just an AI" — you are the ZipCargo Assistant
- For pricing, say rates depend on weight/distance/service and direct to contact page for a free quote
- For complex issues, direct to support team

${shipmentData ? `\nLIVE SHIPMENT DATA:\n${shipmentData}` : ''}
${ctx ? `\nSPECIAL ADMIN INSTRUCTIONS (follow exactly):\n${ctx}` : ''}`;

    const geminiHistory = history.slice(-8).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemContext }] },
            contents: [
              ...geminiHistory,
              { role: 'user', parts: [{ text: userMessage }] }
            ],
            generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
          })
        }
      );
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch { return null; }
  }

  // ── Smart fallback replies ────────────────────────────────
  const rules = [
    { k:['hello','hi','hey','good morning','good afternoon','good evening'], r:`👋 Hello! Welcome to **ZipCargo** — your global logistics partner.\n\nHow can I help you today?`, q:['Track my shipment','Our services','Insurance info','Get a quote'] },
    { k:['services','what do you offer','shipping options','freight'], r:`✈️ **ZipCargo Services:**\n\n• Air Freight — fast worldwide delivery\n• Sea Freight — cost-effective for large cargo\n• Road Transport — cross-border with GPS\n• Express Delivery — same/next day\n• Warehousing — secure storage\n• Customs Clearance — full documentation\n• Supply Chain — end-to-end consulting`, q:['Get a quote','Insurance info','Contact support'] },
    { k:['insurance','insure','refund','refundable','coverage','payment'], r:`🛡️ **Insurance & Payments**\n\nAll ZipCargo cargo insurance fees are **fully refundable** if no claim is made.\n\nThere is **zero risk** — if your shipment arrives safely, you get every penny back. We strongly recommend insuring your cargo for complete peace of mind.`, q:['Get a quote','Contact support'] },
    { k:['price','pricing','cost','how much','rate','quote'], r:`💰 **Pricing**\n\nOur rates depend on service type, weight, dimensions, and route. Get a **free quote** from our team — we respond within 24 hours!`, q:[{label:'📝 Get a Free Quote', href:'contact.html'},'Back to menu'] },
    { k:['contact','support','help','agent','human','team','call','email','phone'], r:`📞 **Contact ZipCargo**\n\nOur team is available **Mon–Fri, 8am–8pm GMT**.\n\n📧 info@zipcargo.com\n\nOr use our contact form for a quick response.`, q:[{label:'📝 Contact Page', href:'contact.html'}] },
    { k:['track','tracking','where is','my package','my shipment','my order'], r:`📦 Please type your **tracking number** and I'll look it up instantly.\n\nIt looks like: **ZC-2026-00123**`, q:[] },
    { k:['transit time','how long','delivery time','when will','arrive','eta'], r:`⏱️ **Estimated Transit Times**\n\n• ✈️ Air Freight: 1–5 business days\n• 🚢 Sea Freight: 2–6 weeks\n• 🚛 Road Transport: 1–10 days\n• ⚡ Express: Same or next day`, q:['Get a quote','Our services'] },
    { k:['thank','thanks','great','awesome','perfect','good'], r:`You're welcome! 😊 Is there anything else I can help you with?`, q:['Track my shipment','Get a quote','Contact support'] },
    { k:['bye','goodbye','done','nothing else'], r:`Thank you for chatting with ZipCargo! 👋 Safe shipping! 📦`, q:[] },
    { k:['back to menu','menu','start over'], r:`Sure! What can I help you with?`, q:['Track my shipment','Our services','Insurance info','Get a quote','Contact support'] },
  ];

  function smartReply(text) {
    const low = text.toLowerCase();
    for (const rule of rules) {
      if (rule.k.some(k => low.includes(k))) return rule;
    }
    return null;
  }

  // ── Welcome ───────────────────────────────────────────────
  async function showWelcome() {
    const ctx = getCtx();
    addTyping();
    await delay(600);
    removeTyping();
    addMsg('assistant', `👋 **Welcome to ZipCargo!**\n\nI'm your logistics assistant. I can help you with:\n• **Track a shipment** — just share your tracking number\n• **Services & pricing** — air, sea, road, express & more\n• **Insurance** — fully refundable fees\n• **Get a quote** — free, we reply within 24 hours\n\nHow can I help you today?`);
    history.push({ role: 'assistant', content: 'Welcome message shown' });
    if (ctx) {
      await delay(400);
      addTyping();
      await delay(700);
      removeTyping();
      addMsg('assistant', `📢 **Notice:** ${ctx}`);
    }
    setQRs(['Track my shipment','Our services','Insurance info','Get a quote']);
  }

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── Main send handler ─────────────────────────────────────
  async function send(text) {
    text = (text || document.getElementById('zc-inp').value).trim();
    if (!text || busy) return;

    busy = true;
    document.getElementById('zc-inp').value = '';
    document.getElementById('zc-qrs').innerHTML = '';
    resize();
    addMsg('user', text);
    history.push({ role: 'user', content: text });

    // Check for tracking number first — always handle locally
    const tn = extractTN(text);
    if (tn) {
      addTyping();
      await delay(800);
      removeTyping();
      const data = await getShipment(tn);
      if (data) {
        const msg = formatShipmentMsg(data);
        addMsg('assistant', msg);
        history.push({ role: 'assistant', content: msg });
        setQRs(['Track another shipment','Contact support',{label:'Go to Tracking Page', href:'tracking.html'}]);
      } else {
        const msg = `❌ No shipment found for **${tn}**.\n\nPlease double-check the number (format: ZC-2026-00123) or contact our support team.`;
        addMsg('assistant', msg);
        history.push({ role: 'assistant', content: msg });
        setQRs([{label:'📝 Contact Support', href:'contact.html'},'Try again']);
      }
      busy = false;
      return;
    }

    // Try Gemini first
    addTyping();
    let reply = await callGemini(text, null);

    if (!reply) {
      // Smart fallback
      await delay(400 + Math.random() * 300);
      const rule = smartReply(text);
      if (rule) {
        removeTyping();
        addMsg('assistant', rule.r);
        history.push({ role: 'assistant', content: rule.r });
        setQRs(rule.q);
        busy = false;
        return;
      }
      reply = `I'd be happy to help! Could you tell me more about what you need? I can assist with:\n\n• Tracking a shipment\n• Information about our services\n• Insurance & payment questions\n• Getting a free quote\n• Connecting you with our support team`;
    }

    removeTyping();
    addMsg('assistant', reply);
    history.push({ role: 'assistant', content: reply });

    // Suggest next steps
    const low = reply.toLowerCase();
    const qr = [];
    if (low.includes('track')) qr.push('Track my shipment');
    if (low.includes('quot') || low.includes('pric')) qr.push({label:'📝 Get a Quote', href:'contact.html'});
    if (low.includes('insur')) qr.push('Tell me about insurance');
    if (low.includes('contact') || low.includes('support')) qr.push({label:'Contact Page', href:'contact.html'});
    if (qr.length === 0) qr.push('Our services', 'Get a quote', 'Insurance info');
    setQRs(qr.slice(0,3));

    busy = false;
  }

  function resize() {
    const t = document.getElementById('zc-inp');
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 80) + 'px';
  }

  // ── Events ────────────────────────────────────────────────
  bubble.addEventListener('click', toggle);
  document.getElementById('zc-close-btn').addEventListener('click', toggle);
  document.getElementById('zc-send-btn').addEventListener('click', () => send());
  document.getElementById('zc-inp').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  document.getElementById('zc-inp').addEventListener('input', resize);

})();
