// ===== TOKEN STORAGE (fallback for mobile browsers) =====
const TokenStore = {
  set: (t) => { try { localStorage.setItem('zc_token', t); } catch(e) {} },
  get: () => { try { return localStorage.getItem('zc_token'); } catch(e) { return null; } },
  clear: () => { try { localStorage.removeItem('zc_token'); } catch(e) {} }
};

// ===== API HELPERS =====
const api = {
  async req(method, path, body) {
    const token = TokenStore.get();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const opts = { method, headers, credentials: 'include' };
    if (body) opts.body = JSON.stringify(body);
    const res  = await fetch(path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },
  get:    p     => api.req('GET',    p),
  post:   (p,b) => api.req('POST',   p, b),
  put:    (p,b) => api.req('PUT',    p, b),
  patch:  (p,b) => api.req('PATCH',  p, b),
  delete: p     => api.req('DELETE', p),
};

// ===== TOAST =====
function showToast(msg, type='success') {
  const toast  = document.getElementById('adminToast');
  const msgEl  = document.getElementById('adminToastMsg');
  const iconEl = document.getElementById('adminToastIcon');
  if (!toast) return;
  iconEl.textContent = {success:'✅',error:'❌',info:'ℹ️'}[type]||'✅';
  msgEl.textContent  = msg;
  toast.style.display = 'block';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.style.display='none', 3500);
}

// ===== STATE =====
let shipments=[], inquiries=[], currentPage=1, totalPages=1;

// ===== LOGIN =====
async function adminLogin() {
  const user  = document.getElementById('loginUser').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const error = document.getElementById('loginError');
  error.textContent = '';
  try {
    const data = await api.post('/api/auth/login', { username:user, password:pass });
    if (data.token) TokenStore.set(data.token);
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display  = 'flex';
    setCurrentDate();
    await showSection('dashboard', null);
  } catch(e) {
    error.textContent = e.message;
    setTimeout(() => error.textContent='', 4000);
  }
}
document.getElementById('loginPass')?.addEventListener('keypress', e => { if(e.key==='Enter') adminLogin(); });
document.getElementById('loginUser')?.addEventListener('keypress', e => { if(e.key==='Enter') adminLogin(); });

// ===== LOGOUT =====
async function adminLogout() {
  if (!confirm('Are you sure you want to logout?')) return;
  try { await api.post('/api/auth/logout'); } catch {}
  TokenStore.clear();
  document.body.classList.remove('no-scroll');
  document.getElementById('adminPanel').style.display  = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  const w = document.getElementById('adminWrapper');
  if(w) w.classList.remove('visible');
}

// ===== DATE =====
function setCurrentDate() {
  document.getElementById('currentDate').textContent =
    new Date().toLocaleDateString('en-US',{weekday:'short',year:'numeric',month:'short',day:'numeric'});
}

// ===== NAVIGATION =====
async function showSection(name, clickedEl) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('sec-'+name)?.classList.add('active');
  const titles = {dashboard:'Dashboard',shipments:'Shipments',create:'New Shipment',receipts:'Receipts',inquiries:'Inquiries',settings:'Settings',activity:'Activity Log'};
  document.getElementById('pageTitle').textContent = titles[name]||name;
  if (clickedEl) clickedEl.classList.add('active');
  if (window.innerWidth<=900) closeSidebar();
  if (name==='dashboard')  await loadDashboard();
  if (name==='shipments')  await loadShipments();
  if (name==='inquiries')  await loadInquiries();
  if (name==='activity')   await loadActivity();
  if (name==='settings')   loadContactSettings();
}

function toggleSidebar() {
  const s=document.getElementById('sidebar'), b=document.getElementById('sidebarBackdrop');
  if(s.classList.contains('open')){ closeSidebar(); }
  else { s.classList.add('open'); b.classList.add('active'); document.body.style.overflow='hidden'; }
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('active');
  document.body.style.overflow='';
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const [stats, inqData] = await Promise.all([
      api.get('/api/shipments/stats'),
      api.get('/api/inquiries'),
    ]);
    document.getElementById('totalShipments').textContent = stats.total;
    document.getElementById('deliveredCount').textContent = stats.delivered;
    document.getElementById('transitCount').textContent   = stats.inTransit;
    document.getElementById('inquiryCount').textContent   = inqData.total;

    const tbody = document.getElementById('recentShipmentsBody');
    if (!stats.recent.length) {
      tbody.innerHTML='<tr><td colspan="4" class="empty-msg">No shipments yet</td></tr>'; return;
    }
    tbody.innerHTML = stats.recent.map(s => `
      <tr>
        <td><strong>${s.tracking}</strong></td>
        <td>${s.rName}</td>
        <td>${badgeHTML(s.status)}</td>
        <td>${new Date(s.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
      </tr>`).join('');
  } catch(e) { showToast('Dashboard load failed: '+e.message,'error'); }
}

// ===== SHIPMENTS =====
async function loadShipments(page=1) {
  currentPage = page;
  const search = document.getElementById('searchShipments')?.value||'';
  const status = document.getElementById('filterStatus')?.value||'';
  try {
    const data  = await api.get(`/api/shipments?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&page=${page}&limit=50`);
    shipments   = data.items;
    totalPages  = data.pages;
    renderShipmentsTable();
    renderPagination();
  } catch(e) { showToast('Load failed: '+e.message,'error'); }
}

