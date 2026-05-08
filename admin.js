// ===== API PROXY =====
// Key lives exclusively in proxy.php — never here.
const ADMIN_PROXY = '/proxy';

async function initBins() {}

async function getShipments() {
  try {
    const res  = await fetch(`${ADMIN_PROXY}?action=getShipments`);
    const data = await res.json();
    return data.shipments || [];
  } catch { return []; }
}

async function getInquiries() {
  try {
    const res  = await fetch(`${ADMIN_PROXY}?action=getInquiries`);
    const data = await res.json();
    return data.inquiries || [];
  } catch { return []; }
}

async function saveShipments(arr) {
  await fetch(`${ADMIN_PROXY}?action=saveShipments`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ shipments: arr })
  });
}

async function saveInquiries(arr) {
  await fetch(`${ADMIN_PROXY}?action=saveInquiries`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ inquiries: arr })
  });
}

// ===== TOAST NOTIFICATION =====
function showToast(msg, type = 'success') {
  const toast = document.getElementById('adminToast');
  const msgEl = document.getElementById('adminToastMsg');
  const iconEl = document.getElementById('adminToastIcon');
  if (!toast) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  iconEl.textContent = icons[type] || '✅';
  msgEl.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

// ===== CREDENTIALS =====
// Credentials live only in proxy.php — never stored here.

// In-memory cache
let shipments = [];
let inquiries = [];

// ===== LOGIN =====
async function adminLogin() {
  const user  = document.getElementById('loginUser').value.trim();
  const pass  = document.getElementById('loginPass').value.trim();
  const error = document.getElementById('loginError');
  const btn   = document.querySelector('.login-form button');

  if (!user || !pass) {
    error.textContent = 'Please enter username and password.';
    setTimeout(() => error.textContent = '', 3000);
    return;
  }

  btn.textContent = 'Signing in...';
  btn.disabled = true;

  try {
    const res  = await fetch(`${ADMIN_PROXY}?action=adminLogin`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user, pass })
    });
    const data = await res.json();

    if (data.ok) {
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('adminPanel').style.display  = 'flex';
      setCurrentDate();
      updateDashboard();
    } else {
      error.textContent = 'Incorrect username or password.';
      setTimeout(() => error.textContent = '', 3000);
    }
  } catch (e) {
    error.textContent = 'Connection error. Please try again.';
    setTimeout(() => error.textContent = '', 4000);
  } finally {
    btn.textContent = 'Sign In';
    btn.disabled = false;
  }
}

document.getElementById('loginPass').addEventListener('keypress', e => { if (e.key === 'Enter') adminLogin(); });
document.getElementById('loginUser').addEventListener('keypress', e => { if (e.key === 'Enter') adminLogin(); });

// ===== LOGOUT =====
async function adminLogout() {
  if (confirm('Are you sure you want to logout?')) {
    await fetch(`${ADMIN_PROXY}?action=adminLogout`, { method: 'POST' }).catch(() => {});
    document.getElementById('adminPanel').style.display  = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
    history.pushState('', document.title, window.location.pathname + window.location.search);
    const wrapper = document.getElementById('adminWrapper');
    if (wrapper) wrapper.classList.remove('visible');
  }
}

// ===== DATE =====
function setCurrentDate() {
  document.getElementById('currentDate').textContent =
    new Date().toLocaleDateString('en-US', { weekday:'short', year:'numeric', month:'short', day:'numeric' });
}

// ===== SIDEBAR NAVIGATION =====
async function showSection(name, clickedEl) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('sec-' + name).classList.add('active');

  const titles = {
    dashboard: 'Dashboard', shipments: 'Shipments', create: 'New Shipment',
    receipts: 'Receipts', inquiries: 'Inquiries', settings: 'Settings'
  };
  document.getElementById('pageTitle').textContent = titles[name] || name;

  if (clickedEl) clickedEl.classList.add('active');
  if (name === 'dashboard') await updateDashboard();
  if (name === 'shipments') { shipments = await getShipments(); renderShipmentsTable(); }
  if (name === 'inquiries') { inquiries = await getInquiries(); renderInquiries(); }

  if (window.innerWidth <= 900) closeSidebar();
}

function toggleSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const isOpen   = sidebar.classList.contains('open');
  if (isOpen) { closeSidebar(); }
  else { sidebar.classList.add('open'); backdrop.classList.add('active'); document.body.style.overflow = 'hidden'; }
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('active');
  document.body.style.overflow = '';
}

