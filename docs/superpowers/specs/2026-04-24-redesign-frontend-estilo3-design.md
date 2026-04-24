# Redesign Frontend — Estilo 3 (Topbar Laranja)

**Data:** 2026-04-24
**Escopo:** Todas as páginas do sistema (login, index/admin, dashboard, tinta)

---

## Paleta de Cores

| Token       | Valor     | Uso                                      |
|-------------|-----------|------------------------------------------|
| `--orange`  | `#FB6602` | Topbar, botões primários, bordas accent  |
| `--gray`    | `#6E6E6E` | Textos secundários, labels               |
| `--white`   | `#F4F4F4` | Fundo geral do body                      |
| `--card`    | `#ffffff` | Fundo de cards e inputs                  |
| `--text`    | `#1a1a1a` | Texto principal                          |
| `--border`  | `#e5e5e5` | Bordas de inputs e divisores             |
| `--ok`      | `#10b981` | Badge ONLINE, stat online                |
| `--err`     | `#ef4444` | Badge OFFLINE, stat offline              |
| `--warn`    | `#f59e0b` | Stat tinta baixa                         |

---

## Layout Geral

Todas as páginas autenticadas seguem a mesma estrutura:

```
┌─────────────────────────────────────┐
│  TOPBAR LARANJA (56px)              │
│  Logo · Nav Links · Clock · User    │
├─────────────────────────────────────┤
│                                     │
│  CONTEÚDO (#F4F4F4)                │
│                                     │
└─────────────────────────────────────┘
```

**Sem sidebar.** A navegação é horizontal no topbar.

---

## Componentes

### Topbar
- Fundo `#FB6602`, altura 56px
- Esquerda: logo "Impressoras Sobral" com ponto branco + links de navegação
- Direita: relógio monospace + chip do usuário (avatar + nome)
- Link ativo: fundo `rgba(255,255,255,0.2)` + peso 700
- Sticky no topo

### Cards
- Fundo `#fff`, border-radius 12px, sombra `0 1px 3px rgba(0,0,0,0.06)`
- Cabeçalho do card com `border-bottom: 2px solid #FB6602`
- Sem bordas laterais coloridas nos cards de lista

### Stats (4 métricas)
- Fundo `#fff`, border-radius 12px
- Borda esquerda de 4px colorida por status (laranja, verde, vermelho, amarelo)
- Label uppercase pequeno + número grande bold

### Badges de status
- ONLINE: fundo `#ecfdf5`, texto `#059669`, border-radius 4px
- OFFLINE: fundo `#fef2f2`, texto `#dc2626`, border-radius 4px

### Botões primários
- Fundo `#FB6602`, texto branco, border-radius 6-8px, font-weight 700
- Hover: `filter: brightness(1.1)`

### Inputs
- Fundo `#F4F4F4`, borda `#e5e5e5`
- Focus: border `#FB6602`, fundo `#fff`

---

## Páginas

### login.html
- Topbar laranja só com logo (sem links de navegação)
- Card centralizado (max-width 400px)
- Cabeçalho do card laranja: título "Bem-vindo" + subtítulo
- Campos de usuário e senha
- Botão "Entrar no sistema →" laranja full-width
- Fundo body `#F4F4F4`
- Remover: grid de fundo, glow radial, tema escuro

### index.html (Admin)
- Topbar com links: Painel · Dispositivos · Estoque · Usuários
- Remover sidebar preta lateral
- Stats em grid 4 colunas com borda esquerda colorida
- Lista de dispositivos em card com header laranja
- Formulário de cadastro em card

### dashboard.html
- Topbar com botão "Atualizar" no canto direito
- Cards de impressoras em grid
- Manter barras de tinta com cores CMYK existentes

### tinta.html
- Mesma topbar
- Cards de toner com barras coloridas mantidas

---

## Arquivos a modificar

| Arquivo          | Mudança                                              |
|------------------|------------------------------------------------------|
| `shared.css`     | Reescrever variáveis e componentes globais           |
| `login.html`     | Remover dark theme, aplicar card com header laranja  |
| `index.html`     | Remover sidebar, adicionar topbar horizontal         |
| `dashboard.html` | Remover topbar escura, aplicar topbar laranja        |
| `tinta.html`     | Remover topbar escura, aplicar topbar laranja        |

---

## O que NÃO muda

- Lógica JavaScript (fetch, auth, SNMP) — sem alterações
- Barras de tinta CMYK (cores ciano/magenta/amarelo/preto mantidas)
- Badges de status (apenas estilo visual muda)
- Responsividade mobile existente