function renderShipmentsTable() {
  const tbody = document.getElementById('shipmentsBody');
  if (!shipments.length) { tbody.innerHTML='<tr><td colspan="9" class="empty-msg">No shipments found.</td></tr>'; return; }
  tbody.innerHTML = shipments.map(s => `
    <tr>
      <td data-label="Tracking #"><strong>${s.tracking}</strong></td>
      <td data-label="Sender">${s.sName}</td>
      <td data-label="Recipient">${s.rName}</td>
      <td data-label="Origin">${s.origin}</td>
      <td data-label="Destination">${s.dest}</td>
      <td data-label="Service">${s.service}</td>
      <td data-label="Status">${badgeHTML(s.status)}</td>
      <td data-label="Date">${new Date(s.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
      <td data-label="Actions">
        <button class="tbl-btn tbl-btn-edit"    onclick="editShipment('${s._id}')"><i class="fa-solid fa-pen"></i> Edit</button>
        <button class="tbl-btn tbl-btn-receipt" onclick="quickReceipt('${s.tracking}')"><i class="fa-solid fa-receipt"></i></button>
        <button class="tbl-btn tbl-btn-delete"  onclick="deleteShipment('${s._id}','${s.tracking}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

function renderPagination() {
  const c = document.getElementById('paginationContainer'); if(!c) return;
  if (totalPages<=1) { c.innerHTML=''; return; }
  let html='';
  for(let i=1;i<=totalPages;i++)
    html+=`<button class="tbl-btn ${i===currentPage?'tbl-btn-edit':''}" onclick="loadShipments(${i})">${i}</button>`;
  c.innerHTML=html;
}

// ===== GENERATE TRACKING =====
function generateTracking() {
  document.getElementById('newTracking').value =
    `ZC-${new Date().getFullYear()}-${Math.floor(10000+Math.random()*90000)}`;
}

// ===== CREATE / UPDATE SHIPMENT =====
async function createShipment() {
  const f   = id => document.getElementById(id)?.value.trim();
  const msg = document.getElementById('createMsg');

  const payload = {
    tracking: f('newTracking'), service: f('newService'),
    sName: f('newSenderName'), sPhone: f('newSenderPhone'), sEmail: f('newSenderEmail'), origin: f('newOrigin'),
    rName: f('newRecipName'),  rPhone: f('newRecipPhone'),  rEmail: f('newRecipEmail'), dest: f('newDestination'),
    desc:   f('newDescription'),
    weight: parseFloat(f('newWeight'))||0,
    value:  parseFloat(f('newValue'))||0,
    cost:   parseFloat(f('newCost'))||0,
    eta: f('newETA'), status: f('newStatus'), location: f('newLocation'), notes: f('newNotes'),
  };

  if (!payload.tracking||!payload.sName||!payload.rName||!payload.origin||!payload.dest) {
    msg.style.color='#e74c3c';
    msg.textContent='Please fill in all required fields.';
    setTimeout(()=>msg.textContent='',4000); return;
  }

  try {
    const editingId = document.getElementById('newTracking').dataset.editingId;
    if (editingId) {
      await api.put(`/api/shipments/${editingId}`, payload);
      showToast(`Shipment ${payload.tracking} updated!`,'success');
      delete document.getElementById('newTracking').dataset.editingId;
    } else {
      await api.post('/api/shipments', payload);
      showToast(`Shipment ${payload.tracking} created!`,'success');
    }
    msg.style.color='#27ae60'; msg.textContent='Saved successfully!';
    setTimeout(()=>msg.textContent='',4000);
    clearForm();
  } catch(e) {
    msg.style.color='#e74c3c'; msg.textContent=e.message;
    setTimeout(()=>msg.textContent='',5000);
  }
}

// ===== EDIT SHIPMENT =====
function editShipment(id) {
  const s = shipments.find(x=>x._id===id); if(!s) return;
  showSection('create',null);
  const set=(el,val)=>{ if(document.getElementById(el)) document.getElementById(el).value=val||''; };
  set('newTracking',s.tracking);  set('newService',s.service);
  set('newSenderName',s.sName);   set('newSenderPhone',s.sPhone); set('newSenderEmail',s.sEmail); set('newOrigin',s.origin);
  set('newRecipName',s.rName);    set('newRecipPhone',s.rPhone);  set('newRecipEmail',s.rEmail);  set('newDestination',s.dest);
  set('newDescription',s.desc);   set('newWeight',s.weight);      set('newValue',s.value);        set('newCost',s.cost);
  set('newETA',s.eta);            set('newStatus',s.status);      set('newLocation',s.location);  set('newNotes',s.notes);
  document.getElementById('newTracking').dataset.editingId = id;
  const msg=document.getElementById('createMsg');
  msg.style.color='#185fa5'; msg.textContent=`Editing ${s.tracking} — make changes and click Save.`;
}

// ===== DELETE SHIPMENT =====
async function deleteShipment(id, tracking) {
  if (!confirm(`Delete shipment ${tracking}? This cannot be undone.`)) return;
  try {
    await api.delete(`/api/shipments/${id}`);
    showToast(`Deleted ${tracking}`,'info');
    await loadShipments(currentPage);
    await loadDashboard();
  } catch(e) { showToast(e.message,'error'); }
}

// ===== CLEAR FORM =====
function clearForm() {
  ['newTracking','newSenderName','newSenderPhone','newSenderEmail','newOrigin',
   'newRecipName','newRecipPhone','newRecipEmail','newDestination','newDescription',
   'newWeight','newValue','newCost','newETA','newLocation','newNotes'].forEach(id => {
    const el=document.getElementById(id); if(el) el.value='';
  });
  const st=document.getElementById('newStatus');   if(st) st.value='Pending';
  const sv=document.getElementById('newService');  if(sv) sv.value='Air Freight';
  const tr=document.getElementById('newTracking'); if(tr) delete tr.dataset.editingId;
}

// ===== INQUIRIES =====
async function loadInquiries() {
  try {
    const data = await api.get('/api/inquiries');
    inquiries  = data.items;
    const tbody = document.getElementById('inquiriesBody');
    if (!inquiries.length) { tbody.innerHTML='<tr><td colspan="7" class="empty-msg">No inquiries yet.</td></tr>'; return; }
    tbody.innerHTML = inquiries.map((inq,i) => `
      <tr style="${!inq.read?'font-weight:700;background:#fffef8;':''}">
        <td>${i+1}</td>
        <td>${inq.name}</td>
        <td>${inq.email}</td>
        <td>${inq.service||'—'}</td>
        <td>${inq.message.substring(0,60)}${inq.message.length>60?'...':''}</td>
        <td>${new Date(inq.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
        <td>
          ${!inq.read?`<button class="tbl-btn tbl-btn-edit" onclick="markRead('${inq._id}')">Mark Read</button>`:''}
          <button class="tbl-btn tbl-btn-delete" onclick="deleteInquiry('${inq._id}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`).join('');
  } catch(e) { showToast('Load inquiries failed: '+e.message,'error'); }
}

async function markRead(id) {
  try { await api.patch(`/api/inquiries/${id}/read`); await loadInquiries(); }
  catch(e) { showToast(e.message,'error'); }
}

async function deleteInquiry(id) {
  if (!confirm('Delete this inquiry?')) return;
  try {
    await api.delete(`/api/inquiries/${id}`);
    showToast('Inquiry deleted.','info');
    await loadInquiries();
    await loadDashboard();
  } catch(e) { showToast(e.message,'error'); }
}

// ===== ACTIVITY LOG =====
async function loadActivity() {
  try {
    const data  = await api.get('/api/activity?limit=100');
    const tbody = document.getElementById('activityBody');
    if (!data.items.length) { tbody.innerHTML='<tr><td colspan="4" class="empty-msg">No activity yet.</td></tr>'; return; }
    tbody.innerHTML = data.items.map(l => `
      <tr>
        <td>${new Date(l.timestamp).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</td>
        <td><strong>${l.username}</strong></td>
        <td>${l.action}</td>
        <td>${l.detail||'—'}</td>
      </tr>`).join('');
  } catch(e) { showToast('Activity load failed: '+e.message,'error'); }
}

// ===== RECEIPT =====
async function generateReceipt() {
  const tracking = document.getElementById('receiptTracking').value.trim();
  const error    = document.getElementById('receiptError');
  const output   = document.getElementById('receiptOutput');
  if (!tracking) { error.textContent='Please enter a tracking number.'; setTimeout(()=>error.textContent='',3000); return; }

  try {
    const s = await api.get(`/api/shipments/track/${encodeURIComponent(tracking)}`);
    window._currentReceiptData = s; // store for PDF generation
    error.textContent='';
    buildReceiptHTML(s);
    output.style.display='block';
    output.scrollIntoView({ behavior:'smooth' });
    const actDiv = output.querySelector('.receipt-actions');
    if (actDiv) actDiv.innerHTML=`
      <button class="btn-save" onclick="printReceipt()"><i class="fa-solid fa-print"></i> Print</button>
      <button class="btn-save" style="background:#27ae60;" onclick="downloadPDF('${s.tracking}')"><i class="fa-solid fa-file-pdf"></i> Download PDF</button>
      <button class="btn-clear" onclick="document.getElementById('receiptOutput').style.display='none'"><i class="fa-solid fa-xmark"></i> Close</button>`;
  } catch(e) {
    error.textContent=e.message; setTimeout(()=>error.textContent='',4000);
    output.style.display='none';
  }
}

async function quickReceipt(tracking) {
  showSection('receipts',null);
  document.getElementById('receiptTracking').value=tracking;
  setTimeout(generateReceipt,200);
}

// ===== BUILD RECEIPT HTML =====
function buildReceiptHTML(s) {
  var statusColors = {
    'Delivered':        { bg:'#d1fae5', color:'#065f46', bar:'#10b981' },
    'In Transit':       { bg:'#dbeafe', color:'#1e40af', bar:'#3b82f6' },
    'Out for Delivery': { bg:'#dcfce7', color:'#14532d', bar:'#22c55e' },
    'On Hold':          { bg:'#fee2e2', color:'#7f1d1d', bar:'#ef4444' },
    'Pending':          { bg:'#fef9c3', color:'#854d0e', bar:'#f59e0b' }
  };
  var sc = statusColors[s.status] || statusColors['Pending'];

  var steps = ['Pending','In Transit','Out for Delivery','Delivered'];
  var stepLabels = ['Order Placed','In Transit','Out for Delivery','Delivered'];
  var stepIcons  = ['fa-file-circle-check','fa-plane-up','fa-truck-fast','fa-house-circle-check'];
  var curIdx = s.status === 'On Hold' ? -1 : steps.indexOf(s.status);

  var stepsHTML = '';
  for (var i = 0; i < steps.length; i++) {
    var done   = curIdx >= 0 && i <= curIdx;
    var active = i === curIdx;
    var lineW  = (curIdx >= 0 && i < curIdx) ? '100%' : '0%';
    var lineHTML = '';
    if (i < steps.length - 1) {
      lineHTML = '<div style="position:absolute;top:20px;left:50%;width:100%;height:3px;background:#e5e7eb;z-index:0;">'
               + '<div style="height:100%;width:'+lineW+';background:linear-gradient(90deg,#27ae60,#10b981);"></div></div>';
    }
    var bg = done ? (active ? 'linear-gradient(135deg,#e8820c,#f59e0b)' : 'linear-gradient(135deg,#27ae60,#10b981)') : '#f1f5f9';
    var ic = done ? 'white' : '#cbd5e1';
    var ring = active ? 'outline:3px solid rgba(232,130,12,.3);outline-offset:3px;' : '';
    stepsHTML += '<div style="display:flex;flex-direction:column;align-items:center;flex:1;position:relative;z-index:1;">'
              + lineHTML
              + '<div style="width:42px;height:42px;border-radius:50%;z-index:1;background:'+bg+';display:flex;align-items:center;justify-content:center;'+ring+'">'
              + '<i class="fa-solid '+stepIcons[i]+'" style="font-size:15px;color:'+ic+';"></i></div>'
              + '<div style="font-size:.6rem;text-align:center;margin-top:8px;line-height:1.35;max-width:66px;color:'+(active?'#0d1f35':(done?'#374151':'#94a3b8'))+';font-weight:'+(active?'700':(done?'600':'400'))+';">'+stepLabels[i]+'</div>'
              + '</div>';
  }

  var date = s.date || new Date(s.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});
  function fmt(v) { return v ? parseFloat(v).toLocaleString() : '—'; }

  function row(label, val) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f8fafc;">'
         + '<span style="font-size:.8rem;color:#64748b;font-weight:500;">'+label+'</span>'
         + '<strong style="font-size:.85rem;color:#0d1f35;text-align:right;max-width:55%;">'+( val||'—')+'</strong>'
         + '</div>';
  }

  function section(title, icon, content) {
    return '<div style="padding:20px 28px;border-bottom:1px solid #f1f5f9;">'
         + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">'
         + '<div style="width:30px;height:30px;border-radius:8px;background:#fff7ed;display:flex;align-items:center;justify-content:center;">'
         + '<i class="fa-solid '+icon+'" style="color:#e8820c;font-size:.85rem;"></i></div>'
         + '<div style="font-size:.65rem;font-weight:700;color:#0d1f35;text-transform:uppercase;letter-spacing:.8px;">'+title+'</div>'
         + '</div>' + content + '</div>';
  }

  var receiptNumber = 'ZCR-' + new Date().getFullYear() + '-' + s.tracking.replace(/[^A-Z0-9]/g,'').slice(-6);

  document.getElementById('receiptContent').innerHTML =
    '<div style="background:white;border-radius:18px;overflow:hidden;border:1px solid #f1f5f9;font-family:\'Outfit\',sans-serif;">'

    // colour accent bar
    + '<div style="height:5px;background:linear-gradient(90deg,'+sc.bar+','+sc.bar+'99);"></div>'

    // header
    + '<div style="background:linear-gradient(135deg,#0a1628 0%,#0d1f35 60%,#1a3a5c 100%);padding:28px 32px;">'
    + '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;">'
    + '<div>'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">'
    + '<div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#e8820c,#f59e0b);display:flex;align-items:center;justify-content:center;">'
    + '<i class="fa-solid fa-bolt" style="color:white;font-size:1rem;"></i></div>'
    + '<div style="font-size:1.6rem;font-weight:900;color:white;letter-spacing:-1px;">ZipCargo</div>'
    + '</div>'
    + '<div style="font-size:.72rem;color:#4a6a88;">Global Logistics Solutions</div>'
    + '</div>'
    + '<div style="text-align:right;">'
    + '<div style="font-size:.55rem;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#e8820c;margin-bottom:6px;">Official Receipt</div>'
    + '<div style="font-size:.65rem;color:#4a6a88;margin-bottom:4px;">Receipt No: <span style="color:#7a9ab8;font-weight:600;">'+receiptNumber+'</span></div>'
    + '<div style="font-size:1.1rem;font-weight:800;color:white;letter-spacing:1.5px;font-family:monospace;">'+s.tracking+'</div>'
    + '<div style="font-size:.7rem;color:#4a6a88;margin-top:6px;"><i class="fa-regular fa-calendar-days" style="font-size:9px;"></i> Issued: '+date+'</div>'
    + '<div style="margin-top:12px;">'
    + '<span style="background:'+sc.bg+';color:'+sc.color+';padding:6px 14px;border-radius:20px;font-size:.72rem;font-weight:700;">'
    + s.status+'</span></div>'
    + '</div></div></div>'

    // route bar
    + '<div style="padding:18px 32px;background:#f8fafc;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;gap:12px;">'
    + '<div style="flex:1;">'
    + '<div style="font-size:.58rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px;font-weight:600;">Origin</div>'
    + '<div style="display:flex;align-items:center;gap:7px;">'
    + '<div style="width:28px;height:28px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
    + '<i class="fa-solid fa-warehouse" style="color:#16a34a;font-size:11px;"></i></div>'
    + '<div style="font-size:.95rem;font-weight:800;color:#0d1f35;">'+s.origin+'</div></div></div>'
    + '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0;">'
    + '<div style="width:32px;height:2px;background:linear-gradient(90deg,#e2e8f0,#e8820c,#e2e8f0);border-radius:2px;"></div>'
    + '<i class="fa-solid fa-angles-right" style="color:#e8820c;font-size:.8rem;"></i>'
    + '<div style="font-size:.5rem;color:#cbd5e1;font-weight:600;letter-spacing:.5px;">ROUTE</div>'
    + '</div>'
    + '<div style="flex:1;text-align:right;">'
    + '<div style="font-size:.58rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px;font-weight:600;">Destination</div>'
    + '<div style="display:flex;align-items:center;justify-content:flex-end;gap:7px;">'
    + '<div style="font-size:.95rem;font-weight:800;color:#0d1f35;">'+s.dest+'</div>'
    + '<div style="width:28px;height:28px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
    + '<i class="fa-solid fa-flag-checkered" style="color:#ef4444;font-size:11px;"></i></div>'
    + '</div></div></div>'

    // progress
    + '<div style="padding:22px 32px;border-bottom:1px solid #f1f5f9;background:white;">'
    + '<div style="font-size:.6rem;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:18px;font-weight:600;display:flex;align-items:center;gap:6px;">'
    + '<i class="fa-solid fa-route" style="color:#e8820c;font-size:10px;"></i> Shipment Progress</div>'
    + '<div style="display:flex;align-items:flex-start;">'+stepsHTML+'</div>'
    + (s.status==='On Hold'?'<div style="margin-top:14px;background:#fee2e2;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:8px;font-size:.8rem;color:#991b1b;font-weight:600;"><i class="fa-solid fa-triangle-exclamation"></i> Shipment on hold — please contact support.</div>':'')
    + '</div>'

    // sender + recipient
    + '<div style="display:flex;flex-wrap:wrap;border-bottom:1px solid #f1f5f9;">'
    + '<div style="flex:1;min-width:200px;padding:20px 28px;border-right:1px solid #f8fafc;">'
    + '<div style="display:flex;align-items:center;gap:7px;margin-bottom:12px;">'
    + '<div style="width:28px;height:28px;border-radius:8px;background:#eff6ff;display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-user-tie" style="color:#3b82f6;font-size:.8rem;"></i></div>'
    + '<div style="font-size:.6rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.6px;">Sender</div>'
    + '</div>'
    + row('Name', s.sName)
    + row('Phone', s.sPhone)
    + row('Email', s.sEmail)
    + '</div>'
    + '<div style="flex:1;min-width:200px;padding:20px 28px;">'
    + '<div style="display:flex;align-items:center;gap:7px;margin-bottom:12px;">'
    + '<div style="width:28px;height:28px;border-radius:8px;background:#f0fdf4;display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-user-check" style="color:#16a34a;font-size:.8rem;"></i></div>'
    + '<div style="font-size:.6rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.6px;">Recipient</div>'
    + '</div>'
    + row('Name', s.rName)
    + row('Phone', s.rPhone)
    + row('Email', s.rEmail)
    + '</div></div>'

    // package + delivery
    + '<div style="display:flex;flex-wrap:wrap;border-bottom:1px solid #f1f5f9;">'
    + '<div style="flex:1;min-width:200px;padding:20px 28px;border-right:1px solid #f8fafc;">'
    + '<div style="display:flex;align-items:center;gap:7px;margin-bottom:12px;">'
    + '<div style="width:28px;height:28px;border-radius:8px;background:#fff7ed;display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-box-open" style="color:#e8820c;font-size:.8rem;"></i></div>'
    + '<div style="font-size:.6rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.6px;">Package</div>'
    + '</div>'
    + row('Service', s.service)
    + row('Weight', s.weight ? fmt(s.weight)+' kg' : null)
    + row('Declared Value', s.value ? '$'+fmt(s.value) : null)
    + row('Description', s.desc)
    + '</div>'
    + '<div style="flex:1;min-width:200px;padding:20px 28px;">'
    + '<div style="display:flex;align-items:center;gap:7px;margin-bottom:12px;">'
    + '<div style="width:28px;height:28px;border-radius:8px;background:#fdf4ff;display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-calendar-check" style="color:#9333ea;font-size:.8rem;"></i></div>'
    + '<div style="font-size:.6rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.6px;">Delivery</div>'
    + '</div>'
    + row('Est. Delivery', s.eta)
    + row('Current Location', s.location || s.origin)
    + row('Status', s.status)
    + row('Date Issued', date)
    + '</div></div>'

    // cost bar
    + '<div style="background:linear-gradient(135deg,#0a1628,#0d1f35);padding:22px 32px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">'
    + '<div>'
    + '<div style="font-size:.6rem;color:#4a6a88;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;font-weight:600;">Total Shipping Cost</div>'
    + '<div style="font-size:.72rem;color:#3a5478;">Inclusive of all applicable fees</div>'
    + '</div>'
    + '<div style="font-size:2.2rem;font-weight:900;color:#e8820c;letter-spacing:-1px;">'+(s.cost?'$'+parseFloat(s.cost).toFixed(2):'Contact Us')+'</div>'
    + '</div>'

    // notes
    + (s.notes ? '<div style="padding:16px 32px;background:#fffbf5;border-top:none;border-bottom:1px solid #f1f5f9;display:flex;gap:10px;align-items:flex-start;">'
    + '<i class="fa-solid fa-note-sticky" style="color:#e8820c;margin-top:2px;font-size:.9rem;flex-shrink:0;"></i>'
    + '<div><div style="font-size:.62rem;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px;">Notes</div>'
    + '<div style="font-size:.85rem;color:#374151;line-height:1.6;">'+s.notes+'</div></div></div>' : '')

    // footer
    + '<div style="padding:20px 32px;background:white;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;border-top:1px solid #f1f5f9;">'
    + '<div style="display:flex;align-items:center;gap:10px;">'
    + '<div style="width:40px;height:40px;border-radius:12px;background:#0d1f35;display:flex;align-items:center;justify-content:center;">'
    + '<i class="fa-solid fa-bolt" style="color:#e8820c;font-size:1.1rem;"></i></div>'
    + '<div><div style="font-size:.9rem;font-weight:800;color:#0d1f35;">ZipCargo Logistics</div>'
    + '<div style="font-size:.7rem;color:#94a3b8;">Ship Smarter. Deliver Faster.</div></div>'
    + '</div>'
    + '<div style="text-align:right;">'
    + '<div style="font-size:.68rem;color:#94a3b8;">Please retain for your records</div>'
    + '<div style="font-size:.7rem;color:#cbd5e1;margin-top:2px;">'+s.tracking+' &bull; '+receiptNumber+'</div>'
    + '</div></div>'
    + '</div>';
}

