// ZipCargo Chat Widget
(function () {

  // ── Styles ──
  document.head.insertAdjacentHTML('beforeend', `<style>
    #zcBtn {
      position: fixed;
      bottom: 30px;
      right: 30px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg,#e8820c,#cf6a00);
      color: white;
      border: none;
      cursor: pointer;
      z-index: 2147483647;
      box-shadow: 0 4px 16px rgba(232,130,12,.6);
      font-size: 1.4rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform .2s;
    }
    #zcBtn:hover { transform: scale(1.1); }
    #zcBtn .zcN {
      position: absolute;
      top: -3px; right: -3px;
      background: #ef4444;
      color: white;
      width: 18px; height: 18px;
      border-radius: 50%;
      border: 2px solid white;
      font-size: 9px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: sans-serif;
    }
    #zcWin {
      position: fixed;
      bottom: 96px;
      right: 30px;
      width: 320px;
      max-width: calc(100vw - 40px);
      height: 460px;
      max-height: calc(100vh - 110px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,.2);
      z-index: 2147483646;
      display: none;
      flex-direction: column;
      overflow: hidden;
    }
    #zcWin.on { display: flex; }
    #zcHead {
      background: linear-gradient(135deg,#0d1f35,#1a3a5c);
      padding: 13px 15px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    #zcHead .av {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg,#e8820c,#f59e0b);
      display: flex; align-items: center; justify-content: center;
      font-size: .95rem; flex-shrink: 0;
    }
    #zcHead .inf { flex: 1; }
    #zcHead .nm { color: white; font-weight: 800; font-size: .88rem; font-family: Outfit,sans-serif; }
    #zcHead .st { color: #7a9ab8; font-size: .68rem; display: flex; align-items: center; gap: 4px; margin-top: 2px; }
    #zcHead .dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; }
    #zcX {
      background: rgba(255,255,255,.12); border: none; color: white;
      width: 26px; height: 26px; border-radius: 50%; cursor: pointer;
      font-size: .8rem; display: flex; align-items: center; justify-content: center;
    }
    #zcMsgs {
      flex: 1; overflow-y: auto; padding: 12px;
      display: flex; flex-direction: column; gap: 9px;
      background: #f8fafc;
    }
    #zcMsgs::-webkit-scrollbar { width: 3px; }
    #zcMsgs::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }
    .zm { display: flex; gap: 7px; align-items: flex-end; }
    .zm.u { flex-direction: row-reverse; }
    .zav {
      width: 24px; height: 24px; border-radius: 50%;
      background: linear-gradient(135deg,#e8820c,#f59e0b);
      display: flex; align-items: center; justify-content: center;
      font-size: .6rem; color: white; flex-shrink: 0;
    }
    .zav.u { background: linear-gradient(135deg,#0d1f35,#1a3a5c); }
    .zb {
      max-width: 82%; padding: 8px 12px; border-radius: 13px;
      font-size: .81rem; line-height: 1.55; font-family: Outfit,sans-serif;
    }
    .zb.b { background: white; color: #1e293b; border-bottom-left-radius: 3px; box-shadow: 0 1px 4px rgba(0,0,0,.08); border: 1px solid #f1f5f9; }
    .zb.u { background: linear-gradient(135deg,#e8820c,#cf6a00); color: white; border-bottom-right-radius: 3px; }
    .zdots { display: flex; gap: 3px; padding: 3px 1px; }
    .zdots span { width: 5px; height: 5px; background: #cbd5e1; border-radius: 50%; animation: zd .9s ease-in-out infinite; }
    .zdots span:nth-child(2){animation-delay:.15s}.zdots span:nth-child(3){animation-delay:.3s}
    @keyframes zd{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}
    #zcQR {
      padding: 7px 9px 5px; display: flex; gap: 5px; flex-wrap: wrap;
      background: #f8fafc; border-top: 1px solid #f1f5f9; flex-shrink: 0;
    }
    .zq {
      background: white; border: 1px solid #e2e8f0; color: #0d1f35;
      padding: 4px 10px; border-radius: 20px; font-size: .7rem; font-weight: 600;
      cursor: pointer; font-family: Outfit,sans-serif; white-space: nowrap;
    }
    .zq:hover { background: #e8820c; color: white; border-color: #e8820c; }
    #zcFoot {
      padding: 9px 11px; display: flex; gap: 7px; align-items: flex-end;
      background: white; border-top: 1px solid #f1f5f9; flex-shrink: 0;
    }
    #zcInp {
      flex: 1; border: 1.5px solid #e2e8f0; border-radius: 9px;
      padding: 8px 11px; font-size: .81rem; font-family: Outfit,sans-serif;
      resize: none; outline: none; line-height: 1.5; color: #1e293b; max-height: 70px;
    }
    #zcInp:focus { border-color: #e8820c; }
    #zcSend {
      width: 36px; height: 36px; border-radius: 9px;
      background: linear-gradient(135deg,#e8820c,#cf6a00);
      color: white; border: none; cursor: pointer; font-size: .85rem;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    #zcSend:disabled { opacity: .4; cursor: not-allowed; }
    @media(max-width:400px){
      #zcWin { right: 10px; bottom: 90px; width: calc(100vw - 20px); }
      #zcBtn { right: 16px; bottom: 24px; }
    }
  </style>`);

  // ── DOM ──
  document.body.insertAdjacentHTML('beforeend', `
    <button id="zcBtn"><i class="fa-solid fa-comment-dots"></i><span class="zcN">1</span></button>
    <div id="zcWin">
      <div id="zcHead">
        <div class="av"><i class="fa-solid fa-bolt"></i></div>
        <div class="inf">
          <div class="nm">ZipCargo Assistant</div>
          <div class="st"><span class="dot"></span> Online · replies instantly</div>
        </div>
        <button id="zcX"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div id="zcMsgs"></div>
      <div id="zcQR"></div>
      <div id="zcFoot">
        <textarea id="zcInp" placeholder="Type your message…" rows="1"></textarea>
        <button id="zcSend"><i class="fa-solid fa-paper-plane"></i></button>
      </div>
    </div>
  `);

  // ── State ──
  let isOpen = false, busy = false;
  const hist = [];

  // ── Open/close ──
  function toggle() {
    isOpen = !isOpen;
    document.getElementById('zcWin').classList.toggle('on', isOpen);
    const ic = document.getElementById('zcBtn').querySelector('i');
    if (ic) ic.className = isOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-comment-dots';
    const badge = document.getElementById('zcBtn').querySelector('.zcN');
    if (badge) badge.remove();
    if (isOpen && document.getElementById('zcMsgs').children.length === 0) {
      setTimeout(welcome, 200);
    }
  }

  // ── Add message ──
  function msg(role, text) {
    const w = document.createElement('div');
    w.className = 'zm' + (role === 'user' ? ' u' : '');
    w.innerHTML = `
      <div class="zav${role==='user'?' u':''}">
        <i class="fa-solid fa-${role==='user'?'user':'bolt'}" style="font-size:.55rem"></i>
      </div>
      <div class="zb ${role==='user'?'u':'b'}">${fmt(text)}</div>`;
    document.getElementById('zcMsgs').appendChild(w);
    scr();
  }

  function fmt(t) {
    return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
      .replace(/\n/g,'<br>');
  }

  function typing() {
    const w = document.createElement('div');
    w.className = 'zm'; w.id = 'zcT';
    w.innerHTML = `<div class="zav"><i class="fa-solid fa-bolt" style="font-size:.55rem"></i></div><div class="zb b"><div class="zdots"><span></span><span></span><span></span></div></div>`;
    document.getElementById('zcMsgs').appendChild(w); scr();
  }
  function rmTyping() { const t=document.getElementById('zcT'); if(t) t.remove(); }

  function qr(list) {
    const el = document.getElementById('zcQR');
    el.innerHTML = '';
    (list||[]).forEach(item => {
      const b = document.createElement('button');
      b.className = 'zq';
      b.textContent = typeof item==='string' ? item : item.label;
      b.onclick = () => {
        if (typeof item==='object' && item.href) window.location.href = item.href;
        else send(typeof item==='string' ? item : item.label);
      };
      el.appendChild(b);
    });
  }

  function scr() { const m=document.getElementById('zcMsgs'); m.scrollTop=m.scrollHeight; }
  function wait(ms) { return new Promise(r=>setTimeout(r,ms)); }

  // ── Shipment lookup ──
  function findTN(text) {
    const m = text.match(/\b(ZC[-\s]?\d{4}[-\s]?\d{3,6})\b/i);
    return m ? m[1].replace(/\s/g,'-').toUpperCase() : null;
  }
  async function getShipment(tn) {
    try {
      const r = await fetch(`/api/shipments/track/${encodeURIComponent(tn)}`);
      return r.ok ? await r.json() : null;
    } catch { return null; }
  }
  function shipMsg(s) {
    const e = {'Pending':'⏳','In Transit':'✈️','Out for Delivery':'🚚','Delivered':'✅','On Hold':'⚠️'}[s.status]||'📦';
    const tl = (s.timeline||[]).slice(-2).reverse().map(t=>`• ${t.status} — ${t.location||'N/A'}`).join('\n');
    return `${e} **Shipment: ${s.tracking}**\n\n**Status:** ${s.status}\n**From:** ${s.origin}\n**To:** ${s.dest}\n**Location:** ${s.location||'Updating...'}\n**Est. Delivery:** ${s.eta||'TBD'}\n**Service:** ${s.service}${tl?'\n\n**Updates:**\n'+tl:''}`;
  }

  // ── Gemini AI ──
  async function gemini(text) {
    const key = window.ZC_GEMINI_KEY || '';
    if (!key) return null;
    const ctx = (() => { try { return localStorage.getItem('zc_ai_context')||''; } catch{return'';} })();
    const sys = `You are the ZipCargo AI Assistant — professional, warm, concise. ZipCargo is a global freight company serving 150+ countries. Services: Air Freight, Sea Freight, Road Transport, Warehousing, Customs Clearance, Express Delivery. Key facts: 99.8% on-time, 80k+ deliveries/month, ISO 9001 certified. Insurance fees are FULLY REFUNDABLE if no claim is made — always mention this when insurance comes up. Keep replies to 2-4 sentences. Never say "I'm an AI".${ctx?'\n\nSPECIAL INSTRUCTIONS: '+ctx:''}`;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          system_instruction:{parts:[{text:sys}]},
          contents:[...hist.slice(-8).map(m=>({role:m.r==='assistant'?'model':'user',parts:[{text:m.t}]})),{role:'user',parts:[{text}]}],
          generationConfig:{maxOutputTokens:400,temperature:0.7}
        })
      });
      const d = await res.json();
      return d?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch { return null; }
  }

  // ── Fallback rules ──
  const rules = [
    {k:['hello','hi','hey','good morning','good afternoon'],r:`👋 Hello! Welcome to **ZipCargo** — your global logistics partner.\n\nHow can I help you today?`,q:['Track my shipment','Our services','Insurance info','Get a quote']},
    {k:['services','what do you offer','freight','shipping options'],r:`✈️ **ZipCargo Services:**\n\n• Air Freight — fast worldwide delivery\n• Sea Freight — cost-effective large cargo\n• Road Transport — cross-border GPS tracked\n• Express Delivery — same/next day\n• Warehousing — secure storage\n• Customs Clearance — full documentation`,q:['Get a quote','Insurance info','Contact support']},
    {k:['insurance','insure','refund','refundable','coverage'],r:`🛡️ **Insurance & Payments**\n\nAll ZipCargo insurance fees are **fully refundable** if no claim is made. Zero risk — you get every penny back if your shipment arrives safely.\n\nWe strongly recommend insuring your cargo.`,q:['Get a quote','Contact support']},
    {k:['price','pricing','cost','how much','quote','rate'],r:`💰 **Pricing**\n\nRates depend on service type, weight, and route. Get a **free quote** — we respond within 24 hours!`,q:[{label:'📝 Get a Free Quote',href:'contact.html'}]},
    {k:['contact','support','help','agent','human','email','phone'],r:`📞 **Contact ZipCargo**\n\nMon–Fri, 8am–8pm GMT\n📧 info@zipcargo.com\n\nOr use our contact form for a quick response.`,q:[{label:'📝 Contact Page',href:'contact.html'}]},
    {k:['track','tracking','where is','my package','my shipment'],r:`📦 Please share your **tracking number** and I'll look it up instantly.\n\nFormat: **ZC-2026-00123**`,q:[]},
    {k:['how long','transit time','delivery time','when will','eta'],r:`⏱️ **Transit Times:**\n\n• ✈️ Air Freight: 1–5 business days\n• 🚢 Sea Freight: 2–6 weeks\n• 🚛 Road Transport: 1–10 days\n• ⚡ Express: Same or next day`,q:['Get a quote','Our services']},
    {k:['countries','where','destinations','global','worldwide'],r:`🌍 **Global Network**\n\nZipCargo operates in **150+ countries** with hubs in New York, London, Dubai, Singapore, Lagos, Sydney, Tokyo and many more.`,q:['Our services','Get a quote']},
    {k:['thank','thanks','great','awesome','perfect'],r:`You're welcome! 😊 Is there anything else I can help you with?`,q:['Track my shipment','Get a quote']},
    {k:['bye','goodbye','done'],r:`Thank you for chatting with ZipCargo! 👋 Safe shipping! 📦`,q:[]},
  ];

  function fallback(text) {
    const low = text.toLowerCase();
    for (const rule of rules) {
      if (rule.k.some(k => low.includes(k))) return rule;
    }
    return null;
  }

  // ── Welcome ──
  async function welcome() {
    typing(); await wait(700); rmTyping();
    const t = `👋 **Welcome to ZipCargo!**\n\nI'm your logistics assistant. I can help you:\n• **Track a shipment** — share your tracking number\n• **Services & pricing** — air, sea, road, express\n• **Insurance** — all fees fully refundable\n• **Get a quote** — free, we reply in 24 hours`;
    msg('assistant', t);
    hist.push({r:'assistant',t});
    qr(['Track my shipment','Our services','Insurance info','Get a quote']);
    const ctx = (() => { try { return localStorage.getItem('zc_ai_context')||''; } catch{return'';} })();
    if (ctx) { await wait(500); typing(); await wait(600); rmTyping(); msg('assistant',`📢 **Notice:** ${ctx}`); }
  }

  // ── Send ──
  async function send(text) {
    text = (text || document.getElementById('zcInp').value).trim();
    if (!text || busy) return;
    busy = true;
    document.getElementById('zcInp').value = '';
    document.getElementById('zcQR').innerHTML = '';
    resize();
    msg('user', text);
    hist.push({r:'user',t:text});

    // Tracking number?
    const tn = findTN(text);
    if (tn) {
      typing(); await wait(800); rmTyping();
      const data = await getShipment(tn);
      if (data) {
        const m = shipMsg(data);
        msg('assistant', m); hist.push({r:'assistant',t:m});
        qr(['Track another shipment',{label:'Go to Tracking Page',href:'tracking.html'},'Contact support']);
      } else {
        const m = `❌ No shipment found for **${tn}**.\n\nPlease double-check the number or contact our support team.`;
        msg('assistant', m); hist.push({r:'assistant',t:m});
        qr([{label:'📝 Contact Support',href:'contact.html'}]);
      }
      busy = false; return;
    }

    // Try Gemini
    typing();
    let reply = await gemini(text);

    if (!reply) {
      // Smart fallback
      await wait(400);
      const rule = fallback(text);
      rmTyping();
      if (rule) {
        msg('assistant', rule.r); hist.push({r:'assistant',t:rule.r});
        qr(rule.q);
      } else {
        const m = `I'm here to help! You can ask me about:\n\n• Tracking a shipment\n• Our services & pricing\n• Insurance information\n• Getting a free quote`;
        msg('assistant', m); hist.push({r:'assistant',t:m});
        qr(['Track my shipment','Our services','Get a quote','Contact support']);
      }
      busy = false; return;
    }

    rmTyping();
    msg('assistant', reply); hist.push({r:'assistant',t:reply});

    const low = reply.toLowerCase();
    const q = [];
    if (low.includes('track')) q.push('Track my shipment');
    if (low.includes('quot')||low.includes('pric')) q.push({label:'📝 Get a Quote',href:'contact.html'});
    if (low.includes('insur')) q.push('Insurance info');
    if (low.includes('contact')||low.includes('support')) q.push({label:'Contact Page',href:'contact.html'});
    if (!q.length) q.push('Our services','Get a quote');
    qr(q.slice(0,3));
    busy = false;
  }

  function resize() {
    const t = document.getElementById('zcInp');
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight,70)+'px';
  }

  // ── Events ──
  document.getElementById('zcBtn').addEventListener('click', toggle);
  document.getElementById('zcX').addEventListener('click', toggle);
  document.getElementById('zcSend').addEventListener('click', () => send());
  document.getElementById('zcInp').addEventListener('keydown', e => {
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  document.getElementById('zcInp').addEventListener('input', resize);

  // Load Gemini key from server
  fetch('/api/chat/config').then(r=>r.json()).then(d=>{ window.ZC_GEMINI_KEY = d.key||''; }).catch(()=>{});

})();
