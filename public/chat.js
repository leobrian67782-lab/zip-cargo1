// ============================================================
//  ZipCargo Smart Chat — Free, No API Key Required
// ============================================================
(function () {
  'use strict';

  // ── Styles ──────────────────────────────────────────────
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
      width: 38px; height: 38px;
      border-radius: 50%;
      background: linear-gradient(135deg,#e8820c,#f59e0b);
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; flex-shrink: 0;
    }
    .zc-info { flex: 1; }
    .zc-name { color: white; font-weight: 800; font-size: .9rem; font-family:'Outfit',sans-serif; }
    .zc-status { color: #7a9ab8; font-size: .7rem; display:flex; align-items:center; gap:4px; margin-top:2px; }
    .zc-dot { width:6px; height:6px; border-radius:50%; background:#22c55e; animation: zcPulse 2s infinite; }
    @keyframes zcPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
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
    .zcm { display:flex; gap:8px; align-items:flex-end; animation: zcIn .25s ease both; }
    .zcm.u { flex-direction:row-reverse; }
    @keyframes zcIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
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
    }
    .zcm-bbl.b { background:white; color:#1e293b; border-bottom-left-radius:3px; box-shadow:0 1px 6px rgba(0,0,0,.07); border:1px solid #f1f5f9; }
    .zcm-bbl.u { background:linear-gradient(135deg,#e8820c,#cf6a00); color:white; border-bottom-right-radius:3px; }
    .zc-dots { display:flex; gap:4px; padding:4px 2px; }
    .zc-dots span { width:6px; height:6px; background:#cbd5e1; border-radius:50%; animation:zcDot .9s ease-in-out infinite; }
    .zc-dots span:nth-child(2){animation-delay:.15s}
    .zc-dots span:nth-child(3){animation-delay:.3s}
    @keyframes zcDot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
    #zc-qrs {
      padding: 8px 10px 6px;
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
      background: #f8fafc;
      border-top: 1px solid #f1f5f9;
      flex-shrink: 0;
    }
    .zc-qr {
      background: white; border: 1px solid #e2e8f0; color: #0d1f35;
      padding: 5px 11px; border-radius: 20px; font-size: .72rem; font-weight: 600;
      cursor: pointer; font-family: 'Outfit',sans-serif; transition: all .15s;
      white-space: nowrap;
    }
    .zc-qr:hover { background: #e8820c; color: white; border-color: #e8820c; }
    #zc-foot {
      padding: 10px 12px;
      display: flex; gap: 8px; align-items: flex-end;
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
    @media(max-width:480px){
      #zc-box { bottom:165px !important; right:10px !important; width:calc(100vw - 20px) !important; }
      #zc-bubble { bottom:90px !important; right:14px !important; }
    }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── DOM ─────────────────────────────────────────────────
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
  let open = false;

  // ── Toggle ───────────────────────────────────────────────
  function toggle() {
    open = !open;
    box.classList.toggle('zc-hidden', !open);
    const icon = bubble.querySelector('i');
    if (icon) icon.className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-comment-dots';
    const badge = bubble.querySelector('.zc-badge');
    if (badge) badge.remove();
    if (open && document.getElementById('zc-msgs').children.length === 0) {
      setTimeout(showWelcome, 300);
    }
  }

  // ── Render message ───────────────────────────────────────
  function addMsg(role, text, delay) {
    return new Promise(resolve => {
      setTimeout(() => {
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
        resolve();
      }, delay || 0);
    });
  }

  function addTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'zcm';
    wrap.id = 'zc-typing';
    wrap.innerHTML = `<div class="zcm-av"><i class="fa-solid fa-bolt" style="font-size:.6rem"></i></div><div class="zcm-bbl b"><div class="zc-dots"><span></span><span></span><span></span></div></div>`;
    document.getElementById('zc-msgs').appendChild(wrap);
    scroll();
  }

  function removeTyping() {
    const t = document.getElementById('zc-typing');
    if (t) t.remove();
  }

  function setQRs(list) {
    const el = document.getElementById('zc-qrs');
    el.innerHTML = '';
    list.forEach(item => {
      const b = document.createElement('button');
      b.className = 'zc-qr';
      b.textContent = typeof item === 'string' ? item : item.label;
      b.onclick = () => {
        if (typeof item === 'object' && item.action) item.action();
        else send(typeof item === 'string' ? item : item.label);
      };
      el.appendChild(b);
    });
  }

  function scroll() {
    const m = document.getElementById('zc-msgs');
    m.scrollTop = m.scrollHeight;
  }

  // ── Get shipment data ────────────────────────────────────
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

  // ── Admin context ────────────────────────────────────────
  function getAdminMsg() {
    try { return localStorage.getItem('zc_ai_context') || ''; } catch { return ''; }
  }

  // ── Smart responses ───────────────────────────────────────
  const responses = [
    {
      match: ['hello','hi','hey','good morning','good afternoon','good evening','howdy'],
      reply: () => `👋 Hello! Welcome to **ZipCargo**.\n\nHow can I help you today? You can ask me about tracking, services, pricing, or insurance.`,
      qrs: ['Track my shipment', 'Our services', 'Insurance info', 'Get a quote']
    },
    {
      match: ['track','tracking','where is','where\'s','my package','my shipment','my order','shipment status','package status'],
      reply: () => `📦 To track your shipment, please type your **ZipCargo tracking number**.\n\nIt looks like this: **ZC-2026-00123**\n\nYou can find it in the confirmation message or email we sent you.`,
      qrs: ['I don\'t have a tracking number', 'Contact support']
    },
    {
      match: ['services','what do you offer','what services','freight','shipping options'],
      reply: () => `✈️ **ZipCargo Services:**\n\n• **Air Freight** — fast, worldwide delivery\n• **Sea Freight** — cost-effective for large cargo\n• **Road Transport** — cross-border with GPS tracking\n• **Express Delivery** — same/next day options\n• **Warehousing** — secure storage & fulfilment\n• **Customs Clearance** — full documentation support\n• **Supply Chain** — end-to-end consulting\n\nWhich service interests you?`,
      qrs: ['Air Freight', 'Sea Freight', 'Get a quote']
    },
    {
      match: ['air freight','air shipping','plane','flight','fly'],
      reply: () => `✈️ **Air Freight**\n\nOur fastest option — express worldwide delivery to 200+ destinations. Ideal for urgent, high-value, or time-sensitive shipments.\n\n⏱ Transit time: 1–5 business days depending on destination.\n\nWant to get a quote?`,
      qrs: ['Get a quote', 'Other services', 'Back to menu']
    },
    {
      match: ['sea freight','ocean','ship','vessel','container','groupage'],
      reply: () => `🚢 **Sea Freight**\n\nOur most cost-effective option for large or heavy cargo. We offer both full container (FCL) and groupage (LCL) options.\n\n⏱ Transit time varies by route — typically 2–6 weeks.\n\nWant to get a quote?`,
      qrs: ['Get a quote', 'Other services', 'Back to menu']
    },
    {
      match: ['road','truck','trucking','road transport','cross border','land'],
      reply: () => `🚛 **Road Transport**\n\nCross-border trucking with real-time GPS tracking and a dedicated fleet. Great for regional shipments across continents.\n\nWant to get a quote?`,
      qrs: ['Get a quote', 'Other services', 'Back to menu']
    },
    {
      match: ['express','same day','next day','urgent','fast delivery'],
      reply: () => `⚡ **Express Delivery**\n\nSame-day and next-day options for time-critical shipments — anywhere in the world. Our fastest service for when it absolutely cannot wait.\n\nWant to get a quote?`,
      qrs: ['Get a quote', 'Other services', 'Back to menu']
    },
    {
      match: ['warehouse','warehousing','storage','store','inventory','fulfilment'],
      reply: () => `🏭 **Warehousing**\n\nSecure, climate-controlled storage with smart inventory management and fulfilment systems. Your cargo is safe with us.\n\nInterested in our warehousing solutions?`,
      qrs: ['Get a quote', 'Other services', 'Back to menu']
    },
    {
      match: ['customs','clearance','import','export','documentation','documents'],
      reply: () => `📋 **Customs Clearance**\n\nOur experts handle all import/export documentation and compliance requirements so you don't have to worry about delays at the border.\n\nNeed customs assistance?`,
      qrs: ['Get a quote', 'Contact support', 'Back to menu']
    },
    {
      match: ['insurance','insure','protect','coverage','refund','refundable','payment'],
      reply: () => `🛡️ **Insurance & Payments**\n\nAll ZipCargo cargo insurance fees are **fully refundable** if no claim is made. There is **zero risk** — you get every penny back if your shipment arrives without issues.\n\nWe strongly recommend insuring your cargo for complete peace of mind. Would you like to know more?`,
      qrs: ['How do I get insurance?', 'Get a quote', 'Back to menu']
    },
    {
      match: ['how do i get insurance','insurance details','cargo insurance'],
      reply: () => `🛡️ **Getting Cargo Insurance**\n\nWhen you book a shipment with us:\n1. Request insurance during the booking process\n2. Pay the insurance fee (fully refundable if unused)\n3. Your cargo is protected for its full declared value\n\nIf your shipment arrives safely, your insurance fee is **returned to you**. No risk at all.\n\nTo get started, contact our team for a quote.`,
      qrs: ['Get a quote', 'Contact support']
    },
    {
      match: ['price','pricing','cost','how much','rate','rates','quote','estimate'],
      reply: () => `💰 **Pricing & Quotes**\n\nOur rates depend on:\n• **Service type** (air, sea, road, express)\n• **Weight & dimensions** of your cargo\n• **Origin & destination**\n• **Any special requirements**\n\nGet a **free quote** from our team — we respond within 24 hours!`,
      qrs: [{ label: '📝 Get a Free Quote', action: () => window.location.href = 'contact.html' }, 'Back to menu']
    },
    {
      match: ['contact','support','help','speak','talk','agent','human','team','call','email','phone'],
      reply: () => `📞 **Contact ZipCargo**\n\nOur team is available **Mon–Fri, 8am–8pm GMT**.\n\n📧 info@zipcargo.com\n\nOr use our contact form — we reply within 24 hours.`,
      qrs: [{ label: '📝 Go to Contact Page', action: () => window.location.href = 'contact.html' }, 'Back to menu']
    },
    {
      match: ['about','who are you','zipcargo','company','history'],
      reply: () => `⚡ **About ZipCargo**\n\nFounded 15+ years ago with a mission to make global shipping simple. We serve businesses of all sizes across **150+ countries**.\n\n✅ ISO 9001 Certified\n✅ 99.8% on-time delivery rate\n✅ 80,000+ shipments per month\n✅ 24/7 customer support`,
      qrs: ['Our services', 'Get a quote', 'Back to menu']
    },
    {
      match: ['how long','transit time','delivery time','when will','arrive','eta'],
      reply: () => `⏱️ **Estimated Transit Times**\n\n• ✈️ Air Freight: 1–5 business days\n• 🚢 Sea Freight: 2–6 weeks\n• 🚛 Road Transport: 1–10 days (regional)\n• ⚡ Express: Same day or next day\n\nExact times depend on origin/destination. Want a precise estimate?`,
      qrs: ['Get a quote', 'Our services', 'Back to menu']
    },
    {
      match: ['countries','where','destinations','international','global','worldwide','operate'],
      reply: () => `🌍 **Global Network**\n\nZipCargo operates in **150+ countries** with major hubs in:\n\nNew York · London · Dubai · Singapore · Lagos · Sydney · Tokyo · Mumbai · Toronto · Nairobi\n\nAnd many more. If you have a destination in mind, we can most likely ship there!`,
      qrs: ['Get a quote', 'Our services', 'Back to menu']
    },
    {
      match: ['don\'t have tracking','no tracking number','lost tracking','forgot tracking'],
      reply: () => `No problem! If you don't have your tracking number:\n\n1. Check the confirmation email we sent you\n2. Check your WhatsApp/SMS from us\n3. Contact our support team with your name and shipment details — we'll find it for you.`,
      qrs: [{ label: '📝 Contact Support', action: () => window.location.href = 'contact.html' }, 'Back to menu']
    },
    {
      match: ['back to menu','main menu','menu','start over','restart'],
      reply: () => `Sure! Here's what I can help you with:`,
      qrs: ['Track my shipment', 'Our services', 'Pricing & quotes', 'Insurance info', 'Contact support']
    },
    {
      match: ['thank','thanks','thank you','appreciate','great','awesome','perfect','good'],
      reply: () => `You're welcome! 😊 Is there anything else I can help you with?`,
      qrs: ['Track my shipment', 'Get a quote', 'Contact support']
    },
    {
      match: ['bye','goodbye','see you','done','that\'s all','nothing'],
      reply: () => `Thank you for chatting with ZipCargo! 👋\n\nHave a great day. Don't hesitate to come back if you need anything. Safe shipping! 📦`,
      qrs: []
    },
  ];

  // ── Match user message ────────────────────────────────────
  function matchResponse(text) {
    const lower = text.toLowerCase().trim();
    for (const r of responses) {
      if (r.match.some(k => lower.includes(k))) return r;
    }
    return null;
  }

  // ── Welcome message ───────────────────────────────────────
  async function showWelcome() {
    // Check for admin custom message
    const adminMsg = getAdminMsg();
    addTyping();
    await new Promise(r => setTimeout(r, 600));
    removeTyping();
    await addMsg('assistant', `👋 **Welcome to ZipCargo!**\n\nI'm your logistics assistant. I can help you with:\n• **Track a shipment** — just share your tracking number\n• **Services & pricing** — air, sea, road, express & more\n• **Insurance** — all fees fully refundable\n• **Get a quote** — free, respond within 24 hours\n\nHow can I help you today?`);
    if (adminMsg) {
      await new Promise(r => setTimeout(r, 400));
      addTyping();
      await new Promise(r => setTimeout(r, 800));
      removeTyping();
      await addMsg('assistant', `📢 **Notice from ZipCargo:**\n\n${adminMsg}`);
    }
    setQRs(['Track my shipment', 'Our services', 'Insurance info', 'Get a quote']);
  }

  // ── Handle send ───────────────────────────────────────────
  async function send(text) {
    text = (text || document.getElementById('zc-inp').value).trim();
    if (!text) return;

    document.getElementById('zc-inp').value = '';
    document.getElementById('zc-qrs').innerHTML = '';
    resize();
    addMsg('user', text);

    // Check for tracking number first
    const tn = extractTN(text);
    if (tn) {
      addTyping();
      await new Promise(r => setTimeout(r, 900));
      removeTyping();
      const data = await getShipment(tn);
      if (data) {
        const statusEmoji = { 'Pending':'⏳', 'In Transit':'✈️', 'Out for Delivery':'🚚', 'Delivered':'✅', 'On Hold':'⚠️' }[data.status] || '📦';
        const tl = (data.timeline||[]).slice(-2).reverse().map(t =>
          `• ${t.status} — ${t.location || 'N/A'}`
        ).join('\n');
        const reply = `${statusEmoji} **Shipment Found: ${data.tracking}**\n\n**Status:** ${data.status}\n**From:** ${data.origin}\n**To:** ${data.dest}\n**Current Location:** ${data.location || 'Updating...'}\n**Est. Delivery:** ${data.eta || 'TBD'}\n**Service:** ${data.service}\n\n${tl ? '**Recent Updates:**\n' + tl : ''}`;
        addMsg('assistant', reply);
        setQRs(['Track another shipment', 'Contact support', 'Back to menu']);
      } else {
        addMsg('assistant', `❌ I couldn't find shipment **${tn}**.\n\nPlease double-check the tracking number. It should look like **ZC-2026-00123**.\n\nIf you need help, our support team can locate your shipment.`);
        setQRs([{ label: '📝 Contact Support', action: () => window.location.href = 'contact.html' }, 'Back to menu']);
      }
      return;
    }

    // Match against response rules
    const match = matchResponse(text);
    addTyping();
    await new Promise(r => setTimeout(r, 500 + Math.random() * 400));
    removeTyping();

    if (match) {
      addMsg('assistant', match.reply());
      setQRs(match.qrs);
    } else {
      // Fallback
      addMsg('assistant', `I'm not sure about that specific question, but I'm happy to help with:\n\n• **Tracking** a shipment\n• Our **services & pricing**\n• **Insurance** information\n• Getting a **free quote**\n• Connecting you with our **support team**`);
      setQRs(['Track my shipment', 'Our services', 'Get a quote', 'Contact support']);
    }
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
