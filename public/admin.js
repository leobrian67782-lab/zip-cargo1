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
let inquiriesPage = 1, inquiriesTotalPages = 1;

async function loadInquiries(page = 1) {
  inquiriesPage = page;
  const search = document.getElementById('searchInquiries')?.value || '';
  try {
    const data = await api.get(`/api/inquiries?page=${page}&limit=50&search=${encodeURIComponent(search)}`);
    inquiries         = data.items;
    inquiriesTotalPages = data.pages;
    const tbody = document.getElementById('inquiriesBody');
    if (!inquiries.length) { tbody.innerHTML='<tr><td colspan="7" class="empty-msg">No inquiries yet.</td></tr>'; renderInquiriesPagination(); return; }
    tbody.innerHTML = inquiries.map((inq,i) => `
      <tr style="${!inq.read?'font-weight:700;background:#fffef8;':''}">
        <td>${((page-1)*50)+i+1}</td>
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
    renderInquiriesPagination();
  } catch(e) { showToast('Load inquiries failed: '+e.message,'error'); }
}

function renderInquiriesPagination() {
  const c = document.getElementById('inquiriesPaginationContainer'); if(!c) return;
  if (inquiriesTotalPages <= 1) { c.innerHTML=''; return; }
  let html='';
  for(let i=1;i<=inquiriesTotalPages;i++)
    html+=`<button class="tbl-btn ${i===inquiriesPage?'tbl-btn-edit':''}" onclick="loadInquiries(${i})">${i}</button>`;
  c.innerHTML=html;
}

// ===== CSV EXPORTS =====
function exportShipmentsCSV() {
  const search = encodeURIComponent(document.getElementById('searchShipments')?.value || '');
  const status = encodeURIComponent(document.getElementById('filterStatus')?.value || '');
  const token  = TokenStore.get();
  const url    = `/api/shipments/export/csv?search=${search}&status=${status}`;
  // Use fetch with auth header then trigger download
  fetch(url, { headers: { Authorization: 'Bearer ' + token } })
    .then(r => r.blob())
    .then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'shipments-' + Date.now() + '.csv';
      a.click(); URL.revokeObjectURL(a.href);
    })
    .catch(() => showToast('Export failed.','error'));
}

function exportInquiriesCSV() {
  const token = TokenStore.get();
  fetch('/api/inquiries/export/csv', { headers: { Authorization: 'Bearer ' + token } })
    .then(r => r.blob())
    .then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'inquiries-' + Date.now() + '.csv';
      a.click(); URL.revokeObjectURL(a.href);
    })
    .catch(() => showToast('Export failed.','error'));
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
    // Generate QR code pointing to tracking URL
    var qrImg = document.getElementById('qr-'+s.tracking);
    if (qrImg) {
      var trackUrl = encodeURIComponent(window.location.origin + '/#tracking?t=' + s.tracking);
      qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=' + trackUrl;
    }
    output.style.display='block';
    output.scrollIntoView({ behavior:'smooth' });
    const actDiv = output.querySelector('.receipt-actions');
    if (actDiv) actDiv.innerHTML=`
      <button class="btn-save" onclick="printReceipt()"><i class="fa-solid fa-print"></i> Print</button>
      <button class="btn-save" style="background:#27ae60;" onclick="downloadPDF('${s.tracking}')"><i class="fa-solid fa-file-arrow-down"></i> Download Receipt</button>
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

    // footer with QR code
    + '<div style="padding:18px 32px;background:white;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;border-top:1px solid #f1f5f9;">'
    + '<div style="display:flex;align-items:center;gap:10px;">'
    + '<div style="width:40px;height:40px;border-radius:12px;background:#0d1f35;display:flex;align-items:center;justify-content:center;">'
    + '<i class="fa-solid fa-bolt" style="color:#e8820c;font-size:1.1rem;"></i></div>'
    + '<div><div style="font-size:.9rem;font-weight:800;color:#0d1f35;">ZipCargo Logistics</div>'
    + '<div style="font-size:.7rem;color:#94a3b8;">Ship Smarter. Deliver Faster.</div></div>'
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:14px;">'
    + '<div style="text-align:right;">'
    + '<div style="font-size:.62rem;color:#94a3b8;margin-bottom:2px;">Scan to track shipment</div>'
    + '<div style="font-size:.68rem;color:#94a3b8;">Please retain for your records</div>'
    + '<div style="font-size:.7rem;color:#cbd5e1;margin-top:2px;">'+s.tracking+' &bull; '+receiptNumber+'</div>'
    + '</div>'
    + '<div style="flex-shrink:0;">'
    + '<img id="qr-'+s.tracking+'" style="width:70px;height:70px;border-radius:8px;border:1px solid #e2e8f0;" src="" alt="QR Code"/>'
    + '</div>'
    + '</div></div>'
    + '</div>';
}

// ===== PRINT RECEIPT =====
function printReceipt() {
  const el = document.getElementById('receiptContent'); if (!el) return;
  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>ZipCargo Receipt</title>
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      html, body { width:210mm; background:white; font-family:'Outfit',sans-serif; }
      body { padding: 0; }
      /* Force ALL backgrounds and colors to print */
      * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
      .receipt-wrap { width:190mm; margin:0 auto; }
      @media print {
        html, body { width:210mm; height:297mm; overflow:hidden; }
        @page { size:A4 portrait; margin:10mm; }
        .receipt-wrap { transform-origin:top center; }
      }
    </style>
  </head><body>
    <div class="receipt-wrap">${el.innerHTML}</div>
    <script>
      window.onload = function() {
        // Scale to fit one page if too tall
        var wrap = document.querySelector('.receipt-wrap');
        var pageH = 277; // mm (297 - 20mm margins)
        var elH = wrap.scrollHeight * 0.2646; // px to mm (1px = 0.2646mm)
        if (elH > pageH) {
          var scale = pageH / elH;
          wrap.style.transform = 'scale(' + scale + ')';
          wrap.style.transformOrigin = 'top center';
        }
        setTimeout(function(){ window.print(); window.close(); }, 800);
      };
    <\/script>
  </body></html>`);
  w.document.close();
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
// ===== CONTACT INFO SETTINGS (DB-backed) =====
var _contactFields = {
  phone:   { key:'phone',   inputId:'ciPhoneInput',   valId:'ciPhoneVal',   editId:'ciPhoneEdit'   },
  email:   { key:'email',   inputId:'ciEmailInput',   valId:'ciEmailVal',   editId:'ciEmailEdit'   },
  website: { key:'website', inputId:'ciWebsiteInput', valId:'ciWebsiteVal', editId:'ciWebsiteEdit' },
  hours:   { key:'hours',   inputId:'ciHoursInput',   valId:'ciHoursVal',   editId:'ciHoursEdit'   },
};

async function loadContactSettings() {
  try {
    const data = await api.get('/api/settings');
    Object.keys(_contactFields).forEach(function(field) {
      var cfg = _contactFields[field];
      var val = data[cfg.key] || '';
      var el  = document.getElementById(cfg.valId);
      if (el) el.textContent = val || 'Not set';
    });
  } catch(e) {
    // fallback: just show current displayed values
  }
}

function editContactField(field) {
  var cfg = _contactFields[field];
  var input = document.getElementById(cfg.inputId);
  var editDiv = document.getElementById(cfg.editId);
  var valEl = document.getElementById(cfg.valId);
  var val = (valEl && valEl.textContent !== 'Not set') ? valEl.textContent : '';
  input.value = val;
  editDiv.style.display = 'block';
  input.focus();
}

function cancelContactField(field) {
  var cfg = _contactFields[field];
  document.getElementById(cfg.editId).style.display = 'none';
}

async function saveContactField(field) {
  var cfg   = _contactFields[field];
  var input = document.getElementById(cfg.inputId);
  var val   = input.value.trim();
  var msg   = document.getElementById('settingsMsg');

  if (field === 'email' && !val) {
    msg.style.color='#ef4444'; msg.textContent='Email cannot be empty.';
    setTimeout(function(){msg.textContent='';},3000); return;
  }

  try {
    await api.put('/api/settings/' + cfg.key, { value: val });

    var displayVal = val || '—';
    document.getElementById(cfg.valId).textContent = val || 'Not set';
    document.getElementById(cfg.editId).style.display = 'none';

    // Update live contact info on the public-facing page elements (if visible)
    var keyCapital = field.charAt(0).toUpperCase() + field.slice(1);
    var siteEl   = document.getElementById('site'   + keyCapital);
    var footerEl = document.getElementById('footer' + keyCapital);
    if (siteEl)   siteEl.textContent = displayVal;
    if (footerEl) { footerEl.textContent = displayVal; footerEl.parentElement.style.display = val ? '' : 'none'; }

    msg.style.color='#16a34a';
    msg.textContent = '\u2713 ' + keyCapital + (val ? ' updated on the site!' : ' removed from the site.');
    showToast(keyCapital + (val ? ' updated successfully!' : ' removed.'), 'success');
    setTimeout(function(){msg.textContent='';},4000);
  } catch(e) {
    msg.style.color='#ef4444'; msg.textContent = e.message || 'Could not save setting.';
    setTimeout(function(){msg.textContent='';},4000);
  }
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

// ===== DOWNLOAD RECEIPT AS HTML =====
async function downloadPDF(tracking) {
  var s = window._currentReceiptData;
  if (!s) { alert('Please generate a receipt first.'); return; }

  var el = document.getElementById('receiptContent');
  if (!el) { alert('Please generate a receipt first.'); return; }

  // Grab the live QR image src so it's baked into the download
  var qrImg = document.getElementById('qr-' + tracking);
  var qrSrc = qrImg ? qrImg.src : '';

  // Clone the receipt HTML and fix the QR src to the live URL
  var receiptHTML = el.innerHTML.replace(
    /(<img[^>]*id="qr-[^"]*"[^>]*src=")[^"]*(")/,
    '$1' + qrSrc + '$2'
  );

  var html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>ZipCargo Receipt - ${s.tracking}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      background: #f1f5f9;
      font-family: 'Outfit', sans-serif;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 24px 20px 40px;
    }

    .page {
      width: 720px;
      background: white;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 8px 48px rgba(0,0,0,0.15);
    }

    .tip-bar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 999;
      background: #0d1f35; color: white;
      padding: 10px 20px; font-family: 'Outfit', sans-serif;
      font-size: .85rem; display: flex; align-items: center;
      justify-content: center; gap: 16px;
    }

    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

      html, body {
        background: white !important;
        padding: 0 !important;
        margin: 0 !important;
        display: block !important;
        width: 210mm;
        height: 297mm;
        overflow: hidden;
      }

      .tip-bar { display: none !important; }

      /* Scale the receipt to fit exactly one A4 page */
      .page {
        position: absolute;
        top: 0; left: 0;
        width: 210mm !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        transform-origin: top left;
        /* JS will set the scale below */
      }

      @page { size: A4 portrait; margin: 0; }
    }
  </style>
</head>
<body>

  <div class="tip-bar">
    <span>
      <i class="fa-solid fa-circle-info" style="color:#e8820c;margin-right:6px;"></i>
      Save as PDF: click the button &rarr; set Destination to <strong>"Save as PDF"</strong> &rarr; Margins: <strong>None</strong> &rarr; enable <strong>Background graphics</strong> &rarr; Save
    </span>
    <button onclick="window.print()" style="
      background:#e8820c;color:white;border:none;border-radius:8px;
      padding:7px 18px;font-size:.85rem;font-weight:700;cursor:pointer;font-family:inherit;
      white-space:nowrap;flex-shrink:0;
    ">
      <i class="fa-solid fa-file-pdf"></i> Save as PDF
    </button>
  </div>

  <div class="page" id="receipt-page" style="margin-top:52px;">
    ${receiptHTML}
  </div>

  <script>
    // Before printing, calculate the scale needed to fit the receipt on one A4 page
    window.addEventListener('beforeprint', function() {
      var page   = document.getElementById('receipt-page');
      var a4H    = 297;   // mm
      var a4W    = 210;   // mm
      var mmToPx = 96 / 25.4;  // 96dpi
      var maxH   = a4H * mmToPx;
      var maxW   = a4W * mmToPx;
      var elH    = page.scrollHeight;
      var elW    = page.scrollWidth;
      var scale  = Math.min(maxH / elH, maxW / elW, 1);
      page.style.transform = 'scale(' + scale + ')';
      page.style.width = (100 / scale) + '%';
    });
    window.addEventListener('afterprint', function() {
      var page = document.getElementById('receipt-page');
      page.style.transform = '';
      page.style.width = '';
    });
  <\/script>

</body>
</html>`;

  var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = 'ZipCargo-Receipt-' + tracking + '.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== INVOICE GENERATOR =====
