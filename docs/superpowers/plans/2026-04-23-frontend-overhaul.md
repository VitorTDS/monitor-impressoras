# Frontend Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir todos os bugs, memory leaks, problemas de acessibilidade e UX identificados no frontend do monitor de impressoras, consolidando CSS duplicado e melhorando segurança da autenticação local.

**Architecture:** CSS comum extraído para `shared.css` e linkado em todas as páginas; cada página mantém apenas seu CSS específico. Melhorias de comportamento feitas diretamente nos scripts inline existentes (sem adicionar bundler ou framework). Auth migrada de `btoa` para SHA-256 via `SubtleCrypto`.

**Tech Stack:** HTML5 vanilla, CSS3 (custom properties), JavaScript ES2020, SubtleCrypto API, Page Visibility API.

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade após mudança |
|---|---|---|
| `public/shared.css` | **Criar** | Variáveis CSS, topbar, loader, btn, bar/fill, sbadge, prefers-reduced-motion |
| `public/style.css` | **Deletar** | Substituído por shared.css (era usado apenas em login.html) |
| `public/dashboard.html` | **Modificar** | Link shared.css, fix admin link, error feedback, loading state, setInterval cleanup, prefers-reduced-motion |
| `public/tinta.html` | **Modificar** | Link shared.css, fix admin link, fix XSS no alerta, error feedback, loading state, setInterval cleanup, prefers-reduced-motion |
| `public/index.html` | **Modificar** | Link shared.css, prefers-reduced-motion no blink |
| `public/login.html` | **Modificar** | Substituir btoa por SHA-256 async, migração transparente de senhas antigas |
| `public/monitor.html` | **Modificar** | Redirect para dashboard.html (arquivo está vazio/1 linha) |

---

## Task 1: Criar shared.css e deletar style.css

**Files:**
- Create: `public/shared.css`
- Delete: `public/style.css`

- [ ] **Step 1: Criar shared.css com variáveis e componentes comuns**

Criar `/c/monitor-impressoras/public/shared.css` com o conteúdo:

```css
/* ── Variáveis globais ──────────────────────────────────────────────────────── */
:root {
  --bg:   #0a0a0a;
  --card: #161616;
  --bd:   #2a2a2a;
  --red:  #cc0000;
  --blue: #3b82f6;
  --tx:   #f1f1f1;
  --mt:   #666;
  --ok:   #10b981;
  --no:   #ef4444;
  --cy:   #06b6d4;
  --mg:   #d946ef;
  --yw:   #eab308;
  --bk:   #64748b;
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
::-webkit-scrollbar-thumb { background: var(--bd); border-radius: 10px; }

/* ── Topbar ─────────────────────────────────────────────────────────────────── */
.topbar {
  background: #000;
  border-bottom: 2px solid var(--red);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 28px;
  position: sticky;
  top: 0;
  z-index: 100;
}
.logo { color: var(--red); font-weight: 900; font-size: 20px; }
.sub  { color: var(--mt); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
.tright { display: flex; align-items: center; gap: 14px; }
#clock { font-family: 'Courier New', monospace; font-size: 22px; color: var(--red); }

/* ── Botões de navegação ────────────────────────────────────────────────────── */
.btn { border: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; transition: filter 0.2s; }
.btn.pr { background: var(--blue); color: #fff; }
.btn.sc { background: #1e293b; color: var(--tx); }
.btn:hover { filter: brightness(1.2); }

/* ── Barras de suprimento ───────────────────────────────────────────────────── */
.bar  { background: #1a1a1a; border-radius: 5px; overflow: hidden; }
.fill { height: 100%; border-radius: 5px; transition: width 1.2s cubic-bezier(.1,0,.2,1); }
.fill.cyan    { background: linear-gradient(90deg, #0891b2, var(--cy)); }
.fill.magenta { background: linear-gradient(90deg, #a21caf, var(--mg)); }
.fill.yellow  { background: linear-gradient(90deg, #a16207, var(--yw)); }
.fill.black   { background: linear-gradient(90deg, #334155, var(--bk)); }
.fill.def     { background: linear-gradient(90deg, #3b82f6, #60a5fa); }

/* ── Badge de status ────────────────────────────────────────────────────────── */
.sbadge { padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; flex-shrink: 0; }
.sbadge.on  { background: rgba(16,185,129,.12); color: var(--ok); border: 1px solid rgba(16,185,129,.4); }
.sbadge.off { background: rgba(239,68,68,.12);  color: var(--no); border: 1px solid rgba(239,68,68,.4); animation: blink 2s 6 forwards; }

/* ── Loader overlay ─────────────────────────────────────────────────────────── */
.loader { position: fixed; inset: 0; background: rgba(10,10,10,.75); display: flex; align-items: center; justify-content: center; z-index: 200; opacity: 0; pointer-events: none; transition: opacity .3s; }
.loader.show { opacity: 1; pointer-events: all; }
.spinner { width: 36px; height: 36px; border: 3px solid var(--bd); border-top-color: var(--red); border-radius: 50%; animation: spin .8s linear infinite; }

/* ── Animações ──────────────────────────────────────────────────────────────── */
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.4} }
@keyframes spin   { to { transform: rotate(360deg); } }
@keyframes flash  { 0%,100%{opacity:0} 50%{opacity:1} }
@keyframes pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }

/* ── Acessibilidade: respeitar preferência de movimento reduzido ─────────────── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* ── Estado vazio ───────────────────────────────────────────────────────────── */
.empty { grid-column: 1/-1; text-align: center; padding: 60px; color: var(--mt); font-size: 16px; }
.empty.error { color: var(--no); }
```