// ===== GENERATE TRACKING =====
function generateTracking() {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  document.getElementById('newTracking').value = `ZC-${year}-${rand}`;
}

// ===== CREATE SHIPMENT =====
async function createShipment() {
  const tracking = document.getElementById('newTracking').value.trim();
  const service  = document.getElementById('newService').value;
  const sName    = document.getElementById('newSenderName').value.trim();
  const sPhone   = document.getElementById('newSenderPhone').value.trim();
  const sEmail   = document.getElementById('newSenderEmail').value.trim();
  const origin   = document.getElementById('newOrigin').value.trim();
  const rName    = document.getElementById('newRecipName').value.trim();
  const rPhone   = document.getElementById('newRecipPhone').value.trim();
  const rEmail   = document.getElementById('newRecipEmail').value.trim();
  const dest     = document.getElementById('newDestination').value.trim();
  const desc     = document.getElementById('newDescription').value.trim();
  const weight   = document.getElementById('newWeight').value.trim();
  const value    = document.getElementById('newValue').value.trim();
  const cost     = document.getElementById('newCost').value.trim();
  const eta      = document.getElementById('newETA').value;
  const status   = document.getElementById('newStatus').value;
  const location = document.getElementById('newLocation').value.trim();
  const notes    = document.getElementById('newNotes').value.trim();
  const msg      = document.getElementById('createMsg');

  if (!tracking || !sName || !rName || !origin || !dest) {
    msg.style.color = '#e74c3c';
    msg.textContent = 'Please fill in all required fields (tracking, sender, recipient, origin, destination).';
    setTimeout(() => msg.textContent = '', 4000);
    return;
  }

  shipments = await getShipments();
  if (shipments.find(s => s.tracking === tracking)) {
    msg.style.color = '#e74c3c';
    msg.textContent = 'A shipment with this tracking number already exists.';
    setTimeout(() => msg.textContent = '', 4000);
    return;
  }

  const shipment = {
    tracking, service, sName, sPhone, sEmail, origin,
    rName, rPhone, rEmail, dest, desc, weight, value,
    cost, eta, status, location, notes,
    date: new Date().toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }),
    timestamp: Date.now()
  };

  msg.style.color = '#185fa5';
  msg.textContent = 'Saving shipment...';

  shipments.unshift(shipment);
  await saveShipments(shipments);

  msg.style.color = '#27ae60';
  msg.textContent = `Shipment ${tracking} created successfully!`;
  showToast(`Shipment ${tracking} created successfully!`, 'success');
  setTimeout(() => msg.textContent = '', 4000);
  clearForm();
  updateDashboard();
}

