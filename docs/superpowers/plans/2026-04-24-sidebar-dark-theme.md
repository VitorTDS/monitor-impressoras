# Redesign Admin — Sidebar Escuro + Tema Claro/Escuro

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o topbar horizontal das 5 páginas admin por uma sidebar fixa escura e adicionar toggle de tema claro/escuro com persistência em localStorage.

**Architecture:** CSS variables em `shared.css` controlam ambos os temas via `[data-theme="dark"]` no `<html>`. `admin.css` define a sidebar fixa (220px) e o `.main-wrap` que ocupa o restante. `admin-auth.js` carrega o tema salvo antes do primeiro render, evitando flash. Os 5 HTMLs trocam `<header class="topbar-admin">` por `<aside class="sidebar">` + `<div class="main-wrap">`.

**Tech Stack:** HTML, CSS variables, JavaScript vanilla — sem frameworks, sem dependências novas.

---

### Task 1: shared.css — variáveis do tema escuro

**Files:**
- Modify: `public/shared.css`

- [ ] **Step 1: Adicionar bloco de tema escuro ao final de `public/shared.css`**

Localizar o final do arquivo (após o bloco `.empty`) e adicionar:

```css
/* ── Tema escuro ────────────────────────────────────────────────────────────── */
[data-theme="dark"] {
  --bg:   #0f172a;
  --card: #1e293b;
  --bd:   #334155;
  --tx:   #e2e8f0;
  --mt:   #94a3b8;
}

[data-theme="dark"] ::-webkit-scrollbar-track { background: #0f172a; }
[data-theme="dark"] ::-webkit-scrollbar-thumb { background: #334155; }

[data-theme="dark"] .sbadge.on  { background: rgba(16,185,129,.15); color: #34d399; }
[data-theme="dark"] .sbadge.off { background: rgba(239,68,68,.15);  color: #f87171; }
```

- [ ] **Step 2: Commit**

```bash
git add public/shared.css
git commit -m "feat: shared.css — variáveis CSS para tema escuro"
```

---

### Task 2: admin.css — sidebar styles + dark mode fixes

**Files:**
- Modify: `public/admin.css`

- [ ] **Step 1: Substituir o bloco Topbar pelo bloco Sidebar**

Substituir desde `/* ── Topbar */` até `.btn-logout:hover { color: #fff; }` (inclusive) pelo seguinte bloco:

```css
/* ── Sidebar ─────────────────────────────────────────────────────────────────── */
.sidebar {
  width: 220px; background: #0f172a; position: fixed;
  top: 0; left: 0; bottom: 0; display: flex; flex-direction: column;
  z-index: 100; box-shadow: 2px 0 16px rgba(0,0,0,.25);
}
.sb-brand {
  padding: 22px 20px 18px; border-bottom: 1px solid rgba(255,255,255,.06);
  display: flex; align-items: center; gap: 11px;
}
.sb-dot { width: 9px; height: 9px; background: #FB6602; border-radius: 50%; flex-shrink: 0; }
.sb-brand strong { color: #fff; font-size: 13px; font-weight: 800; display: block; line-height: 1.3; }
.sb-brand span   { color: rgba(255,255,255,.3); font-size: 10px; }
.sb-nav { flex: 1; padding: 10px 0; overflow-y: auto; }
.sb-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 20px;
  color: rgba(255,255,255,.5); font-size: 13px; text-decoration: none;
  border-left: 3px solid transparent; transition: all .15s; white-space: nowrap;
}
.sb-item:hover  { color: rgba(255,255,255,.85); background: rgba(255,255,255,.06); }
.sb-item.active { color: #fff; background: rgba(251,102,2,.15); border-left-color: #FB6602; }
.sb-footer { padding: 16px 20px; border-top: 1px solid rgba(255,255,255,.06); }
.sb-user   { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.sb-avatar { width: 30px; height: 30px; background: #FB6602; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
.sb-user strong { color: #fff; font-size: 12px; display: block; }
.sb-user span   { color: rgba(255,255,255,.3); font-size: 10px; }
.sb-theme  { width: 100%; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1); color: rgba(255,255,255,.7); font-size: 12px; padding: 8px; border-radius: 6px; cursor: pointer; margin-bottom: 8px; transition: all .2s; font-family: inherit; }
.sb-theme:hover  { background: rgba(255,255,255,.14); color: #fff; }
.sb-logout { width: 100%; background: none; border: 1px solid rgba(255,255,255,.1); color: rgba(255,255,255,.4); font-size: 12px; padding: 7px; border-radius: 6px; cursor: pointer; transition: all .2s; font-family: inherit; }
.sb-logout:hover { border-color: #ef4444; color: #ef4444; }

/* Sidebar ligeiramente mais escura no dark mode para criar separação do conteúdo */
[data-theme="dark"] .sidebar { background: #060d1a; box-shadow: 2px 0 16px rgba(0,0,0,.5); }

/* ── Main wrap ───────────────────────────────────────────────────────────────── */
.main-wrap    { margin-left: 220px; min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); }
.main-topbar  { background: var(--card); border-bottom: 1px solid var(--bd); padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
.main-title   { font-size: 17px; font-weight: 800; color: var(--tx); }
.main-clock   { font-family: 'Courier New', monospace; font-size: 13px; color: var(--mt); letter-spacing: 1px; }
.main-content { padding: 28px; flex: 1; }
```

