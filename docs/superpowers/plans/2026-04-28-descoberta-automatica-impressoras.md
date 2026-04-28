# Descoberta Automática de Impressoras via IP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir cadastrar uma impressora informando só o IP — o sistema consulta SNMP e preenche fabricante, modelo, tipo e material automaticamente.

**Architecture:** Novo endpoint `GET /api/descobrir?ip=X` consulta SNMP (sysDescr + hrDeviceDescr + OIDs de suprimento colorido) e retorna os dados detectados. O frontend de cadastro mostra só o campo IP inicialmente; após clicar "Buscar", os demais campos aparecem pré-preenchidos e editáveis.

**Tech Stack:** Node.js / Express / net-snmp (já instalado) / Vanilla JS / Jest + supertest

---

## Files

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Modify | `server.js` | Adicionar `descobrirImpressora()` + rota `GET /api/descobrir` |
| Create | `tests/descobrir.test.js` | Testes unitários do novo endpoint |
| Modify | `public/cadastrar.html` | Redesenho do formulário (IP-first + reveal) |

---

## Task 1 — Testes do endpoint `/api/descobrir`

**Files:**
- Create: `tests/descobrir.test.js`

- [ ] **Step 1: Criar o arquivo de testes**

```js
// tests/descobrir.test.js
'use strict';

let mockSnmpCallback = (_oids, cb) => cb(new Error('timeout'));

jest.mock('net-snmp', () => ({
    createSession: () => ({
        get: (oids, cb) => mockSnmpCallback(oids, cb),
        close: () => {}
    })
}));

const request  = require('supertest');
const { app, db, dbReady } = require('../server');

beforeAll(() => dbReady);
afterAll(() => new Promise(resolve => db.close(resolve)));

describe('GET /api/descobrir', () => {
    it('deve retornar 400 quando ip ausente', async () => {
        const res = await request(app).get('/api/descobrir');
        expect(res.status).toBe(400);
        expect(res.body.erro).toMatch(/IP/i);
    });

    it('deve retornar 400 quando ip inválido', async () => {
        const res = await request(app).get('/api/descobrir?ip=999.0.0.1');
        expect(res.status).toBe(400);
    });

    it('deve retornar online:false e campos vazios quando SNMP não responde', async () => {
        mockSnmpCallback = (_oids, cb) => cb(new Error('timeout'));
        const res = await request(app).get('/api/descobrir?ip=192.168.1.50');
        expect(res.status).toBe(200);
        expect(res.body.online).toBe(false);
        expect(res.body.fabricante).toBe('');
        expect(res.body.modelo).toBe('');
    });

    it('deve detectar fabricante Canon e tipo Colorido', async () => {
        mockSnmpCallback = (_oids, cb) => cb(null, [
            { value: Buffer.from('Canon imageCLASS MF654Cdw') }, // sysDescr
            { value: Buffer.from('Canon imageCLASS MF654Cdw') }, // hrDeviceDescr
            { value: 100 }, { value: 80 },  // C max, cur
            { value: 100 }, { value: 60 },  // M max, cur
            { value: 100 }, { value: 40 },  // Y max, cur
        ]);
        const res = await request(app).get('/api/descobrir?ip=192.168.1.50');
        expect(res.status).toBe(200);
        expect(res.body.online).toBe(true);
        expect(res.body.fabricante).toBe('Canon');
        expect(res.body.tipo).toBe('Colorido');
        expect(res.body.modelo).toBe('Canon imageCLASS MF654Cdw');
    });

    it('deve detectar tipo Mono quando suprimentos CMY retornam 0', async () => {
        mockSnmpCallback = (_oids, cb) => cb(null, [
            { value: Buffer.from('HP LaserJet Pro MFP 4103fdw') },
            { value: Buffer.from('HP LaserJet Pro MFP 4103fdw') },
            { value: 0 }, { value: 0 },
            { value: 0 }, { value: 0 },
            { value: 0 }, { value: 0 },
        ]);
        const res = await request(app).get('/api/descobrir?ip=192.168.1.50');
        expect(res.status).toBe(200);
        expect(res.body.tipo).toBe('Mono');
        expect(res.body.fabricante).toBe('HP');
    });

    it('deve detectar material Toner quando texto contém "laser"', async () => {
        mockSnmpCallback = (_oids, cb) => cb(null, [
            { value: Buffer.from('HP LaserJet Pro MFP 4103fdw') },
            { value: Buffer.from('HP LaserJet Pro MFP 4103fdw') },
            { value: 0 }, { value: 0 },
            { value: 0 }, { value: 0 },
            { value: 0 }, { value: 0 },
        ]);
        const res = await request(app).get('/api/descobrir?ip=192.168.1.50');
        expect(res.status).toBe(200);
        expect(res.body.material).toBe('Toner');
    });

    it('deve detectar material Tinta quando texto não contém laser/toner', async () => {
        mockSnmpCallback = (_oids, cb) => cb(null, [
            { value: Buffer.from('Epson EcoTank L3150') },
            { value: Buffer.from('Epson EcoTank L3150') },
            { value: 100 }, { value: 90 },
            { value: 100 }, { value: 80 },
            { value: 100 }, { value: 70 },
        ]);
        const res = await request(app).get('/api/descobrir?ip=192.168.1.50');
        expect(res.status).toBe(200);
        expect(res.body.material).toBe('Tinta');
        expect(res.body.fabricante).toBe('Epson');
    });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

```
cd C:\monitor-impressoras
npm test -- --testPathPattern=descobrir
```

Resultado esperado: todos os testes falham com `Cannot GET /api/descobrir` ou similar.

---

## Task 2 — Backend: função `descobrirImpressora` + rota

**Files:**
- Modify: `server.js` — inserir após a função `obterDadosSNMP` (linha ~270) e antes do error handler (linha ~599)

- [ ] **Step 3: Adicionar constante FABRICANTES e função `descobrirImpressora` em `server.js`**

Inserir imediatamente após o fechamento da função `obterDadosSNMP` (linha 270), antes do comentário `// ── Rotas`:

```js
// ── Descoberta de dispositivo via SNMP ────────────────────────────────────────
const FABRICANTES = ['Canon', 'HP', 'Epson', 'Brother', 'Kyocera'];

function descobrirImpressora(ip) {
    return new Promise((resolve) => {
        const session = snmp.createSession(ip, 'public', { timeout: 2000, retries: 0 });
        const oids = [
            '1.3.6.1.2.1.1.1.0',            // sysDescr
            '1.3.6.1.2.1.25.3.2.1.3.1',     // hrDeviceDescr
            '1.3.6.1.2.1.43.11.1.1.8.1.2',  // C max
            '1.3.6.1.2.1.43.11.1.1.9.1.2',  // C cur
            '1.3.6.1.2.1.43.11.1.1.8.1.3',  // M max
            '1.3.6.1.2.1.43.11.1.1.9.1.3',  // M cur
            '1.3.6.1.2.1.43.11.1.1.8.1.4',  // Y max
            '1.3.6.1.2.1.43.11.1.1.9.1.4',  // Y cur
        ];
        session.get(oids, (error, varbinds) => {
            session.close();
            if (error) {
                return resolve({ online: false, fabricante: '', modelo: '', tipo: 'Colorido', material: 'Toner', comunidade: 'public' });
            }
            const toStr = (vb) => Buffer.isBuffer(vb?.value) ? vb.value.toString('utf8') : String(vb?.value || '');
            const sysDescr      = toStr(varbinds[0]);
            const hrDeviceDescr = toStr(varbinds[1]);
            const texto         = (sysDescr + ' ' + hrDeviceDescr).toLowerCase();

            const fabricante = FABRICANTES.find(f => texto.includes(f.toLowerCase())) || '';
            const modelo     = hrDeviceDescr.trim() || sysDescr.trim();
            const cMax = Number(varbinds[2]?.value) || 0;
            const mMax = Number(varbinds[4]?.value) || 0;
            const yMax = Number(varbinds[6]?.value) || 0;
            const tipo     = (cMax > 0 || mMax > 0 || yMax > 0) ? 'Colorido' : 'Mono';
            const material = /laser|toner/i.test(sysDescr + hrDeviceDescr) ? 'Toner' : 'Tinta';

            resolve({ online: true, fabricante, modelo, tipo, material, comunidade: 'public' });
        });
    });
}
```

- [ ] **Step 4: Adicionar a rota `GET /api/descobrir` em `server.js`**

Inserir imediatamente antes do comentário `// ── Error handler centralizado` (linha ~599):

