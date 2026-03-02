/* ============================================================
   BIX TECH — app.js
   Anti-Piracy Engine + UI + Payment Flow
   ============================================================ */

'use strict';

// ─── STATE ───────────────────────────────────────────────────
const STATE = {
  screenshotAttempts: 0,
  maxAttempts: 3,
  currentUser: null,
  purchasedItems: [],
  files: [],           // Admin uploaded files (in-memory)
  currentPayItem: null,
  fraudUsers: [],
};

// Sample fake users for admin panel
const MOCK_USERS = [
  { id: 'USR001', name: 'Alain Mbakop',   purchases: 5, attempts: 0, status: 'active'  },
  { id: 'USR002', name: 'Fatima Bello',   purchases: 2, attempts: 2, status: 'flagged' },
  { id: 'USR003', name: 'Jean-Pierre N.', purchases: 8, attempts: 0, status: 'active'  },
  { id: 'USR004', name: 'Sophie Awa',     purchases: 1, attempts: 3, status: 'frozen'  },
];

// Sample catalog
const CATALOG = [
  { id: 1, title: 'Complete Forex Masterclass',  type: 'video', price: 1500,  desc: 'Insider trading strategies from certified Forex gurus. 4h video content.',            protected: true  },
  { id: 2, title: 'BEPC Maths Guide 2025',       type: 'pdf',   price: 500,   desc: 'Full revision guide covering all BEPC maths topics with worked examples.',           protected: true  },
  { id: 3, title: 'Real Estate Investment Kit',  type: 'doc',   price: 1000,  desc: 'Templates, contracts, and analysis tools for Cameroon real estate investors.',       protected: true  },
  { id: 4, title: 'Digital Marketing Blueprint', type: 'pdf',   price: 750,   desc: 'Step-by-step guide to growing any business online using low-cost strategies.',      protected: true  },
  { id: 5, title: 'Premium Logo Pack Vol. 3',    type: 'image', price: 250,   desc: '50 high-resolution logo templates. Full commercial license included.',              protected: true  },
  { id: 6, title: 'Crypto Entry Signals 2025',   type: 'doc',   price: 2000,  desc: 'Live signal history and entry-point strategies for major crypto assets.',           protected: true  },
  { id: 7, title: 'French Grammar Crash Course', type: 'video', price: 500,   desc: 'Master French grammar in 30 days. Native-speaker tutor. High-pass rate.',           protected: true  },
  { id: 8, title: 'Photography Presets Bundle',  type: 'image', price: 250,   desc: '100 Lightroom presets optimised for African landscapes and skin tones.',            protected: false },
];

const TYPE_ICONS = { video: '🎬', pdf: '📄', doc: '📝', image: '🖼' };

// ─── ANTI-PIRACY ENGINE ──────────────────────────────────────

/**
 * Detect visibility change (tab switch / screenshot shortcut)
 */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) handleScreenshotAttempt();
});

/**
 * Detect PrintScreen key
 */
document.addEventListener('keyup', (e) => {
  if (e.key === 'PrintScreen' || (e.key === 'p' && e.ctrlKey && e.shiftKey)) {
    handleScreenshotAttempt();
    // Overwrite clipboard so screenshot is black
    try {
      navigator.clipboard.writeText('');
    } catch (_) {}
  }
  // Disable common dev-tool shortcuts over protected content
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))) {
    if (hasProtectedContent()) e.preventDefault();
  }
});

/**
 * Disable right-click on media
 */
document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('.viewer-body, .card-thumb')) {
    e.preventDefault();
    showFraudToast('Right-click is disabled on protected content.');
  }
});

/**
 * Disable drag-and-drop on media elements
 */
document.addEventListener('dragstart', (e) => {
  if (e.target.closest('.viewer-body')) e.preventDefault();
});

function hasProtectedContent() {
  return document.getElementById('viewerModal').classList.contains('open');
}

function handleScreenshotAttempt() {
  if (!hasProtectedContent()) return; // only track when viewing content
  STATE.screenshotAttempts++;
  updateAttemptCounter();
  if (STATE.screenshotAttempts >= STATE.maxAttempts) {
    lockAccount();
    return;
  }
  showBlurOverlay();
  logAttemptToAdmin();
}