- [ ] **Step 2: Corrigir `input:focus` — usar `var(--card)` em vez de `#fff`**

Localizar:
```css
input:focus, select:focus, textarea:focus { outline: none; border-color: var(--accent); background: #fff; }
```
Substituir por:
```css
input:focus, select:focus, textarea:focus { outline: none; border-color: var(--accent); background: var(--card); }
```

- [ ] **Step 3: Corrigir `td border-bottom` — usar `var(--bd)` em vez de `#f0f0f0`**

Localizar:
```css
td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
```
Substituir por:
```css
td { padding: 10px 12px; border-bottom: 1px solid var(--bd); vertical-align: middle; }
```

- [ ] **Step 4: Adicionar override do loader para tema escuro e substituir bloco Responsivo**

Localizar o bloco responsivo inteiro:
```css
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
Substituir por:
```css
/* ── Dark mode overrides ─────────────────────────────────────────────────────── */
[data-theme="dark"] .loader { background: rgba(15,23,42,.85); }

/* ── Responsivo ─────────────────────────────────────────────────────────────── */
@media (max-width: 900px) { .main-content { padding: 20px; } }
@media (max-width: 640px) {
  .sidebar { display: none; }
  .main-wrap { margin-left: 0; }
  .fgrid { grid-template-columns: 1fr; }
  .table-wrap { overflow-x: auto; }
  table { white-space: nowrap; }
  .modal-actions { flex-direction: column; }
  .btn-save, .btn-cancel { width: 100%; }
}
```

- [ ] **Step 5: Commit**

```bash
git add public/admin.css
git commit -m "feat: admin.css — sidebar fixa substitui topbar, dark mode fixes"
```

---

### Task 3: admin-auth.js — funções de tema

**Files:**
- Modify: `public/admin-auth.js`

- [ ] **Step 1: Substituir conteúdo completo de `public/admin-auth.js`**

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
  document.querySelectorAll('.sb-item').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });
}

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
```

- [ ] **Step 2: Commit**

```bash
git add public/admin-auth.js
git commit -m "feat: admin-auth.js — initTheme, toggleTheme, setActiveNav para sidebar"
```

---

### Task 4: admin.html — sidebar

**Files:**
- Modify: `public/admin.html`

O bloco sidebar é idêntico nas 5 páginas. Apenas o título da `.main-topbar` muda.

- [ ] **Step 1: Adicionar `initTheme()` antes de `requireAuth()`**

Substituir:
```html
<script src="admin-auth.js"></script>
<script>requireAuth();</script>
```
Por:
```html
<script src="admin-auth.js"></script>
<script>initTheme(); requireAuth();</script>
```

