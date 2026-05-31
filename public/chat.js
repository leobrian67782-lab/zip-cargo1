// ============================================================
//  ZipCargo AI Chat Widget
//  Powered by Claude — fully self-contained
// ============================================================

(function () {
  'use strict';

  // ── Inject styles ────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    /* ── Chat bubble ── */
    #zc-chat-bubble {
      position: fixed;
      bottom: 50%;
      transform: translateY(50%);
      right: 0;
      width: 52px;
      height: 52px;
      border-radius: 14px 0 0 14px;
      background: linear-gradient(135deg, #e8820c, #cf6a00);
      color: white;
      border: none;
      cursor: pointer;
      z-index: 9000;
      box-shadow: -4px 4px 20px rgba(232,130,12,.55);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-size: 1.2rem;
      transition: width .2s, box-shadow .2s;
      animation: zcBubblePop .4s cubic-bezier(.34,1.56,.64,1) both;
    }
    #zc-chat-bubble .zc-label {
      font-size: 8px;
      font-weight: 800;
      letter-spacing: .5px;
      font-family: 'Outfit', sans-serif;
      line-height: 1;
    }
    #zc-chat-bubble:hover { width: 60px; box-shadow: -6px 4px 24px rgba(232,130,12,.7); }
    #zc-chat-bubble:hover { transform: scale(1.08); box-shadow: 0 8px 32px rgba(232,130,12,.7); }
    #zc-chat-bubble .zc-notif {
      position: absolute;
      top: -4px; right: -4px;
      width: 18px; height: 18px;
      background: #ef4444;
      border-radius: 50%;
      border: 2px solid white;
      font-size: 10px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    @keyframes zcBubblePop {
      from { transform: scale(0); opacity: 0; }
      to   { transform: scale(1); opacity: 1; }
    }

    /* ── Chat window ── */
    #zc-chat-window {
      position: fixed;
      top: 50%;
      transform: translateY(-50%) translateX(20px);
      right: 60px;
      width: 370px;
      max-width: calc(100vw - 80px);
      height: 560px;
      max-height: calc(100vh - 40px);
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,.18), 0 4px 16px rgba(0,0,0,.08);
      display: flex;
      flex-direction: column;
      z-index: 9001;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      transition: transform .25s cubic-bezier(.34,1.56,.64,1), opacity .2s ease;
    }
    #zc-chat-window.open {
      transform: translateY(-50%) translateX(0);
      opacity: 1;
      pointer-events: all;
    }

    /* ── Header ── */
    #zc-chat-header {
      background: linear-gradient(135deg, #0d1f35, #1a3a5c);
      padding: 16px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    .zc-avatar {
      width: 40px; height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg,#e8820c,#f59e0b);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(232,130,12,.4);
    }
    .zc-header-info { flex: 1; }
    .zc-header-name { color: white; font-weight: 800; font-size: .95rem; font-family: 'Outfit', sans-serif; }
    .zc-header-status {
      display: flex; align-items: center; gap: 5px;
      font-size: .72rem; color: #7a9ab8; margin-top: 2px;
    }
    .zc-status-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #22c55e;
      animation: zcStatusPulse 2s ease-in-out infinite;
    }
    @keyframes zcStatusPulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,.5); }
      50%      { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
    }
    #zc-chat-close {
      background: rgba(255,255,255,.1);
      border: none; color: white;
      width: 30px; height: 30px;
      border-radius: 50%;
      cursor: pointer;
      font-size: .9rem;
      display: flex; align-items: center; justify-content: center;
      transition: background .2s;
    }
    #zc-chat-close:hover { background: rgba(255,255,255,.2); }

    /* ── Messages ── */
    #zc-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f8fafc;
    }
    #zc-messages::-webkit-scrollbar { width: 4px; }
    #zc-messages::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }

    .zc-msg {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      animation: zcMsgIn .3s ease both;
    }
    @keyframes zcMsgIn {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .zc-msg.user { flex-direction: row-reverse; }
    .zc-msg-avatar {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg,#e8820c,#f59e0b);
      display: flex; align-items: center; justify-content: center;
      font-size: .75rem; color: white; flex-shrink: 0;
      font-weight: 800;
    }
    .zc-msg-avatar.user-av {
      background: linear-gradient(135deg,#0d1f35,#1a3a5c);
    }
    .zc-bubble {
      max-width: 78%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: .855rem;
      line-height: 1.6;
      font-family: 'Outfit', sans-serif;
    }
    .zc-bubble.bot {
      background: white;
      color: #1e293b;
      border-bottom-left-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,.07);
      border: 1px solid #f1f5f9;
    }
    .zc-bubble.user {
      background: linear-gradient(135deg, #e8820c, #cf6a00);
      color: white;
      border-bottom-right-radius: 4px;
    }
    .zc-bubble a { color: #e8820c; text-decoration: underline; }
    .zc-bubble.user a { color: white; }

    /* Typing indicator */
    .zc-typing {
      display: flex; gap: 5px;
      align-items: center;
      padding: 12px 16px;
    }
    .zc-typing span {
      width: 7px; height: 7px;
      background: #cbd5e1;
      border-radius: 50%;
      animation: zcTypeBounce .9s ease-in-out infinite;
    }
    .zc-typing span:nth-child(2) { animation-delay: .15s; }
    .zc-typing span:nth-child(3) { animation-delay: .3s; }
    @keyframes zcTypeBounce {
      0%,60%,100% { transform: translateY(0); }
      30%          { transform: translateY(-6px); }
    }

    /* Quick replies */
    #zc-quick-replies {
      padding: 8px 12px 4px;
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      background: #f8fafc;
      border-top: 1px solid #f1f5f9;
    }
    .zc-qr {
      background: white;
      border: 1px solid #e2e8f0;
      color: #0d1f35;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: .75rem;
      font-weight: 600;
      cursor: pointer;
      font-family: 'Outfit', sans-serif;
      transition: all .15s;
      white-space: nowrap;
    }
    .zc-qr:hover { background: #e8820c; color: white; border-color: #e8820c; }

    /* Input area */
    #zc-input-area {
      padding: 12px 14px;
      display: flex;
      gap: 8px;
      align-items: flex-end;
      background: white;
      border-top: 1px solid #f1f5f9;
      flex-shrink: 0;
    }
    #zc-input {
      flex: 1;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px 14px;
      font-size: .875rem;
      font-family: 'Outfit', sans-serif;
      resize: none;
      outline: none;
      max-height: 100px;
      line-height: 1.5;
      color: #1e293b;
      transition: border-color .2s;
    }
    #zc-input:focus { border-color: #e8820c; }
    #zc-send {
      width: 40px; height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, #e8820c, #cf6a00);
      color: white;
      border: none;
      cursor: pointer;
      font-size: .95rem;
      display: flex; align-items: center; justify-content: center;
      transition: transform .15s, box-shadow .15s;
      flex-shrink: 0;
    }
    #zc-send:hover { transform: scale(1.08); box-shadow: 0 4px 12px rgba(232,130,12,.5); }
    #zc-send:disabled { opacity: .5; cursor: not-allowed; transform: none; }

    /* Timestamp */
    .zc-time {
      font-size: .65rem;
      color: #94a3b8;
      text-align: center;
      margin: 4px 0;
    }

    @media (max-width: 600px) {
      #zc-chat-window {
        top: auto;
        bottom: 0;
        right: 0;
        left: 0;
        width: 100%;
        max-width: 100%;
        height: 80vh;
        max-height: 80vh;
        border-radius: 20px 20px 0 0;
        transform: translateY(100%);
      }
      #zc-chat-window.open {
        transform: translateY(0);
      }
      #zc-chat-bubble {
        bottom: 50%;
        right: 0;
        transform: translateY(50%);
        border-radius: 14px 0 0 14px;
      }
    }
  `;
  document.head.appendChild(style);

  // ── Build DOM ────────────────────────────────────────────
  const bubble = document.createElement('button');
  bubble.id = 'zc-chat-bubble';
  bubble.innerHTML = '<i class="fa-solid fa-comment-dots"></i><span class="zc-label">CHAT</span><span class="zc-notif">1</span>';
  bubble.title = 'Chat with ZipCargo AI';

  const win = document.createElement('div');
  win.id = 'zc-chat-window';
  win.innerHTML = `
    <div id="zc-chat-header">
      <div class="zc-avatar"><i class="fa-solid fa-bolt"></i></div>
      <div class="zc-header-info">
        <div class="zc-header-name">ZipCargo Assistant</div>
        <div class="zc-header-status">
          <span class="zc-status-dot"></span> Online — typically replies instantly
        </div>
      </div>
      <button id="zc-chat-close" title="Close"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div id="zc-messages"></div>
    <div id="zc-quick-replies"></div>
    <div id="zc-input-area">
      <textarea id="zc-input" placeholder="Ask about your shipment, services, pricing…" rows="1"></textarea>
      <button id="zc-send"><i class="fa-solid fa-paper-plane"></i></button>
    </div>
  `;

  document.body.appendChild(bubble);
  document.body.appendChild(win);

  // ── State ────────────────────────────────────────────────
  const msgs = [];
  let isOpen = false;
  let isThinking = false;
  let thinkingEl = null;
  let adminContext = '';

  // ── Load admin context from localStorage ─────────────────
  function loadAdminContext() {
    try {
      adminContext = localStorage.getItem('zc_ai_context') || '';
    } catch(e) { adminContext = ''; }
  }

  // ── System prompt ────────────────────────────────────────
  function buildSystemPrompt() {
    const base = `You are the ZipCargo AI Assistant — a professional, warm, and knowledgeable logistics support agent for ZipCargo, a global freight and logistics company operating in 150+ countries.

