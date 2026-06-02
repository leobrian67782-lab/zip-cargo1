// ZipCargo AI Chat Widget
(function () {

  document.head.insertAdjacentHTML('beforeend', `<style>
    #zcBtn {
      position: fixed !important;
      bottom: 80px !important;
      right: 20px !important;
      width: 54px !important;
      height: 54px !important;
      border-radius: 50% !important;
      background: linear-gradient(135deg,#e8820c,#cf6a00) !important;
      color: white !important;
      border: none !important;
      cursor: pointer !important;
      z-index: 2147483647 !important;
      box-shadow: 0 4px 18px rgba(232,130,12,.65) !important;
      font-size: 1.35rem !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: transform .2s !important;
      padding: 0 !important;
      margin: 0 !important;
      top: auto !important;
      left: auto !important;
      transform: none !important;
    }
    #zcBtn:hover { transform: scale(1.08) !important; }
    #zcBtn .zcN {
      position: absolute !important;
      top: -4px !important; right: -4px !important;
      background: #ef4444 !important;
      color: white !important;
      width: 18px !important; height: 18px !important;
      border-radius: 50% !important;
      border: 2px solid white !important;
      font-size: 9px !important; font-weight: 800 !important;
      display: flex !important;
      align-items: center !important; justify-content: center !important;
      font-family: sans-serif !important;
    }
    #zcWin {
      position: fixed !important;
      bottom: 144px !important;
      right: 20px !important;
      width: 320px !important;
      max-width: calc(100vw - 40px) !important;
      height: 460px !important;
      max-height: calc(100vh - 160px) !important;
      background: white !important;
      border-radius: 16px !important;
      box-shadow: 0 8px 36px rgba(0,0,0,.2) !important;
      z-index: 2147483646 !important;
      display: none !important;
      flex-direction: column !important;
      overflow: hidden !important;
      top: auto !important; left: auto !important;
    }
    #zcWin.on { display: flex !important; }
    #zcHead {
      background: linear-gradient(135deg,#0d1f35,#1a3a5c);
      padding: 13px 15px; display: flex; align-items: center; gap: 10px; flex-shrink: 0;
    }
    .zcAv {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg,#e8820c,#f59e0b);
      display: flex; align-items: center; justify-content: center;
      font-size: .95rem; flex-shrink: 0;
    }
    .zcInf { flex: 1; }
    .zcNm { color: white; font-weight: 800; font-size: .88rem; font-family: Outfit,sans-serif; }
    .zcSt { color: #7a9ab8; font-size: .68rem; display: flex; align-items: center; gap: 4px; margin-top: 2px; }
    .zcDt { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; animation: zcp 2s infinite; }
    @keyframes zcp{0%,100%{opacity:1}50%{opacity:.4}}
    #zcClose {
      background: rgba(255,255,255,.12); border: none; color: white;
      width: 26px; height: 26px; border-radius: 50%; cursor: pointer;
      font-size: .8rem; display: flex; align-items: center; justify-content: center;
    }
    #zcClose:hover { background: rgba(255,255,255,.2); }
    #zcMsgs {
      flex: 1; overflow-y: auto; padding: 12px;
      display: flex; flex-direction: column; gap: 9px; background: #f8fafc;
    }
    #zcMsgs::-webkit-scrollbar{width:3px}
    #zcMsgs::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:2px}
    .zm{display:flex;gap:7px;align-items:flex-end}
    .zm.u{flex-direction:row-reverse}
    .zav{width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#e8820c,#f59e0b);display:flex;align-items:center;justify-content:center;font-size:.6rem;color:white;flex-shrink:0}
    .zav.u{background:linear-gradient(135deg,#0d1f35,#1a3a5c)}
    .zb{max-width:82%;padding:8px 12px;border-radius:13px;font-size:.81rem;line-height:1.55;font-family:Outfit,sans-serif;word-break:break-word}
    .zb.b{background:white;color:#1e293b;border-bottom-left-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,.08);border:1px solid #f1f5f9}
    .zb.u{background:linear-gradient(135deg,#e8820c,#cf6a00);color:white;border-bottom-right-radius:3px}
    .zdts{display:flex;gap:3px;padding:3px 1px}
    .zdts span{width:5px;height:5px;background:#cbd5e1;border-radius:50%;animation:zdb .9s ease-in-out infinite}
    .zdts span:nth-child(2){animation-delay:.15s}.zdts span:nth-child(3){animation-delay:.3s}
    @keyframes zdb{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}
    #zcQR{padding:7px 9px 5px;display:flex;gap:5px;flex-wrap:wrap;background:#f8fafc;border-top:1px solid #f1f5f9;flex-shrink:0}
    .zqr{background:white;border:1px solid #e2e8f0;color:#0d1f35;padding:4px 10px;border-radius:20px;font-size:.7rem;font-weight:600;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap}
    .zqr:hover{background:#e8820c;color:white;border-color:#e8820c}
    #zcFoot{padding:9px 11px;display:flex;gap:7px;align-items:flex-end;background:white;border-top:1px solid #f1f5f9;flex-shrink:0}
    #zcInp{flex:1;border:1.5px solid #e2e8f0;border-radius:9px;padding:8px 11px;font-size:.81rem;font-family:Outfit,sans-serif;resize:none;outline:none;line-height:1.5;color:#1e293b;max-height:70px}
    #zcInp:focus{border-color:#e8820c}
    #zcSend{width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#e8820c,#cf6a00);color:white;border:none;cursor:pointer;font-size:.85rem;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    #zcSend:disabled{opacity:.4;cursor:not-allowed}
    @media(max-width:400px){
      #zcWin{right:10px !important;width:calc(100vw - 20px) !important}
      #zcBtn{right:14px !important}
    }
  </style>`);

  document.body.insertAdjacentHTML('beforeend', `
    <button id="zcBtn"><i class="fa-solid fa-comment-dots"></i><span class="zcN">1</span></button>
    <div id="zcWin">
      <div id="zcHead">
        <div class="zcAv"><i class="fa-solid fa-bolt"></i></div>
        <div class="zcInf">
          <div class="zcNm">ZipCargo Assistant</div>
          <div class="zcSt"><span class="zcDt"></span> Online · replies instantly</div>
        </div>
        <button id="zcClose"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div id="zcMsgs"></div>
      <div id="zcQR"></div>
      <div id="zcFoot">
        <textarea id="zcInp" placeholder="Ask me anything…" rows="1"></textarea>
        <button id="zcSend"><i class="fa-solid fa-paper-plane"></i></button>
      </div>
    </div>
  `);

  let isOpen = false, busy = false;
  const hist = [];

  function toggle() {
    isOpen = !isOpen;
    document.getElementById('zcWin').classList.toggle('on', isOpen);
    const ic = document.getElementById('zcBtn').querySelector('i');
    if (ic) ic.className = isOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-comment-dots';
    const badge = document.getElementById('zcBtn').querySelector('.zcN');
    if (badge) badge.remove();
    if (isOpen && document.getElementById('zcMsgs').children.length === 0) setTimeout(welcome, 200);
  }

  function addMsg(role, text) {
    const w = document.createElement('div');
    w.className = 'zm' + (role==='user' ? ' u' : '');
    w.innerHTML = `<div class="zav${role==='user'?' u':''}"><i class="fa-solid fa-${role==='user'?'user':'bolt'}" style="font-size:.55rem"></i></div><div class="zb ${role==='user'?'u':'b'}">${fmt(text)}</div>`;
    document.getElementById('zcMsgs').appendChild(w);
    scr();
  }

  function fmt(t) {
    return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.*?)\*/g,'<em>$1</em>')
      .replace(/\n/g,'<br>');
  }

  function showTyping() {
    const w=document.createElement('div'); w.className='zm'; w.id='zcTyping';
    w.innerHTML=`<div class="zav"><i class="fa-solid fa-bolt" style="font-size:.55rem"></i></div><div class="zb b"><div class="zdts"><span></span><span></span><span></span></div></div>`;
    document.getElementById('zcMsgs').appendChild(w); scr();
  }
  function hideTyping() { const t=document.getElementById('zcTyping'); if(t) t.remove(); }

  function setQR(list) {
    const el=document.getElementById('zcQR'); el.innerHTML='';
    (list||[]).forEach(item => {
      const b=document.createElement('button'); b.className='zqr';
      b.textContent=typeof item==='string'?item:item.label;
      b.onclick=()=>{ if(typeof item==='object'&&item.href) window.location.href=item.href; else send(typeof item==='string'?item:item.label); };
      el.appendChild(b);
    });
  }

  function scr() { const m=document.getElementById('zcMsgs'); m.scrollTop=m.scrollHeight; }
  const wait = ms => new Promise(r=>setTimeout(r,ms));

  // Shipment tracking
  function findTN(t) { const m=t.match(/\b(ZC[-\s]?\d{4}[-\s]?\d{3,6})\b/i); return m?m[1].replace(/\s/g,'-').toUpperCase():null; }
  async function getShipment(tn) {
    try { const r=await fetch(`/api/shipments/track/${encodeURIComponent(tn)}`); return r.ok?await r.json():null; } catch{return null;}
  }
  function fmtShipment(s) {
    const e={'Pending':'⏳','In Transit':'✈️','Out for Delivery':'🚚','Delivered':'✅','On Hold':'⚠️'}[s.status]||'📦';
    const tl=(s.timeline||[]).slice(-2).reverse().map(t=>`• ${t.status} — ${t.location||'N/A'}`).join('\n');
    return `${e} **Shipment: ${s.tracking}**\n\n**Status:** ${s.status}\n**From:** ${s.origin}\n**To:** ${s.dest}\n**Location:** ${s.location||'Updating...'}\n**Est. Delivery:** ${s.eta||'TBD'}\n**Service:** ${s.service}${tl?'\n\n**Recent Updates:**\n'+tl:''}`;
  }

  // AI call — goes through your server (key stays safe)
  async function callAI(userText) {
    const adminCtx = (()=>{ try{return localStorage.getItem('zc_ai_context')||'';}catch{return'';} })();
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: hist.slice(-10),
          adminContext: adminCtx
        })
      });
      const data = await res.json();
      return data.reply || null;
    } catch { return null; }
  }

  // Welcome message
  async function welcome() {
    showTyping(); await wait(600); hideTyping();
    const t=`👋 Hi there! I'm **Zara**, ZipCargo's AI assistant.\n\nI can help you with:\n• **Tracking** your shipment\n• **Pet & animal transport**\n• **Shipping services & pricing**\n• **Insurance & refund policy**\n• **Customs & documentation**\n\nWhat can I help you with today?`;
    addMsg('assistant',t); hist.push({r:'assistant',t});
    setQR(['Track my shipment','Pet transport info','Insurance info','Get a free quote']);
    const ctx=(()=>{try{return localStorage.getItem('zc_ai_context')||'';}catch{return'';}})();
    if(ctx){await wait(400);showTyping();await wait(500);hideTyping();addMsg('assistant',`📢 ${ctx}`);}
  }

  // Main send
  async function send(text) {
    text=(text||document.getElementById('zcInp').value).trim();
    if(!text||busy) return;
    busy=true;
    document.getElementById('zcInp').value='';
    document.getElementById('zcQR').innerHTML='';
    resize();
    addMsg('user',text);
    hist.push({r:'user',t:text});

    // Always check for tracking number first
    const tn=findTN(text);
    if(tn){
      showTyping(); await wait(900); hideTyping();
      const data=await getShipment(tn);
      if(data){
        const m=fmtShipment(data); addMsg('assistant',m); hist.push({r:'assistant',t:m});
        setQR(['Track another shipment',{label:'Go to Tracking Page',href:'tracking.html'},'Contact support']);
      } else {
        const m=`❌ I couldn't find a shipment with tracking number **${tn}**.\n\nPlease double-check the number — it should look like **ZC-2026-00123**. If you're sure it's correct, our team can help locate it.`;
        addMsg('assistant',m); hist.push({r:'assistant',t:m});
        setQR([{label:'📝 Contact Support',href:'contact.html'},'Try a different number']);
      }
      busy=false; return;
    }

    // Call Gemini AI
    showTyping();
    const reply = await callAI(text);
    hideTyping();

    if(reply){
      addMsg('assistant',reply); hist.push({r:'assistant',t:reply});
      // Smart follow-up suggestions
      const low=reply.toLowerCase();
      const q=[];
      if(low.includes('track')||low.includes('tracking number')) q.push('Track my shipment');
      if(low.includes('pet')||low.includes('animal')||low.includes('dog')||low.includes('cat')) q.push('Pet transport info');
      if(low.includes('quot')||low.includes('pric')||low.includes('cost')) q.push({label:'📝 Get a Free Quote',href:'contact.html'});
      if(low.includes('insur')||low.includes('refund')||low.includes('fee')) q.push('Insurance & fees info');
      if(low.includes('custom')||low.includes('document')) q.push('Customs info');
      if(low.includes('contact')||low.includes('team')||low.includes('support')) q.push({label:'Contact Us',href:'contact.html'});
      if(q.length===0) q.push('Tell me more','Get a free quote',{label:'Contact Us',href:'contact.html'});
      setQR(q.slice(0,3));
    } else {
      // Fallback when AI unavailable
      const low=text.toLowerCase();
      let r,q=[];
      if(low.includes('pet')||low.includes('dog')||low.includes('cat')||low.includes('animal')||low.includes('bird')){
        r=`🐾 ZipCargo specializes in **pet and animal transport**!\n\nWe handle everything:\n• IATA-compliant climate-controlled crates\n• Health certificates & vaccination records\n• Travel permits & import permits\n• Vet-approved handling throughout transit\n\n**Required fees (all 100% refundable on delivery):**\n• Vaccination Fee: $289\n• Pet Travel Permit: $100\n• Crate Rental: $200 | Purchase: $250\n• Insurance: $103\n\nAll fees are fully refunded once your pet arrives safely! 🐾`;
        q=['Insurance info','Get a quote',{label:'Contact Us',href:'contact.html'}];
      } else if(low.includes('insur')||low.includes('refund')||low.includes('fee')){
        r=`🛡️ **ZipCargo Refundable Fees:**\n\n• Insurance Fee: **$103** — 100% refundable\n• Vaccination Fee: **$289** — 100% refundable\n• Delivery Authorization: **$300** — 100% refundable\n• Pet Travel Permit: **$100** — 100% refundable\n\nEvery single fee is **fully refunded** the moment your shipment or pet arrives safely. You pay for protection — if everything goes well, you get it all back. Zero risk!`;
        q=['Pet transport info','Get a quote',{label:'Contact Us',href:'contact.html'}];
      } else if(low.includes('service')||low.includes('offer')||low.includes('freight')){
        r=`✈️ **ZipCargo Services:**\n\n• **Air Freight** — 1-5 business days worldwide\n• **Sea Freight** — 2-6 weeks, cost-effective\n• **Road Transport** — 1-10 days, GPS tracked\n• **Express Delivery** — same or next day\n• **Pet Transport** — full documentation handled\n• **Warehousing** — secure climate-controlled storage\n• **Customs Clearance** — we handle all paperwork`;
        q=['Pet transport info','Insurance info',{label:'Get a Free Quote',href:'contact.html'}];
      } else if(low.includes('price')||low.includes('cost')||low.includes('quot')||low.includes('how much')){
        r=`💰 Our rates depend on service type, weight, dimensions, and route.\n\nThe best way to get an accurate price is a **free quote** — fill out our contact form and we respond within 24 hours with a competitive price tailored to your shipment.`;
        q=[{label:'📝 Get a Free Quote',href:'contact.html'},'Our services','Pet transport info'];
      } else if(low.includes('track')||low.includes('package')||low.includes('where')){
        r=`📦 To track your shipment, just type your **ZipCargo tracking number** and I'll pull up the live details immediately.\n\nFormat: **ZC-2026-00123**\n\nOr visit our tracking page directly.`;
        q=[{label:'Go to Tracking',href:'tracking.html'}];
      } else if(low.includes('hello')||low.includes('hi')||low.includes('hey')||low.includes('good')){
        r=`👋 Hello! I'm **Zara**, your ZipCargo assistant. How can I help you today?\n\nI can assist with shipment tracking, pet transport, pricing, insurance, and more!`;
        q=['Track my shipment','Pet transport info','Insurance info','Get a quote'];
      } else if(low.includes('custom')||low.includes('import')||low.includes('export')||low.includes('document')){
        r=`📋 **Customs & Documentation:**\n\nZipCargo handles all customs clearance for you:\n• Import & export documentation\n• HTS code classification\n• Customs compliance & regulations\n• Bill of lading & airway bills\n• For pets: health certs, permits, vaccination records\n\nOur team manages everything so you don't have to worry about paperwork.`;
        q=['Pet transport info','Get a quote',{label:'Contact Us',href:'contact.html'}];
      } else {
        r=`I'm here to help with all your shipping needs! Ask me about:\n\n• **Tracking** a shipment\n• **Pet transport** — dogs, cats, birds & more\n• **Services** — air, sea, road, express\n• **Pricing** — free quote in 24hrs\n• **Insurance** — all fees 100% refundable\n• **Customs & documentation**`;
        q=['Track my shipment','Pet transport info','Insurance info','Get a quote'];
      }
      addMsg('assistant',r); hist.push({r:'assistant',t:r}); setQR(q);
    }
    busy=false;
  }

  function resize(){
    const t=document.getElementById('zcInp');
    t.style.height='auto';
    t.style.height=Math.min(t.scrollHeight,70)+'px';
  }

  document.getElementById('zcBtn').addEventListener('click',toggle);
  document.getElementById('zcClose').addEventListener('click',toggle);
  document.getElementById('zcSend').addEventListener('click',()=>send());
  document.getElementById('zcInp').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
  document.getElementById('zcInp').addEventListener('input',resize);


})();