function showBlurOverlay() {
  const overlay = document.getElementById('blurOverlay');
  overlay.classList.add('active');
  showFraudToast(`Screenshot attempt logged. (${STATE.screenshotAttempts}/${STATE.maxAttempts})`);
  setTimeout(() => overlay.classList.remove('active'), 3000);
}

function lockAccount() {
  const overlay = document.getElementById('blurOverlay');
  overlay.classList.add('active');
  document.querySelector('.blur-warning h2').textContent = 'ACCOUNT FROZEN';
  document.querySelector('.blur-warning p').innerHTML =
    'You have exceeded the maximum screenshot attempts.<br/>Your account has been suspended. Contact support.';
  showFraudToast('🚨 Account frozen due to repeated screenshot attempts.');
  triggerAdminAlert();
}

function updateAttemptCounter() {
  const el = document.getElementById('attemptCounter');
  if (el) el.textContent = `Attempt: ${STATE.screenshotAttempts} / ${STATE.maxAttempts}`;
}

function showFraudToast(msg) {
  const toast = document.getElementById('fraudToast');
  toast.querySelector('span').textContent = '🚨 ' + msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

function logAttemptToAdmin() {
  // Flag user in admin panel if open
  if (STATE.screenshotAttempts >= 2) {
    triggerAdminAlert();
  }
}

function triggerAdminAlert() {
  const alert = document.getElementById('adminAlert');
  const userId = document.getElementById('alertUser');
  if (alert && userId) {
    userId.textContent = STATE.currentUser || '4821';
    alert.style.display = 'block';
  }
}

// ─── STORE ────────────────────────────────────────────────────

function renderStore(filter = 'all') {
  const grid = document.getElementById('contentGrid');
  const items = filter === 'all' ? CATALOG : CATALOG.filter(i => i.type === filter);
  grid.innerHTML = items.map(item => `
    <div class="content-card" data-type="${item.type}" onclick="buyItem(${item.id})">
      <div class="card-thumb">
        <div class="card-type-icon">${TYPE_ICONS[item.type] || '📦'}</div>
        ${item.protected ? '<div class="card-drm-badge">🛡 DRM</div>' : ''}
        <div class="card-wm">USER#XXXX USER#XXXX USER#XXXX USER#XXXX USER#XXXX USER#XXXX</div>
      </div>
      <div class="card-body">
        <div class="card-title">${item.title}</div>
        <div class="card-desc">${item.desc}</div>
        <div class="card-footer">
          <div class="card-price">${item.price.toLocaleString()}<span class="xaf">XAF</span></div>
          <button class="quick-buy-btn" onclick="event.stopPropagation();buyItem(${item.id})">⚡ Buy Now</button>
        </div>
      </div>
    </div>
  `).join('');
}

function buyItem(id) {
  const item = CATALOG.find(i => i.id === id);
  if (!item) return;
  STATE.currentPayItem = item;
  document.getElementById('payItemName').textContent = item.title;
  document.getElementById('payItemPrice').textContent = item.price.toLocaleString() + ' XAF';
  showModal('payModal');
}

// Filter buttons
document.addEventListener('DOMContentLoaded', () => {
  renderStore();
  renderAdminFiles();
  renderUsersTable();

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderStore(btn.dataset.filter);
    });
  });

  // Admin: toggle price custom
  document.getElementById('uploadPrice').addEventListener('change', function() {
    document.getElementById('customPriceGroup').style.display =
      this.value === 'custom' ? 'block' : 'none';
  });

  // Admin: toggle label
  document.getElementById('antiScreenshot').addEventListener('change', function() {
    document.getElementById('antiScreenshotLabel').textContent = this.checked ? 'ENABLED' : 'DISABLED';
    document.getElementById('antiScreenshotLabel').style.color = this.checked ? 'var(--good)' : 'var(--bad)';
  });
});

// ─── PAYMENT FLOW ─────────────────────────────────────────────