Your personality: Professional yet friendly. Concise but thorough. Always reassuring and solution-focused. You represent a trusted global brand.

CORE KNOWLEDGE:
- ZipCargo services: Air Freight, Sea Freight, Road Transport, Warehousing, Customs Clearance, Supply Chain Consulting, Express Delivery
- Coverage: 150+ countries, major hubs in New York, London, Dubai, Singapore, Lagos, Sydney and more
- On-time rate: 99.8% | 80,000+ deliveries monthly | 15+ years in operation | ISO 9001 Certified
- 24/7 live customer support | Real-time GPS tracking on all shipments

INSURANCE & PAYMENTS — ALWAYS MENTION THIS WHEN RELEVANT:
- All insurance fees are FULLY REFUNDABLE if a claim is not made
- All payments and service fees are REFUNDABLE in accordance with ZipCargo's refund policy
- Customers should not hesitate to pay for insurance as it protects their cargo and the fee comes back if unused
- Payment methods and exact pricing are provided by our team — direct customers to the contact page or tell them to ask for a quote

TRACKING:
- When a customer provides a tracking number (format: ZC-YYYY-NNNNN), you will receive the shipment data and can explain the status, route, timeline, and estimated delivery clearly
- Always explain what each status means: Pending = order received, In Transit = shipment moving, Out for Delivery = arriving soon, Delivered = completed, On Hold = requires attention