// ===== PRINT RECEIPT =====
function printReceipt() {
  const el=document.getElementById('receiptContent'); if(!el) return;
  const w=window.open('','_blank','width=900,height=700');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>ZipCargo Receipt</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>
    <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',sans-serif;background:white;}
    .badge{padding:4px 12px;border-radius:20px;font-size:.78rem;font-weight:700;}
    .badge-pending{background:#fff3cd;color:#856404;}.badge-transit{background:#cce5ff;color:#004085;}
    .badge-out,.badge-delivered{background:#d4edda;color:#155724;}.badge-hold{background:#f8d7da;color:#721c24;}
    </style></head><body>${el.innerHTML}</body></html>`);
  w.document.close(); w.focus(); setTimeout(()=>{w.print();w.close();},700);
}

// ===== SETTINGS =====
async function changePassword() {
  const oldP = document.getElementById('oldPass').value;
  const newP = document.getElementById('newPass').value;
  const conP = document.getElementById('confirmPass').value;
  const msg  = document.getElementById('passMsg');
  if (newP!==conP) { msg.style.color='#ef4444'; msg.textContent='Passwords do not match.'; return; }
  try {
    await api.post('/api/auth/change-password',{oldPassword:oldP,newPassword:newP});
    msg.style.color='#16a34a'; msg.textContent='\u2713 Password updated successfully!';
    ['oldPass','newPass','confirmPass'].forEach(id=>document.getElementById(id).value='');
    setTimeout(()=>msg.textContent='',4000);
  } catch(e) { msg.style.color='#ef4444'; msg.textContent=e.message; }
}

// ===== CONTACT INFO SETTINGS =====
var _contactFields = {
  phone:   { key:'zc_contact_phone',   inputId:'ciPhoneInput',   valId:'ciPhoneVal',   editId:'ciPhoneEdit'   },
  email:   { key:'zc_contact_email',   inputId:'ciEmailInput',   valId:'ciEmailVal',   editId:'ciEmailEdit'   },
  website: { key:'zc_contact_website', inputId:'ciWebsiteInput', valId:'ciWebsiteVal', editId:'ciWebsiteEdit' },
  hours:   { key:'zc_contact_hours',   inputId:'ciHoursInput',   valId:'ciHoursVal',   editId:'ciHoursEdit'   }
};

function loadContactSettings() {
  Object.keys(_contactFields).forEach(function(field) {
    var cfg = _contactFields[field];
    var val = localStorage.getItem(cfg.key) || '';
    var el  = document.getElementById(cfg.valId);
    if (el && val) el.textContent = val;
  });
}

function editContactField(field) {
  var cfg = _contactFields[field];
  var input = document.getElementById(cfg.inputId);
  var editDiv = document.getElementById(cfg.editId);
  var val = localStorage.getItem(cfg.key) || document.getElementById(cfg.valId).textContent;
  if (val === 'Not set' || val === '\u2014') val = '';
  input.value = val;
  editDiv.style.display = 'block';
  input.focus();
}

function cancelContactField(field) {
  var cfg = _contactFields[field];
  document.getElementById(cfg.editId).style.display = 'none';
}

function saveContactField(field) {
  var cfg   = _contactFields[field];
  var input = document.getElementById(cfg.inputId);
  var val   = input.value.trim();
  var msg   = document.getElementById('settingsMsg');

  // email must have a value (site needs at least one email)
  if (field === 'email' && !val) {
    msg.style.color='#ef4444'; msg.textContent='Email cannot be empty.';
    setTimeout(function(){msg.textContent='';},3000); return;
  }
  // phone and website CAN be cleared — remove from localStorage and show blank
  if (!val) {
    localStorage.removeItem(cfg.key);
    document.getElementById(cfg.valId).textContent = 'Not set';
    document.getElementById(cfg.editId).style.display = 'none';
    var siteEl   = document.getElementById('site'+field.charAt(0).toUpperCase()+field.slice(1));
    var footerEl = document.getElementById('footer'+field.charAt(0).toUpperCase()+field.slice(1));
    if (siteEl)   siteEl.textContent = '\u2014';
    if (footerEl) { footerEl.textContent = ''; footerEl.parentElement.style.display='none'; }
    msg.style.color='#16a34a'; msg.textContent='\u2713 ' + field.charAt(0).toUpperCase()+field.slice(1) + ' removed from the site.';
    showToast(field.charAt(0).toUpperCase()+field.slice(1)+' removed.','success');
    setTimeout(function(){msg.textContent='';},4000);
    return;
  }

  localStorage.setItem(cfg.key, val);
  document.getElementById(cfg.valId).textContent = val;
  document.getElementById(cfg.editId).style.display = 'none';
  var siteEl   = document.getElementById('site'+field.charAt(0).toUpperCase()+field.slice(1));
  var footerEl = document.getElementById('footer'+field.charAt(0).toUpperCase()+field.slice(1));
  if (siteEl)   siteEl.textContent   = val;
  if (footerEl) { footerEl.textContent = val; footerEl.parentElement.style.display=''; }
  msg.style.color='#16a34a';
  msg.textContent='\u2713 ' + field.charAt(0).toUpperCase()+field.slice(1) + ' updated on the site!';
  showToast(field.charAt(0).toUpperCase()+field.slice(1)+' updated successfully!','success');
  setTimeout(function(){msg.textContent='';},4000);
}

function saveSettings() {
  var msg=document.getElementById('settingsMsg');
  msg.style.color='#16a34a'; msg.textContent='\u2713 Settings saved!';
  setTimeout(function(){msg.textContent='';},3000);
}

// ===== BADGE HTML =====
function badgeHTML(status) {
  const m={'Pending':'badge-pending','In Transit':'badge-transit','Out for Delivery':'badge-out','Delivered':'badge-delivered','On Hold':'badge-hold'};
  return `<span class="badge ${m[status]||'badge-pending'}">${status}</span>`;
}

// ===== DOWNLOAD PDF =====
async function downloadPDF(tracking) {
  const btn = document.querySelector('button[onclick="downloadPDF(\''+tracking+'\')"]');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Generating...'; }

  function loadScript(src, cb) {
    if (document.querySelector('script[src="'+src+'"]')) { cb(); return; }
    var el = document.createElement('script'); el.src=src; el.onload=cb; document.head.appendChild(el);
  }

  function generate() {
    try {
      var jsPDF = window.jspdf.jsPDF;
      var s = window._currentReceiptData;
      if (!s) { alert('Please generate a receipt first.'); return; }

      var doc = new jsPDF({ unit:'mm', format:'a4', orientation:'portrait' });
      var W=210, H=297, L=15, R=195, MW=180;
      var date = s.date || new Date(s.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
      var receiptNo = 'ZCR-'+new Date().getFullYear()+'-'+s.tracking.replace(/[^A-Z0-9]/g,'').slice(-6);

      // ── helpers ──────────────────────────────────────────────────────────
      function fillRect(x,y,w,h, r,g,b){ doc.setFillColor(r,g,b); doc.rect(x,y,w,h,'F'); }
      function fillRR(x,y,w,h,rad, r,g,b){ doc.setFillColor(r,g,b); doc.roundedRect(x,y,w,h,rad,rad,'F'); }
      function drawLine(x1,y1,x2,y2, r,g,b, lw){
        doc.setDrawColor(r,g,b); doc.setLineWidth(lw||0.2); doc.line(x1,y1,x2,y2);
      }
      function bold(sz){ doc.setFont('helvetica','bold');   doc.setFontSize(sz); }
      function norm(sz){ doc.setFont('helvetica','normal'); doc.setFontSize(sz); }
      function ital(sz){ doc.setFont('helvetica','italic'); doc.setFontSize(sz); }
      function color(r,g,b){ doc.setTextColor(r,g,b); }
      function txt(str,x,y,opts){ doc.text(String(str||'—'),x,y,opts||{}); }
      function safeVal(v){ return (v && String(v).trim()) ? String(v) : '—'; }

      // status theme
      var sBg  = {'Delivered':[209,250,229],'In Transit':[219,234,254],'Out for Delivery':[220,252,231],'On Hold':[254,226,226],'Pending':[254,249,195]}[s.status]||[254,249,195];
      var sFg  = {'Delivered':[6,95,70],'In Transit':[30,64,175],'Out for Delivery':[20,83,52],'On Hold':[127,29,29],'Pending':[133,77,14]}[s.status]||[133,77,14];
      var sBar = {'Delivered':[16,185,129],'In Transit':[59,130,246],'Out for Delivery':[34,197,94],'On Hold':[239,68,68],'Pending':[245,158,11]}[s.status]||[245,158,11];

      // ── TOP COLOUR STRIPE ──────────────────────────────────────────────
      fillRect(0,0,W,3, sBar[0],sBar[1],sBar[2]);

      // ── HEADER ────────────────────────────────────────────────────────
      fillRect(0,3,W,44, 10,22,40);

      // icon box
      fillRR(L,9,13,13,2, 232,130,12);
      bold(10); color(255,255,255); txt('Z',L+3.8,18.2);

      // brand
      bold(18); color(255,255,255); txt('ZipCargo',L+17,18);
      norm(7);  color(90,130,170);  txt('Global Logistics Solutions',L+17,24.5);

      // right: receipt info
      bold(6);  color(232,130,12);  txt('OFFICIAL RECEIPT',R,11,{align:'right'});
      bold(13); color(255,255,255); txt(s.tracking,R,20,{align:'right'});
      norm(6.5);color(80,110,150);  txt('No: '+receiptNo,R,26.5,{align:'right'});
      norm(6.5);color(80,110,150);  txt('Issued: '+date,R,32.5,{align:'right'});

      // status badge
      fillRR(R-36,37,36,8,3, sBg[0],sBg[1],sBg[2]);
      bold(7); color(sFg[0],sFg[1],sFg[2]); txt(s.status,R-18,43.2,{align:'center'});

      // ── ROUTE BAR ────────────────────────────────────────────────────
      fillRect(0,47,W,18, 248,250,252);
      drawLine(0,65,W,65, 226,232,240);

      norm(6.5); color(148,163,184); txt('ORIGIN',L,54); txt('DESTINATION',R,54,{align:'right'});
      bold(10);  color(13,31,53);    txt(safeVal(s.origin),L,63); txt(safeVal(s.dest),R,63,{align:'right'});

      // arrow
      doc.setDrawColor(232,130,12); doc.setLineWidth(0.9);
      var ax=105, ay=61;
      doc.line(ax-9,ay,ax+8,ay);
      doc.line(ax+3,ay-2.5,ax+8,ay);
      doc.line(ax+3,ay+2.5,ax+8,ay);

      // ── PROGRESS ────────────────────────────────────────────────────
      fillRect(0,65,W,28, 255,255,255);
      bold(6); color(232,130,12); txt('SHIPMENT PROGRESS',L,73);
      drawLine(L,74.5,L+45,74.5, 232,130,12,0.4);

      var steps=['Pending','In Transit','Out for Delivery','Delivered'];
      var sLabels=['Order Placed','In Transit','Out for Delivery','Delivered'];
      var curIdx = s.status==='On Hold' ? -1 : steps.indexOf(s.status);
      var xs=[32,82,133,178], PY=83;

      for(var i=0;i<steps.length;i++){
        var done = curIdx>=0 && i<=curIdx;
        var actv = i===curIdx && s.status!=='On Hold';
        var cx=xs[i];
        if(i<steps.length-1){
          var lclr=(done&&i<curIdx)?[39,174,96]:[210,215,225];
          drawLine(cx+6,PY,xs[i+1]-6,PY, lclr[0],lclr[1],lclr[2], 0.8);
        }
        doc.setFillColor.apply(doc, done?(actv?[232,130,12]:[39,174,96]):[210,215,225]);
        doc.circle(cx,PY,5,'F');
        bold(6.5); color(255,255,255);
        txt(done?'✓':String(i+1), cx, PY+1.5, {align:'center'});
        norm(5.5); color(actv?13:120, actv?31:130, actv?53:145);
        // wrap label
        var words=sLabels[i].split(' ');
        if(words.length>1){
          txt(words.slice(0,Math.ceil(words.length/2)).join(' '), cx, PY+8.5, {align:'center'});
          txt(words.slice(Math.ceil(words.length/2)).join(' '),   cx, PY+12.5,{align:'center'});
        } else {
          txt(words[0], cx, PY+9, {align:'center'});
        }
      }

      // ── DATA GRID ────────────────────────────────────────────────────
      var y=97;
      var c1=L, c2=110, cw1=90, cw2=85;

      drawLine(L,y,R,y, 226,232,240);

      function secHdr(title,x,yy,cw){
        fillRR(x,yy,cw,7,1.5, 255,247,237);
        bold(6.5); color(200,100,10); txt(title,x+3,yy+5);
      }
      function row(lbl,v,x,yy,cw){
        norm(7.5); color(100,116,139); txt(lbl,x,yy);
        bold(7.5); color(15,23,42);    txt(safeVal(v),x+cw,yy,{align:'right',maxWidth:cw-18});
        drawLine(x,yy+2,x+cw,yy+2, 243,244,246, 0.15);
      }

      y+=3;
      secHdr('SENDER',c1,y,cw1); secHdr('RECIPIENT',c2,y,cw2); y+=10;
      row('Name',  s.sName, c1,y,cw1); row('Name',  s.rName, c2,y,cw2); y+=8;
      row('Phone', s.sPhone,c1,y,cw1); row('Phone', s.rPhone,c2,y,cw2); y+=8;
      row('Email', s.sEmail,c1,y,cw1); row('Email', s.rEmail,c2,y,cw2); y+=8;
      row('From',  s.origin,c1,y,cw1); row('To',    s.dest,  c2,y,cw2); y+=12;

      drawLine(L,y-2,R,y-2, 226,232,240);

      secHdr('PACKAGE',c1,y,cw1); secHdr('DELIVERY',c2,y,cw2); y+=10;
      row('Service', s.service,                               c1,y,cw1); row('Est. Delivery',s.eta,               c2,y,cw2); y+=8;
      row('Weight',  s.weight?s.weight+' kg':null,            c1,y,cw1); row('Location',     s.location||s.origin,c2,y,cw2); y+=8;
      row('Value',   s.value?'$'+parseFloat(s.value).toFixed(2):null,c1,y,cw1); row('Status',s.status,           c2,y,cw2); y+=8;
      row('Desc.',   s.desc,                                  c1,y,cw1); row('Date Issued',  date,                c2,y,cw2); y+=12;

      // ── COST BAR ────────────────────────────────────────────────────
      fillRect(0,y,W,22, 10,22,40);
      fillRR(L,y+3,MW,16,3, 18,32,55);
      norm(8);  color(90,130,170); txt('Total Shipping Cost',L+6,y+10);
      norm(6);  color(55,85,125);  txt('Inclusive of all fees',L+6,y+17);
      bold(20); color(232,130,12); txt(s.cost?'$'+parseFloat(s.cost).toFixed(2):'Contact Us',R-3,y+17,{align:'right'});
      y+=26;

      // ── NOTES ───────────────────────────────────────────────────────
      if(s.notes){
        fillRR(L,y,MW,12,2, 255,251,235);
        fillRect(L,y,2,12, 232,130,12);
        bold(7); color(13,31,53); txt('Notes:',L+5,y+7);
        norm(7); color(80,100,120); txt(s.notes,L+23,y+7,{maxWidth:MW-28});
        y+=16;
      }

      // ── VERIFIED STAMP + INFO ────────────────────────────────────────
      y+=6;
      // stamp
      doc.setDrawColor(39,174,96); doc.setLineWidth(1.4); doc.circle(L+14,y+14,13);
      doc.setLineWidth(0.35); doc.circle(L+14,y+14,10);
      bold(5.5); color(39,174,96);
      txt('ZIPCARGO',    L+14,y+7.5, {align:'center'});
      bold(7.5); txt('OFFICIAL', L+14,y+13,  {align:'center'});
      txt('RECEIPT',     L+14,y+18.5,{align:'center'});
      norm(5); txt('✓ VERIFIED',L+14,y+23,  {align:'center'});
      // text beside stamp
      norm(7);  color(100,116,139); txt('Document verified by',L+33,y+9);
      bold(9);  color(13,31,53);    txt('ZipCargo Logistics',  L+33,y+16);
      norm(6.5);color(148,163,184); txt(s.tracking+' • '+receiptNo,L+33,y+22);

      // ── FOOTER ──────────────────────────────────────────────────────
      fillRect(0,H-22,W,22, 248,250,252);
      drawLine(0,H-22,W,H-22, 226,232,240);
      fillRR(L,H-18,9,9,2, 13,31,53);
      bold(7);  color(232,130,12); txt('⚡',L+1.8,H-11.5);
      bold(8.5);color(13,31,53);   txt('ZipCargo Logistics',L+13,H-13);
      norm(6.5);color(120,130,155);txt('info@zipcargo.com  |  www.zipcargo.com',105,H-7,{align:'center'});
      ital(6);  color(148,163,184);txt('Ship Smarter. Deliver Faster. — Thank you for choosing ZipCargo.',105,H-2.5,{align:'center'});

      doc.save('ZipCargo-Receipt-'+tracking+'.pdf');
      if(btn){ btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-file-pdf"></i> Download PDF'; }

    } catch(e) {
      console.error('PDF error:',e);
      alert('PDF generation failed: '+e.message);
      if(btn){ btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-file-pdf"></i> Download PDF'; }
    }
  }

  loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', generate);
}

// ===== INVOICE GENERATOR =====