- [ ] **Step 2: Remover `body { display: flex; ... }` do `<style>` inline**

No bloco `<style>` no `<head>`, localizar e remover esta linha:
```css
body { display: flex; flex-direction: column; min-height: 100vh; }
```

- [ ] **Step 3: Substituir `<header class="topbar-admin">...</header>` pelo sidebar**

Substituir o bloco `<header class="topbar-admin">` inteiro (da tag `<header` até `</header>`) por:

```html
<aside class="sidebar">
  <div class="sb-brand">
    <div class="sb-dot"></div>
    <div><strong>Impressoras Sobral</strong><span>Gerenciamento de rede</span></div>
  </div>
  <nav class="sb-nav">
    <a href="admin.html"        class="sb-item">📊 Dashboard</a>
    <a href="dispositivos.html" class="sb-item">🖨️ Dispositivos</a>
    <a href="cadastrar.html"    class="sb-item">➕ Cadastrar</a>
    <a href="estoque.html"      class="sb-item">📦 Estoque</a>
    <a href="usuarios.html"     class="sb-item">👥 Usuários</a>
  </nav>
  <div class="sb-footer">
    <div class="sb-user">
      <div class="sb-avatar">👤</div>
      <div><strong id="userLabel">—</strong><span>Administrador</span></div>
    </div>
    <button id="themeBtn" class="sb-theme" onclick="toggleTheme()">🌙 Escuro</button>
    <button class="sb-logout" onclick="logout()">Sair</button>
  </div>
</aside>
```

- [ ] **Step 4: Envolver `<main>` em `.main-wrap`**

Substituir:
```html
<main style="padding:28px;flex:1">
```
Por:
```html
<div class="main-wrap">
<div class="main-topbar"><span class="main-title">📊 Dashboard</span><span id="clock" class="main-clock"></span></div>
<main class="main-content">
```

Substituir `</main>` do final do body por:
```html
</main>
</div>
```

- [ ] **Step 5: Commit**

```bash
git add public/admin.html
git commit -m "feat: admin.html — sidebar fixa + toggle de tema"
```

---

### Task 5: dispositivos.html — sidebar

**Files:**
- Modify: `public/dispositivos.html`

- [ ] **Step 1: Adicionar `initTheme()` antes de `requireAuth()`**

Substituir:
```html
<script src="admin-auth.js"></script>
<script>requireAuth();</script>
```
Por:
```html
<script src="admin-auth.js"></script>
<script>initTheme(); requireAuth();</script>
```

- [ ] **Step 2: Remover `body { display: flex; ... }` do `<style>` inline**

No bloco `<style>` no `<head>`, localizar e remover:
```css
body { display: flex; flex-direction: column; min-height: 100vh; }
```

- [ ] **Step 3: Substituir `<header class="topbar-admin">...</header>` pelo sidebar**

Substituir o bloco `<header class="topbar-admin">` inteiro por:

```html
<aside class="sidebar">
  <div class="sb-brand">
    <div class="sb-dot"></div>
    <div><strong>Impressoras Sobral</strong><span>Gerenciamento de rede</span></div>
  </div>
  <nav class="sb-nav">
    <a href="admin.html"        class="sb-item">📊 Dashboard</a>
    <a href="dispositivos.html" class="sb-item">🖨️ Dispositivos</a>
    <a href="cadastrar.html"    class="sb-item">➕ Cadastrar</a>
    <a href="estoque.html"      class="sb-item">📦 Estoque</a>
    <a href="usuarios.html"     class="sb-item">👥 Usuários</a>
  </nav>
  <div class="sb-footer">
    <div class="sb-user">
      <div class="sb-avatar">👤</div>
      <div><strong id="userLabel">—</strong><span>Administrador</span></div>
    </div>
    <button id="themeBtn" class="sb-theme" onclick="toggleTheme()">🌙 Escuro</button>
    <button class="sb-logout" onclick="logout()">Sair</button>
  </div>
</aside>
```

