# Admin Multi-Páginas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar o painel admin de uma única página com abas em 5 páginas HTML independentes + arquivos compartilhados.

**Architecture:** Cada página HTML inclui shared.css + admin.css (estilos comuns de topbar/modais) + admin-auth.js (funções de auth). Navegação por links normais entre páginas. JS vanilla puro, sem frameworks.

**Tech Stack:** HTML, CSS, JavaScript (vanilla), Express.js (backend existente — sem modificações)

---

### Task 1: admin.css + admin-auth.js

**Files:**
- Create: `public/admin.css`
- Create: `public/admin-auth.js`

- [ ] **Step 1: Criar public/admin.css**

```css
/* ── Topbar ─────────────────────────────────────────────────────────────────── */
.topbar-admin {
  background: var(--accent); padding: 0 24px;
  display: flex; align-items: center; justify-content: space-between;
  height: 56px; position: sticky; top: 0; z-index: 100; flex-shrink: 0;
}
.topbar-left { display: flex; align-items: center; gap: 24px; }
.tb-logo { color: #fff; font-size: 15px; font-weight: 900; display: flex; align-items: center; gap: 10px; white-space: nowrap; }
.tb-logo-dot { width: 8px; height: 8px; background: rgba(255,255,255,0.6); border-radius: 50%; flex-shrink: 0; }
.nav-links { display: flex; gap: 2px; }
.nav-item {
  display: flex; align-items: center; gap: 7px; padding: 7px 13px;
  color: rgba(255,255,255,0.75); font-size: 13px; font-weight: 500;
  border: none; background: none; font-family: inherit;
  border-radius: 6px; transition: all .15s; white-space: nowrap;
  text-decoration: none; cursor: pointer;
}
.nav-item:hover  { background: rgba(255,255,255,0.12); color: #fff; }
.nav-item.active { background: rgba(255,255,255,0.2);  color: #fff; font-weight: 700; }
.topbar-right { display: flex; align-items: center; gap: 10px; }
#clock { font-family: 'Courier New', monospace; font-size: 13px; color: rgba(255,255,255,0.85); letter-spacing: 1px; }
.user-chip { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.15); border-radius: 20px; padding: 4px 12px 4px 5px; }
.user-avatar { width: 24px; height: 24px; background: rgba(255,255,255,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; }
.btn-logout { background: none; border: none; color: rgba(255,255,255,0.75); font-size: 12px; cursor: pointer; padding: 6px 4px; font-family: inherit; transition: color .2s; }
.btn-logout:hover { color: #fff; }

/* ── Modais ─────────────────────────────────────────────────────────────────── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 1000; opacity: 0; pointer-events: none; transition: opacity .2s; padding: 16px; }
.modal-overlay.open { opacity: 1; pointer-events: all; }
.modal { background: var(--card); border-radius: 14px; padding: 24px; width: 100%; max-width: 380px; transform: translateY(12px); transition: transform .2s; box-shadow: 0 20px 60px rgba(0,0,0,.12); }
.modal-overlay.open .modal { transform: translateY(0); }
.modal h4 { font-size: 15px; font-weight: 700; margin-bottom: 18px; color: var(--tx); }
.modal p  { font-size: 13px; color: var(--mt); margin-bottom: 16px; line-height: 1.6; }
.modal-label { font-size: 11px; font-weight: 600; color: var(--mt); text-transform: uppercase; display: block; margin-bottom: 4px; }
.modal-input { width: 100%; background: var(--bg); border: 1.5px solid var(--bd); padding: 10px; border-radius: 6px; color: var(--tx); margin-bottom: 12px; font-size: 13px; transition: border-color .2s; font-family: inherit; }
.modal-input:focus { outline: none; border-color: var(--accent); }
.modal-actions { display: flex; gap: 8px; margin-top: 4px; }
.btn-save   { background: var(--accent); color: #fff; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 13px; flex: 1; transition: filter .2s; font-family: inherit; }
.btn-save:hover { filter: brightness(1.08); }
.btn-cancel { background: none; border: 1.5px solid var(--bd); color: var(--mt); padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; transition: all .2s; font-family: inherit; }
.btn-cancel:hover { border-color: var(--no); color: var(--no); }
.senha-erro { font-size: 12px; color: var(--no); display: none; margin: -6px 0 10px; }
.senha-erro.show { display: block; }

/* ── Toast ─────────────────────────────────────────────────────────────────── */
.toast { position: fixed; bottom: 24px; right: 24px; background: var(--ok); color: #fff; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; transform: translateY(60px); opacity: 0; transition: all .3s; z-index: 1100; }
.toast.show { transform: translateY(0); opacity: 1; }

/* ── Loader ─────────────────────────────────────────────────────────────────── */
.loader { position: fixed; inset: 0; background: rgba(244,244,244,.8); display: flex; align-items: center; justify-content: center; z-index: 200; opacity: 0; pointer-events: none; transition: opacity .3s; }
.loader.show { opacity: 1; pointer-events: all; }
.spinner { width: 36px; height: 36px; border: 3px solid var(--bd); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Formulários ────────────────────────────────────────────────────────────── */
label { font-size: 11px; font-weight: 600; color: var(--mt); text-transform: uppercase; display: block; margin-bottom: 4px; letter-spacing: .5px; }
input, select, textarea { width: 100%; background: var(--bg); border: 1.5px solid var(--bd); padding: 10px; border-radius: 6px; color: var(--tx); margin-bottom: 8px; font-size: 13px; transition: border-color .2s; font-family: inherit; }
input:focus, select:focus, textarea:focus { outline: none; border-color: var(--accent); background: #fff; }
input.is-invalid, select.is-invalid { border-color: var(--no) !important; box-shadow: 0 0 0 2px rgba(239,68,68,.1); }
.fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.btn-add { background: var(--accent); color: #fff; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: 700; width: 100%; margin-top: 6px; font-size: 14px; transition: filter .2s; font-family: inherit; }
.btn-add:hover { filter: brightness(1.08); }
.btn-add:disabled { opacity: .6; cursor: not-allowed; filter: none; }

/* ── Tabelas ─────────────────────────────────────────────────────────────────── */
.table-wrap { background: var(--card); border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: var(--mt); padding: 10px 12px; border-bottom: 2px solid var(--accent); font-size: 11px; text-transform: uppercase; letter-spacing: .5px; background: var(--card); }
td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: rgba(251,102,2,.02); }
code { background: rgba(0,0,0,.05); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; }
.btn-del  { background: none; border: none; color: #bbb; font-size: 16px; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: color .2s; }
.btn-del:hover { color: var(--no); }
.btn-edit { background: rgba(110,110,110,.08); border: 1px solid rgba(110,110,110,.2); color: var(--mt); padding: 4px 10px; border-radius: 5px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all .2s; font-family: inherit; }
.btn-edit:hover { border-color: var(--accent); color: var(--accent); }

/* ── Responsivo ─────────────────────────────────────────────────────────────── */
@media (max-width: 900px) { .nav-links .nav-item { padding: 7px 10px; font-size: 12px; } }
@media (max-width: 640px) {
  .topbar-admin { padding: 0 12px; }
  #clock { display: none; }
  .fgrid { grid-template-columns: 1fr; }
  .table-wrap { overflow-x: auto; }
  table { white-space: nowrap; }
  .modal-actions { flex-direction: column; }
  .btn-save, .btn-cancel { width: 100%; }
}
```