WHAT YOU CANNOT DO:
- You cannot process payments, make bookings, or access private account information beyond what's provided
- For complex customs questions, direct to our team via the contact page
- Never make up tracking numbers or shipment data

TONE RULES:
- Never say "I'm just an AI" — you are the ZipCargo Assistant
- Keep responses under 4 sentences unless the customer needs detailed help
- Use line breaks to keep things readable
- End with a helpful follow-up question or next step when appropriate
- If someone asks about pricing, say rates depend on weight, distance, and service type and invite them to get a free quote

${adminContext ? `\nSPECIAL ADMIN INSTRUCTIONS (highest priority — follow these exactly):\n${adminContext}` : ''}`;
    return base;
  }

  // ── Fetch shipment data ──────────────────────────────────
  async function fetchShipment(trackingNum) {
    try {
      const res = await fetch(`/api/shipments/track/${encodeURIComponent(trackingNum.toUpperCase().trim())}`);
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }

  // ── Extract tracking number from message ─────────────────
  function extractTracking(text) {
    const match = text.match(/\b(ZC[-\s]?\d{4}[-\s]?\d{4,6})\b/i);
    return match ? match[1].replace(/\s/g, '-').toUpperCase() : null;
  }

  // ── Format shipment for AI context ──────────────────────
  function formatShipment(s) {
    const tl = (s.timeline || []).slice(-3).map(t =>
      `  • ${t.status} — ${t.location || 'N/A'} (${new Date(t.timestamp).toLocaleDateString()})`
    ).join('\n');
    return `SHIPMENT DATA FOR ${s.tracking}:
