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
  const statusClassMap={'Delivered':'badge-delivered','In Transit':'badge-transit','Out for Delivery':'badge-out','On Hold':'badge-hold','Pending':'badge-pending'};
  const steps=['Pending','In Transit','Out for Delivery','Delivered'];
  const stepLabels=['Order Placed','Picked Up','Out for Delivery','Delivered'];
  const curIdx=steps.indexOf(s.status);
  const stepsHTML=steps.map((step,i)=>{
    const done=i<=curIdx&&s.status!=='On Hold';
    const lineColor=(i<curIdx&&s.status!=='On Hold')?'#27ae60':'#ddd';
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;position:relative;">
      ${i<steps.length-1?`<div style="position:absolute;top:17px;left:50%;width:100%;height:3px;background:${lineColor};z-index:0;"></div>`:''}
      <div style="width:34px;height:34px;border-radius:50%;background:${done?'#27ae60':'#e0e0e0'};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;z-index:1;">${done?'<i class="fa-solid fa-check"></i>':(i+1)}</div>
      <div style="font-size:.65rem;text-align:center;margin-top:6px;color:${i===curIdx&&s.status!=='On Hold'?'#0d1f35':'#999'};font-weight:${i===curIdx&&s.status!=='On Hold'?'700':'400'};line-height:1.3;max-width:70px;">${stepLabels[i]}</div></div>`;
  }).join('');
  const date=s.date||new Date(s.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});

  document.getElementById('receiptContent').innerHTML=`
    <div style="background:#0d1f35;padding:32px 36px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
      <div><div style="font-size:1.7rem;font-weight:800;color:white;"><i class="fa-solid fa-bolt"></i> ZipCargo</div>
        <div style="font-size:.74rem;color:#7a9ab8;margin-top:4px;">Global Logistics Solutions</div></div>
      <div style="text-align:right;">
        <div style="font-size:.64rem;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#e8820c;margin-bottom:6px;">Official Receipt</div>
        <div style="font-size:1.1rem;font-weight:700;color:white;">${s.tracking}</div>
        <div style="font-size:.79rem;color:#7a9ab8;margin-top:4px;">Issued: ${date}</div>
        <div style="margin-top:10px;"><span class="badge ${statusClassMap[s.status]||'badge-pending'}">${s.status}</span></div></div></div>
    <div style="padding:14px 36px;display:flex;align-items:center;justify-content:space-between;gap:10px;background:#f9f8f5;border-bottom:1px solid #ebe8df;">
      <div><div style="font-size:.64rem;text-transform:uppercase;color:#888;margin-bottom:3px;">Origin</div>
        <div style="font-size:1.05rem;font-weight:800;color:#0d1f35;">${s.origin}</div></div>
      <div style="font-size:1.5rem;color:#e8820c;"><i class="fa-solid fa-arrow-right"></i></div>
      <div style="text-align:right;"><div style="font-size:.64rem;text-transform:uppercase;color:#888;margin-bottom:3px;">Destination</div>
        <div style="font-size:1.05rem;font-weight:800;color:#0d1f35;">${s.dest}</div></div></div>
    <div style="padding:20px 36px;border-bottom:1px solid #ebe8df;">
      <div style="font-size:.64rem;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#e8820c;margin-bottom:14px;padding-bottom:6px;border-bottom:2px solid #e8820c;">Shipment Progress</div>
      <div style="display:flex;align-items:flex-start;">${stepsHTML}</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;">
      <div style="padding:22px 26px;border-right:1px solid #ebe8df;border-bottom:1px solid #ebe8df;">
        <div style="font-size:.62rem;font-weight:700;text-transform:uppercase;color:#e8820c;margin-bottom:10px;padding-bottom:5px;border-bottom:2px solid #e8820c;">Sender</div>
        <div style="font-size:.87rem;display:flex;flex-direction:column;gap:7px;">
          <div style="display:flex;justify-content:space-between;"><span style="color:#888;">Name</span><strong>${s.sName||'—'}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:#888;">Phone</span><strong>${s.sPhone||'—'}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:#888;">Origin</span><strong>${s.origin}</strong></div></div></div>
      <div style="padding:22px 26px;border-bottom:1px solid #ebe8df;">
        <div style="font-size:.62rem;font-weight:700;text-transform:uppercase;color:#e8820c;margin-bottom:10px;padding-bottom:5px;border-bottom:2px solid #e8820c;">Recipient</div>
        <div style="font-size:.87rem;display:flex;flex-direction:column;gap:7px;">
          <div style="display:flex;justify-content:space-between;"><span style="color:#888;">Name</span><strong>${s.rName}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:#888;">Phone</span><strong>${s.rPhone||'—'}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:#888;">Destination</span><strong>${s.dest}</strong></div></div></div>
      <div style="padding:22px 26px;border-right:1px solid #ebe8df;">
        <div style="font-size:.62rem;font-weight:700;text-transform:uppercase;color:#e8820c;margin-bottom:10px;padding-bottom:5px;border-bottom:2px solid #e8820c;">Package</div>
        <div style="font-size:.87rem;display:flex;flex-direction:column;gap:7px;">
          <div style="display:flex;justify-content:space-between;"><span style="color:#888;">Service</span><strong>${s.service}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:#888;">Weight</span><strong>${s.weight?s.weight+' kg':'—'}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:#888;">Value</span><strong>${s.value?'$'+parseFloat(s.value).toFixed(2):'—'}</strong></div></div></div>
      <div style="padding:22px 26px;">
        <div style="font-size:.62rem;font-weight:700;text-transform:uppercase;color:#e8820c;margin-bottom:10px;padding-bottom:5px;border-bottom:2px solid #e8820c;">Delivery</div>
        <div style="font-size:.87rem;display:flex;flex-direction:column;gap:7px;">
          <div style="display:flex;justify-content:space-between;"><span style="color:#888;">Est. Delivery</span><strong>${s.eta||'—'}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:#888;">Location</span><strong>${s.location||s.origin}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:#888;">Issued</span><strong>${date}</strong></div></div></div></div>
    <div style="background:#0d1f35;padding:20px 36px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:.74rem;color:#7a9ab8;">Total Shipping Cost</div>
      <div style="font-size:2rem;font-weight:800;color:#e8820c;">${s.cost?'$'+parseFloat(s.cost).toFixed(2):'Contact Us'}</div></div>
    ${s.notes?`<div style="padding:14px 36px;background:#fffbf5;border-top:2px solid #e8820c;font-size:.87rem;color:#5a6a7a;"><strong>Notes:</strong> ${s.notes}</div>`:''}
    <div style="background:#f9f8f5;padding:20px 36px;text-align:center;border-top:1px solid #ebe8df;font-size:.79rem;color:#7a8a9a;line-height:2.2;">
      <strong style="color:#0d1f35;">ZipCargo Logistics</strong><br/>info@zipcargo.com &bull; www.zipcargo.com<br/>
      <em>Ship Smarter. Deliver Faster.</em></div>`;
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
  if (newP!==conP) { msg.style.color='#e74c3c'; msg.textContent='Passwords do not match.'; return; }
  try {
    await api.post('/api/auth/change-password',{oldPassword:oldP,newPassword:newP});
    msg.style.color='#27ae60'; msg.textContent='Password updated successfully!';
    ['oldPass','newPass','confirmPass'].forEach(id=>document.getElementById(id).value='');
    setTimeout(()=>msg.textContent='',4000);
  } catch(e) { msg.style.color='#e74c3c'; msg.textContent=e.message; }
}

function saveSettings() {
  const msg=document.getElementById('settingsMsg');
  msg.style.color='#27ae60'; msg.textContent='Settings saved!';
  setTimeout(()=>msg.textContent='',3000);
}

// ===== BADGE HTML =====
function badgeHTML(status) {
  const m={'Pending':'badge-pending','In Transit':'badge-transit','Out for Delivery':'badge-out','Delivered':'badge-delivered','On Hold':'badge-hold'};
  return `<span class="badge ${m[status]||'badge-pending'}">${status}</span>`;
}

// ===== DOWNLOAD PDF (A4, watermark, exact preview) =====
async function downloadPDF(tracking) {
  const btn = document.querySelector(`button[onclick="downloadPDF('${tracking}')"]`);
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Generating...'; }

  function loadScript(src, cb) {
    if (document.querySelector(`script[src="${src}"]`)) { cb(); return; }
    const s = document.createElement('script'); s.src = src; s.onload = cb; document.head.appendChild(s);
  }

  function doGenerate() {
    try {
      const { jsPDF } = window.jspdf;
      const pageW = 210, pageH = 297;
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const s = window._currentReceiptData;
      if (!s) { alert('Please generate the receipt first.'); return; }

      const date = s.date || new Date(s.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});
      const L = 14, R = pageW - 14, mid = pageW / 2;

      // helpers
      const rgb = (r,g,b) => doc.setTextColor(r,g,b);
      const fill = (r,g,b) => doc.setFillColor(r,g,b);
      const stroke = (r,g,b) => doc.setDrawColor(r,g,b);
      const bold = (sz) => { doc.setFont('helvetica','bold'); doc.setFontSize(sz); };
      const normal = (sz) => { doc.setFont('helvetica','normal'); doc.setFontSize(sz); };
      const italic = (sz) => { doc.setFont('helvetica','italic'); doc.setFontSize(sz); };

      // ── WATERMARK ──────────────────────────────────────────────────────────
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({opacity:0.055}));
      bold(52); rgb(13,31,53);
      doc.text('ZipCargo', mid, 148, {align:'center', angle:45});
      bold(22); doc.text('OFFICIAL RECEIPT', mid, 170, {align:'center', angle:45});
      doc.restoreGraphicsState();

      // ── HEADER ─────────────────────────────────────────────────────────────
      fill(13,31,53); doc.rect(0,0,pageW,42,'F');

      // Logo text (no emoji — jsPDF safe)
      bold(18); rgb(255,255,255); doc.text('ZipCargo', L+6, 14);
      // Lightning bolt shape
      fill(232,130,12);
      doc.triangle(L,7, L+4,14, L+2,14, 'F');
      doc.triangle(L+2,14, L+6,14, L+2,21, 'F');

      normal(7.5); rgb(122,154,184); doc.text('Global Logistics Solutions', L+6, 20);

      // Right — official receipt label
      bold(6.5); rgb(232,130,12); doc.text('OFFICIAL RECEIPT', R, 9, {align:'right'});
      bold(14); rgb(255,255,255); doc.text(s.tracking, R, 18, {align:'right'});
      normal(7); rgb(122,154,184); doc.text('Issued: '+date, R, 24, {align:'right'});

      // Status pill
      const statusBg = {
        'Delivered':[212,237,218],'In Transit':[204,229,255],
        'Out for Delivery':[212,237,218],'On Hold':[248,215,218],'Pending':[255,243,205]
      }[s.status]||[255,243,205];
      const statusFg = {
        'Delivered':[21,87,36],'In Transit':[0,64,133],
        'Out for Delivery':[21,87,36],'On Hold':[114,28,36],'Pending':[133,100,4]
      }[s.status]||[133,100,4];
      fill(...statusBg);
      doc.roundedRect(R-38, 29, 38, 9, 2, 2, 'F');
      bold(8); rgb(...statusFg); doc.text(s.status, R-19, 34.8, {align:'center'});

      // ── ROUTE BAR ──────────────────────────────────────────────────────────
      fill(249,248,245); doc.rect(0,42,pageW,20,'F');
      stroke(235,232,223); doc.setLineWidth(0.3); doc.line(0,62,pageW,62);

      normal(7); rgb(136,136,136);
      doc.text('ORIGIN', L, 48);
      doc.text('DESTINATION', R, 48, {align:'right'});

      bold(11); rgb(13,31,53);
      doc.text(s.origin, L, 56);
      doc.text(s.dest, R, 56, {align:'right'});

      // Arrow
      bold(13); rgb(232,130,12); doc.text('→', mid, 56, {align:'center'});

      // ── PROGRESS ───────────────────────────────────────────────────────────
      const steps = ['Pending','In Transit','Out for Delivery','Delivered'];
      const sLabels = ['Order Placed','Picked Up','Out for Delivery','Delivered'];
      const curIdx = steps.indexOf(s.status);
      const xs = [35, 85, 135, 180];
      let py = 72;

      bold(7); rgb(232,130,12); doc.text('SHIPMENT PROGRESS', L, py-4);
      stroke(232,130,12); doc.setLineWidth(0.5); doc.line(L, py-3, L+42, py-3);

      steps.forEach((step, i) => {
        const done = i <= curIdx && s.status !== 'On Hold';
        const x = xs[i];
        if (i < steps.length-1) {
          stroke(done && i<curIdx ? 39:200, done && i<curIdx ? 174:200, done && i<curIdx ? 96:200);
          doc.setLineWidth(0.8); doc.line(x+5, py, xs[i+1]-5, py);
        }
        fill(done?39:210, done?174:210, done?96:210);
        doc.circle(x, py, 5, 'F');
        bold(done?8:7); rgb(255,255,255);
        doc.text(done?'v':String(i+1), x, py+1, {align:'center'});
        const active = i===curIdx && s.status!=='On Hold';
        normal(6); rgb(active?13:150, active?31:150, active?53:150);
        doc.text(sLabels[i], x, py+9, {align:'center', maxWidth:26});
      });

      // ── GRID ───────────────────────────────────────────────────────────────
      let y = 98;
      const c1=L, c2=mid+3, cw=(pageW/2)-17;
      stroke(235,232,223); doc.setLineWidth(0.3);
      doc.line(L, y-2, R, y-2);

      function hdr(title, x, yy) {
        bold(7); rgb(232,130,12); doc.text(title, x, yy);
        stroke(232,130,12); doc.setLineWidth(0.4); doc.line(x, yy+1, x+cw, yy+1);
      }
      function row(lbl, val, x, yy) {
        normal(8); rgb(150,150,150); doc.text(lbl, x, yy);
        bold(8); rgb(13,31,53);
        doc.text(String(val||'—'), x+cw, yy, {align:'right', maxWidth:cw-2});
      }

      // SENDER col
      hdr('SENDER', c1, y); y+=7;
      row('Name', s.sName, c1, y); y+=6;
      row('Phone', s.sPhone, c1, y); y+=6;
      row('Origin', s.origin, c1, y);

      // RECIPIENT col
      let y2=98+7;
      hdr('RECIPIENT', c2, 98);
      row('Name', s.rName, c2, y2); y2+=6;
      row('Phone', s.rPhone, c2, y2); y2+=6;
      row('Destination', s.dest, c2, y2);

      y = Math.max(y, y2) + 12;
      stroke(235,232,223); doc.setLineWidth(0.3); doc.line(L, y-4, R, y-4);

      // PACKAGE col
      const py2 = y;
      hdr('PACKAGE', c1, y); y+=7;
      row('Service', s.service, c1, y); y+=6;
      row('Weight', s.weight?s.weight+' kg':'—', c1, y); y+=6;
      row('Value', s.value?'$'+parseFloat(s.value).toFixed(2):'—', c1, y);

      // DELIVERY col
      let y3=py2+7;
      hdr('DELIVERY', c2, py2);
      row('Est. Delivery', s.eta, c2, y3); y3+=6;
      row('Location', s.location||s.origin, c2, y3); y3+=6;
      row('Issued', date, c2, y3);

      y = Math.max(y, y3) + 12;

      // ── TOTAL BAR ──────────────────────────────────────────────────────────
      fill(13,31,53); doc.rect(0, y, pageW, 22, 'F');
      normal(8); rgb(122,154,184); doc.text('Total Shipping Cost', L, y+9);
      normal(6.5); rgb(74,106,138); doc.text('Inclusive of all applicable fees', L, y+15);
      bold(22); rgb(232,130,12);
      doc.text(s.cost?'$'+parseFloat(s.cost).toFixed(2):'Contact Us', R, y+15, {align:'right'});

      y += 26;

      // ── NOTES ──────────────────────────────────────────────────────────────
      if (s.notes) {
        fill(255,251,245); doc.rect(0, y, pageW, 14, 'F');
        fill(232,130,12); doc.rect(0, y, 2, 14, 'F');
        bold(7.5); rgb(13,31,53); doc.text('Notes:', L+4, y+6);
        normal(7.5); rgb(90,106,122); doc.text(s.notes, L+24, y+6, {maxWidth:R-L-28});
        y += 18;
      }

      // ── WATERMARK STAMP ────────────────────────────────────────────────────
      const stampX = R - 18, stampY = y + 22;
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({opacity:0.75}));
      stroke(39,174,96); doc.setLineWidth(0.8);
      doc.circle(stampX, stampY, 16); doc.circle(stampX, stampY, 13);
      bold(5); rgb(39,174,96);
      doc.text('ZIPCARGO', stampX, stampY-8, {align:'center'});
      bold(7); doc.text('OFFICIAL', stampX, stampY-2, {align:'center'});
      doc.text('RECEIPT', stampX, stampY+4, {align:'center'});
      normal(5); doc.text('* VERIFIED *', stampX, stampY+9, {align:'center'});
      doc.restoreGraphicsState();

      // ── FOOTER ─────────────────────────────────────────────────────────────
      fill(249,248,245); doc.rect(0, pageH-26, pageW, 26, 'F');
      stroke(235,232,223); doc.setLineWidth(0.3); doc.line(0, pageH-26, pageW, pageH-26);
      bold(9); rgb(13,31,53); doc.text('ZipCargo Logistics', mid, pageH-17, {align:'center'});
      normal(7.5); rgb(120,130,154); doc.text('info@zipcargo.com  •  www.zipcargo.com', mid, pageH-11, {align:'center'});
      italic(7); rgb(120,130,154); doc.text('Ship Smarter. Deliver Faster.  —  Thank you for your business.', mid, pageH-5, {align:'center'});

      doc.save(`ZipCargo-Receipt-${s.tracking}.pdf`);
      if (btn) { btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-file-pdf"></i> Download PDF'; }
    } catch(e) {
      console.error(e);
      alert('PDF generation failed: '+e.message);
      if (btn) { btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-file-pdf"></i> Download PDF'; }
    }
  }

  loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', doGenerate);
}
