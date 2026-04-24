# Admin Multi-Páginas — Design Spec

**Data:** 2026-04-24
**Escopo:** Separar o painel admin (index.html) em 5 páginas independentes

---

## Objetivo

Transformar o painel admin de página única com abas em 5 páginas HTML separadas, cada uma com responsabilidade única. Manter a identidade visual Estilo 3 (topbar laranja, tema claro).

---

## Arquitetura

### Abordagem
5 páginas HTML independentes. Cada página inclui `shared.css` e `admin-auth.js`. Navegação por links normais entre páginas. Nenhum framework — JS vanilla puro, igual ao padrão atual do projeto.

### Arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `public/admin-auth.js` | Criar | Auth compartilhado: getToken, authHeaders, requireAuth, logout |
| `public/admin.html` | Criar | Dashboard principal: stats + alertas + recentes |
| `public/dispositivos.html` | Criar | Lista de impressoras: tabela + editar + excluir |
| `public/cadastrar.html` | Criar | Formulário de cadastro de nova impressora |
| `public/estoque.html` | Criar | Gestão de estoque (extraído de index.html) |
| `public/usuarios.html` | Criar | Gestão de usuários (extraído de index.html) |
| `public/index.html` | Modificar | Redirect instantâneo para admin.html |
| `public/dashboard.html` | Modificar | Atualizar link "Admin" para admin.html |
| `public/tinta.html` | Modificar | Atualizar link "Admin" para admin.html |

---

## Componente Compartilhado: `admin-auth.js`

```js
function getToken() {
  try { return JSON.parse(sessionStorage.getItem('ic_token') || 'null'); } catch { return null; }
}

function authHeaders() {
  const t = getToken();
  return t ? { 'Authorization': 'Bearer ' + t.token, 'Content-Type': 'application/json' } : {};
}

function requireAuth() {
  const t = getToken();
  if (!t || !t.token) { window.location.href = 'login.html'; }
}

function logout() {
  sessionStorage.removeItem('ic_token');
  window.location.href = 'login.html';
}
```

Incluído via `<script src="admin-auth.js"></script>` em todas as páginas admin.
Cada página chama `requireAuth()` na primeira linha do script.

---

## Topbar Admin (padrão em todas as páginas)

```html
<div class="topbar">
  <div style="display:flex;align-items:center;gap:24px">
    <div class="logo"><div class="logo-dot"></div>Impressoras Sobral</div>
    <nav class="admin-nav">
      <a href="admin.html"       class="nav-item">📊 Dashboard</a>
      <a href="dispositivos.html" class="nav-item">🖨️ Dispositivos</a>
      <a href="cadastrar.html"   class="nav-item">➕ Cadastrar</a>
      <a href="estoque.html"     class="nav-item">📦 Estoque</a>
      <a href="usuarios.html"    class="nav-item">👥 Usuários</a>
    </nav>
  </div>
  <div class="tright">
    <span id="clock">00:00:00</span>
    <span id="userLabel" class="user-chip"></span>
    <button class="btn sc" onclick="logout()">Sair</button>
  </div>
</div>
```

Link da página atual recebe classe `active` via JS: `document.querySelector('a[href="<pagina-atual>"]').classList.add('active')`.

CSS das classes `.admin-nav`, `.nav-item`, `.nav-item.active` e `.user-chip` fica em cada página (não em shared.css, para não vazar para dashboard/tinta).

---

## Páginas

### `admin.html` — Dashboard Principal

**API:** `GET /api/dashboard` (retorna array de impressoras com dados SNMP)

**Layout:**
1. Topbar com link "Dashboard" ativo
2. Grid de 4 stat cards (Total · Online · Offline · Tinta Baixa) com borda esquerda colorida
3. Card "Alertas" — impressoras offline OU com suprimento ≤ 15%
   - Cada linha: nome, IP, badge de status, motivo do alerta
   - Se nenhum alerta: mensagem "Tudo funcionando normalmente ✓"
4. Card "Recém Cadastradas" — últimas 5 impressoras via `GET /api/impressoras`, ordenadas por `id DESC`

**Stats calculados no frontend** a partir do array retornado por `/api/dashboard`.

---

### `dispositivos.html` — Impressoras Cadastradas

**API:** `GET /api/impressoras`, `PUT /api/impressoras/:id`, `DELETE /api/impressoras/:id`

**Layout:**
1. Topbar com link "Dispositivos" ativo
2. Barra: input de busca + filtros (Todas / Online / Offline) + botão "➕ Nova Impressora" → `cadastrar.html`
3. Tabela: Nome · Fabricante · Modelo · IP · Localização · Ações
   - Ações: botão Editar (abre modal) + botão Excluir (abre modal de confirmação)
   - Sem coluna de status — essa página é gerenciamento cadastral, não monitoramento
4. Modal de edição: Nome, Fabricante, Modelo, IP, Comunidade, Localização, Material, Tipo
5. Modal de confirmação de exclusão

**Nota:** `/api/impressoras` retorna dados cadastrais sem SNMP. Status online/offline fica no `dashboard.html` e `tinta.html`.

---

### `cadastrar.html` — Nova Impressora

**API:** `POST /api/impressoras`

**Layout:**
1. Topbar com link "Cadastrar" ativo
2. Card centralizado (max-width 600px) com cabeçalho laranja "Nova Impressora"
3. Formulário em 2 colunas (em telas ≥ 600px):
   - Col 1: Nome, IP, Comunidade SNMP, Localização
   - Col 2: Fabricante (select), Modelo, Material (select: Tinta/Toner), Tipo (select: Colorido/Monocromático)
4. Botão "Cadastrar Impressora →" laranja full-width
5. Feedback inline (sucesso em verde, erro em vermelho)
6. Link "← Ver todas as impressoras" abaixo do formulário
7. Após sucesso: limpa formulário + mostra mensagem de confirmação

---

### `estoque.html` — Estoque

**API:** `GET /api/estoque`, `PUT /api/estoque/:id`

**Layout:** Idêntico à seção `sec-estoque` do `index.html` atual. Extrair o HTML/JS dessa seção sem alterações de comportamento. Topbar com link "Estoque" ativo.

**Inclui:** modal de senha (para desbloquear edição de estoque), timer de desbloqueio, grid de cards por modelo com barras CMYK.

---

### `usuarios.html` — Usuários

**API:** `GET /api/usuarios`, `POST /api/usuarios`, `DELETE /api/usuarios/:id`, `PUT /api/usuarios/:id/senha`

**Layout:** Idêntico à seção `sec-usuarios` do `index.html` atual. Extrair o HTML/JS sem alterações. Topbar com link "Usuários" ativo.

**Inclui:** tabela de usuários, formulário de novo usuário, ação de exclusão.

---

### `index.html` — Redirect

```html
<!DOCTYPE html>
<html><head>
<meta http-equiv="refresh" content="0;url=admin.html">
<script>window.location.replace('admin.html');</script>
</head></html>
```

---

## Navegação entre páginas existentes

- `dashboard.html`: link "Admin" atualiza de `index.html` para `admin.html`
- `tinta.html`: link "Admin" atualiza de `index.html` para `admin.html`
- `login.html`: após login, redireciona para `dashboard.html` (sem alteração)

---

## O que NÃO muda

- Toda a lógica de API no `server.js`
- CSS em `shared.css`
- Páginas `dashboard.html`, `tinta.html`, `login.html` (exceto link Admin)
- Endpoints da API — nenhuma alteração no backend