- [ ] **Step 2: Deletar style.css**

```bash
rm /c/monitor-impressoras/public/style.css
```

- [ ] **Step 3: Commit**

```bash
git add public/shared.css public/style.css
git commit -m "feat: criar shared.css com componentes comuns e remover style.css não-utilizado"
```

---

## Task 2: Corrigir dashboard.html

**Files:**
- Modify: `public/dashboard.html`

Substituições a fazer no arquivo (reescrever o arquivo completo):

- [ ] **Step 1: Reescrever dashboard.html**

Substituir o conteúdo completo de `public/dashboard.html` por:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monitor de Impressoras</title>
  <link rel="stylesheet" href="shared.css">
  <style>
    body { overflow-x: hidden; }

    .statsbar { display: flex; gap: 14px; padding: 14px 28px; background: #0d0d0d; border-bottom: 1px solid var(--bd); }
    .pill { display: flex; align-items: center; gap: 12px; background: var(--card); border: 1px solid var(--bd); border-radius: 8px; padding: 10px 18px; flex: 1; }
    .pico { font-size: 20px; }
    .plbl { font-size: 10px; color: var(--mt); text-transform: uppercase; letter-spacing: 1px; }
    .pval { font-size: 26px; font-weight: 800; line-height: 1; }
    .pval.bl { color: var(--blue); } .pval.gn { color: var(--ok); } .pval.rd { color: var(--no); } .pval.wn { color: #f59e0b; }

    .sbar { padding: 12px 28px; display: flex; gap: 10px; align-items: center; background: #0d0d0d; flex-wrap: wrap; }
    .si { background: var(--card); border: 1px solid var(--bd); color: var(--tx); padding: 9px 14px; border-radius: 8px; font-size: 13px; width: 260px; transition: border-color 0.2s; }
    .si:focus { outline: none; border-color: var(--blue); }
    .fb { background: var(--card); border: 1px solid var(--bd); color: var(--mt); padding: 8px 14px; border-radius: 8px; font-size: 12px; cursor: pointer; transition: all 0.2s; }
    .fb.act { border-color: var(--blue); color: var(--blue); background: rgba(59,130,246,.08); }
    .fb:hover { border-color: #555; color: var(--tx); }
    .fb:disabled { opacity: .5; cursor: not-allowed; }

    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px; padding: 24px 28px; }

    .card { background: var(--card); border: 1px solid var(--bd); border-radius: 12px; padding: 20px; transition: all 0.25s ease; position: relative; overflow: hidden; }
    .card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--bd); transition: background 0.3s; }
    .card.is-on::before { background: var(--ok); }
    .card.is-off::before { background: var(--no); }
    .card:hover { border-color: #444; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.4); }

    .ch { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
    .pname { font-size: 17px; font-weight: 700; }
    .pip   { font-size: 13px; color: var(--red); font-weight: 600; margin-top: 3px; }
    .pmod  { font-size: 11px; color: var(--mt); margin-top: 3px; }
    .ploc  { font-size: 11px; color: #555; margin-top: 2px; }

    .srow  { margin-bottom: 12px; }
    .smeta { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 5px; color: var(--mt); text-transform: uppercase; letter-spacing: .5px; }
    .pct   { font-weight: 700; }
    .pct.wn { color: #f59e0b; } .pct.cr { color: var(--no); }
    .bar   { height: 10px; }

    .nosnmp   { color: #333; font-size: 11px; padding: 12px; text-align: center; border: 1px dashed #222; border-radius: 6px; }
    .alert-low { background: rgba(239,68,68,.07); border: 1px solid rgba(239,68,68,.2); border-radius: 6px; padding: 7px 12px; font-size: 11px; color: var(--no); margin-top: 12px; }

    .cf  { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--bd); }
    .lck { font-size: 11px; color: #444; }
    .btr { background: rgba(59,130,246,.08); border: 1px solid rgba(59,130,246,.25); color: var(--blue); padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; text-decoration: none; transition: all 0.2s; }
    .btr:hover { background: var(--blue); color: #fff; }
  </style>
</head>
<body>

<div class="loader" id="loader"><div class="spinner"></div></div>

<div class="topbar">
  <div>
    <div class="logo">imageCLASS</div>
    <div class="sub">Monitoramento de Rede</div>
  </div>
  <div class="tright">
    <div id="clock">00:00:00</div>
    <a href="tinta.html" class="btn pr">Níveis de Tinta</a>
    <a href="index.html" class="btn sc">Admin</a>
  </div>
</div>

<div class="statsbar">
  <div class="pill"><div class="pico">🖨️</div><div><div class="plbl">Total</div><div class="pval bl" id="tot">0</div></div></div>
  <div class="pill"><div class="pico">🟢</div><div><div class="plbl">Online</div><div class="pval gn" id="onl">0</div></div></div>
  <div class="pill"><div class="pico">🔴</div><div><div class="plbl">Offline</div><div class="pval rd" id="ofl">0</div></div></div>
  <div class="pill"><div class="pico">⚠️</div><div><div class="plbl">Tinta Baixa</div><div class="pval wn" id="low">0</div></div></div>
</div>

<div class="sbar">
  <input class="si" id="si" placeholder="Buscar impressora, IP, setor..." oninput="renderizar()" aria-label="Buscar impressora">
  <button class="fb act" id="b-all" onclick="setF('all')">Todas</button>
  <button class="fb"     id="b-on"  onclick="setF('on')">Online</button>
  <button class="fb"     id="b-off" onclick="setF('off')">Offline</button>
  <button class="fb"     id="b-low" onclick="setF('low')">Tinta Baixa</button>
  <button class="fb" id="btn-refresh" style="margin-left:auto" onclick="carregar()">Atualizar</button>
</div>

<div class="grid" id="grid"></div>

<script>
  let dadosCache  = [];
  let filtroAtivo = 'all';
  let timerId     = null;

  const esc = t => String(t ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]);

  function corC(nome) {
    const n = nome.toLowerCase();
    if (n.includes('cyan')   || n.includes('ciano'))   return 'cyan';
    if (n.includes('magenta'))                          return 'magenta';
    if (n.includes('yellow') || n.includes('amarelo'))  return 'yellow';
    if (n.includes('black')  || n.includes('preto'))   return 'black';
    return 'def';
  }

  function pClass(v) { return v <= 10 ? 'cr' : v <= 25 ? 'wn' : ''; }
  function tBaixa(s) { return (s || []).some(x => x.percentual <= 15); }

  function setF(f) {
    filtroAtivo = f;
    ['all','on','off','low'].forEach(id => document.getElementById('b-'+id).classList.toggle('act', id === f));
    renderizar();
  }

  function dadosFiltrados() {
    const q = (document.getElementById('si').value || '').toLowerCase();
    return dadosCache.filter(p => {
      const txt = (p.nome + p.ip + (p.modelo||'') + (p.localizacao||'')).toLowerCase();
      if (!txt.includes(q)) return false;
      if (filtroAtivo === 'on')  return p.online;
      if (filtroAtivo === 'off') return !p.online;
      if (filtroAtivo === 'low') return tBaixa(p.suprimentos);
      return true;
    });
  }

  async function carregar() {
    const btn = document.getElementById('btn-refresh');
    btn.disabled = true;
    btn.textContent = 'Atualizando...';
    document.getElementById('loader').classList.add('show');
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      dadosCache = await res.json();
      renderizar();
    } catch(e) {
      console.error('Erro ao carregar:', e);
      document.getElementById('grid').innerHTML =
        '<div class="empty error">Erro ao carregar dados. Verifique a conexão com o servidor.</div>';
    } finally {
      document.getElementById('loader').classList.remove('show');
      btn.disabled = false;
      btn.textContent = 'Atualizar';
    }
  }

  function renderizar() {
    const lista = dadosFiltrados();
    const grid  = document.getElementById('grid');
    const agora = new Date().toLocaleTimeString('pt-BR');

    document.getElementById('tot').textContent = dadosCache.length;
    document.getElementById('onl').textContent = dadosCache.filter(p => p.online).length;
    document.getElementById('ofl').textContent = dadosCache.filter(p => !p.online).length;
    document.getElementById('low').textContent = dadosCache.filter(p => tBaixa(p.suprimentos)).length;

    if (!lista.length) {
      grid.innerHTML = '<div class="empty">Nenhuma impressora encontrada</div>';
      return;
    }

    grid.innerHTML = lista.map(p => {
      const sup   = Array.isArray(p.suprimentos) ? p.suprimentos : [];
      const baixa = tBaixa(sup);
      return `
        <div class="card ${p.online ? 'is-on' : 'is-off'}">
          <div class="ch">
            <div>
              <div class="pname">${esc(p.nome)}</div>
              <div class="pip">${esc(p.ip)}</div>
              <div class="pmod">${esc(p.modelo || 'Canon imageCLASS')}</div>
              ${p.localizacao ? `<div class="ploc">📍 ${esc(p.localizacao)}</div>` : ''}
            </div>
            <div class="sbadge ${p.online ? 'on' : 'off'}" aria-label="${p.online ? 'Conectado' : 'Sem sinal'}">${p.online ? '● CONECTADO' : '● SEM SINAL'}</div>
          </div>
          <div>
            ${sup.length ? sup.map(s => `
              <div class="srow">
                <div class="smeta">
                  <span>${esc(s.nome)}</span>
                  <span class="pct ${pClass(s.percentual)}">${s.percentual}%</span>
                </div>
                <div class="bar"><div class="fill ${corC(s.nome)}" style="width:${s.percentual}%" role="progressbar" aria-valuenow="${s.percentual}" aria-valuemin="0" aria-valuemax="100"></div></div>
              </div>`).join('') : '<div class="nosnmp">Leitura SNMP indisponível</div>'}
          </div>
          ${baixa ? '<div class="alert-low" role="alert">Tinta crítica — verificar reposição</div>' : ''}
          <div class="cf">
            <span class="lck">Verificado: ${agora}</span>
            ${p.online
              ? `<a class="btr" href="http://${esc(p.ip)}" target="_blank" rel="noopener">Interface Remota</a>`
              : '<span style="font-size:11px;color:#333">Sem conexão</span>'}
          </div>
        </div>`;
    }).join('');
  }

  function iniciarTimer() {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(carregar, 30000);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(timerId);
      timerId = null;
    } else {
      carregar();
      iniciarTimer();
    }
  });

  setInterval(() => {
    document.getElementById('clock').textContent = new Date().toLocaleTimeString('pt-BR');
  }, 1000);

  carregar();
  iniciarTimer();
</script>
</body>
</html>
```

- [ ] **Step 2: Verificar no browser que a página carrega sem erros de console**

Abrir `http://localhost:3000/dashboard.html` e verificar:
- Sem erros de CSP no console
- Link "Admin" vai para `index.html`
- Botão "Atualizar" fica desabilitado durante o load
- Grid mostra "Erro ao carregar..." se servidor estiver down

- [ ] **Step 3: Commit**

```bash
git add public/dashboard.html
git commit -m "fix: dashboard — link admin, error feedback, loading state, setInterval cleanup, shared.css"
```

---

## Task 3: Corrigir tinta.html

**Files:**
- Modify: `public/tinta.html`

- [ ] **Step 1: Reescrever tinta.html**

Substituir o conteúdo completo de `public/tinta.html` por:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Níveis de Tinta - imageCLASS</title>
  <link rel="stylesheet" href="shared.css">
  <style>
    .page-header { padding: 20px 28px 0; display: flex; justify-content: space-between; align-items: flex-end; }
    .ph-title { font-size: 22px; font-weight: 800; }
    .ph-sub   { font-size: 12px; color: var(--mt); margin-top: 4px; }
    .lupd { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #555; }
    .dot  { width: 8px; height: 8px; border-radius: 50%; background: var(--ok); animation: pulse 2s 5 forwards; }

    .alert-global { margin: 16px 28px; background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.25); border-radius: 10px; padding: 14px 18px; display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--no); }
    .alert-global .ico { font-size: 22px; flex-shrink: 0; }

    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; padding: 20px 28px; }

    .card { background: var(--card); border: 1px solid var(--bd); border-radius: 12px; overflow: hidden; transition: border-color .2s, box-shadow .2s; }
    .card:hover { border-color: #444; box-shadow: 0 6px 20px rgba(0,0,0,.4); }
    .card.crit  { border-color: rgba(239,68,68,.35); }

    .ctop { padding: 14px 16px 12px; border-bottom: 1px solid var(--bd); display: flex; justify-content: space-between; align-items: center; }
    .pname { font-size: 15px; font-weight: 700; }
    .pip   { font-size: 12px; color: var(--red); font-weight: 600; margin-top: 2px; }
    .ploc  { font-size: 10px; color: #555; margin-top: 2px; }
    .pmod  { font-size: 10px; color: var(--mt); margin-top: 2px; }

    .sbadge { padding: 4px 10px; font-size: 10px; }

    .inks { padding: 16px; }
    .irow { margin-bottom: 14px; }
    .irow:last-child { margin-bottom: 0; }
    .imeta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .iname { font-size: 11px; color: var(--mt); text-transform: uppercase; letter-spacing: .5px; display: flex; align-items: center; gap: 7px; }
    .idot  { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .idot.cyan    { background: var(--cy); box-shadow: 0 0 6px var(--cy); }
    .idot.magenta { background: var(--mg); box-shadow: 0 0 6px var(--mg); }
    .idot.yellow  { background: var(--yw); box-shadow: 0 0 6px var(--yw); }
    .idot.black   { background: var(--bk); }

    .ipct    { font-size: 14px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .ipct.ok { color: var(--ok); } .ipct.wn { color: #f59e0b; } .ipct.cr { color: var(--no); }

    .bar  { height: 12px; }
    .fill { position: relative; }
    .fill.cyan    { background: var(--cy); }
    .fill.magenta { background: var(--mg); }
    .fill.yellow  { background: var(--yw); }
    .fill.black   { background: var(--bk); }
    .fill.low::after { content: ''; position: absolute; inset: 0; background: rgba(239,68,68,.35); animation: flash 1s 6 forwards; }

    .nosnmp { color: #333; font-size: 12px; padding: 20px; text-align: center; }

    .cfoot { padding: 10px 16px; border-top: 1px solid var(--bd); display: flex; justify-content: space-between; align-items: center; }
    .lck   { font-size: 10px; color: #444; }
    .btr   { background: rgba(59,130,246,.08); border: 1px solid rgba(59,130,246,.2); color: var(--blue); padding: 4px 10px; border-radius: 5px; font-size: 10px; font-weight: 600; cursor: pointer; text-decoration: none; transition: all .2s; }
    .btr:hover { background: var(--blue); color: #fff; }

    .refresh-row { display: flex; justify-content: center; padding: 8px 28px 28px; }
    .btn-refresh { background: var(--card); border: 1px solid var(--bd); color: var(--mt); padding: 12px 28px; border-radius: 8px; font-size: 13px; cursor: pointer; transition: all .2s; display: flex; align-items: center; gap: 10px; }
    .btn-refresh:hover:not(:disabled) { border-color: var(--blue); color: var(--blue); }
    .btn-refresh:disabled { opacity: .5; cursor: not-allowed; }
    .spin { display: inline-block; animation: spin .8s linear infinite; }
  </style>
</head>
<body>

<div class="loader" id="loader"><div class="spinner"></div></div>

<div class="topbar">
  <div>
    <div class="logo">imageCLASS</div>
    <div class="sub">Níveis de Suprimentos</div>
  </div>
  <div class="tright">
    <div id="clock">00:00:00</div>
    <button class="btn pr" id="btn-atualizar" onclick="carregar()">Atualizar Agora</button>
    <a href="dashboard.html" class="btn sc">Monitor TV</a>
    <a href="index.html"     class="btn sc">Admin</a>
  </div>
</div>

<div class="page-header">
  <div>
    <div class="ph-title">Monitoramento de Tinta</div>
    <div class="ph-sub">Níveis consultados em tempo real via SNMP · Atualiza a cada 30s</div>
  </div>
  <div class="lupd"><div class="dot" aria-hidden="true"></div><span id="lupd">Aguardando...</span></div>
</div>

<div class="alert-global" id="alertbox" style="display:none" role="alert">
  <div class="ico" aria-hidden="true">⚠️</div>
  <div id="alertmsg"></div>
</div>

<div class="grid" id="grid"></div>

<div class="refresh-row">
  <button class="btn-refresh" id="btn-refresh" onclick="carregar()">
    <span id="rspin"></span> Verificar todos os níveis agora
  </button>
</div>

<script>
  let dadosCache = [];
  let timerId    = null;

  const esc = t => String(t ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]);

  function corC(nome) {
    const n = nome.toLowerCase();
    if (n.includes('cyan')   || n.includes('ciano'))   return 'cyan';
    if (n.includes('magenta'))                          return 'magenta';
    if (n.includes('yellow') || n.includes('amarelo'))  return 'yellow';
    return 'black';
  }

  function pClass(v) { return v <= 10 ? 'cr' : v <= 25 ? 'wn' : 'ok'; }
  function tBaixa(s) { return (s || []).some(x => x.percentual <= 15); }

  function setBotoes(carregando) {
    document.getElementById('btn-atualizar').disabled = carregando;
    document.getElementById('btn-refresh').disabled   = carregando;
    const rs = document.getElementById('rspin');
    rs.textContent = carregando ? '↺' : '';
    rs.className   = carregando ? 'spin' : '';
  }

  async function carregar() {
    setBotoes(true);
    document.getElementById('loader').classList.add('show');
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      dadosCache = await res.json();
      renderizar();
      document.getElementById('lupd').textContent = 'Atualizado: ' + new Date().toLocaleTimeString('pt-BR');
    } catch(e) {
      console.error(e);
      document.getElementById('grid').innerHTML =
        '<div class="empty error" role="alert">Erro ao carregar dados. Verifique a conexão com o servidor.</div>';
    } finally {
      document.getElementById('loader').classList.remove('show');
      setBotoes(false);
    }
  }

  function renderizar() {
    const g     = document.getElementById('grid');
    const agora = new Date().toLocaleTimeString('pt-BR');

    const criticos = dadosCache.filter(p => p.online && tBaixa(p.suprimentos));
    const ab = document.getElementById('alertbox');
    const am = document.getElementById('alertmsg');
    if (criticos.length) {
      ab.style.display = 'flex';
      // textContent evita XSS com nomes de impressora
      const strong = document.createElement('strong');
      strong.textContent = `${criticos.length} impressora(s) com tinta crítica: `;
      const nomes = document.createTextNode(criticos.map(p => p.nome).join(', ') + ' — verificar reposição com urgência.');
      am.innerHTML = '';
      am.appendChild(strong);
      am.appendChild(nomes);
    } else {
      ab.style.display = 'none';
    }

    g.innerHTML = dadosCache.map(p => {
      const sup   = Array.isArray(p.suprimentos) ? p.suprimentos : [];
      const baixa = tBaixa(sup);
      return `
        <div class="card ${baixa ? 'crit' : ''}">
          <div class="ctop">
            <div>
              <div class="pname">${esc(p.nome)}</div>
              <div class="pip">${esc(p.ip)}</div>
              <div class="pmod">${esc(p.modelo || 'Canon imageCLASS')}</div>
              ${p.localizacao ? `<div class="ploc">📍 ${esc(p.localizacao)}</div>` : ''}
            </div>
            <div class="sbadge ${p.online ? 'on' : 'off'}" aria-label="${p.online ? 'Online' : 'Offline'}">${p.online ? '● ONLINE' : '● OFFLINE'}</div>
          </div>
          <div class="inks">
            ${sup.length ? sup.map(s => {
              const c   = corC(s.nome);
              const cls = pClass(s.percentual);
              const low = s.percentual <= 15;
              return `
                <div class="irow">
                  <div class="imeta">
                    <div class="iname"><div class="idot ${c}" aria-hidden="true"></div>${esc(s.nome)}</div>
                    <span class="ipct ${cls}">${s.percentual}%</span>
                  </div>
                  <div class="bar"><div class="fill ${c} ${low ? 'low' : ''}" style="width:${s.percentual}%" role="progressbar" aria-valuenow="${s.percentual}" aria-valuemin="0" aria-valuemax="100"></div></div>
                </div>`;
            }).join('') : '<div class="nosnmp">Impressora offline — sem dados SNMP</div>'}
          </div>
          <div class="cfoot">
            <span class="lck">Verificado: ${agora}</span>
            ${p.online ? `<a class="btr" href="http://${esc(p.ip)}" target="_blank" rel="noopener">Abrir Interface</a>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  function iniciarTimer() {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(carregar, 30000);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(timerId);
      timerId = null;
    } else {
      carregar();
      iniciarTimer();
    }
  });

  setInterval(() => {
    document.getElementById('clock').textContent = new Date().toLocaleTimeString('pt-BR');
  }, 1000);

  carregar();
  iniciarTimer();
</script>
</body>
</html>
```

- [ ] **Step 2: Verificar no browser `http://localhost:3000/tinta.html`**

Confirmar:
- Link "Admin" vai para `index.html`
- Sem console errors
- Botões ficam desabilitados durante load
- Alerta de críticos usa textContent (inspecionar DOM)

- [ ] **Step 3: Commit**

```bash
git add public/tinta.html
git commit -m "fix: tinta — link admin, XSS no alerta, error feedback, loading state, setInterval cleanup, shared.css"
```

---

## Task 4: Corrigir index.html

**Files:**
- Modify: `public/index.html`

Duas mudanças pontuais: linkar `shared.css` e adicionar `prefers-reduced-motion` ao blink do status dot.

- [ ] **Step 1: Adicionar link para shared.css**

Em `public/index.html`, no `<head>` (antes da tag `<style>`), adicionar:

```html
<link rel="stylesheet" href="shared.css">
```

- [ ] **Step 2: Adicionar prefers-reduced-motion ao CSS inline**

No bloco `<style>` de `index.html`, a animação `@keyframes blink` já está em `shared.css`. Adicionar ao final do bloco `<style>` de `index.html`:

```css
@media (prefers-reduced-motion: reduce) {
  .status-dot.off { animation: none; }
  .sbadge.off     { animation: none; }
}
```

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "fix: index — linkar shared.css e prefers-reduced-motion no status dot"
```

---

## Task 5: Corrigir monitor.html (redirect)

**Files:**
- Modify: `public/monitor.html`

O arquivo está vazio. Criar um redirect para `dashboard.html`.

- [ ] **Step 1: Criar redirect**

Substituir o conteúdo de `public/monitor.html` por:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=dashboard.html">
  <title>Redirecionando...</title>
</head>
<body>
  <script>window.location.replace('dashboard.html');</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/monitor.html
git commit -m "fix: monitor.html — redirect para dashboard.html (arquivo estava vazio)"
```

---

## Task 6: Melhorar autenticação — btoa → SHA-256

**Files:**
- Modify: `public/login.html`

Substituir `btoa(unescape(encodeURIComponent(pass)))` por SHA-256 via `SubtleCrypto`. Como é uma mudança de hash, precisamos de migração transparente: no login, se o hash armazenado for curto (base64 de btoa), migrar para SHA-256 na hora do login bem-sucedido.

- [ ] **Step 1: Adicionar função de hash SHA-256**

No `<script>` de `login.html`, adicionar no início (antes de `getUsers()`):

```js
async function sha256(str) {
  const buf    = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function isBtoa(hash) {
  // hashes btoa têm no máximo ~88 chars; SHA-256 hex tem exatos 64
  return hash.length !== 64;
}
```

- [ ] **Step 2: Tornar doLogin() async e usar SHA-256**

Substituir a função `doLogin()` por:

```js
async function doLogin() {
  const user = document.getElementById('login-user').value.trim().toLowerCase();
  const pass = document.getElementById('login-pass').value;
  clearMsg('login-msg');

  if (!user || !pass) {
    showMsg('login-msg', 'Preencha usuário e senha.', 'error'); return;
  }

  const users = getUsers();

  if (!users[user]) {
    showMsg('login-msg', 'Usuário não encontrado. Crie uma conta primeiro.', 'error'); return;
  }

  const stored  = users[user].pass;
  const btoaVal = btoa(unescape(encodeURIComponent(pass)));
  const sha     = await sha256(pass);

  const valid = isBtoa(stored) ? stored === btoaVal : stored === sha;

  if (!valid) {
    showMsg('login-msg', 'Senha incorreta. Tente novamente.', 'error'); return;
  }

  // Migração: se ainda estava em btoa, atualizar para SHA-256
  if (isBtoa(stored)) {
    users[user].pass = sha;
    saveUsers(users);
  }

  showMsg('login-msg', '✓ Acesso autorizado! Redirecionando...', 'success');
  setSession(user);

  setTimeout(() => {
    document.getElementById('loadingOverlay').classList.add('show');
    setTimeout(() => { window.location.href = 'index.html'; }, 400);
  }, 800);
}
```

- [ ] **Step 3: Tornar doRegister() async e usar SHA-256**

Substituir a linha de salvar senha em `doRegister()`:

```js
// Antes:
pass: btoa(unescape(encodeURIComponent(pass))),

// Depois (doRegister precisa ser async):
pass: await sha256(pass),
```

E a função deve ser declarada como `async function doRegister()`.

- [ ] **Step 4: Testar login com conta existente (migração)**

1. Abrir `http://localhost:3000/login.html`
2. Fazer login com uma conta existente (criada com btoa)
3. Verificar no DevTools → Application → localStorage → `ic_users` que o hash agora tem 64 chars (SHA-256)
4. Fazer logout e login novamente — deve funcionar com o novo hash

- [ ] **Step 5: Testar criar nova conta**

1. Criar nova conta
2. Verificar no localStorage que o hash tem 64 chars desde o início

- [ ] **Step 6: Commit**

```bash
git add public/login.html
git commit -m "feat: login — substituir btoa por SHA-256 com migração transparente de contas existentes"
```

---

## Self-Review

### Spec coverage

| Requisito | Task |
|---|---|
| Link admin.html quebrado | Task 2 (dashboard), Task 3 (tinta) |
| style.css não utilizado / CSS duplicado | Task 1 (shared.css) |
| dashboard.html + monitor.html duplicados | monitor.html vazio → redirect (Task 5) |
| setInterval sem clearInterval | Task 2, Task 3 (visibilitychange + timerId) |
| Senhas em btoa | Task 6 (SHA-256 + migração) |
| Animações piscantes infinitas | shared.css (blink/flash limitados + prefers-reduced-motion) |
| Sem feedback de carregamento | Task 2, Task 3 (btn.disabled + loader) |
| Sem tratamento de erro visível | Task 2, Task 3 (empty.error no grid) |
| XSS no alerta de tinta | Task 3 (textContent) |
| index.html sem shared.css | Task 4 |
| monitor.html vazio | Task 5 |

### Placeholder scan

Nenhum TBD, TODO ou "similar ao task N" encontrado. Todos os passos têm código completo.

### Type consistency

- `timerId` declarado e usado consistentemente em Task 2 e Task 3
- `carregar()` e `iniciarTimer()` consistentes em ambas as páginas
- `setBotoes()` declarado e usado apenas em tinta.html (Task 3)
- `sha256()` e `isBtoa()` declarados antes de uso (Task 6)
