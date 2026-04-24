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
  document.querySelectorAll('.nav-item').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });
}