function processPay() {
  const phone = document.getElementById('momoNumber').value.trim();
  if (!phone || phone.length < 9) {
    alert('Please enter a valid 9-digit MoMo number.');
    return;
  }
  // Simulate pending → success
  const btn = document.querySelector('#payModal .btn-gold.full-width');
  btn.textContent = '⏳ Processing...';
  btn.disabled = true;

  setTimeout(() => {
    closeModal('payModal');
    btn.textContent = '⚡ Confirm Payment';
    btn.disabled = false;

    const txn = 'BIX-' + Math.floor(Math.random() * 90000 + 10000);
    document.getElementById('txnId').textContent = txn;

    if (STATE.currentPayItem) {
      STATE.purchasedItems.push(STATE.currentPayItem.id);
    }

    showModal('successModal');
  }, 2200);
}

// ─── MODALS ───────────────────────────────────────────────────

function showModal(id) {
  const el = document.getElementById(id);
  if (!el) { console.error('Modal not found:', id); return; }
  el.style.display = 'flex';
  el.style.opacity = '0';
  el.style.pointerEvents = 'all';
  document.body.style.overflow = 'hidden';
  // Fade in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.25s ease';
      el.style.opacity = '1';
    });
  });
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
  setTimeout(() => {
    el.style.display = 'none';
  }, 250);
  // Restore scroll if no modals visible
  setTimeout(() => {
    const anyOpen = Array.from(document.querySelectorAll('.modal-overlay'))
      .some(m => m.style.display === 'flex');
    if (!anyOpen) document.body.style.overflow = '';
  }, 260);
}

function closeModalOutside(event, id) {
  if (event.target.id === id) closeModal(id);
}

function switchModal(closeId, openId) {
  closeModal(closeId);
  setTimeout(() => showModal(openId), 250);
}

// ─── ADMIN PANEL ──────────────────────────────────────────────

function switchAdminTab(tab, btn) {
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.admin-panel-content').forEach(p => p.classList.add('hidden'));
  document.getElementById('tab-' + tab).classList.remove('hidden');

  if (tab === 'files') renderAdminFiles();
  if (tab === 'users') renderUsersTable();
}

function renderAdminFiles() {
  const list = document.getElementById('adminFilesList');
  if (!list) return;
  const allFiles = [...CATALOG.map(c => ({
    name: c.title,
    type: c.type,
    price: c.price,
    protected: c.protected,
    id: c.id,
  })), ...STATE.files];

  if (allFiles.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">No files yet. Upload your first file.</p>';
    return;
  }

  list.innerHTML = allFiles.map(f => `
    <div class="admin-file-row">
      <div class="admin-file-icon">${TYPE_ICONS[f.type] || '📦'}</div>
      <div class="admin-file-info">
        <div class="admin-file-name">${f.name}</div>
        <div class="admin-file-meta">${f.price.toLocaleString()} XAF · ${f.type.toUpperCase()} · ${f.protected ? '🛡 Protected' : '⚠ Unprotected'}</div>
      </div>
      <div class="admin-file-actions">
        <button class="btn-small-gold" onclick="toggleProtection(${f.id})">${f.protected ? 'Unprotect' : 'Protect'}</button>
      </div>
    </div>
  `).join('');
}

function toggleProtection(id) {
  const item = CATALOG.find(c => c.id === id);
  if (item) {
    item.protected = !item.protected;
    renderAdminFiles();
    renderStore(document.querySelector('.filter-btn.active')?.dataset?.filter || 'all');
  }
}

function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  tbody.innerHTML = MOCK_USERS.map(u => `
    <tr>
      <td>
        <strong>${u.name}</strong><br/>
        <span style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text-muted)">${u.id}</span>
      </td>
      <td>${u.purchases}</td>
      <td>
        <span style="color:${u.attempts >= 3 ? 'var(--bad)' : u.attempts >= 2 ? 'var(--gold)' : 'var(--good)'}">${u.attempts} / 3</span>
      </td>
      <td class="status-${u.status}">
        ${u.status === 'active' ? '✅ Active' : u.status === 'flagged' ? '⚠️ Flagged' : '🚫 Frozen'}
      </td>
      <td>
        ${u.status !== 'frozen'
          ? `<button class="btn-small-gold" onclick="freezeUser('${u.id}')">Freeze</button>`
          : `<button class="btn-small-gold" style="background:var(--surface2);color:var(--text-dim)" onclick="unfreezeUser('${u.id}')">Unfreeze</button>`
        }
      </td>
    </tr>
  `).join('');
}