- [ ] **Step 4: Envolver `<main>` em `.main-wrap`**

Substituir:
```html
<main style="padding:28px;flex:1">
```
Por:
```html
<div class="main-wrap">
<div class="main-topbar"><span class="main-title">🖨️ Dispositivos</span><span id="clock" class="main-clock"></span></div>
<main class="main-content">
```

Substituir `</main>` do final do body por:
```html
</main>
</div>
```

- [ ] **Step 5: Commit**

```bash
git add public/dispositivos.html
git commit -m "feat: dispositivos.html — sidebar fixa + toggle de tema"
```

---

### Task 6: cadastrar.html — sidebar

**Files:**
- Modify: `public/cadastrar.html`

- [ ] **Step 1: Adicionar `initTheme()` antes de `requireAuth()`**

Substituir:
```html
<script src="admin-auth.js"></script>
<script>requireAuth();</script>
```
Por:
```html
<script src="admin-auth.js"></script>
<script>initTheme(); requireAuth();</script>
```

- [ ] **Step 2: Remover `body { display: flex; ... }` do `<style>` inline**

No bloco `<style>` no `<head>`, localizar e remover:
```css
body { display: flex; flex-direction: column; min-height: 100vh; }
```

- [ ] **Step 3: Substituir `<header class="topbar-admin">...</header>` pelo sidebar**

Substituir o bloco `<header class="topbar-admin">` inteiro por:

```html
<aside class="sidebar">
  <div class="sb-brand">
    <div class="sb-dot"></div>
    <div><strong>Impressoras Sobral</strong><span>Gerenciamento de rede</span></div>
  </div>
  <nav class="sb-nav">
    <a href="admin.html"        class="sb-item">📊 Dashboard</a>
    <a href="dispositivos.html" class="sb-item">🖨️ Dispositivos</a>
    <a href="cadastrar.html"    class="sb-item">➕ Cadastrar</a>
    <a href="estoque.html"      class="sb-item">📦 Estoque</a>
    <a href="usuarios.html"     class="sb-item">👥 Usuários</a>
  </nav>
  <div class="sb-footer">
    <div class="sb-user">
      <div class="sb-avatar">👤</div>
      <div><strong id="userLabel">—</strong><span>Administrador</span></div>
    </div>
    <button id="themeBtn" class="sb-theme" onclick="toggleTheme()">🌙 Escuro</button>
    <button class="sb-logout" onclick="logout()">Sair</button>
  </div>
</aside>
```

- [ ] **Step 4: Envolver `<main>` em `.main-wrap`**

Substituir:
```html
<main style="padding:28px;flex:1">
```
Por:
```html
<div class="main-wrap">
<div class="main-topbar"><span class="main-title">➕ Nova Impressora</span><span id="clock" class="main-clock"></span></div>
<main class="main-content">
```

Substituir `</main>` do final do body por:
```html
</main>
</div>
```

- [ ] **Step 5: Commit**

```bash
git add public/cadastrar.html
git commit -m "feat: cadastrar.html — sidebar fixa + toggle de tema"
```

---

### Task 7: estoque.html — sidebar

**Files:**
- Modify: `public/estoque.html`

- [ ] **Step 1: Adicionar `initTheme()` antes de `requireAuth()`**

Substituir:
```html
<script src="admin-auth.js"></script>
<script>requireAuth();</script>
```
Por:
```html
<script src="admin-auth.js"></script>
<script>initTheme(); requireAuth();</script>
```

- [ ] **Step 2: Remover `body { display: flex; ... }` do `<style>` inline**

No bloco `<style>` no `<head>`, localizar e remover:
```css
body { display: flex; flex-direction: column; min-height: 100vh; }
```

- [ ] **Step 3: Substituir `<header class="topbar-admin">...</header>` pelo sidebar**

Substituir o bloco `<header class="topbar-admin">` inteiro por:

```html
<aside class="sidebar">
  <div class="sb-brand">
    <div class="sb-dot"></div>
    <div><strong>Impressoras Sobral</strong><span>Gerenciamento de rede</span></div>
  </div>
  <nav class="sb-nav">
    <a href="admin.html"        class="sb-item">📊 Dashboard</a>
    <a href="dispositivos.html" class="sb-item">🖨️ Dispositivos</a>
    <a href="cadastrar.html"    class="sb-item">➕ Cadastrar</a>
    <a href="estoque.html"      class="sb-item">📦 Estoque</a>
    <a href="usuarios.html"     class="sb-item">👥 Usuários</a>
  </nav>
  <div class="sb-footer">
    <div class="sb-user">
      <div class="sb-avatar">👤</div>
      <div><strong id="userLabel">—</strong><span>Administrador</span></div>
    </div>
    <button id="themeBtn" class="sb-theme" onclick="toggleTheme()">🌙 Escuro</button>
    <button class="sb-logout" onclick="logout()">Sair</button>
  </div>
</aside>
```

- [ ] **Step 4: Envolver `<main>` em `.main-wrap`**

Substituir:
```html
<main style="padding:28px;flex:1">
```
Por:
```html
<div class="main-wrap">
<div class="main-topbar"><span class="main-title">📦 Estoque de Suprimentos</span><span id="clock" class="main-clock"></span></div>
<main class="main-content">
```

Substituir `</main>` do final do body por:
```html
</main>
</div>
```

- [ ] **Step 5: Commit**

```bash
git add public/estoque.html
git commit -m "feat: estoque.html — sidebar fixa + toggle de tema"
```

---

### Task 8: usuarios.html — sidebar

**Files:**
- Modify: `public/usuarios.html`

- [ ] **Step 1: Adicionar `initTheme()` antes de `requireAuth()`**

Substituir:
```html
<script src="admin-auth.js"></script>
<script>requireAuth();</script>
```
Por:
```html
<script src="admin-auth.js"></script>
<script>initTheme(); requireAuth();</script>
```

- [ ] **Step 2: Remover `body { display: flex; ... }` do `<style>` inline**

No bloco `<style>` no `<head>`, localizar e remover:
```css
body { display: flex; flex-direction: column; min-height: 100vh; }
```

- [ ] **Step 3: Substituir `<header class="topbar-admin">...</header>` pelo sidebar**

Substituir o bloco `<header class="topbar-admin">` inteiro por:

```html
<aside class="sidebar">
  <div class="sb-brand">
    <div class="sb-dot"></div>
    <div><strong>Impressoras Sobral</strong><span>Gerenciamento de rede</span></div>
  </div>
  <nav class="sb-nav">
    <a href="admin.html"        class="sb-item">📊 Dashboard</a>
    <a href="dispositivos.html" class="sb-item">🖨️ Dispositivos</a>
    <a href="cadastrar.html"    class="sb-item">➕ Cadastrar</a>
    <a href="estoque.html"      class="sb-item">📦 Estoque</a>
    <a href="usuarios.html"     class="sb-item">👥 Usuários</a>
  </nav>
  <div class="sb-footer">
    <div class="sb-user">
      <div class="sb-avatar">👤</div>
      <div><strong id="userLabel">—</strong><span>Administrador</span></div>
    </div>
    <button id="themeBtn" class="sb-theme" onclick="toggleTheme()">🌙 Escuro</button>
    <button class="sb-logout" onclick="logout()">Sair</button>
  </div>
</aside>
```

- [ ] **Step 4: Envolver `<main>` em `.main-wrap`**

Substituir:
```html
<main style="padding:28px;flex:1">
```
Por:
```html
<div class="main-wrap">
<div class="main-topbar"><span class="main-title">👥 Usuários do Sistema</span><span id="clock" class="main-clock"></span></div>
<main class="main-content">
```

Substituir `</main>` do final do body por:
```html
</main>
</div>
```

- [ ] **Step 5: Commit final**

```bash
git add public/usuarios.html
git commit -m "feat: usuarios.html — sidebar fixa + toggle de tema"
```
