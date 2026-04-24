# Redesign Frontend — Estilo 3 (Topbar Laranja) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o tema dark atual por um tema claro com topbar laranja (#FB6602) em todas as páginas do sistema.

**Architecture:** Atualizar `shared.css` com novos tokens de cor e componente topbar laranja, depois refatorar cada página para remover overrides dark e migrar para o novo layout. Nenhum JavaScript é tocado — apenas HTML estrutural e CSS.

**Tech Stack:** HTML, CSS (variáveis CSS nativas), Playwright (verificação visual)

---

## Mapa de Arquivos

| Arquivo                  | Mudança                                                    |
|--------------------------|------------------------------------------------------------|
| `public/shared.css`      | Reescrever variáveis e `.topbar` para tema claro + laranja |
| `public/login.html`      | Substituir dark card por card com header laranja           |
| `public/index.html`      | Remover sidebar, adicionar topbar horizontal               |
| `public/dashboard.html`  | Atualizar stats e cards para tema claro                    |
| `public/tinta.html`      | Atualizar cards para tema claro                            |

---

## Task 1: Atualizar shared.css

**Files:**
- Modify: `public/shared.css`

- [ ] **Step 1: Substituir as variáveis :root e o topbar**

Substituir TODO o conteúdo de `public/shared.css` por:

```css
/* ── Variáveis globais ──────────────────────────────────────────────────────── */
:root {
  --bg:   #F4F4F4;
  --card: #ffffff;
  --bd:   #e5e5e5;
  --red:  #FB6602;
  --blue: #FB6602;
  --tx:   #1a1a1a;
  --mt:   #6E6E6E;
  --ok:   #10b981;
  --no:   #ef4444;
  --cy:   #06b6d4;
  --mg:   #d946ef;
  --yw:   #eab308;
  --bk:   #64748b;
  --accent: #FB6602;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--tx);
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  min-height: 100vh;
}

/* ── Scrollbar ──────────────────────────────────────────────────────────────── */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: #d0d0d0; border-radius: 10px; }

/* ── Topbar ─────────────────────────────────────────────────────────────────── */
.topbar {
  background: #FB6602;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 28px;
  height: 56px;
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
}
.logo { color: #fff; font-weight: 900; font-size: 15px; display: flex; align-items: center; gap: 10px; }
.logo-dot { width: 8px; height: 8px; background: rgba(255,255,255,0.6); border-radius: 50%; }
.sub  { color: rgba(255,255,255,0.7); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
.tright { display: flex; align-items: center; gap: 14px; }
#clock { font-family: 'Courier New', monospace; font-size: 14px; color: rgba(255,255,255,0.85); letter-spacing: 1px; }

/* ── Botões de navegação ────────────────────────────────────────────────────── */
.btn { border: none; padding: 7px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; transition: filter 0.2s; }
.btn.pr { background: rgba(255,255,255,0.2); color: #fff; }
.btn.sc { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.85); }
.btn:hover { filter: brightness(1.15); }

/* ── Barras de suprimento ───────────────────────────────────────────────────── */
.bar  { background: #e8e8e8; border-radius: 5px; overflow: hidden; }
.fill { height: 100%; border-radius: 5px; transition: width 1.2s cubic-bezier(.1,0,.2,1); }
.fill.cyan    { background: linear-gradient(90deg, #0891b2, var(--cy)); }
.fill.magenta { background: linear-gradient(90deg, #a21caf, var(--mg)); }
.fill.yellow  { background: linear-gradient(90deg, #a16207, var(--yw)); }
.fill.black   { background: linear-gradient(90deg, #334155, var(--bk)); }
.fill.def     { background: linear-gradient(90deg, #d45600, #FB6602); }

/* ── Badge de status ────────────────────────────────────────────────────────── */
.sbadge { padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; flex-shrink: 0; }
.sbadge.on  { background: #ecfdf5; color: #059669; }
.sbadge.off { background: #fef2f2; color: #dc2626; animation: blink 2s 6 forwards; }

/* ── Loader overlay ─────────────────────────────────────────────────────────── */
.loader { position: fixed; inset: 0; background: rgba(244,244,244,.8); display: flex; align-items: center; justify-content: center; z-index: 200; opacity: 0; pointer-events: none; transition: opacity .3s; }
.loader.show { opacity: 1; pointer-events: all; }
.spinner { width: 36px; height: 36px; border: 3px solid #e5e5e5; border-top-color: #FB6602; border-radius: 50%; animation: spin .8s linear infinite; }

/* ── Animações ──────────────────────────────────────────────────────────────── */
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.4} }
@keyframes spin   { to { transform: rotate(360deg); } }
@keyframes flash  { 0%,100%{opacity:0} 50%{opacity:1} }
@keyframes pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }

/* ── Responsividade ─────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .topbar { padding: 0 16px; }
  #clock  { display: none; }
  .tright { gap: 8px; }
  .btn    { padding: 6px 10px; font-size: 11px; }
}

/* ── Acessibilidade: respeitar preferência de movimento reduzido ─────────────── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* ── Estado vazio / erro ────────────────────────────────────────────────────── */
.empty { grid-column: 1/-1; text-align: center; padding: 60px; color: var(--mt); font-size: 16px; }
.empty.error { color: var(--no); }
```