- [ ] **Step 2: Criar public/admin-auth.js**

```js
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
```

- [ ] **Step 3: Commit**

```bash
git add public/admin.css public/admin-auth.js
git commit -m "feat: admin — admin.css e admin-auth.js compartilhados"
```

---

### Task 2: admin.html — Dashboard

**Files:**
- Create: `public/admin.html`

- [ ] **Step 1: Criar public/admin.html**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Impressoras Sobral | Dashboard</title>
  <link rel="stylesheet" href="shared.css">
  <link rel="stylesheet" href="admin.css">
  <style>
    body { display: flex; flex-direction: column; min-height: 100vh; }
    .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 24px; }
    .stat  { background: var(--card); border-radius: 12px; padding: 20px; border-left: 4px solid transparent; box-shadow: 0 1px 3px rgba(0,0,0,.06); display: flex; align-items: center; gap: 14px; }
    .stat-icon { font-size: 24px; }
    .stat-lbl  { font-size: 10px; color: var(--mt); text-transform: uppercase; letter-spacing: 1px; }
    .stat-val  { font-size: 30px; font-weight: 800; line-height: 1; }
    .stat-val.or { color: var(--accent); } .stat-val.gn { color: var(--ok); }
    .stat-val.rd { color: var(--no); }     .stat-val.wn { color: #f59e0b; }
    .card { background: var(--card); border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.06); margin-bottom: 20px; }
    .card-head { padding: 14px 20px; border-bottom: 2px solid var(--accent); display: flex; justify-content: space-between; align-items: center; }
    .card-head h4 { font-size: 14px; font-weight: 800; }
    .card-head a  { font-size: 11px; color: var(--accent); font-weight: 600; text-decoration: none; }
    .alert-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid #f5f5f5; gap: 12px; }
    .alert-row:last-child { border-bottom: none; }
    .alert-info strong { font-size: 13px; display: block; }
    .alert-info span   { font-size: 11px; color: var(--mt); margin-top: 2px; display: block; }
    .alert-ok  { padding: 24px; text-align: center; color: var(--ok); font-size: 13px; }
    .dev-row   { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid #f5f5f5; }
    .dev-row:last-child { border-bottom: none; }
    .dev-info strong { font-size: 13px; display: block; }
    .dev-info span   { font-size: 11px; color: var(--mt); margin-top: 2px; display: block; }
    @media (max-width: 900px) { .stats { grid-template-columns: repeat(2,1fr); } }
    @media (max-width: 640px) { .stats { grid-template-columns: repeat(2,1fr); } }
  </style>
</head>
<body>
<script src="admin-auth.js"></script>
<script>requireAuth();</script>

<header class="topbar-admin">
  <div class="topbar-left">
    <div class="tb-logo"><div class="tb-logo-dot"></div>Impressoras Sobral</div>
    <nav class="nav-links">
      <a href="admin.html"        class="nav-item">📊 Dashboard</a>
      <a href="dispositivos.html" class="nav-item">🖨️ Dispositivos</a>
      <a href="cadastrar.html"    class="nav-item">➕ Cadastrar</a>
      <a href="estoque.html"      class="nav-item">📦 Estoque</a>
      <a href="usuarios.html"     class="nav-item">👥 Usuários</a>
    </nav>
  </div>
  <div class="topbar-right">
    <span id="clock"></span>
    <div class="user-chip">
      <div class="user-avatar">👤</div>
      <span id="userLabel" style="color:#fff;font-size:12px;font-weight:600">—</span>
    </div>
    <button class="btn-logout" onclick="logout()">Sair</button>
  </div>
</header>

<main style="padding:28px;flex:1">
  <div class="stats">
    <div class="stat" style="border-left-color:var(--accent)">
      <div class="stat-icon">🖨️</div>
      <div><div class="stat-lbl">Total</div><div class="stat-val or" id="stat-total">—</div></div>
    </div>
    <div class="stat" style="border-left-color:var(--ok)">
      <div class="stat-icon">🟢</div>
      <div><div class="stat-lbl">Online</div><div class="stat-val gn" id="stat-online">—</div></div>
    </div>
    <div class="stat" style="border-left-color:var(--no)">
      <div class="stat-icon">🔴</div>
      <div><div class="stat-lbl">Offline</div><div class="stat-val rd" id="stat-offline">—</div></div>
    </div>
    <div class="stat" style="border-left-color:#f59e0b">
      <div class="stat-icon">⚠️</div>
      <div><div class="stat-lbl">Tinta Baixa</div><div class="stat-val wn" id="stat-baixa">—</div></div>
    </div>
  </div>

  <div class="card">
    <div class="card-head"><h4>⚠️ Alertas</h4></div>
    <div id="alertas-body"><div style="padding:24px;text-align:center;color:var(--mt);font-size:13px">Carregando...</div></div>
  </div>

  <div class="card">
    <div class="card-head">
      <h4>🖨️ Impressoras Recentes</h4>
      <a href="dispositivos.html">Ver todas →</a>
    </div>
    <div id="recentes-body"><div style="padding:24px;text-align:center;color:var(--mt);font-size:13px">Carregando...</div></div>
  </div>
</main>

<script>
  initUserLabel(); initClock(); setActiveNav();

  const esc = t => String(t ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]);
  const tBaixa = p => (p.suprimentos || []).some(s => s.percentual <= 15);

  async function carregar() {
    try {
      const [resDash, resImps] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/impressoras')
      ]);
      const dash = await resDash.json();
      const imps = await resImps.json();

      document.getElementById('stat-total').textContent   = dash.length;
      document.getElementById('stat-online').textContent  = dash.filter(p => p.online).length;
      document.getElementById('stat-offline').textContent = dash.filter(p => !p.online).length;
      document.getElementById('stat-baixa').textContent   = dash.filter(p => p.online && tBaixa(p)).length;

      const alertas = dash.filter(p => !p.online || (p.online && tBaixa(p)));
      const alertasEl = document.getElementById('alertas-body');
      if (!alertas.length) {
        alertasEl.innerHTML = '<div class="alert-ok">✓ Tudo funcionando normalmente</div>';
      } else {
        alertasEl.innerHTML = alertas.map(p => {
          const motivos = [];
          if (!p.online) motivos.push('Sem sinal');
          if (p.online && tBaixa(p)) {
            const cores = (p.suprimentos||[]).filter(s=>s.percentual<=15).map(s=>s.nome+' '+s.percentual+'%').join(', ');
            motivos.push('Tinta crítica: ' + cores);
          }
          return `<div class="alert-row">
            <div class="alert-info">
              <strong>${esc(p.nome || p.modelo)}</strong>
              <span>${esc(p.ip)}${p.localizacao ? ' · '+esc(p.localizacao) : ''}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:11px;color:var(--mt)">${esc(motivos.join(' / '))}</span>
              <span class="sbadge ${p.online?'on':'off'}">${p.online?'● ONLINE':'● OFFLINE'}</span>
            </div>
          </div>`;
        }).join('');
      }

      const recentes = [...imps].sort((a,b) => b.id - a.id).slice(0, 5);
      const recentesEl = document.getElementById('recentes-body');
      if (!recentes.length) {
        recentesEl.innerHTML = '<div style="padding:24px;text-align:center;color:var(--mt);font-size:13px">Nenhuma impressora cadastrada.</div>';
      } else {
        recentesEl.innerHTML = recentes.map(p => `
          <div class="dev-row">
            <div class="dev-info">
              <strong>${esc(p.modelo || p.nome)}</strong>
              <span>${esc(p.ip)}${p.localizacao ? ' · '+esc(p.localizacao) : ''}</span>
            </div>
            <span style="font-size:11px;color:var(--mt)">${esc(p.fabricante||'')}</span>
          </div>`).join('');
      }
    } catch(e) { console.error(e); }
  }

  carregar();
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/admin.html
git commit -m "feat: admin.html — dashboard com stats, alertas e recentes"
```

---

### Task 3: dispositivos.html

**Files:**
- Create: `public/dispositivos.html`

- [ ] **Step 1: Criar public/dispositivos.html**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Impressoras Sobral | Dispositivos</title>
  <link rel="stylesheet" href="shared.css">
  <link rel="stylesheet" href="admin.css">
  <style>
    body { display: flex; flex-direction: column; min-height: 100vh; }
    .toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    .search-input { background: var(--card); border: 1.5px solid var(--bd); color: var(--tx); padding: 9px 14px; border-radius: 8px; font-size: 13px; width: 280px; transition: border-color .2s; font-family: inherit; }
    .search-input:focus { outline: none; border-color: var(--accent); }
    .btn-new { background: var(--accent); color: #fff; border: none; padding: 10px 18px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; transition: filter .2s; margin-left: auto; }
    .btn-new:hover { filter: brightness(1.08); }
    .btn-print { background: rgba(16,185,129,.08); border: 1px solid rgba(16,185,129,.2); color: var(--ok); padding: 4px 10px; border-radius: 5px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all .2s; font-family: inherit; }
    .btn-print:hover { background: var(--ok); color: #fff; }
    .btn-tinta { background: rgba(251,102,2,.08); border: 1px solid rgba(251,102,2,.25); color: var(--accent); padding: 4px 10px; border-radius: 5px; font-size: 11px; font-weight: 600; text-decoration: none; transition: all .2s; }
    .btn-tinta:hover { background: var(--accent); color: #fff; }
  </style>
</head>
<body>
<script src="admin-auth.js"></script>
<script>requireAuth();</script>

<div class="toast" id="toast"></div>
<div class="loader" id="loader"><div class="spinner"></div></div>

<div class="modal-overlay" id="modalEdit">
  <div class="modal">
    <h4>✏️ Editar Impressora</h4>
    <input type="hidden" id="editId">
    <span class="modal-label">Fabricante</span>
    <select id="editFabricante" class="modal-input"><option>Canon</option><option>HP</option><option>Epson</option><option>Brother</option><option>Kyocera</option></select>
    <span class="modal-label">Modelo / Setor</span>
    <input type="text" id="editModelo" class="modal-input" placeholder="Ex: GX7010 - Financeiro">
    <span class="modal-label">IP / Endereço</span>
    <input type="text" id="editIp" class="modal-input" placeholder="192.168.1.50">
    <span class="modal-label">Localização</span>
    <input type="text" id="editLocalizacao" class="modal-input" placeholder="Ex: 2º Andar - Sala 201">
    <div class="modal-actions">
      <button class="btn-cancel" onclick="document.getElementById('modalEdit').classList.remove('open')">Cancelar</button>
      <button class="btn-save" onclick="salvarEdicao()">Salvar alterações</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="modalPrint">
  <div class="modal">
    <h4>🖨️ Enviar Impressão</h4>
    <input type="hidden" id="printId">
    <span class="modal-label">Impressora</span>
    <input type="text" id="printNome" class="modal-input" disabled style="opacity:.5">
    <span class="modal-label">Conteúdo</span>
    <textarea id="printConteudo" class="modal-input" rows="6" placeholder="Digite o texto..." style="resize:vertical;font-family:monospace"></textarea>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="document.getElementById('modalPrint').classList.remove('open')">Cancelar</button>
      <button class="btn-save" onclick="enviarImpressao()">🖨️ Imprimir</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="modalConfirm">
  <div class="modal" style="max-width:340px">
    <h4 id="confirmTitle">Confirmar</h4>
    <p id="confirmMsg" style="font-size:13px;color:var(--mt);margin-bottom:20px;line-height:1.6"></p>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="document.getElementById('modalConfirm').classList.remove('open')">Cancelar</button>
      <button class="btn-save" id="btnConfirmOk" style="background:var(--no)">Confirmar</button>
    </div>
  </div>
</div>

<header class="topbar-admin">
  <div class="topbar-left">
    <div class="tb-logo"><div class="tb-logo-dot"></div>Impressoras Sobral</div>
    <nav class="nav-links">
      <a href="admin.html"        class="nav-item">📊 Dashboard</a>
      <a href="dispositivos.html" class="nav-item">🖨️ Dispositivos</a>
      <a href="cadastrar.html"    class="nav-item">➕ Cadastrar</a>
      <a href="estoque.html"      class="nav-item">📦 Estoque</a>
      <a href="usuarios.html"     class="nav-item">👥 Usuários</a>
    </nav>
  </div>
  <div class="topbar-right">
    <span id="clock"></span>
    <div class="user-chip">
      <div class="user-avatar">👤</div>
      <span id="userLabel" style="color:#fff;font-size:12px;font-weight:600">—</span>
    </div>
    <button class="btn-logout" onclick="logout()">Sair</button>
  </div>
</header>

<main style="padding:28px;flex:1">
  <div class="toolbar">
    <input class="search-input" id="searchInput" placeholder="Buscar impressora, IP, setor..." oninput="filtrar()">
    <a href="cadastrar.html" class="btn-new">➕ Nova Impressora</a>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Fabricante</th><th>Modelo / Setor</th><th>IP</th><th>Localização</th><th>Ações</th></tr></thead>
      <tbody id="deviceBody">
        <tr><td colspan="5" style="text-align:center;color:var(--mt);padding:24px">Carregando...</td></tr>
      </tbody>
    </table>
  </div>
</main>

<script>
  initUserLabel(); initClock(); setActiveNav();

  const esc = t => String(t ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]);

  let todosImps = [];
  let _confirmCb = null;

  function showToast(msg, erro = false) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.style.background = erro ? '#ef4444' : '#10b981';
    t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500);
  }

  function confirmar(titulo, msg, cb) {
    document.getElementById('confirmTitle').textContent = titulo;
    document.getElementById('confirmMsg').textContent   = msg;
    _confirmCb = cb;
    document.getElementById('modalConfirm').classList.add('open');
    setTimeout(() => document.getElementById('btnConfirmOk').focus(), 150);
  }

  document.getElementById('btnConfirmOk').addEventListener('click', async () => {
    document.getElementById('modalConfirm').classList.remove('open');
    if (_confirmCb) { const cb = _confirmCb; _confirmCb = null; await cb(); }
  });

  ['modalEdit','modalPrint','modalConfirm'].forEach(id => {
    document.getElementById(id).addEventListener('click', function(e) {
      if (e.target === this) this.classList.remove('open');
    });
  });

  async function carregar() {
    document.getElementById('loader').classList.add('show');
    try {
      const res = await fetch('/api/impressoras');
      todosImps = await res.json();
      renderizar(todosImps);
    } catch {
      document.getElementById('deviceBody').innerHTML =
        '<tr><td colspan="5" style="text-align:center;color:var(--no);padding:24px">Erro ao carregar dados.</td></tr>';
    } finally { document.getElementById('loader').classList.remove('show'); }
  }

  function filtrar() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    renderizar(todosImps.filter(p =>
      (p.modelo+p.ip+(p.fabricante||'')+(p.localizacao||'')).toLowerCase().includes(q)
    ));
  }

  function renderizar(lista) {
    const body = document.getElementById('deviceBody');
    if (!lista.length) {
      body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--mt);padding:24px">Nenhuma impressora encontrada.</td></tr>';
      return;
    }
    body.innerHTML = lista.map(p => `
      <tr>
        <td><strong>${esc(p.fabricante||'---')}</strong></td>
        <td>${esc(p.modelo||'---')}</td>
        <td><code>${esc(p.ip||'---')}</code></td>
        <td>${esc(p.localizacao||'---')}</td>
        <td style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <a class="btn-tinta" href="http://${esc(p.ip)}" target="_blank" rel="noopener">🔗 Interface</a>
          <button class="btn-print" data-id="${p.id}" data-nome="${esc(p.modelo||'Impressora')}" onclick="abrirImpressao(this)">▶ Imprimir</button>
          <button class="btn-edit" data-id="${p.id}" data-fab="${esc(p.fabricante||'')}" data-mod="${esc(p.modelo||'')}" data-ip="${esc(p.ip||'')}" data-loc="${esc(p.localizacao||'')}" onclick="abrirEdicao(this)">✏️ Editar</button>
          <button class="btn-del" onclick="del(${p.id})">✕</button>
        </td>
      </tr>`).join('');
  }

  function abrirEdicao(btn) {
    document.getElementById('editId').value          = btn.dataset.id;
    document.getElementById('editFabricante').value  = btn.dataset.fab;
    document.getElementById('editModelo').value      = btn.dataset.mod;
    document.getElementById('editIp').value          = btn.dataset.ip;
    document.getElementById('editLocalizacao').value = btn.dataset.loc;
    document.getElementById('modalEdit').classList.add('open');
  }

  async function salvarEdicao() {
    const id          = document.getElementById('editId').value;
    const fabricante  = document.getElementById('editFabricante').value;
    const modelo      = document.getElementById('editModelo').value.trim();
    const ip          = document.getElementById('editIp').value.trim();
    const localizacao = document.getElementById('editLocalizacao').value.trim();
    if (!modelo) { showToast('Preencha o Modelo/Setor', true); return; }
    try {
      const res = await fetch(`/api/impressoras/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: fabricante, modelo, ip, localizacao })
      });
      if (!res.ok) throw new Error();
      document.getElementById('modalEdit').classList.remove('open');
      showToast('Impressora atualizada!'); carregar();
    } catch { showToast('Erro ao salvar edição!', true); }
  }

  function del(id) {
    confirmar('Remover impressora', 'Esta ação não pode ser desfeita.', async () => {
      await fetch(`/api/impressoras/${id}`, { method: 'DELETE' });
      showToast('Impressora removida'); carregar();
    });
  }

  function abrirImpressao(btn) {
    document.getElementById('printId').value       = btn.dataset.id;
    document.getElementById('printNome').value     = btn.dataset.nome;
    document.getElementById('printConteudo').value = '';
    document.getElementById('modalPrint').classList.add('open');
    setTimeout(() => document.getElementById('printConteudo').focus(), 200);
  }

  async function enviarImpressao() {
    const id       = document.getElementById('printId').value;
    const conteudo = document.getElementById('printConteudo').value.trim();
    if (!conteudo) { showToast('Digite algo para imprimir!', true); return; }
    try {
      const res  = await fetch(`/api/impressoras/${id}/imprimir`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conteudo })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.erro);
      document.getElementById('modalPrint').classList.remove('open');
      showToast('Impressão enviada!');
    } catch(e) { showToast('Erro: ' + (e.message||'desconhecido'), true); }
  }

  carregar();
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/dispositivos.html
git commit -m "feat: dispositivos.html — lista de impressoras com busca, editar e excluir"
```

---

### Task 4: cadastrar.html

**Files:**
- Create: `public/cadastrar.html`

- [ ] **Step 1: Criar public/cadastrar.html**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Impressoras Sobral | Cadastrar</title>
  <link rel="stylesheet" href="shared.css">
  <link rel="stylesheet" href="admin.css">
  <style>
    body { display: flex; flex-direction: column; min-height: 100vh; }
    .form-card { background: var(--card); border-radius: 14px; overflow: hidden; max-width: 600px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .form-card-head { background: var(--accent); padding: 20px 24px; }
    .form-card-head h2 { color: #fff; font-size: 16px; font-weight: 800; }
    .form-card-head p  { color: rgba(255,255,255,0.8); font-size: 12px; margin-top: 4px; }
    .form-card-body { padding: 24px; }
    .form-msg { font-size: 13px; min-height: 18px; margin-bottom: 10px; }
    .form-msg.ok  { color: var(--ok); }
    .form-msg.err { color: var(--no); }
    .back-link { display: block; margin-top: 16px; font-size: 12px; color: var(--mt); text-decoration: none; transition: color .2s; }
    .back-link:hover { color: var(--accent); }
  </style>
</head>
<body>
<script src="admin-auth.js"></script>
<script>requireAuth();</script>

<header class="topbar-admin">
  <div class="topbar-left">
    <div class="tb-logo"><div class="tb-logo-dot"></div>Impressoras Sobral</div>
    <nav class="nav-links">
      <a href="admin.html"        class="nav-item">📊 Dashboard</a>
      <a href="dispositivos.html" class="nav-item">🖨️ Dispositivos</a>
      <a href="cadastrar.html"    class="nav-item">➕ Cadastrar</a>
      <a href="estoque.html"      class="nav-item">📦 Estoque</a>
      <a href="usuarios.html"     class="nav-item">👥 Usuários</a>
    </nav>
  </div>
  <div class="topbar-right">
    <span id="clock"></span>
    <div class="user-chip">
      <div class="user-avatar">👤</div>
      <span id="userLabel" style="color:#fff;font-size:12px;font-weight:600">—</span>
    </div>
    <button class="btn-logout" onclick="logout()">Sair</button>
  </div>
</header>

<main style="padding:28px;flex:1">
  <div class="form-card">
    <div class="form-card-head">
      <h2>➕ Nova Impressora</h2>
      <p>Preencha os dados do equipamento para cadastrá-lo no sistema</p>
    </div>
    <div class="form-card-body">
      <form id="formAdd">
        <div class="fgrid">
          <div>
            <label>Fabricante</label>
            <select name="fabricante"><option>Canon</option><option>HP</option><option>Epson</option><option>Brother</option><option>Kyocera</option></select>
          </div>
          <div>
            <label>Material do Suprimento</label>
            <select name="material"><option value="Tinta">🖋️ Tinta</option><option value="Toner">⬛ Toner</option></select>
          </div>
        </div>
        <label>Modelo / Setor</label>
        <input type="text" name="modelo" placeholder="Ex: GX7010 - Financeiro" required>
        <label>IP / Endereço</label>
        <input type="text" name="ip" placeholder="192.168.1.50">
        <div class="fgrid">
          <div>
            <label>Localização</label>
            <input type="text" name="localizacao" placeholder="Ex: 2º Andar - Sala 201">
          </div>
          <div>
            <label>Comunidade SNMP</label>
            <input type="text" name="comunidade" placeholder="public" value="public">
          </div>
        </div>
        <label>Tipo de Suprimento</label>
        <select name="tipo">
          <option value="Colorido">Colorido (CMYK)</option>
          <option value="Mono">Apenas Preto</option>
          <option value="Manutencao">Caixa Manutenção</option>
        </select>
        <div class="form-msg" id="formMsg"></div>
        <button type="submit" class="btn-add">+ Registrar Equipamento</button>
      </form>
      <a href="dispositivos.html" class="back-link">← Ver todas as impressoras</a>
    </div>
  </div>
</main>

<script>
  initUserLabel(); initClock(); setActiveNav();

  function showMsg(text, type) {
    const el = document.getElementById('formMsg');
    el.textContent = text; el.className = 'form-msg ' + type;
  }

  document.getElementById('formAdd').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    const modeloEl = form.querySelector('[name="modelo"]');
    if (!data.modelo || !data.modelo.trim()) {
      modeloEl.classList.add('is-invalid'); modeloEl.focus();
      showMsg('O campo Modelo / Setor é obrigatório.', 'err'); return;
    }
    const btn = form.querySelector('.btn-add');
    btn.disabled = true; btn.textContent = 'Registrando...'; showMsg('', '');
    try {
      const res = await fetch('/api/impressoras', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error();
      form.reset();
      form.querySelector('[name="comunidade"]').value = 'public';
      showMsg('✓ Impressora cadastrada com sucesso!', 'ok');
      setTimeout(() => showMsg('', ''), 4000);
    } catch { showMsg('Erro ao cadastrar impressora. Tente novamente.', 'err'); }
    finally { btn.disabled = false; btn.textContent = '+ Registrar Equipamento'; }
  });

  document.querySelectorAll('#formAdd input, #formAdd select').forEach(el => {
    el.addEventListener('input',  function() { this.classList.remove('is-invalid'); });
    el.addEventListener('change', function() { this.classList.remove('is-invalid'); });
  });
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/cadastrar.html
git commit -m "feat: cadastrar.html — formulário de nova impressora"
```