// ===== CLEAR FORM =====
function clearForm() {
  ['newTracking','newSenderName','newSenderPhone','newSenderEmail','newOrigin',
   'newRecipName','newRecipPhone','newRecipEmail','newDestination','newDescription',
   'newWeight','newValue','newCost','newETA','newLocation','newNotes'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('newStatus').value  = 'Pending';
  document.getElementById('newService').value = 'Air Freight';
}

// ===== STATUS BADGE =====
function badgeHTML(status) {
  const map = {
    'Pending':          'badge-pending',
    'In Transit':       'badge-transit',
    'Out for Delivery': 'badge-out',
    'Delivered':        'badge-delivered',
    'On Hold':          'badge-hold'
  };
  return `<span class="badge ${map[status] || 'badge-pending'}">${status}</span>`;
}

// ===== RENDER SHIPMENTS TABLE =====
function renderShipmentsTable() {
  const search = (document.getElementById('searchShipments').value || '').toLowerCase();
  const filter = document.getElementById('filterStatus').value;
  const tbody  = document.getElementById('shipmentsBody');

  const filtered = shipments.filter(s => {
    const matchSearch = !search ||
      s.tracking.toLowerCase().includes(search) ||
      s.rName.toLowerCase().includes(search) ||
      s.sName.toLowerCase().includes(search);
    const matchFilter = !filter || s.status === filter;
    return matchSearch && matchFilter;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-msg">No shipments found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => `
    <tr>
      <td data-label="Tracking #"><strong>${s.tracking}</strong></td>
      <td data-label="Sender">${s.sName}</td>
      <td data-label="Recipient">${s.rName}</td>
      <td data-label="Origin">${s.origin}</td>
      <td data-label="Destination">${s.dest}</td>
      <td data-label="Service">${s.service}</td>
      <td data-label="Status">${badgeHTML(s.status)}</td>
      <td data-label="Date">${s.date}</td>
      <td data-label="Actions">
        <button class="tbl-btn tbl-btn-edit"    onclick="editShipment('${s.tracking}')"><i class="fa-solid fa-pen"></i> Edit</button>
        <button class="tbl-btn tbl-btn-receipt" onclick="quickReceipt('${s.tracking}')"><i class="fa-solid fa-receipt"></i> Receipt</button>
        <button class="tbl-btn tbl-btn-delete"  onclick="deleteShipment('${s.tracking}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

// ===== EDIT SHIPMENT =====
async function editShipment(tracking) {
  shipments = await getShipments();
  const s = shipments.find(s => s.tracking === tracking);
  if (!s) return;
  showSection('create', null);
  document.getElementById('newTracking').value    = s.tracking;
  document.getElementById('newService').value     = s.service;
  document.getElementById('newSenderName').value  = s.sName;
  document.getElementById('newSenderPhone').value = s.sPhone;
  document.getElementById('newSenderEmail').value = s.sEmail;
  document.getElementById('newOrigin').value      = s.origin;
  document.getElementById('newRecipName').value   = s.rName;
  document.getElementById('newRecipPhone').value  = s.rPhone;
  document.getElementById('newRecipEmail').value  = s.rEmail;
  document.getElementById('newDestination').value = s.dest;
  document.getElementById('newDescription').value = s.desc;
  document.getElementById('newWeight').value      = s.weight;
  document.getElementById('newValue').value       = s.value;
  document.getElementById('newCost').value        = s.cost;
  document.getElementById('newETA').value         = s.eta;
  document.getElementById('newStatus').value      = s.status;
  document.getElementById('newLocation').value    = s.location;
  document.getElementById('newNotes').value       = s.notes;
  await deleteShipment(tracking, true);
  const msg = document.getElementById('createMsg');
  msg.style.color = '#185fa5';
  msg.textContent = `Editing shipment ${tracking} — make changes and click Save.`;
}

// ===== DELETE SHIPMENT =====
async function deleteShipment(tracking, silent = false) {
  if (!silent && !confirm(`Delete shipment ${tracking}? This cannot be undone.`)) return;
  shipments = await getShipments();
  shipments = shipments.filter(s => s.tracking !== tracking);
  await saveShipments(shipments);
  if (!silent) { renderShipmentsTable(); await updateDashboard(); showToast('Shipment deleted.', 'info'); }
}

// ===== DASHBOARD UPDATE =====
async function updateDashboard() {
  shipments = await getShipments();
  inquiries = await getInquiries();
  document.getElementById('totalShipments').textContent = shipments.length;
  document.getElementById('deliveredCount').textContent = shipments.filter(s => s.status === 'Delivered').length;
  document.getElementById('transitCount').textContent   = shipments.filter(s => s.status === 'In Transit' || s.status === 'Out for Delivery').length;
  document.getElementById('inquiryCount').textContent   = inquiries.length;

  const tbody  = document.getElementById('recentShipmentsBody');
  const recent = shipments.slice(0, 5);
  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-msg">No shipments yet</td></tr>`;
    return;
  }
  tbody.innerHTML = recent.map(s => `
    <tr>
      <td><strong>${s.tracking}</strong></td>
      <td>${s.rName}</td>
      <td>${badgeHTML(s.status)}</td>
      <td>${s.date}</td>
    </tr>
  `).join('');
}

// ===== GENERATE RECEIPT =====
async function generateReceipt() {
  const tracking = document.getElementById('receiptTracking').value.trim();
  const error    = document.getElementById('receiptError');
  const output   = document.getElementById('receiptOutput');

  if (!tracking) {
    error.textContent = 'Please enter a tracking number.';
    setTimeout(() => error.textContent = '', 3000);
    return;
  }

  shipments = await getShipments();
  const s = shipments.find(s => s.tracking === tracking);
  if (!s) {
    error.textContent = `No shipment found with tracking number "${tracking}".`;
    setTimeout(() => error.textContent = '', 4000);
    output.style.display = 'none';
    return;
  }

  error.textContent = '';

  const statusClassMap = {
    'Delivered':        'badge-delivered',
    'In Transit':       'badge-transit',
    'Out for Delivery': 'badge-out',
    'On Hold':          'badge-hold',
    'Pending':          'badge-pending'
  };

  const statusBandMap = {
    'Delivered':        'status-delivered',
    'In Transit':       'status-transit',
    'Out for Delivery': 'status-out',
    'On Hold':          'status-hold',
    'Pending':          'status-pending'
  };

  const steps      = ['Pending', 'In Transit', 'Out for Delivery', 'Delivered'];
  const stepLabels = ['Order Placed', 'Picked Up', 'Out for Delivery', 'Delivered'];
  const stepIcons  = ['fa-box', 'fa-plane-departure', 'fa-truck', 'fa-circle-check'];
  const currentIdx = steps.indexOf(s.status);

  const stepsHTML = steps.map((step, i) => {
    const done = (s.status !== 'On Hold') && (i <= currentIdx);
    return `
      <div class="receipt-step ${done ? 'done' : ''}">
        <div class="step-icon"><i class="fa-solid ${stepIcons[i]}"></i></div>
        <div class="step-label">${stepLabels[i]}</div>
      </div>
      ${i < steps.length - 1 ? `<div class="step-connector ${done && i < currentIdx ? 'done' : ''}"></div>` : ''}
    `;
  }).join('');

  const content = document.getElementById('receiptContent');
  content.innerHTML = `
    <div class="receipt-header">
      <div class="receipt-brand"><i class="fa-solid fa-bolt"></i> ZipCargo</div>
      <div class="receipt-meta">
        <div class="receipt-label">TRACKING NUMBER</div>
        <div class="receipt-tracking">${s.tracking}</div>
        <span class="badge ${statusClassMap[s.status] || 'badge-pending'}">${s.status}</span>
      </div>
    </div>
    <div class="receipt-route">
      <div><div class="route-label">ORIGIN</div><div class="route-city">${s.origin}</div></div>
      <div class="route-arrow"><i class="fa-solid fa-arrow-right-long"></i></div>
      <div><div class="route-label">DESTINATION</div><div class="route-city">${s.dest}</div></div>
    </div>
    <div class="receipt-steps">${stepsHTML}</div>
    <div class="receipt-details">
      <div class="receipt-col">
        <div class="receipt-section-title">SENDER</div>
        <div class="receipt-row"><span>Name</span><span>${s.sName}</span></div>
        <div class="receipt-row"><span>Phone</span><span>${s.sPhone || '—'}</span></div>
        <div class="receipt-row"><span>Email</span><span>${s.sEmail || '—'}</span></div>
      </div>
      <div class="receipt-col">
        <div class="receipt-section-title">RECIPIENT</div>
        <div class="receipt-row"><span>Name</span><span>${s.rName}</span></div>
        <div class="receipt-row"><span>Phone</span><span>${s.rPhone || '—'}</span></div>
        <div class="receipt-row"><span>Email</span><span>${s.rEmail || '—'}</span></div>
      </div>
    </div>
    <div class="receipt-details">
      <div class="receipt-col">
        <div class="receipt-section-title">PACKAGE</div>
        <div class="receipt-row"><span>Service</span><span>${s.service}</span></div>
        <div class="receipt-row"><span>Description</span><span>${s.desc || '—'}</span></div>
        <div class="receipt-row"><span>Weight</span><span>${s.weight ? s.weight + ' kg' : '—'}</span></div>
        <div class="receipt-row"><span>Value</span><span>${s.value ? '$' + parseFloat(s.value).toFixed(2) : '—'}</span></div>
      </div>
      <div class="receipt-col">
        <div class="receipt-section-title">DELIVERY</div>
        <div class="receipt-row"><span>Est. Delivery</span><span>${s.eta || '—'}</span></div>
        <div class="receipt-row"><span>Location</span><span>${s.location || s.origin}</span></div>
        <div class="receipt-row"><span>Date Issued</span><span>${s.date}</span></div>
        <div class="receipt-row"><span>Shipping Cost</span><span>${s.cost ? '$' + parseFloat(s.cost).toFixed(2) : 'Contact Us'}</span></div>
      </div>
    </div>
    ${s.notes ? `<div class="receipt-notes"><strong>Notes:</strong> ${s.notes}</div>` : ''}
  `;

  // Load QR library
  if (!document.querySelector('script[src*="qrcode"]')) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.onload = () => {
      const qrDiv = document.createElement('div');
      qrDiv.style.cssText = 'text-align:center;margin-top:16px;';
      content.appendChild(qrDiv);
      new QRCode(qrDiv, { text: s.tracking, width: 100, height: 100 });
    };
    document.head.appendChild(script);
  }

  output.style.display = 'block';
  output.scrollIntoView({ behavior: 'smooth' });

  const actionsDiv = output.querySelector('.receipt-actions');
  if (actionsDiv) {
    actionsDiv.innerHTML = `
      <button class="btn-save" onclick="printReceipt()"><i class="fa-solid fa-print"></i> Print Receipt</button>
      <button class="btn-save" style="background:#27ae60;" onclick="downloadReceiptPDF('${s.tracking}')"><i class="fa-solid fa-file-pdf"></i> Download PDF</button>
      <button class="btn-clear" onclick="document.getElementById('receiptOutput').style.display='none'"><i class="fa-solid fa-xmark"></i> Close</button>
    `;
  }
}

// ===== PRINT RECEIPT =====
function printReceipt() {
  const receiptEl = document.getElementById('receiptContent');
  if (!receiptEl) return;
  const printWin = window.open('', '_blank', 'width=900,height=700');
  printWin.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"/><title>ZipCargo Receipt</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet"/>
    <style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:'Outfit','Segoe UI',sans-serif;background:white;}
      .badge{padding:4px 12px;border-radius:20px;font-size:0.78rem;font-weight:700;}
      .badge-pending{background:#fff3cd;color:#856404;}
      .badge-transit{background:#cce5ff;color:#004085;}
      .badge-out{background:#d4edda;color:#155724;}
      .badge-delivered{background:#d4edda;color:#155724;}
      .badge-hold{background:#f8d7da;color:#721c24;}
    </style>
    </head><body>${receiptEl.innerHTML}</body></html>`);
  printWin.document.close();
  printWin.focus();
  setTimeout(() => { printWin.print(); printWin.close(); }, 700);
}

// ===== DOWNLOAD RECEIPT PDF =====
async function downloadReceiptPDF(tracking) {
  shipments = await getShipments();
  const s = shipments.find(x => x.tracking === tracking);
  if (!s) { alert('Shipment not found.'); return; }

  const btn = document.querySelector('button[onclick="downloadReceiptPDF(\'' + tracking + '\')"]');
  if (btn) { btn.innerHTML = '⏳ Generating...'; btn.disabled = true; }

  const statusColors = {
    'Delivered':        { bg:'#d4edda', color:'#155724' },
    'In Transit':       { bg:'#cce5ff', color:'#004085' },
    'Out for Delivery': { bg:'#d4edda', color:'#155724' },
    'On Hold':          { bg:'#f8d7da', color:'#721c24' },
    'Pending':          { bg:'#fff3cd', color:'#856404' }
  };
  const sc         = statusColors[s.status] || statusColors['Pending'];
  const steps      = ['Pending','In Transit','Out for Delivery','Delivered'];
  const stepLabels = ['Order Placed','Picked Up','Out for Delivery','Delivered'];
  const curIdx     = steps.indexOf(s.status);
  const cost       = s.cost ? '$' + parseFloat(s.cost).toFixed(2) : 'Contact Us';
  const declVal    = s.value ? '$' + parseFloat(s.value).toFixed(2) : '-';
  const wt         = s.weight ? s.weight + ' kg' : '-';

  function row(l, v) {
    return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f4f0e8;font-size:10px;gap:6px;">'
      + '<span style="color:#888;white-space:nowrap;">' + l + '</span>'
      + '<span style="color:#0d1f35;font-weight:700;text-align:right;">' + (v || '-') + '</span></div>';
  }

  function secTitle(t) {
    return '<div style="font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#e8820c;'
      + 'margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #e8820c;">' + t + '</div>';
  }

  let stepsHTML = '';
  steps.forEach(function(step, i) {
    const done     = i <= curIdx && s.status !== 'On Hold';
    const lineDone = done && (i + 1) <= curIdx && s.status !== 'On Hold';
    const isLast   = i === steps.length - 1;
    const dotBg    = done ? '#27ae60' : '#e0e0e0';
    const lblColor = done ? '#0d1f35' : '#999';
    const lblW     = done ? '700' : '400';
    const lineColor= lineDone ? '#27ae60' : '#ddd';
    stepsHTML +=
      '<div style="flex:1;display:flex;flex-direction:column;align-items:center;position:relative;">'
      + (!isLast ? '<div style="position:absolute;top:13px;left:50%;width:100%;height:2px;background:' + lineColor + ';z-index:0;"></div>' : '')
      + '<div style="width:26px;height:26px;border-radius:50%;background:' + dotBg + ';'
      + 'display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;position:relative;z-index:1;">'
      + (done ? '&#10003;' : (i+1)) + '</div>'
      + '<div style="font-size:7.5px;text-align:center;margin-top:5px;color:' + lblColor + ';font-weight:' + lblW + ';line-height:1.3;max-width:55px;">'
      + stepLabels[i] + '</div>'
      + '</div>';
  });

  const qrApiUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=' + encodeURIComponent(s.tracking) + '&color=0d1f35&bgcolor=ffffff';

  function buildAndDownload(qrDataUrl) {
    const stampSVG =
      '<svg width="78" height="78" viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">'
      + '<circle cx="45" cy="45" r="42" fill="none" stroke="#27ae60" stroke-width="3"/>'
      + '<circle cx="45" cy="45" r="36" fill="none" stroke="#27ae60" stroke-width="1.2"/>'
      + '<text x="45" y="30" text-anchor="middle" font-family="Arial" font-size="7" font-weight="bold" fill="#27ae60" letter-spacing="2">ZIPCARGO</text>'
      + '<text x="45" y="44" text-anchor="middle" font-family="Arial" font-size="9" font-weight="bold" fill="#27ae60">OFFICIAL</text>'
      + '<text x="45" y="57" text-anchor="middle" font-family="Arial" font-size="7" font-weight="bold" fill="#27ae60" letter-spacing="1">RECEIPT</text>'
      + '<text x="45" y="70" text-anchor="middle" font-family="Arial" font-size="6" fill="#27ae60">* VERIFIED *</text>'
      + '</svg>';

    const qrImg = qrDataUrl
      ? '<img src="' + qrDataUrl + '" width="80" height="80" style="display:block;border:1px solid #e0ddd5;padding:3px;border-radius:4px;"/>'
      : '<div style="width:80px;height:80px;border:1px solid #e0ddd5;display:flex;align-items:center;justify-content:center;font-size:8px;color:#999;">QR Code</div>';

    const receiptHTML =
      '<!DOCTYPE html><html><head><meta charset="UTF-8"/>'
      + '<style>*{margin:0;padding:0;box-sizing:border-box;} body{font-family:Arial,Helvetica,sans-serif;background:white;}</style>'
      + '</head><body>'
      + '<div id="rc" style="width:680px;background:white;">'
      + '<div style="background:#0d1f35;padding:22px 30px;display:flex;justify-content:space-between;align-items:flex-start;">'
      + '<div><div style="font-size:21px;font-weight:900;color:white;">&#9889; ZipCargo</div>'
      + '<div style="font-size:9px;color:#7a9ab8;margin-top:3px;">Global Logistics Solutions</div></div>'
      + '<div style="text-align:right;">'
      + '<div style="font-size:7px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#e8820c;margin-bottom:4px;">OFFICIAL RECEIPT</div>'
      + '<div style="font-size:14px;font-weight:700;color:white;">' + s.tracking + '</div>'
      + '<div style="font-size:9px;color:#7a9ab8;margin-top:3px;">Issued: ' + s.date + '</div>'
      + '<div style="margin-top:7px;display:inline-block;padding:3px 10px;border-radius:10px;font-size:8px;font-weight:700;background:' + sc.bg + ';color:' + sc.color + ';">' + s.status + '</div>'
      + '</div></div>'
      + '<div style="padding:12px 30px;background:#f9f8f5;border-bottom:1px solid #ebe8df;display:flex;align-items:center;justify-content:space-between;">'
      + '<div><div style="font-size:7px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:2px;">ORIGIN</div>'
      + '<div style="font-size:14px;font-weight:800;color:#0d1f35;">' + s.origin + '</div></div>'
      + '<div style="font-size:18px;color:#e8820c;font-weight:900;">&#10230;</div>'
      + '<div style="text-align:right;"><div style="font-size:7px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:2px;">DESTINATION</div>'
      + '<div style="font-size:14px;font-weight:800;color:#0d1f35;">' + s.dest + '</div></div>'
      + '</div>'
      + '<div style="padding:16px 30px;border-bottom:1px solid #ebe8df;">'
      + '<div style="font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#e8820c;margin-bottom:12px;padding-bottom:4px;border-bottom:2px solid #e8820c;">SHIPMENT PROGRESS</div>'
      + '<div style="display:flex;align-items:flex-start;">' + stepsHTML + '</div>'
      + '</div>'
      + '<div style="display:flex;border-bottom:1px solid #ebe8df;">'
      + '<div style="flex:1;padding:14px 20px;border-right:1px solid #ebe8df;">' + secTitle('SENDER')
      + row('Name', s.sName) + row('Phone', s.sPhone) + row('Email', s.sEmail) + row('Origin', s.origin) + '</div>'
      + '<div style="flex:1;padding:14px 20px;">' + secTitle('RECIPIENT')
      + row('Name', s.rName) + row('Phone', s.rPhone) + row('Email', s.rEmail) + row('Destination', s.dest) + '</div>'
      + '</div>'
      + '<div style="display:flex;border-bottom:1px solid #ebe8df;">'
      + '<div style="flex:1;padding:14px 20px;border-right:1px solid #ebe8df;">' + secTitle('PACKAGE DETAILS')
      + row('Service', s.service) + row('Description', s.desc) + row('Weight', wt) + row('Declared Value', declVal) + '</div>'
      + '<div style="flex:1;padding:14px 20px;">' + secTitle('DELIVERY INFO')
      + row('Est. Delivery', s.eta) + row('Current Location', s.location || s.origin) + row('Date Issued', s.date) + row('Status', s.status) + '</div>'
      + '</div>'
      + '<div style="background:#0d1f35;padding:16px 30px;display:flex;justify-content:space-between;align-items:center;">'
      + '<div><div style="font-size:9px;color:#7a9ab8;text-transform:uppercase;letter-spacing:1px;">Total Shipping Cost</div>'
      + '<div style="font-size:8px;color:#4a6a8a;margin-top:2px;">Inclusive of all applicable fees</div></div>'
      + '<div style="font-size:26px;font-weight:800;color:#e8820c;">' + cost + '</div>'
      + '</div>'
      + (s.notes ? '<div style="padding:10px 30px;background:#fffbf5;border-top:2px solid #e8820c;font-size:10px;color:#5a6a7a;"><strong style="color:#0d1f35;">Special Notes:</strong> ' + s.notes + '</div>' : '')
      + '<div style="background:#f9f8f5;padding:14px 30px;text-align:center;border-top:1px solid #ebe8df;font-size:9px;color:#7a8a9a;line-height:2;">'
      + '<strong style="color:#0d1f35;">ZipCargo Logistics</strong><br/>'
      + 'info@zipcargo.com &bull; www.zipcargo.com<br/>'
      + '<em>Ship Smarter. Deliver Faster. &#8212; Thank you for your business.</em>'
      + '</div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 30px;gap:16px;border-top:1px solid #ebe8df;background:white;">'
      + stampSVG
      + '<div style="text-align:center;">'
      + '<div style="font-size:7px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Scan to verify tracking</div>'
      + qrImg
      + '<div style="font-size:7px;color:#bbb;margin-top:5px;">' + s.tracking + '</div>'
      + '</div>'
      + '<div style="font-size:7px;color:#ccc;text-align:right;line-height:1.6;">Official ZipCargo receipt.<br/>Please retain for your records.</div>'
      + '</div>'
      + '</div>'
      + '</body></html>';

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:680px;height:2000px;border:none;opacity:0;pointer-events:none;z-index:-999;';
    document.body.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(receiptHTML);
    iframe.contentDocument.close();

    setTimeout(function() {
      const rc = iframe.contentDocument.getElementById('rc');
      const h  = rc ? rc.offsetHeight : 900;
      iframe.style.height = h + 'px';
      setTimeout(function() {
        html2canvas(rc || iframe.contentDocument.body, {
          scale: 2, useCORS: true, allowTaint: true,
          backgroundColor: '#ffffff', width: 680, height: h, windowWidth: 680
        }).then(function(canvas) {
          document.body.removeChild(iframe);
          const imgData = canvas.toDataURL('image/jpeg', 0.97);
          const pdfW = 595.28;
          const pdfH = (h / 680) * pdfW;
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF({ unit:'pt', format:[pdfW, pdfH], orientation:'portrait' });
          doc.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
          doc.save('ZipCargo-Receipt-' + s.tracking + '.pdf');
          if (btn) { btn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Download PDF'; btn.disabled = false; }
        }).catch(function(e) {
          document.body.removeChild(iframe);
          console.error(e);
          if (btn) { btn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Download PDF'; btn.disabled = false; }
          alert('PDF failed. Please try again.');
        });
      }, 500);
    }, 600);
  }

  function loadScript(src, cb) {
    if (document.querySelector('script[src="' + src + '"]')) { cb(); return; }
    const sc = document.createElement('script'); sc.src = src; sc.onload = cb;
    document.head.appendChild(sc);
  }

  function loadLibsAndRun(qrDataUrl) {
    const jspdfSrc = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    const h2cSrc   = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    if (window.jspdf && window.html2canvas) { buildAndDownload(qrDataUrl); return; }
    if (window.jspdf) { loadScript(h2cSrc, function() { buildAndDownload(qrDataUrl); }); return; }
    loadScript(jspdfSrc, function() { loadScript(h2cSrc, function() { buildAndDownload(qrDataUrl); }); });
  }

  fetch(qrApiUrl)
    .then(function(res) { return res.blob(); })
    .then(function(blob) {
      const reader = new FileReader();
      reader.onloadend = function() { loadLibsAndRun(reader.result); };
      reader.onerror   = function() { loadLibsAndRun(null); };
      reader.readAsDataURL(blob);
    })
    .catch(function() { loadLibsAndRun(null); });
}

// ===== QUICK RECEIPT FROM TABLE =====
function quickReceipt(tracking) {
  showSection('receipts', null);
  document.getElementById('receiptTracking').value = tracking;
  setTimeout(() => generateReceipt(), 200);
}

// ===== RENDER INQUIRIES =====
function renderInquiries() {
  const tbody = document.getElementById('inquiriesBody');
  if (inquiries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-msg">No inquiries yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = inquiries.map((inq, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${inq.name}</td>
      <td>${inq.email}</td>
      <td>${inq.service || '—'}</td>
      <td>${inq.message.substring(0, 60)}${inq.message.length > 60 ? '...' : ''}</td>
      <td>${inq.date}</td>
      <td><button class="tbl-btn tbl-btn-delete" onclick="deleteInquiry(${i})"><i class="fa-solid fa-trash"></i></button></td>
    </tr>
  `).join('');
}

// ===== DELETE INQUIRY =====
async function deleteInquiry(index) {
  if (!confirm('Delete this inquiry?')) return;
  inquiries = await getInquiries();
  inquiries.splice(index, 1);
  await saveInquiries(inquiries);
  renderInquiries();
  updateDashboard();
}

// ===== CHANGE PASSWORD =====
async function changePassword() {
  const oldP = document.getElementById('oldPass').value;
  const newP = document.getElementById('newPass').value;
  const conP = document.getElementById('confirmPass').value;
  const msg  = document.getElementById('passMsg');

  if (newP.length < 6) { msg.style.color = '#e74c3c'; msg.textContent = 'New password must be at least 6 characters.'; return; }
  if (newP !== conP)   { msg.style.color = '#e74c3c'; msg.textContent = 'Passwords do not match.'; return; }

  try {
    const res  = await fetch(`${ADMIN_PROXY}?action=changePassword`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ oldPass: oldP, newPass: newP })
    });
    const data = await res.json();
    if (data.ok) {
      msg.style.color = '#27ae60';
      msg.textContent = 'Password updated successfully!';
      document.getElementById('oldPass').value = '';
      document.getElementById('newPass').value = '';
      document.getElementById('confirmPass').value = '';
    } else {
      msg.style.color = '#e74c3c';
      msg.textContent = data.error || 'Current password is incorrect.';
    }
  } catch {
    msg.style.color = '#e74c3c';
    msg.textContent = 'Connection error. Please try again.';
  }
  setTimeout(() => msg.textContent = '', 4000);
}

// ===== SAVE SETTINGS =====
function saveSettings() {
  const msg = document.getElementById('settingsMsg');
  msg.style.color = '#27ae60';
  msg.textContent = 'Settings saved successfully!';
  setTimeout(() => msg.textContent = '', 3000);
}