```js
app.get('/api/descobrir', async (req, res, next) => {
    const ip = String(req.query.ip || '').trim();
    if (!IPV4_RE.test(ip)) return res.status(400).json({ erro: 'IP inválido' });
    try {
        res.json(await descobrirImpressora(ip));
    } catch (e) {
        next(e);
    }
});
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

```
npm test -- --testPathPattern=descobrir
```

Resultado esperado: 7 testes passando.

- [ ] **Step 6: Rodar a suite completa para checar regressões**

```
npm test
```

Resultado esperado: todos os testes passando.

- [ ] **Step 7: Commit**

```
git add server.js tests/descobrir.test.js
git commit -m "feat: endpoint GET /api/descobrir para auto-descoberta de impressoras via SNMP"
```

---

## Task 3 — Frontend: redesenho de `public/cadastrar.html`

**Files:**
- Modify: `public/cadastrar.html`

- [ ] **Step 8: Substituir o conteúdo de `public/cadastrar.html`**

Substituir o arquivo inteiro pelo conteúdo abaixo (mantém sidebar, topbar e estilos — altera apenas o form e o JS):

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

    .ip-row { display: flex; gap: 8px; margin-bottom: 16px; }
    .ip-row input { flex: 1; margin-bottom: 0 !important; }
    .btn-buscar { background: var(--accent); color: #fff; border: none; border-radius: 8px; padding: 0 20px; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: opacity .2s; }
    .btn-buscar:hover { opacity: .85; }
    .btn-buscar:disabled { opacity: .5; cursor: not-allowed; }
    .aviso-offline { background: #fff3cd; color: #856404; border: 1px solid #ffc107; border-radius: 8px; padding: 10px 14px; font-size: 12px; margin-bottom: 16px; }
    #camposExtra { animation: fadeIn .25s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  </style>
</head>
<body>
<script src="admin-auth.js"></script>
<script>initTheme();</script>

<aside class="sidebar">
  <div class="sb-brand">
    <div class="sb-dot"></div>
    <div><strong>Impressoras Sobral</strong><span>Gerenciamento de rede</span></div>
  </div>
  <nav class="sb-nav">
    <a href="admin.html"        class="sb-item">📊 Dashboard</a>
    <a href="dispositivos.html" class="sb-item">🖨️ Dispositivos</a>
    <a href="cadastrar.html"    class="sb-item">➕ Cadastrar</a>
    <a href="tinta.html"        class="sb-item">🖋️ Níveis de Tinta</a>
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

<div class="main-wrap">
  <div class="main-topbar">
    <span class="main-title">➕ Nova Impressora</span>
    <span id="clock" class="main-clock"></span>
  </div>
  <main class="main-content">
  <div class="form-card">
    <div class="form-card-head">
      <h2>➕ Nova Impressora</h2>
      <p>Digite o IP do equipamento — as informações serão preenchidas automaticamente</p>
    </div>
    <div class="form-card-body">
      <form id="formAdd">

        <label>IP / Endereço</label>
        <div class="ip-row">
          <input type="text" name="ip" id="ipInput" placeholder="192.168.1.50" autocomplete="off">
          <button type="button" id="buscarBtn" class="btn-buscar">🔍 Buscar</button>
        </div>

        <div id="camposExtra" style="display:none;">
          <div id="avisoOffline" class="aviso-offline" style="display:none;">
            ⚠️ Dispositivo não respondeu — preencha os campos manualmente
          </div>

          <div class="fgrid">
            <div>
              <label>Fabricante</label>
              <select name="nome">
                <option value="Canon">Canon</option>
                <option value="HP">HP</option>
                <option value="Epson">Epson</option>
                <option value="Brother">Brother</option>
                <option value="Kyocera">Kyocera</option>
              </select>
            </div>
            <div>
              <label>Material do Suprimento</label>
              <select name="material">
                <option value="Tinta">🖋️ Tinta</option>
                <option value="Toner">⬛ Toner</option>
              </select>
            </div>
          </div>

          <label>Modelo</label>
          <input type="text" name="modelo" placeholder="Ex: imageCLASS MF654Cdw">

          <label>Localização</label>
          <input type="text" name="localizacao" placeholder="Ex: 2º Andar - Sala 201">

          <div class="fgrid">
            <div>
              <label>Tipo de Suprimento</label>
              <select name="tipo">
                <option value="Colorido">Colorido (CMYK)</option>
                <option value="Mono">Apenas Preto</option>
                <option value="Manutencao">Caixa Manutenção</option>
              </select>
            </div>
            <div>
              <label>Comunidade SNMP</label>
              <input type="text" name="comunidade" placeholder="public" value="public">
            </div>
          </div>

          <button type="submit" class="btn-add">+ Registrar Equipamento</button>
        </div>

      </form>
      <div class="form-msg" id="formMsg"></div>
      <a href="dispositivos.html" class="back-link">← Ver todas as impressoras</a>
    </div>
  </div>
  </main>
</div>

<script>
  initUserLabel(); initClock(); setActiveNav();

  const IPV4_RE = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
  const ipInput     = document.getElementById('ipInput');
  const buscarBtn   = document.getElementById('buscarBtn');
  const camposExtra = document.getElementById('camposExtra');
  const avisoOffline = document.getElementById('avisoOffline');

  function showMsg(text, type) {
    const el = document.getElementById('formMsg');
    el.textContent = text;
    el.className = 'form-msg ' + (type || '');
  }

  function setSelect(name, value) {
    if (!value) return;
    const sel = document.querySelector(`[name="${name}"]`);
    if (!sel) return;
    const opt = Array.from(sel.options).find(o =>
      o.value.toLowerCase() === value.toLowerCase() ||
      o.text.toLowerCase().includes(value.toLowerCase())
    );
    if (opt) sel.value = opt.value;
  }

  buscarBtn.addEventListener('click', async () => {
    const ip = ipInput.value.trim();
    if (!IPV4_RE.test(ip)) {
      showMsg('IP inválido. Use o formato 192.168.1.50', 'err');
      return;
    }
    buscarBtn.disabled = true;
    buscarBtn.textContent = 'Buscando...';
    ipInput.disabled = true;
    showMsg('', '');

    try {
      const res = await fetch(`/api/descobrir?ip=${encodeURIComponent(ip)}`);
      if (!res.ok) { showMsg('Erro ao consultar o dispositivo.', 'err'); return; }
      const data = await res.json();

      setSelect('nome',     data.fabricante);
      setSelect('material', data.material);
      setSelect('tipo',     data.tipo);
      document.querySelector('[name="modelo"]').value    = data.modelo     || '';
      document.querySelector('[name="comunidade"]').value = data.comunidade || 'public';

      avisoOffline.style.display = data.online ? 'none' : 'block';
      camposExtra.style.display  = 'block';
      document.querySelector('[name="localizacao"]').focus();
    } catch {
      showMsg('Erro ao consultar o dispositivo. Tente novamente.', 'err');
    } finally {
      buscarBtn.disabled = false;
      buscarBtn.textContent = '🔍 Buscar';
      ipInput.disabled = false;
    }
  });

  document.getElementById('formAdd').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

    if (!data.modelo || !data.modelo.trim()) {
      const modeloEl = form.querySelector('[name="modelo"]');
      modeloEl.classList.add('is-invalid');
      modeloEl.focus();
      showMsg('O campo Modelo é obrigatório.', 'err');
      return;
    }

    const btn = form.querySelector('.btn-add');
    btn.disabled = true; btn.textContent = 'Registrando...';
    showMsg('', '');

    try {
      const res = await fetch('/api/impressoras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showMsg(err.erro || 'Erro ao cadastrar impressora.', 'err');
        return;
      }
      form.reset();
      camposExtra.style.display = 'none';
      showMsg('✓ Impressora cadastrada com sucesso!', 'ok');
      setTimeout(() => showMsg('', ''), 4000);
    } catch {
      showMsg('Erro ao cadastrar impressora. Tente novamente.', 'err');
    } finally {
      btn.disabled = false; btn.textContent = '+ Registrar Equipamento';
    }
  });

  document.querySelectorAll('#formAdd input, #formAdd select').forEach(el => {
    el.addEventListener('input',  function() { this.classList.remove('is-invalid'); });
    el.addEventListener('change', function() { this.classList.remove('is-invalid'); });
  });
</script>
</body>
</html>
```

- [ ] **Step 9: Verificar no browser**

Com o servidor rodando (`npm start`), abrir http://localhost:3000/cadastrar.html e validar:

1. Formulário mostra apenas o campo IP + botão "Buscar"
2. IP inválido exibe mensagem de erro sem chamar o backend
3. IP válido + clique em Buscar → botão vira "Buscando...", campos aparecem pré-preenchidos
4. Campo Localização fica com foco após o reveal
5. Formulário completo enviado com sucesso → tela volta ao estado inicial (só IP)
6. Aviso amarelo aparece ao simular IP de dispositivo offline (usar um IP que não existe na rede)

- [ ] **Step 10: Commit**

```
git add public/cadastrar.html
git commit -m "feat: redesenho do cadastro de impressoras com descoberta automática via IP"
```