---

### Task 5: estoque.html

**Files:**
- Create: `public/estoque.html`

- [ ] **Step 1: Criar public/estoque.html**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Impressoras Sobral | Estoque</title>
  <link rel="stylesheet" href="shared.css">
  <link rel="stylesheet" href="admin.css">
  <style>
    body { display: flex; flex-direction: column; min-height: 100vh; }
    .btn-sec { background: none; border: 1.5px solid var(--bd); color: var(--mt); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all .2s; font-family: inherit; }
    .btn-sec:hover { border-color: var(--no); color: var(--no); }
    .secao-titulo { display: flex; align-items: center; gap: 10px; margin: 24px 0 12px; }
    .secao-titulo h3 { font-size: 14px; font-weight: 700; }
    .badge-material { padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .badge-tinta { background: rgba(251,102,2,.1); color: var(--accent); border: 1px solid rgba(251,102,2,.2); }
    .badge-toner { background: rgba(110,110,110,.1); color: var(--mt); border: 1px solid rgba(110,110,110,.2); }
    .secao-empty { color: var(--mt); font-size: 13px; padding: 16px 0; }
    .model-group { background: var(--card); border: 1.5px solid var(--bd); border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
    .model-group.unlocked { border-color: rgba(251,102,2,.5); background: rgba(251,102,2,.02); }
    .model-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--bd); font-size: 14px; }
    .stock-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px,1fr)); gap: 10px; }
    .toner-card { background: var(--bg); border: 1.5px solid var(--bd); padding: 12px; border-radius: 8px; text-align: center; transition: border-color .2s; }
    .toner-card:hover { border-color: var(--accent); }
    .toner-card.locked .controls { opacity: .3; pointer-events: none; }
    .toner-card.locked { border-color: #ddd; }
    .indicator { height: 3px; width: 30px; margin: 0 auto 8px; border-radius: 2px; }
    .bg-cyan { background: #06b6d4; } .bg-magenta { background: #d946ef; }
    .bg-yellow { background: #eab308; } .bg-black { background: #64748b; }
    .toner-name { font-size: 10px; font-weight: 600; color: var(--mt); text-transform: uppercase; margin-bottom: 8px; }
    .controls { display: flex; align-items: center; justify-content: center; gap: 10px; }
    .btn-q { background: var(--bd); color: var(--tx); border: none; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 16px; transition: background .2s; }
    .btn-q:hover { background: var(--accent); color: #fff; }
    .val { font-size: 1.15rem; font-weight: 800; min-width: 22px; }
    .btn-lock { display: inline-flex; align-items: center; gap: 5px; background: rgba(200,200,200,.3); border: 1.5px solid var(--bd); color: var(--mt); padding: 5px 11px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all .2s; font-family: inherit; white-space: nowrap; }
    .btn-lock:hover { border-color: var(--accent); color: var(--accent); }
    .btn-lock.unlocked { background: rgba(251,102,2,.1); border-color: rgba(251,102,2,.4); color: var(--accent); }
    @media (max-width: 640px) { .stock-grid { grid-template-columns: repeat(auto-fill, minmax(100px,1fr)); } }
  </style>
</head>
<body>
<script src="admin-auth.js"></script>
<script>requireAuth();</script>

<div class="toast" id="toast"></div>

<div class="modal-overlay" id="modalSenha">
  <div class="modal" style="max-width:320px">
    <h4>🔒 Desbloquear Edição</h4>
    <p>Digite a senha mestre para liberar os botões de ajuste por <strong style="color:var(--tx)">5 minutos</strong>.</p>
    <span class="modal-label">Senha</span>
    <input type="password" id="senhaInput" class="modal-input" placeholder="••••••••" autocomplete="off">
    <p class="senha-erro" id="senhaErro">❌ Senha incorreta. Tente novamente.</p>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="fecharModalSenha()">Cancelar</button>
      <button class="btn-save" id="btnDesbloquear" onclick="validarSenha()">Desbloquear</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="modalConfirm">
  <div class="modal" style="max-width:340px">
    <h4 id="confirmTitle">Confirmar</h4>
    <p id="confirmMsg" style="font-size:13px;color:var(--mt);margin-bottom:20px;line-height:1.6"></p>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="document.getElementById('modalConfirm').classList.remove('open')">Cancelar</button>
      <button class="btn-save" id="btnConfirmOk" style="background:var(--no)">Confirmar</button>
    </div>
  </div>
</div>

<header class="topbar-admin">
  <div class="topbar-left">
    <div class="tb-logo"><div class="tb-logo-dot"></div>Impressoras Sobral</div>
    <nav class="nav-links">
      <a href="admin.html"        class="nav-item">📊 Dashboard</a>
      <a href="dispositivos.html" class="nav-item">🖨️ Dispositivos</a>
      <a href="cadastrar.html"    class="nav-item">➕ Cadastrar</a>
      <a href="estoque.html"      class="nav-item">📦 Estoque</a>
      <a href="usuarios.html"     class="nav-item">👥 Usuários</a>
    </nav>
  </div>
  <div class="topbar-right">
    <span id="clock"></span>
    <div class="user-chip">
      <div class="user-avatar">👤</div>
      <span id="userLabel" style="color:#fff;font-size:12px;font-weight:600">—</span>
    </div>
    <button class="btn-logout" onclick="logout()">Sair</button>
  </div>
</header>

<main style="padding:28px;flex:1">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
    <div style="font-size:18px;font-weight:800">📦 Estoque de Suprimentos</div>
    <button onclick="zerarTudo()" class="btn-sec">🗑️ Zerar Estoque</button>
  </div>
  <div class="secao-titulo"><h3>🖋️ Impressoras de Tinta</h3><span class="badge-material badge-tinta">TINTA</span></div>
  <div id="estoqueContainerTinta"></div>
  <div class="secao-titulo"><h3>⬛ Impressoras de Toner</h3><span class="badge-material badge-toner">TONER</span></div>
  <div id="estoqueContainerToner"></div>
</main>

<script>
  initUserLabel(); initClock(); setActiveNav();

  const CORES_MAP = { Colorido:['Preto','Ciano','Magenta','Amarelo'], Mono:['Preto'], Manutencao:['Manutenção'] };
  const UNLOCK_DURATION = 5 * 60;
  const unlockedGroups = {};
  let modeloPendente = null, estoqueToken = null, _confirmCb = null;

  const esc = t => String(t ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]);

  function showToast(msg, erro = false) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.style.background = erro ? '#ef4444' : '#10b981';
    t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500);
  }

  function confirmar(titulo, msg, cb) {
    document.getElementById('confirmTitle').textContent = titulo;
    document.getElementById('confirmMsg').textContent   = msg;
    _confirmCb = cb;
    document.getElementById('modalConfirm').classList.add('open');
    setTimeout(() => document.getElementById('btnConfirmOk').focus(), 150);
  }

  document.getElementById('btnConfirmOk').addEventListener('click', async () => {
    document.getElementById('modalConfirm').classList.remove('open');
    if (_confirmCb) { const cb = _confirmCb; _confirmCb = null; await cb(); }
  });

  ['modalSenha','modalConfirm'].forEach(id => {
    document.getElementById(id).addEventListener('click', function(e) {
      if (e.target === this) { this.classList.remove('open'); if (id==='modalSenha') modeloPendente=null; }
    });
  });

  function corClasse(c) {
    const v = c.toLowerCase();
    if (v.includes('ciano'))   return 'bg-cyan';
    if (v.includes('magenta')) return 'bg-magenta';
    if (v.includes('amarelo')) return 'bg-yellow';
    return 'bg-black';
  }
  function limparID(t) { return t.replace(/[^a-zA-Z0-9]/g,''); }

  function toggleLock(modelo) {
    if (unlockedGroups[modelo]) { lockGroup(modelo); return; }
    modeloPendente = modelo;
    document.getElementById('senhaInput').value = '';
    document.getElementById('senhaErro').classList.remove('show');
    document.getElementById('modalSenha').classList.add('open');
    setTimeout(() => document.getElementById('senhaInput').focus(), 150);
  }

  function fecharModalSenha() {
    document.getElementById('modalSenha').classList.remove('open');
    modeloPendente = null;
  }

  document.getElementById('senhaInput').addEventListener('keydown', e => { if (e.key==='Enter') validarSenha(); });

  async function validarSenha() {
    const senha = document.getElementById('senhaInput').value;
    if (!senha) return;
    const btn = document.getElementById('btnDesbloquear');
    btn.textContent = 'Verificando...'; btn.disabled = true;
    try {
      const res  = await fetch('/api/auth/estoque', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({senha})
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        document.getElementById('senhaErro').classList.add('show');
        document.getElementById('senhaInput').value = '';
        document.getElementById('senhaInput').focus();
      } else {
        estoqueToken = json.token;
        document.getElementById('modalSenha').classList.remove('open');
        if (modeloPendente) { unlockGroup(modeloPendente); modeloPendente = null; }
      }
    } catch { document.getElementById('senhaErro').classList.add('show'); }
    finally  { btn.textContent = 'Desbloquear'; btn.disabled = false; }
  }

  function unlockGroup(modelo) {
    const key = limparID(modelo);
    const group = document.querySelector(`.model-group[data-modelo="${modelo}"]`);
    const btn   = document.getElementById(`lock-${key}`);
    if (!group) return;
    group.classList.add('unlocked');
    group.querySelectorAll('.toner-card').forEach(c => c.classList.remove('locked'));
    if (btn) { btn.classList.add('unlocked'); btn.innerHTML = `🔓 <span id="timer-${key}">5:00</span>`; }
    if (unlockedGroups[modelo]) clearInterval(unlockedGroups[modelo].interval);
    let remaining = UNLOCK_DURATION;
    const interval = setInterval(() => {
      remaining--;
      const el = document.getElementById(`timer-${key}`);
      if (el) el.textContent = `${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
      if (remaining <= 0) lockGroup(modelo);
    }, 1000);
    unlockedGroups[modelo] = { interval };
    showToast('Desbloqueado por 5 minutos ✓');
  }

  function lockGroup(modelo) {
    const key = limparID(modelo);
    const group = document.querySelector(`.model-group[data-modelo="${modelo}"]`);
    const btn   = document.getElementById(`lock-${key}`);
    if (!group) return;
    group.classList.remove('unlocked');
    group.querySelectorAll('.toner-card').forEach(c => c.classList.add('locked'));
    if (btn) { btn.classList.remove('unlocked'); btn.innerHTML = '🔒 Bloqueado'; }
    if (unlockedGroups[modelo]) { clearInterval(unlockedGroups[modelo].interval); delete unlockedGroups[modelo]; }
    showToast('Estoque bloqueado');
  }

  async function mudarQtd(mod, insumo, delta) {
    if (!unlockedGroups[mod]) { showToast('Desbloqueie o estoque primeiro 🔒', true); return; }
    const grupo = [...document.querySelectorAll('.model-group')].find(g => g.getAttribute('data-modelo')===mod);
    if (!grupo) return;
    const card = grupo.querySelector(`[data-insumo="${insumo}"]`);
    const span = card.querySelector('.val');
    const novo = Math.max(0, parseInt(span.textContent) + delta);
    span.textContent = novo; span.style.color = 'var(--accent)';
    try {
      const res = await fetch('/api/estoque', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${estoqueToken}`},
        body:JSON.stringify({modelo:mod, insumo, quantidade:novo, estado:'Novo'})
      });
      if (!res.ok) throw new Error();
      setTimeout(() => { span.style.color = 'var(--tx)'; }, 400);
    } catch { showToast('Erro ao salvar!', true); carregar(); }
  }

  function zerarTudo() {
    confirmar('Zerar todo o estoque', 'Todos os quantitativos voltarão para zero. Esta ação não pode ser desfeita.', async () => {
      const res = await fetch('/api/estoque');
      const est = await res.json();
      for (const item of est) {
        await fetch('/api/estoque', {
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':`Bearer ${estoqueToken}`},
          body:JSON.stringify({modelo:item.modelo, insumo:item.insumo, quantidade:0, estado:'Novo'})
        });
      }
      showToast('Estoque zerado!'); carregar();
    });
  }

  async function carregar() {
    try {
      const [resImps, resEst] = await Promise.all([fetch('/api/dashboard'), fetch('/api/estoque')]);
      const imps = await resImps.json(), estoque = await resEst.json();
      const containerTinta = document.getElementById('estoqueContainerTinta');
      const containerToner = document.getElementById('estoqueContainerToner');
      containerTinta.innerHTML = ''; containerToner.innerHTML = '';
      let temTinta = false, temToner = false;
      const agrupados = {};
      imps.forEach(p => {
        const m = (p.modelo||'').trim().toUpperCase();
        let chave = (m.includes('GX7010')||m.includes('GX6010')||m.includes('7010')||m.includes('6010'))
          ? 'Canon GX6010 / GX7010'
          : (p.modelo||'Geral').trim().replace(/\s+/g,' ');
        if (!agrupados[chave]) agrupados[chave] = {...p, modelo:chave, localizacoes:[], modelosOriginais:new Set()};
        if (p.localizacao) agrupados[chave].localizacoes.push(p.localizacao);
        agrupados[chave].modelosOriginais.add((p.modelo||'').trim());
      });
      Object.entries(agrupados).forEach(([modelo, info]) => {
        const cores   = CORES_MAP[info.tipo] || CORES_MAP['Colorido'];
        const gridID  = `grid-${limparID(modelo)}`;
        const lockID  = `lock-${limparID(modelo)}`;
        const mat     = info.material || 'Toner';
        const isTinta = mat === 'Tinta';
        const desbloq = !!unlockedGroups[modelo];
        temTinta = temTinta || isTinta; temToner = temToner || !isTinta;
        const locs     = [...new Set(info.localizacoes)];
        const locsHtml = locs.length ? `<span style="font-size:11px;color:var(--mt);font-weight:400"> · ${locs.join(' / ')}</span>` : '';
        const group = document.createElement('div');
        group.className = `model-group${desbloq?' unlocked':''}`;
        group.setAttribute('data-modelo', modelo);
        group.innerHTML = `
          <div class="model-header">
            <span><strong>${info.fabricante||'Geral'} — ${modelo}</strong>${locsHtml}</span>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="badge-material ${isTinta?'badge-tinta':'badge-toner'}">${mat.toUpperCase()}</span>
              <button class="btn-lock${desbloq?' unlocked':''}" id="${lockID}" onclick="toggleLock('${modelo}')">
                ${desbloq?`🔓 <span id="timer-${limparID(modelo)}">--:--</span>`:'🔒 Bloqueado'}
              </button>
            </div>
          </div>
          <div class="stock-grid" id="${gridID}"></div>`;
        (isTinta ? containerTinta : containerToner).appendChild(group);
        cores.forEach(cor => {
          const modelos   = [...info.modelosOriginais];
          const registros = estoque.filter(e => modelos.some(m => e.modelo===m) && e.insumo===cor);
          const quantidade = registros.reduce((acc,e) => acc+(e.quantidade||0), 0);
          document.getElementById(gridID).innerHTML += `
            <div class="toner-card${desbloq?'':' locked'}" data-insumo="${cor}">
              <div class="indicator ${corClasse(cor)}"></div>
              <div class="toner-name">${cor}</div>
              <div class="controls">
                <button class="btn-q" onclick="mudarQtd('${modelo}','${cor}',-1)">−</button>
                <span class="val">${quantidade}</span>
                <button class="btn-q" onclick="mudarQtd('${modelo}','${cor}',1)">+</button>
              </div>
            </div>`;
        });
      });
      if (!temTinta) containerTinta.innerHTML = '<p class="secao-empty">Nenhuma impressora de tinta cadastrada.</p>';
      if (!temToner) containerToner.innerHTML = '<p class="secao-empty">Nenhuma impressora de toner cadastrada.</p>';
    } catch(e) { console.error(e); showToast('Erro ao carregar dados', true); }
  }

  carregar();
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/estoque.html
git commit -m "feat: estoque.html — gestão de estoque extraída para página própria"
```

---

### Task 6: usuarios.html

**Files:**
- Create: `public/usuarios.html`

- [ ] **Step 1: Criar public/usuarios.html**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Impressoras Sobral | Usuários</title>
  <link rel="stylesheet" href="shared.css">
  <link rel="stylesheet" href="admin.css">
  <style>
    body { display: flex; flex-direction: column; min-height: 100vh; }
    .section-title { font-size: 15px; font-weight: 800; margin-bottom: 14px; }
    .form-card { background: var(--card); border-radius: 14px; padding: 24px; max-width: 460px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
  </style>
</head>
<body>
<script src="admin-auth.js"></script>
<script>requireAuth();</script>

<div class="toast" id="toast"></div>

<div class="modal-overlay" id="modalConfirm">
  <div class="modal" style="max-width:340px">
    <h4 id="confirmTitle">Confirmar</h4>
    <p id="confirmMsg" style="font-size:13px;color:var(--mt);margin-bottom:20px;line-height:1.6"></p>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="document.getElementById('modalConfirm').classList.remove('open')">Cancelar</button>
      <button class="btn-save" id="btnConfirmOk" style="background:var(--no)">Confirmar</button>
    </div>
  </div>
</div>

<header class="topbar-admin">
  <div class="topbar-left">
    <div class="tb-logo"><div class="tb-logo-dot"></div>Impressoras Sobral</div>
    <nav class="nav-links">
      <a href="admin.html"        class="nav-item">📊 Dashboard</a>
      <a href="dispositivos.html" class="nav-item">🖨️ Dispositivos</a>
      <a href="cadastrar.html"    class="nav-item">➕ Cadastrar</a>
      <a href="estoque.html"      class="nav-item">📦 Estoque</a>
      <a href="usuarios.html"     class="nav-item">👥 Usuários</a>
    </nav>
  </div>
  <div class="topbar-right">
    <span id="clock"></span>
    <div class="user-chip">
      <div class="user-avatar">👤</div>
      <span id="userLabel" style="color:#fff;font-size:12px;font-weight:600">—</span>
    </div>
    <button class="btn-logout" onclick="logout()">Sair</button>
  </div>
</header>

<main style="padding:28px;flex:1">
  <div style="font-size:18px;font-weight:800;margin-bottom:20px">👥 Usuários do Sistema</div>

  <div class="table-wrap" style="margin-bottom:28px">
    <table>
      <thead><tr><th>Nome</th><th>Usuário</th><th>Status</th><th>Criado em</th><th>Ações</th></tr></thead>
      <tbody id="usuariosBody">
        <tr><td colspan="5" style="text-align:center;color:var(--mt);padding:24px">Carregando...</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section-title">➕ Novo Usuário</div>
  <div class="form-card">
    <div class="fgrid">
      <div><label>Nome completo</label><input type="text" id="uNome" placeholder="João Silva"></div>
      <div><label>Usuário (login)</label><input type="text" id="uUsuario" placeholder="joao.silva"></div>
    </div>
    <label>Senha inicial</label>
    <input type="password" id="uSenha" placeholder="Mínimo 6 caracteres">
    <div id="uMsg" style="font-size:12px;margin:8px 0;min-height:18px"></div>
    <button class="btn-add" onclick="criarUsuario()">+ Criar Usuário</button>
  </div>
</main>

<script>
  initUserLabel(); initClock(); setActiveNav();

  let _confirmCb = null;

  function showToast(msg, erro = false) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.style.background = erro ? '#ef4444' : '#10b981';
    t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500);
  }

  function confirmar(titulo, msg, cb) {
    document.getElementById('confirmTitle').textContent = titulo;
    document.getElementById('confirmMsg').textContent   = msg;
    _confirmCb = cb;
    document.getElementById('modalConfirm').classList.add('open');
    setTimeout(() => document.getElementById('btnConfirmOk').focus(), 150);
  }

  document.getElementById('btnConfirmOk').addEventListener('click', async () => {
    document.getElementById('modalConfirm').classList.remove('open');
    if (_confirmCb) { const cb = _confirmCb; _confirmCb = null; await cb(); }
  });

  document.getElementById('modalConfirm').addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('open');
  });

  function criarLinhaUsuario(u) {
    const tr = document.createElement('tr');
    const tdNome = document.createElement('td');
    const strong = document.createElement('strong');
    strong.textContent = u.nome; tdNome.appendChild(strong);
    const tdUser = document.createElement('td');
    const code   = document.createElement('code');
    code.textContent = u.usuario; tdUser.appendChild(code);
    const tdStatus = document.createElement('td');
    const dot = document.createElement('span');
    dot.style.cssText = 'width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px;background:' + (u.ativo ? 'var(--ok)' : 'var(--no)');
    tdStatus.appendChild(dot);
    tdStatus.appendChild(document.createTextNode(u.ativo ? 'Ativo' : 'Inativo'));
    const tdData = document.createElement('td');
    tdData.textContent = new Date(u.criado_em).toLocaleDateString('pt-BR');
    tdData.style.cssText = 'color:var(--mt);font-size:12px';
    const tdAcoes = document.createElement('td');
    tdAcoes.style.cssText = 'display:flex;gap:8px';
    const btnToggle = document.createElement('button');
    btnToggle.className = 'btn-edit';
    btnToggle.textContent = u.ativo ? 'Desativar' : 'Ativar';
    btnToggle.addEventListener('click', () => toggleUsuario(u.id, u.ativo));
    const btnDel = document.createElement('button');
    btnDel.className = 'btn-del'; btnDel.textContent = '✕';
    btnDel.addEventListener('click', () => removerUsuario(u.id));
    tdAcoes.appendChild(btnToggle); tdAcoes.appendChild(btnDel);
    tr.appendChild(tdNome); tr.appendChild(tdUser); tr.appendChild(tdStatus);
    tr.appendChild(tdData); tr.appendChild(tdAcoes);
    return tr;
  }

  async function carregarUsuarios() {
    const res  = await fetch('/api/usuarios', { headers: authHeaders() });
    const rows = res.ok ? await res.json() : [];
    const body = document.getElementById('usuariosBody');
    body.replaceChildren();
    if (!rows.length) {
      const tr = document.createElement('tr'); const td = document.createElement('td');
      td.colSpan = 5; td.style.cssText = 'text-align:center;color:var(--mt);padding:24px';
      td.textContent = 'Nenhum usuário cadastrado.'; tr.appendChild(td); body.appendChild(tr);
      return;
    }
    rows.forEach(u => body.appendChild(criarLinhaUsuario(u)));
  }

  async function criarUsuario() {
    const nome    = document.getElementById('uNome').value.trim();
    const usuario = document.getElementById('uUsuario').value.trim().toLowerCase();
    const senha   = document.getElementById('uSenha').value;
    const msg     = document.getElementById('uMsg');
    msg.style.color = 'var(--no)'; msg.textContent = '';
    if (!nome || !usuario || !senha) { msg.textContent = 'Preencha todos os campos.'; return; }
    if (senha.length < 6) { msg.textContent = 'Senha deve ter ao menos 6 caracteres.'; return; }
    try {
      const res  = await fetch('/api/usuarios', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ nome, usuario, senha })
      });
      const json = await res.json();
      if (!res.ok) { msg.textContent = json.erro || 'Erro ao criar usuário.'; return; }
      document.getElementById('uNome').value = '';
      document.getElementById('uUsuario').value = '';
      document.getElementById('uSenha').value = '';
      msg.style.color = 'var(--ok)'; msg.textContent = '✓ Usuário criado com sucesso!';
      carregarUsuarios();
      setTimeout(() => { msg.textContent = ''; }, 3000);
    } catch { msg.textContent = 'Erro de conexão.'; }
  }

  async function toggleUsuario(id, ativo) {
    await fetch('/api/usuarios/' + id, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ ativo: !ativo })
    });
    carregarUsuarios();
  }

  async function removerUsuario(id) {
    confirmar('Remover usuário', 'Esta ação não pode ser desfeita.', async () => {
      const res = await fetch('/api/usuarios/' + id, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) { const j = await res.json(); showToast(j.erro || 'Erro ao remover.', true); return; }
      carregarUsuarios();
    });
  }

  carregarUsuarios();
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/usuarios.html
git commit -m "feat: usuarios.html — gestão de usuários extraída para página própria"
```

---

### Task 7: Atualizar index.html, dashboard.html, tinta.html

**Files:**
- Modify: `public/index.html`
- Modify: `public/dashboard.html`
- Modify: `public/tinta.html`

- [ ] **Step 1: Substituir public/index.html por redirect**

Substituir todo o conteúdo de `public/index.html` por:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=admin.html">
  <title>Redirecionando...</title>
</head>
<body>
  <script>window.location.replace('admin.html');</script>
</body>
</html>
```

- [ ] **Step 2: Atualizar link "Admin" em dashboard.html**

Em `public/dashboard.html`, trocar:
```html
<a href="index.html" class="btn sc">Admin</a>
```
por:
```html
<a href="admin.html" class="btn sc">Admin</a>
```

- [ ] **Step 3: Atualizar link "Admin" em tinta.html**

Em `public/tinta.html`, trocar:
```html
<a href="index.html"     class="btn sc">Admin</a>
```
por:
```html
<a href="admin.html" class="btn sc">Admin</a>
```

- [ ] **Step 4: Commit**

```bash
git add public/index.html public/dashboard.html public/tinta.html
git commit -m "feat: index.html redirect + links Admin atualizados para admin.html"
```