- Status: ${s.status}
- Service: ${s.service}
- From: ${s.sName} (${s.origin})
- To: ${s.rName} (${s.dest})
- Current Location: ${s.location || 'Not updated'}
- Est. Delivery: ${s.eta || 'TBD'}
- Weight: ${s.weight ? s.weight + ' kg' : 'N/A'}
- Recent Timeline:
${tl || '  • No updates yet'}`;
  }

  // ── Send message to Claude API ───────────────────────────
  async function sendToAI(userText) {
    loadAdminContext();
    let extraContext = '';

    // Check for tracking number in message
    const tn = extractTracking(userText);
    if (tn) {
      const shipData = await fetchShipment(tn);
      if (shipData) {
        extraContext = '\n\n[SYSTEM: Live shipment data retrieved]\n' + formatShipment(shipData);
      } else {
        extraContext = `\n\n[SYSTEM: Tracking number ${tn} was not found in the system. Tell the customer politely and suggest they double-check the number or contact support.]`;
      }
    }

    const apiMessages = msgs.map(m => ({ role: m.role, content: m.content }));
    // Add extra context to the latest user message
    if (extraContext) {
      apiMessages[apiMessages.length - 1].content += extraContext;
    }

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: buildSystemPrompt(),
        messages: apiMessages,
      }),
    });

    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.reply || 'Sorry, I had trouble responding. Please try again.';
  }

  // ── Render message ───────────────────────────────────────
  function renderMsg(role, text) {
    const msgEl = document.createElement('div');
    msgEl.className = `zc-msg ${role}`;
    const av = document.createElement('div');
    av.className = `zc-msg-avatar ${role === 'user' ? 'user-av' : ''}`;
    av.innerHTML = role === 'user'
      ? '<i class="fa-solid fa-user" style="font-size:.7rem;"></i>'
      : '<i class="fa-solid fa-bolt" style="font-size:.7rem;"></i>';
    const bub = document.createElement('div');
    bub.className = `zc-bubble ${role === 'user' ? 'user' : 'bot'}`;
    // Convert newlines to <br> and basic markdown bold
    bub.innerHTML = text
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
      .replace(/\n/g,'<br>');
    msgEl.appendChild(av);
    msgEl.appendChild(bub);
    document.getElementById('zc-messages').appendChild(msgEl);
    scrollToBottom();
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'zc-msg';
    el.innerHTML = `
      <div class="zc-msg-avatar"><i class="fa-solid fa-bolt" style="font-size:.7rem;"></i></div>
      <div class="zc-bubble bot"><div class="zc-typing"><span></span><span></span><span></span></div></div>`;
    document.getElementById('zc-messages').appendChild(el);
    scrollToBottom();
    return el;
  }

  function scrollToBottom() {
    const m = document.getElementById('zc-messages');
    m.scrollTop = m.scrollHeight;
  }

  function setQuickReplies(replies) {
    const el = document.getElementById('zc-quick-replies');
    el.innerHTML = '';
    replies.forEach(r => {
      const btn = document.createElement('button');
      btn.className = 'zc-qr';
      btn.textContent = r;
      btn.onclick = () => handleSend(r);
      el.appendChild(btn);
    });
  }

  // ── Handle send ──────────────────────────────────────────
  async function handleSend(text) {
    text = (text || document.getElementById('zc-input').value).trim();
    if (!text || isThinking) return;

    // Remove notification badge
    const notif = bubble.querySelector('.zc-notif');
    if (notif) notif.remove();

    document.getElementById('zc-input').value = '';
    document.getElementById('zc-quick-replies').innerHTML = '';
    autoResize();

    msgs.push({ role: 'user', content: text });
    renderMsg('user', text);

    isThinking = true;
    document.getElementById('zc-send').disabled = true;
    thinkingEl = showTyping();

    try {
      const reply = await sendToAI(text);
      thinkingEl.remove();
      msgs.push({ role: 'assistant', content: reply });
      renderMsg('assistant', reply);

      // Dynamic quick replies based on context
      const lower = reply.toLowerCase();
      const qr = [];
      if (lower.includes('track') || lower.includes('shipment')) qr.push('Track my package');
      if (lower.includes('quote') || lower.includes('price')) qr.push('Get a free quote');
      if (lower.includes('insurance')) qr.push('Tell me more about insurance');
      if (lower.includes('contact') || lower.includes('team')) qr.push('How do I contact support?');
      if (qr.length === 0) qr.push('What services do you offer?', 'How does tracking work?');
      setQuickReplies(qr.slice(0, 3));

    } catch (err) {
      thinkingEl.remove();
      const errMsg = err.message && err.message.includes('configured')
        ? 'The AI service is being set up. In the meantime, please contact us directly at info@zipcargo.com or use the Contact page.'
        : 'I\'m having a connection issue right now. Please try again in a moment, or reach us directly via the Contact page.';
      renderMsg('assistant', errMsg);
    } finally {
      isThinking = false;
      document.getElementById('zc-send').disabled = false;
    }
  }

  // ── Auto resize textarea ─────────────────────────────────
  function autoResize() {
    const ta = document.getElementById('zc-input');
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 100) + 'px';
  }

  // ── Toggle chat ──────────────────────────────────────────
  function toggleChat() {
    isOpen = !isOpen;
    win.classList.toggle('open', isOpen);
    const icon = bubble.querySelector('i');
    if (icon) {
      icon.className = isOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-comment-dots';
    }
    if (isOpen && msgs.length === 0) {
      // Welcome message
      setTimeout(() => {
        const greeting = `👋 **Welcome to ZipCargo!**

I'm your personal logistics assistant. I can help you with:
• **Track a shipment** — just share your tracking number
• **Services & pricing** — air, sea, road, express
• **Insurance & payments** — all refundable
• **Customs & documentation** — expert guidance

How can I help you today?`;
        msgs.push({ role: 'assistant', content: greeting });
        renderMsg('assistant', greeting);
        setQuickReplies(['Track my shipment', 'View our services', 'Insurance info']);
      }, 300);
    }
  }

  // ── Events ───────────────────────────────────────────────
  bubble.addEventListener('click', toggleChat);
  document.getElementById('zc-chat-close').addEventListener('click', toggleChat);
  document.getElementById('zc-send').addEventListener('click', () => handleSend());
  document.getElementById('zc-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });
  document.getElementById('zc-input').addEventListener('input', autoResize);

  // Auto-open after 8 seconds if never opened
  setTimeout(() => {
    if (!isOpen && msgs.length === 0) {
      const notif = bubble.querySelector('.zc-notif');
      if (notif) notif.style.animation = 'zcBubblePop .4s ease both';
    }
  }, 8000);

})();