- [ ] **Step 2: Verificar dashboard.html no browser**

Abrir http://localhost:3000/dashboard.html e confirmar:
- Topbar laranja no topo
- Fundo cinza claro (#F4F4F4)
- Cards com fundo branco

- [ ] **Step 3: Commit**

```bash
git add public/shared.css
git commit -m "feat: shared.css — tema claro com topbar laranja"
```

---

## Task 2: Redesign login.html

**Files:**
- Modify: `public/login.html` — substituir `<style>` inteiro e HTML do body

- [ ] **Step 1: Substituir o bloco `<style>` do login**

Localizar todo o `<style>...</style>` entre as linhas 8–323 de `public/login.html` e substituir por:

```html
  <style>
    :root {
      --bg: #F4F4F4; --card: #ffffff; --accent: #FB6602;
      --tx: #1a1a1a; --mt: #6E6E6E; --bd: #e5e5e5;
      --no: #ef4444; --ok: #10b981;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
      background: var(--bg);
      color: var(--tx);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .topbar {
      background: var(--accent);
      padding: 0 32px;
      height: 56px;
      display: flex;
      align-items: center;
    }
    .logo { color: #fff; font-size: 15px; font-weight: 900; display: flex; align-items: center; gap: 10px; }
    .logo-dot { width: 8px; height: 8px; background: rgba(255,255,255,0.6); border-radius: 50%; }

    .body {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
    }

    .card {
      background: var(--card);
      border-radius: 14px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.08);
      width: 100%;
      max-width: 400px;
      overflow: hidden;
    }

    .card-header {
      background: var(--accent);
      padding: 28px 32px;
    }
    .card-header h1 { color: #fff; font-size: 20px; font-weight: 800; }
    .card-header p  { color: rgba(255,255,255,0.8); font-size: 13px; margin-top: 4px; }

    .card-body { padding: 28px 32px; }

    .form-group { margin-bottom: 16px; }
    label { font-size: 11px; font-weight: 700; color: var(--mt); text-transform: uppercase; letter-spacing: .8px; display: block; margin-bottom: 6px; }
    input {
      width: 100%;
      background: var(--bg);
      border: 1.5px solid var(--bd);
      padding: 11px 14px;
      border-radius: 8px;
      color: var(--tx);
      font-size: 14px;
      font-family: inherit;
      transition: border-color .2s, background .2s;
    }
    input:focus { outline: none; border-color: var(--accent); background: #fff; }

    .msg { font-size: 13px; min-height: 18px; margin-bottom: 8px; }
    .msg.error { color: var(--no); }
    .msg.ok    { color: var(--ok); }

    .btn-primary {
      width: 100%;
      background: var(--accent);
      color: #fff;
      border: none;
      padding: 13px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      transition: filter .2s;
    }
    .btn-primary:hover   { filter: brightness(1.08); }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; filter: none; }

    .loading-overlay {
      position: fixed; inset: 0;
      background: rgba(244,244,244,.85);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      z-index: 100; opacity: 0; pointer-events: none; transition: opacity .3s;
    }
    .loading-overlay.show { opacity: 1; pointer-events: all; }
    .loading-spinner {
      width: 40px; height: 40px;
      border: 3px solid var(--bd);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin .8s linear infinite;
      margin-bottom: 16px;
    }
    .loading-overlay p { font-size: 14px; color: var(--mt); }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
```

- [ ] **Step 2: Substituir o HTML do `<body>`**

Localizar tudo a partir de `<body>` até `</body>` e substituir por (mantendo o `<script>` existente intacto):

```html
<body>

  <div class="loading-overlay" id="loadingOverlay">
    <div class="loading-spinner"></div>
    <p>Entrando no sistema...</p>
  </div>

  <div class="topbar">
    <div class="logo">
      <div class="logo-dot"></div>
      Impressoras Sobral
    </div>
  </div>

  <div class="body">
    <div class="card">
      <div class="card-header">
        <h1>Bem-vindo</h1>
        <p>Entre com suas credenciais para acessar o sistema</p>
      </div>
      <div class="card-body">
        <div id="screen-login">
          <form onsubmit="doLogin(); return false;">
            <div class="form-group">
              <label>Usuário</label>
              <input type="text" id="login-user" placeholder="seu.usuario" autocomplete="username" />
            </div>
            <div class="form-group">
              <label>Senha</label>
              <input type="password" id="login-pass" placeholder="••••••••" autocomplete="current-password" />
            </div>
            <div class="msg" id="login-msg"></div>
            <button type="submit" class="btn-primary" id="btn-entrar">Entrar no sistema →</button>
          </form>
        </div>
      </div>
    </div>
  </div>

  <script>
  /* MANTER O SCRIPT EXISTENTE AQUI SEM ALTERAÇÕES */
  </script>
</body>
```

> **Atenção:** Copiar o bloco `<script>` existente do arquivo original para dentro do novo `</body>`. Não alterar nenhuma linha do JavaScript.

- [ ] **Step 3: Verificar login no browser**

Abrir http://localhost:3000/login.html e confirmar:
- Topbar laranja no topo com "Impressoras Sobral"
- Card centralizado com cabeçalho laranja "Bem-vindo"
- Campos sobre fundo cinza claro
- Botão laranja

- [ ] **Step 4: Commit**

```bash
git add public/login.html
git commit -m "feat: login — redesign Estilo 3, topbar laranja + card claro"
```

---

## Task 3: Redesign index.html (Admin — remover sidebar)

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Substituir o bloco `<style>` do index**

Localizar o `<style>` interno (linhas 8–250 aprox.) e substituir por:

```html
  <style>
    :root {
      --bg: #F4F4F4; --card: #ffffff; --accent: #FB6602;
      --tx: #1a1a1a; --mt: #6E6E6E; --bd: #e5e5e5;
      --red: #FB6602; --ok: #10b981; --no: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body { display: flex; flex-direction: column; height: 100vh; overflow: hidden; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--tx); }

    /* ── Topbar laranja (navegação horizontal) ───────────────────────────────── */
    .topbar-admin {
      background: var(--accent); padding: 0 28px;
      display: flex; align-items: center; justify-content: space-between;
      height: 56px; flex-shrink: 0; position: sticky; top: 0; z-index: 100;
    }
    .topbar-left { display: flex; align-items: center; gap: 28px; }
    .tb-logo { color: #fff; font-size: 15px; font-weight: 900; display: flex; align-items: center; gap: 10px; }
    .tb-logo-dot { width: 8px; height: 8px; background: rgba(255,255,255,0.6); border-radius: 50%; }
    .nav-links { display: flex; gap: 4px; }
    .nav-item {
      display: flex; align-items: center; gap: 8px;
      padding: 7px 14px; color: rgba(255,255,255,0.75);
      font-size: 13px; font-weight: 500; cursor: pointer;
      border: none; background: none; font-family: inherit;
      border-radius: 6px; transition: all .15s;
    }
    .nav-item:hover { background: rgba(255,255,255,0.12); color: #fff; }
    .nav-item.active { background: rgba(255,255,255,0.2); color: #fff; font-weight: 700; }
    .nav-icon { font-size: 14px; }
    .topbar-right { display: flex; align-items: center; gap: 12px; }
    .user-chip { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.15); border-radius: 20px; padding: 5px 14px 5px 6px; }
    .user-avatar { width: 26px; height: 26px; background: rgba(255,255,255,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; }
    .user-name-chip { color: #fff; font-size: 12px; font-weight: 600; }
    .btn-logout-top { background: none; border: none; color: rgba(255,255,255,0.7); font-size: 12px; cursor: pointer; padding: 6px 0; font-family: inherit; transition: color .2s; }
    .btn-logout-top:hover { color: #fff; }

    /* ── Main ────────────────────────────────────────────────────────────────── */
    .main { flex: 1; overflow-y: auto; padding: 28px; }
    .section { display: none; }
    .section.active { display: block; }
    .section-title { font-size: 18px; font-weight: 800; margin-bottom: 6px; color: var(--tx); }
    .section-sub   { font-size: 13px; color: var(--mt); margin-bottom: 24px; }

    /* ── Stats ──────────────────────────────────────────────────────────────── */
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
    .stat  { background: var(--card); border-radius: 12px; padding: 20px; border-left: 4px solid transparent; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .stat.s-or { border-left-color: var(--accent); }
    .stat.s-gn { border-left-color: var(--ok); }
    .stat.s-rd { border-left-color: var(--no); }
    .stat.s-yw { border-left-color: #f59e0b; }
    .stat-lbl { font-size: 11px; color: var(--mt); text-transform: uppercase; letter-spacing: .8px; margin-bottom: 8px; }
    .stat-val { font-size: 36px; font-weight: 900; line-height: 1; }
    .stat-val.or { color: var(--accent); }
    .stat-val.gn { color: var(--ok); }
    .stat-val.rd { color: var(--no); }
    .stat-val.wn { color: #f59e0b; }

    /* ── Cards lista ─────────────────────────────────────────────────────────── */
    .recent { background: var(--card); border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .recent-head { padding: 14px 20px; border-bottom: 2px solid var(--accent); display: flex; justify-content: space-between; align-items: center; }
    .recent-head h4 { font-size: 14px; font-weight: 800; color: var(--tx); }
    .dev-row { display: flex; align-items: center; justify-content: space-between; padding: 13px 20px; border-bottom: 1px solid #f5f5f5; transition: background .15s; }
    .dev-row:last-child { border-bottom: none; }
    .dev-row:hover { background: rgba(0,0,0,.02); }
    .dev-info strong { font-size: 13px; display: block; color: var(--tx); }
    .dev-info span   { font-size: 11px; color: var(--mt); margin-top: 2px; display: block; }

    /* ── Formulário ──────────────────────────────────────────────────────────── */
    .form-card { background: var(--card); border-radius: 14px; padding: 24px; max-width: 520px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    label { font-size: 11px; font-weight: 700; color: var(--mt); text-transform: uppercase; display: block; margin-bottom: 4px; letter-spacing: .5px; }
    input, select { width: 100%; background: var(--bg); border: 1.5px solid var(--bd); padding: 10px; border-radius: 6px; color: var(--tx); margin-bottom: 8px; font-size: 13px; transition: border-color .2s; font-family: inherit; }
    input:focus, select:focus { outline: none; border-color: var(--accent); background: #fff; }
    input.is-invalid, select.is-invalid { border-color: var(--no) !important; box-shadow: 0 0 0 2px rgba(239,68,68,.1); }
    .fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .btn-add { background: var(--accent); color: #fff; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: 700; width: 100%; margin-top: 6px; font-size: 14px; transition: filter .2s; font-family: inherit; }
    .btn-add:hover { filter: brightness(1.08); }
    .btn-add:disabled { opacity: .6; cursor: not-allowed; filter: none; }

    /* ── Estoque ─────────────────────────────────────────────────────────────── */
    .est-actions { display: flex; justify-content: flex-end; margin-bottom: 16px; }
    .btn-sec { background: none; border: 1.5px solid var(--bd); color: var(--mt); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all .2s; font-family: inherit; }
    .btn-sec:hover { border-color: var(--no); color: var(--no); }
    .secao-titulo { display: flex; align-items: center; gap: 10px; margin: 24px 0 12px; }
    .secao-titulo h3 { font-size: 14px; font-weight: 700; color: var(--tx); }
    .badge-toner  { background: rgba(110,110,110,.1); color: var(--mt); border: 1px solid rgba(110,110,110,.2); padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .secao-empty  { color: var(--mt); font-size: 13px; padding: 16px 0; }

    .model-group { background: var(--card); border: 1.5px solid var(--bd); border-radius: 12px; padding: 16px; margin-bottom: 16px; transition: border-color .3s; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .model-group.unlocked { border-color: rgba(251,102,2,.5); background: rgba(251,102,2,.03); }
    .model-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--bd); font-size: 14px; }
    .stock-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }

    .toner-card { background: var(--bg); border: 1.5px solid var(--bd); padding: 12px; border-radius: 8px; text-align: center; transition: border-color .2s; }
    .toner-card:hover { border-color: var(--accent); }
    .toner-card.locked .controls { opacity: .3; pointer-events: none; }
    .toner-card.locked { border-color: rgba(200,200,200,.4); }

    .indicator { height: 3px; width: 30px; margin: 0 auto 8px; border-radius: 2px; }
    .bg-cyan    { background: #06b6d4; }
    .bg-magenta { background: #d946ef; }
    .bg-yellow  { background: #eab308; }
    .bg-black   { background: #64748b; }
    .toner-name { font-size: 10px; font-weight: 600; color: var(--mt); text-transform: uppercase; margin-bottom: 8px; }
    .controls   { display: flex; align-items: center; justify-content: center; gap: 10px; }
    .btn-q { background: var(--bd); color: var(--tx); border: none; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 16px; transition: background .2s; }
    .btn-q:hover { background: var(--accent); color: #fff; }
    .val { font-size: 1.15rem; font-weight: 800; min-width: 22px; }

    .btn-lock { display: inline-flex; align-items: center; gap: 5px; background: rgba(200,200,200,.3); border: 1.5px solid var(--bd); color: var(--mt); padding: 5px 11px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all .2s; font-family: inherit; white-space: nowrap; }
    .btn-lock:hover { border-color: var(--accent); color: var(--accent); }
    .btn-lock.unlocked { background: rgba(251,102,2,.1); border-color: rgba(251,102,2,.4); color: var(--accent); }

    /* ── Dispositivos — tabela ──────────────────────────────────────────────── */
    .table-wrap { background: var(--card); border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; color: var(--mt); padding: 10px 12px; border-bottom: 2px solid var(--accent); font-size: 11px; text-transform: uppercase; letter-spacing: .5px; background: var(--card); }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(251,102,2,.02); }

    .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
    .status-dot.on  { background: var(--ok); }
    .status-dot.off { background: var(--no); animation: blink 2s infinite; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
    @media (prefers-reduced-motion: reduce) { .status-dot.off { animation: none; } }

    .btn-tinta { background: rgba(251,102,2,.08); border: 1px solid rgba(251,102,2,.25); color: var(--accent); padding: 4px 10px; border-radius: 5px; font-size: 11px; font-weight: 600; cursor: pointer; text-decoration: none; transition: all .2s; }
    .btn-tinta:hover { background: var(--accent); color: #fff; }
    .btn-del  { background: none; border: none; color: #aaa; font-size: 16px; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: color .2s; }
    .btn-del:hover { color: var(--no); }
    .btn-edit { background: rgba(110,110,110,.08); border: 1px solid rgba(110,110,110,.2); color: var(--mt); padding: 4px 10px; border-radius: 5px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all .2s; font-family: inherit; }
    .btn-edit:hover { border-color: var(--accent); color: var(--accent); }
    .btn-print { background: rgba(16,185,129,.08); border: 1px solid rgba(16,185,129,.2); color: var(--ok); padding: 4px 10px; border-radius: 5px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all .2s; font-family: inherit; }
    .btn-print:hover { background: var(--ok); color: #fff; }

    /* ── Modal ──────────────────────────────────────────────────────────────── */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: none; align-items: center; justify-content: center; z-index: 300; padding: 16px; }
    .modal-overlay.open { display: flex; }
    .modal { background: var(--card); border-radius: 14px; padding: 28px; max-width: 400px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,.15); }
    .modal h3 { font-size: 16px; font-weight: 800; margin-bottom: 8px; color: var(--tx); }
    .modal p  { font-size: 13px; color: var(--mt); margin-bottom: 20px; }
    .modal-btns { display: flex; gap: 10px; justify-content: flex-end; }
    .modal input { margin-bottom: 0; }

    .btn-cancel { background: var(--bg); border: 1.5px solid var(--bd); color: var(--mt); padding: 9px 18px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .2s; }
    .btn-cancel:hover { border-color: #aaa; color: var(--tx); }
    .btn-confirm { background: var(--no); color: #fff; border: none; padding: 9px 18px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: filter .2s; }
    .btn-confirm:hover { filter: brightness(1.1); }

    /* ── Toast ──────────────────────────────────────────────────────────────── */
    .toast { position: fixed; bottom: 24px; right: 24px; background: var(--tx); color: var(--card); padding: 12px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; z-index: 400; opacity: 0; transform: translateY(8px); transition: all .25s; pointer-events: none; }
    .toast.show { opacity: 1; transform: translateY(0); }
    .toast.erro { background: var(--no); }

    /* ── Usuários ────────────────────────────────────────────────────────────── */
    .user-form { background: var(--card); border-radius: 14px; padding: 24px; max-width: 480px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .user-form h3 { font-size: 15px; font-weight: 700; margin-bottom: 16px; color: var(--tx); }
    .user-table-wrap { background: var(--card); border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .msg-inline { font-size: 12px; min-height: 16px; margin: 4px 0 8px; }
    .msg-inline.ok  { color: var(--ok); }
    .msg-inline.err { color: var(--no); }

    /* ── Loader overlay ──────────────────────────────────────────────────────── */
    .loader { position: fixed; inset: 0; background: rgba(244,244,244,.8); display: flex; align-items: center; justify-content: center; z-index: 200; opacity: 0; pointer-events: none; transition: opacity .3s; }
    .loader.show { opacity: 1; pointer-events: all; }
    .spinner { width: 36px; height: 36px; border: 3px solid var(--bd); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Responsividade ──────────────────────────────────────────────────────── */
    @media (max-width: 768px) {
      .stats { grid-template-columns: repeat(2, 1fr); }
      .topbar-admin { padding: 0 16px; }
      .nav-links .nav-item span:not(.nav-icon) { display: none; }
    }
    @media (max-width: 480px) {
      .main { padding: 16px; }
      .fgrid { grid-template-columns: 1fr; }
    }
  </style>
```

- [ ] **Step 2: Substituir o HTML da topbar e layout**

No `<body>` do `index.html`, localizar o trecho:

```html
<div class="loader" id="loader"><div class="spinner"></div></div>

<div class="layout">
  <aside class="sidebar">
    ...
  </aside>
  <div class="main">
```

E substituir por:

```html
<div class="loader" id="loader"><div class="spinner"></div></div>

<header class="topbar-admin">
  <div class="topbar-left">
    <div class="tb-logo">
      <div class="tb-logo-dot"></div>
      Impressoras Sobral
    </div>
    <nav class="nav-links">
      <button class="nav-item active" onclick="setSection('painel', this)"><span class="nav-icon">📊</span> Painel</button>
      <button class="nav-item" onclick="setSection('dispositivos', this)"><span class="nav-icon">🖨️</span> Dispositivos</button>
      <button class="nav-item" onclick="setSection('cadastrar', this)"><span class="nav-icon">➕</span> Cadastrar</button>
      <button class="nav-item" onclick="setSection('estoque', this)"><span class="nav-icon">📦</span> Estoque</button>
      <button class="nav-item" onclick="setSection('usuarios', this)"><span class="nav-icon">👤</span> Usuários</button>
    </nav>
  </div>
  <div class="topbar-right">
    <div class="user-chip">
      <div class="user-avatar">👤</div>
      <span class="user-name-chip" id="user-name-display">admin</span>
    </div>
    <button class="btn-logout-top" onclick="doLogout()">Sair</button>
  </div>
</header>

<div class="main">
```

- [ ] **Step 3: Fechar as divs corretas no final do body**

Localizar o fechamento `</div><!-- /.layout -->` e remover esse wrapper, mantendo apenas `</div>` para fechar `.main`.

- [ ] **Step 4: Atualizar a função `setSection` no JS**

No script do `index.html`, localizar a função `setSection` e confirmar que ela funciona com os botões do topbar (o segundo parâmetro `btn` já é passado via `onclick`). Não há alteração necessária no JS se a assinatura for `setSection(id, btn)`.

- [ ] **Step 5: Atualizar o nome do usuário no topbar**

Localizar onde `_adminToken` é decodificado para exibir o nome do usuário e adicionar:
```javascript
document.getElementById('user-name-display').textContent = payload.usuario || 'admin';
```
Logo após a linha que lê o token do `sessionStorage`.

- [ ] **Step 6: Verificar index.html no browser**

Abrir http://localhost:3000/index.html e confirmar:
- Topbar laranja com navegação horizontal
- Sem sidebar preta
- Seções alternando ao clicar nos botões

- [ ] **Step 7: Commit**

```bash
git add public/index.html
git commit -m "feat: admin — remover sidebar, topbar horizontal laranja"
```

---

## Task 4: Atualizar dashboard.html

**Files:**
- Modify: `public/dashboard.html`

- [ ] **Step 1: Atualizar cores do `<style>` interno**

Localizar e substituir as linhas problemáticas para tema claro:

`.nosnmp`:
```css
.nosnmp { color: var(--mt); font-size: 11px; padding: 12px; text-align: center; border: 1px dashed var(--bd); border-radius: 6px; }
```

`.lck`:
```css
.lck { font-size: 11px; color: var(--mt); }
```

`.card:hover`:
```css
.card:hover { border-color: #ccc; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.08); }
```

`.statsbar` e `.pill`:
```css
.statsbar { display: flex; gap: 14px; padding: 14px 28px; background: var(--card); border-bottom: 1px solid var(--bd); }
.pill { display: flex; align-items: center; gap: 12px; background: var(--card); border: 1px solid var(--bd); border-radius: 8px; padding: 10px 18px; flex: 1; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
```

`.si` (campo de busca):
```css
.si { background: var(--card); border: 1.5px solid var(--bd); color: var(--tx); padding: 9px 14px; border-radius: 8px; font-size: 13px; width: 260px; transition: border-color 0.2s; }
.si:focus { outline: none; border-color: var(--blue); }
```

`.fb` (botões de filtro):
```css
.fb { background: var(--card); border: 1.5px solid var(--bd); color: var(--mt); padding: 8px 14px; border-radius: 8px; font-size: 12px; cursor: pointer; transition: all 0.2s; }
.fb.act { border-color: var(--blue); color: var(--blue); background: rgba(251,102,2,.08); }
.fb:hover { border-color: #bbb; color: var(--tx); }
.fb:disabled { opacity: .5; cursor: not-allowed; }
```

`.pip` (IP da impressora):
```css
.pip { font-size: 13px; color: var(--accent); font-weight: 600; margin-top: 3px; }
```

`.btr` (botão ver tinta):
```css
.btr { background: rgba(251,102,2,.08); border: 1px solid rgba(251,102,2,.25); color: var(--blue); padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; text-decoration: none; transition: all 0.2s; }
.btr:hover { background: var(--blue); color: #fff; }
```

- [ ] **Step 2: Verificar dashboard.html no browser**

Abrir http://localhost:3000/dashboard.html e confirmar:
- Topbar laranja (vem do shared.css)
- Cards com fundo branco e borda cinza clara
- Barras de tinta CMYK mantidas com as cores originais

- [ ] **Step 3: Commit**

```bash
git add public/dashboard.html
git commit -m "feat: dashboard — atualizar estilos para tema claro"
```

---

## Task 5: Atualizar tinta.html

**Files:**
- Modify: `public/tinta.html`

- [ ] **Step 1: Atualizar cores do `<style>` interno**

`.card:hover`:
```css
.card:hover { border-color: #ccc; box-shadow: 0 6px 20px rgba(0,0,0,.08); }
```

`.card.crit`:
```css
.card.crit { border-color: rgba(239,68,68,.4); }
```

`.pip` (IP):
```css
.pip { font-size: 12px; color: var(--accent); font-weight: 600; margin-top: 2px; }
```

`.ctop`:
```css
.ctop { padding: 14px 16px 12px; border-bottom: 1px solid var(--bd); display: flex; justify-content: space-between; align-items: center; background: var(--card); }
```

`.lupd` e `.dot`:
```css
.lupd { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--mt); }
.dot  { width: 8px; height: 8px; border-radius: 50%; background: var(--ok); animation: pulse 2s 5 forwards; }
```

`.btn-refresh`:
```css
.btn-refresh { background: var(--card); border: 1.5px solid var(--bd); color: var(--mt); padding: 12px 28px; border-radius: 8px; font-size: 13px; cursor: pointer; transition: all .2s; display: flex; align-items: center; gap: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.btn-refresh:hover:not(:disabled) { border-color: var(--blue); color: var(--blue); }
.btn-refresh:disabled { opacity: .5; cursor: not-allowed; }
```

`.alert-global`:
```css
.alert-global { margin: 16px 28px; background: rgba(239,68,68,.06); border: 1px solid rgba(239,68,68,.2); border-radius: 10px; padding: 14px 18px; display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--no); }
```

- [ ] **Step 2: Verificar tinta.html no browser**

Abrir http://localhost:3000/tinta.html e confirmar:
- Topbar laranja (vem do shared.css)
- Cards de toner com fundo branco
- Barras CMYK preservadas com as cores originais

- [ ] **Step 3: Commit final**

```bash
git add public/tinta.html
git commit -m "feat: tinta — atualizar estilos para tema claro"
git push origin master
```

---

## Verificação Final

Após todos os tasks, confirmar em cada página:

| Página          | Topbar laranja | Fundo claro | Cards brancos | JS funcional |
|-----------------|:--------------:|:-----------:|:-------------:|:------------:|
| login.html      | ✓              | ✓           | ✓             | login        |
| index.html      | ✓              | ✓           | ✓             | nav, estoque |
| dashboard.html  | ✓              | ✓           | ✓             | filtros, cards |
| tinta.html      | ✓              | ✓           | ✓             | refresh      |
