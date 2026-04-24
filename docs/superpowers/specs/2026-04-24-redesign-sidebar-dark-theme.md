# Redesign Admin — Sidebar Escuro + Tema Claro/Escuro

## Goal
Substituir o topbar horizontal de todas as páginas admin por uma sidebar fixa à esquerda (estilo escuro), e adicionar toggle de tema claro/escuro com persistência em localStorage.

## Architecture
Sidebar fixa (220px) compartilhada entre todas as 5 páginas admin. CSS variables em `shared.css` controlam ambos os temas via `[data-theme="dark"]` no `<html>`. `admin-auth.js` carrega o tema salvo antes do primeiro render, evitando flash. O toggle fica no rodapé da sidebar.

## Tech Stack
HTML, CSS (variables + data-theme), JavaScript vanilla — sem frameworks, sem dependências novas.

---

## Layout

### Sidebar (220px, fixa, sempre escura)
- **Topo:** logo com dot laranja + nome "Impressoras Sobral" + subtítulo "Gerenciamento de rede"
- **Nav:** 5 links (Dashboard, Dispositivos, Cadastrar, Estoque, Usuários) com ícone emoji + texto. Active state: `border-left: 3px solid #FB6602` + `background: rgba(251,102,2,.15)` + texto branco
- **Rodapé:** avatar + nome do usuário + botão "Sair" + botão de tema (🌙 / ☀️)
- Cores sidebar: fundo `#0f172a` (light mode) / `#060d1a` (dark mode), texto `rgba(255,255,255,.55)`, hover `rgba(255,255,255,.08)`

### Área de conteúdo (flex: 1, margin-left: 220px)
- **Topbar interna:** barra fina com título da página + relógio (sem navegação — fica na sidebar)
- **Conteúdo:** ocupa o restante

---

## CSS Variables

### Tema Claro (padrão — sem atributo)
```css
--bg:      #f1f5f9
--card:    #ffffff
--tx:      #0f172a
--mt:      #64748b
--bd:      #e2e8f0
--accent:  #FB6602
--ok:      #10b981
--no:      #ef4444
--shadow:  rgba(0,0,0,.06)
```

### Tema Escuro (`[data-theme="dark"]`)
```css
--bg:      #0f172a
--card:    #1e293b
--tx:      #e2e8f0
--mt:      #94a3b8
--bd:      #334155
--accent:  #FB6602
--ok:      #10b981
--no:      #ef4444
--shadow:  rgba(0,0,0,.25)
```

---

## admin-auth.js — Funções novas

```js
function initTheme() {
  const saved = localStorage.getItem('ic_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeBtn(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ic_theme', next);
  updateThemeBtn(next);
}

function updateThemeBtn(theme) {
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = theme === 'dark' ? '☀️ Claro' : '🌙 Escuro';
}
```

`initTheme()` chamado ANTES de qualquer render (primeiro script da página, antes de `requireAuth()`).

---

## HTML da Sidebar (padrão para todas as páginas)

```html
<aside class="sidebar">
  <div class="sb-brand">
    <div class="sb-dot"></div>
    <div>
      <strong>Impressoras Sobral</strong>
      <span>Gerenciamento de rede</span>
    </div>
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
      <div>
        <strong id="userLabel">—</strong>
        <span>Administrador</span>
      </div>
    </div>
    <button id="themeBtn" class="sb-theme" onclick="toggleTheme()">🌙 Escuro</button>
    <button class="sb-logout" onclick="logout()">Sair</button>
  </div>
</aside>

<div class="main-wrap">
  <div class="main-topbar">
    <span class="main-title"><!-- título da página --></span>
    <span id="clock" class="main-clock"></span>
  </div>
  <main class="main-content">
    <!-- conteúdo da página -->
  </main>
</div>
```

---

## admin.css — Classes da sidebar

```css
.sidebar {
  width: 220px; background: #0f172a; position: fixed;
  top: 0; left: 0; bottom: 0; display: flex; flex-direction: column;
  z-index: 100; box-shadow: 2px 0 12px rgba(0,0,0,.2);
}
.sb-brand { padding: 22px 20px 18px; border-bottom: 1px solid rgba(255,255,255,.06); display: flex; align-items: center; gap: 11px; }
.sb-dot { width: 9px; height: 9px; background: #FB6602; border-radius: 50%; flex-shrink: 0; }
.sb-brand strong { color: #fff; font-size: 13px; font-weight: 800; display: block; }
.sb-brand span { color: rgba(255,255,255,.3); font-size: 10px; }
.sb-nav { flex: 1; padding: 12px 0; overflow-y: auto; }
.sb-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 20px;
  color: rgba(255,255,255,.5); font-size: 13px; text-decoration: none;
  border-left: 3px solid transparent; transition: all .15s;
}
.sb-item:hover { color: rgba(255,255,255,.85); background: rgba(255,255,255,.06); }
.sb-item.active { color: #fff; background: rgba(251,102,2,.15); border-left-color: #FB6602; }
.sb-footer { padding: 16px 20px; border-top: 1px solid rgba(255,255,255,.06); }
.sb-user { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.sb-avatar { width: 30px; height: 30px; background: #FB6602; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
.sb-user strong { color: #fff; font-size: 12px; display: block; }
.sb-user span { color: rgba(255,255,255,.3); font-size: 10px; }
.sb-theme { width: 100%; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1); color: rgba(255,255,255,.7); font-size: 12px; padding: 7px; border-radius: 6px; cursor: pointer; margin-bottom: 8px; transition: all .2s; font-family: inherit; }
.sb-theme:hover { background: rgba(255,255,255,.14); color: #fff; }
.sb-logout { width: 100%; background: none; border: 1px solid rgba(255,255,255,.1); color: rgba(255,255,255,.4); font-size: 12px; padding: 7px; border-radius: 6px; cursor: pointer; transition: all .2s; font-family: inherit; }
.sb-logout:hover { border-color: #ef4444; color: #ef4444; }

/* Main wrap */
.main-wrap { margin-left: 220px; min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); }
.main-topbar { background: var(--card); border-bottom: 1px solid var(--bd); padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
.main-title { font-size: 17px; font-weight: 800; color: var(--tx); }
.main-clock { font-family: 'Courier New', monospace; font-size: 13px; color: var(--mt); letter-spacing: 1px; }
.main-content { padding: 28px; flex: 1; }
```

---

## Páginas — o que muda

Cada página troca:
- Remove: `<header class="topbar-admin">...</header>` inteiro
- Remove: `#clock`, `#userLabel`, `.btn-logout`, `.user-chip` do topbar
- Adiciona: `<aside class="sidebar">` + `<div class="main-wrap">`
- Wrap do `<main>` dentro de `.main-content`
- Chama `initTheme()` como primeiro script (antes de `requireAuth()`)

### Títulos por página
- admin.html → "📊 Dashboard"
- dispositivos.html → "🖨️ Dispositivos"
- cadastrar.html → "➕ Nova Impressora"
- estoque.html → "📦 Estoque de Suprimentos"
- usuarios.html → "👥 Usuários do Sistema"

---

## admin-auth.js — setActiveNav atualizado

`setActiveNav()` atualmente usa `.nav-item` — precisa ser atualizado para `.sb-item`:

```js
function setActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'admin.html';
  document.querySelectorAll('.sb-item').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });
}
```

---

## Escopo fora
- Responsividade mobile (sidebar colapsável) — fora do escopo desta iteração
- Mudança nas páginas públicas (dashboard.html, tinta.html) — fora do escopo
