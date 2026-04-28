function getToken() {
  try { return JSON.parse(sessionStorage.getItem('ic_token') || 'null'); } catch { return null; }
}

function authHeaders() {
  const t = getToken();
  const base = { 'Content-Type': 'application/json' };
  return t ? { ...base, 'Authorization': 'Bearer ' + t.token } : base;
}

function requireAuth() {
  const t = getToken();
  if (!t || !t.token) window.location.replace('login.html');
}

function logout() {
  sessionStorage.removeItem('ic_token');
  window.location.replace('login.html');
}

function initUserLabel() {
  const t  = getToken();
  const el = document.getElementById('userLabel');
  if (el && t) el.textContent = t.usuario || 'admin';
}

function initClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  el.textContent = new Date().toLocaleTimeString('pt-BR');
  setInterval(() => { el.textContent = new Date().toLocaleTimeString('pt-BR'); }, 1000);
}

function setActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'admin.html';
  document.querySelectorAll('.sb-item').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });
}

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sb-overlay');
  const isOpen  = sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('show', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

function closeSidebar() {
  document.querySelector('.sidebar')?.classList.remove('open');
  document.querySelector('.sb-overlay')?.classList.remove('show');
  document.body.style.overflow = '';
}

function initMobileNav() {
  const topbar  = document.querySelector('.main-topbar');
  const sidebar = document.querySelector('.sidebar');
  if (!topbar || !sidebar) return;

  const overlay = document.createElement('div');
  overlay.className = 'sb-overlay';
  overlay.addEventListener('click', closeSidebar);
  document.body.appendChild(overlay);

  const btn = document.createElement('button');
  btn.className = 'sb-toggle';
  btn.innerHTML = '&#9776;';
  btn.setAttribute('aria-label', 'Abrir menu');
  btn.addEventListener('click', toggleSidebar);
  topbar.insertBefore(btn, topbar.firstChild);

  sidebar.querySelectorAll('.sb-item').forEach(a => {
    a.addEventListener('click', closeSidebar);
  });
}

document.addEventListener('DOMContentLoaded', initMobileNav);

function initTheme() {
  const saved = localStorage.getItem('ic_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeBtn(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ic_theme', next);
  updateThemeBtn(next);
}

function updateThemeBtn(theme) {
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = theme === 'dark' ? '☀️ Claro' : '🌙 Escuro';
}