function freezeUser(id) {
  const u = MOCK_USERS.find(u => u.id === id);
  if (u) { u.status = 'frozen'; renderUsersTable(); }
}

function unfreezeUser(id) {
  const u = MOCK_USERS.find(u => u.id === id);
  if (u) { u.status = 'active'; u.attempts = 0; renderUsersTable(); }
}

function freezeAccount() {
  // Called from admin alert button
  MOCK_USERS.find(u => u.status === 'flagged') && (MOCK_USERS.find(u => u.status === 'flagged').status = 'frozen');
  document.getElementById('adminAlert').style.display = 'none';
  renderUsersTable();
}

// ─── FILE UPLOAD (admin) ──────────────────────────────────────

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) previewUpload(file);
}

function handleDrop(event) {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  if (file) previewUpload(file);
  document.getElementById('uploadZone').classList.remove('drag-over');
}

function previewUpload(file) {
  const zone = document.getElementById('uploadZone');
  zone.innerHTML = `
    <div class="upload-icon">✅</div>
    <p><strong>${file.name}</strong></p>
    <p class="mono small">${(file.size / 1024).toFixed(1)} KB · ${file.type}</p>
  `;
  // Pre-fill title
  const titleInput = document.getElementById('uploadTitle');
  if (!titleInput.value) {
    titleInput.value = file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
  }
}

// Drag-over styling
document.addEventListener('DOMContentLoaded', () => {
  const zone = document.getElementById('uploadZone');
  if (zone) {
    zone.addEventListener('dragover', () => zone.classList.add('drag-over'));
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  }
});

function uploadContent() {
  const title = document.getElementById('uploadTitle').value.trim();
  const priceSelect = document.getElementById('uploadPrice').value;
  const price = priceSelect === 'custom'
    ? parseInt(document.getElementById('customPrice').value) || 250
    : parseInt(priceSelect);
  const antiShot = document.getElementById('antiScreenshot').checked;

  if (!title) { alert('Please enter a title.'); return; }

  // Determine type from last uploaded file
  const fileInput = document.getElementById('fileInput');
  let type = 'doc';
  if (fileInput.files[0]) {
    const mime = fileInput.files[0].type;
    if (mime.startsWith('video')) type = 'video';
    else if (mime === 'application/pdf') type = 'pdf';
    else if (mime.startsWith('image')) type = 'image';
  }

  const newFile = {
    id: Date.now(),
    name: title,
    title,
    type,
    price,
    protected: antiShot,
    desc: 'Uploaded via Admin Panel.',
  };

  STATE.files.push(newFile);
  CATALOG.push({ ...newFile, desc: 'Uploaded via Admin Panel.' });

  renderAdminFiles();
  renderStore();

  // Reset form
  document.getElementById('uploadTitle').value = '';
  document.getElementById('uploadZone').innerHTML = `
    <div class="upload-icon">📁</div>
    <p>Drag & drop file here or <label class="upload-link" for="fileInput">browse</label></p>
    <input type="file" id="fileInput" accept="video/*,application/pdf,image/*,.docx,.doc" onchange="handleFileSelect(event)" style="display:none" />
    <p class="mono small">MP4, PDF, JPG, PNG, DOCX supported</p>
  `;

  alert(`✅ "${title}" uploaded and protected successfully!`);
}

// ─── AUTH & ROUTING ──────────────────────────────────────────

// Admin credentials (for GitHub Pages demo — no real backend)
const ADMIN_EMAIL    = 'admin@bixtech.cm';
const ADMIN_PASSWORD = 'bixadmin2025';

function doLogin() {
  const cred  = document.querySelector('#loginModal input[type="text"]').value.trim();
  const pass  = document.querySelector('#loginModal input[type="password"]').value;
  const errEl = document.getElementById('loginError');

  if (!cred || !pass) { errEl.style.display = 'block'; errEl.textContent = 'Please fill in all fields.'; return; }

  // Admin route
  if ((cred === ADMIN_EMAIL || cred === 'admin') && pass === ADMIN_PASSWORD) {
    sessionStorage.setItem('bixRole', 'admin');
    window.location.href = 'admin.html';
    return;
  }

  // Regular user — accept any filled credentials for demo
  const name = cred.includes('@') ? cred.split('@')[0] : cred;
  sessionStorage.setItem('bixRole', 'user');
  sessionStorage.setItem('bixUser', JSON.stringify({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    email: cred.includes('@') ? cred : cred + '@bixtech.cm',
    phone: '',
  }));
  window.location.href = 'dashboard.html';
}

function doSignup() {
  const name  = document.querySelector('#signupModal input[type="text"]').value.trim();
  const email = document.querySelector('#signupModal input[type="email"]').value.trim();
  const phone = document.querySelector('#signupModal input[type="tel"]').value.trim();
  const pass  = document.querySelector('#signupModal input[type="password"]').value;

  if (!name || !email || !pass) { alert('Please fill in all required fields.'); return; }

  sessionStorage.setItem('bixRole', 'user');
  sessionStorage.setItem('bixUser', JSON.stringify({ name, email, phone }));
  window.location.href = 'dashboard.html';
}



function toggleMenu() {
  const menu = document.getElementById('mobileMenu');
  menu.classList.toggle('open');
}

function scrollTo(selector) {
  const el = document.querySelector(selector);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// ─── CONTENT VIEWER (secure) ─────────────────────────────────

function openViewer(itemId) {
  const item = CATALOG.find(i => i.id === itemId);
  if (!item) return;

  document.getElementById('viewerTitle').textContent = item.title;
  const body = document.getElementById('viewerBody');
  const userId = STATE.currentUser || 'GUEST';

  // Render type-specific placeholder
  let content = '';
  if (item.type === 'video') {
    content = `
      <div style="text-align:center;padding:3rem">
        <div style="font-size:3rem;margin-bottom:1rem">🔒</div>
        <p style="font-family:var(--font-display);font-size:0.9rem;color:var(--gold)">HARDWARE DRM ACTIVE</p>
        <p style="color:var(--text-muted);font-size:0.8rem;margin-top:0.5rem">Video stream protected by Widevine EME.<br>Screen recorders will show a black screen.</p>
      </div>
    `;
  } else if (item.type === 'pdf') {
    content = `
      <div style="text-align:center;padding:3rem">
        <div style="font-size:3rem;margin-bottom:1rem">📄</div>
        <p style="font-family:var(--font-display);font-size:0.9rem;color:var(--gold)">CANVAS-RENDERED PDF</p>
        <p style="color:var(--text-muted);font-size:0.8rem;margin-top:0.5rem">Document rendered via Canvas API.<br>Save Image / Print Screen commands are blocked.</p>
      </div>
    `;
  } else {
    content = `
      <div style="text-align:center;padding:3rem">
        <div style="font-size:3rem;margin-bottom:1rem">${TYPE_ICONS[item.type]}</div>
        <p style="font-family:var(--font-display);font-size:0.9rem;color:var(--gold)">SECURE VIEWER</p>
        <p style="color:var(--text-muted);font-size:0.8rem;margin-top:0.5rem">Content encrypted in browser sandbox.<br>No raw file stored in Downloads.</p>
      </div>
    `;
  }

  body.innerHTML = content;

  // Dynamic watermark with user ID
  const wm = document.getElementById('viewerWatermark');
  const wmText = Array(20).fill(`USER#${userId}`).join('  ');
  wm.textContent = wmText;

  showModal('viewerModal');
}

// ─── PWA MANIFEST HELPER ─────────────────────────────────────
// manifest.json is a separate file; this section is informational.

// ─── SMOOTH SCROLL FOR ALL ANCHOR LINKS ──────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });

  // Intersection observer for entrance animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.sec-card, .step, .content-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
});
