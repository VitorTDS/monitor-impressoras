# Login Kit — Laboratório Sobral

Padrão visual de tela de login para sistemas internos da empresa.
Origem: projeto **Tinta Branca** (monitor-impressoras).

---

## Checklist de adoção

1. Copie `login.template.html` para `public/login.html` do novo projeto
2. Copie a `logo.png` circular da empresa para `public/logo.png`
3. Edite as 10 variáveis marcadas com `{{...}}` (veja tabela abaixo)
4. Ajuste os 4 parâmetros JS no topo do `<script>`
5. Troque o SVG de ícone por algo temático do novo sistema

---

## Variáveis de conteúdo

| Marcador            | Onde aparece              | Exemplo                          |
|---------------------|---------------------------|----------------------------------|
| `{{SYSTEM_NAME}}`   | Título linha 1 (laranja)  | `TINTA`                         |
| `{{SYSTEM_LINE2}}`  | Título linha 2 (branco)   | `BRANCA`                        |
| `{{SYSTEM_TAGLINE}}`| Descrição curta           | `GERENCIAMENTO DE IMPRESSORAS`  |
| `{{SYSTEM_MODULES}}`| Módulos do sistema        | `MONITORAMENTO · CONSUMÍVEIS`   |
| `{{CARD_TITLE}}`    | Título dentro do card     | `Acesso ao Sistema`             |
| `{{CARD_SUBTITLE}}` | Subtítulo do card         | `Autenticação de usuário`       |

---

## Parâmetros JS

```js
const AUTH_LOGIN      = '/api/auth/login';        // POST { usuario, senha }
const AUTH_TROCAR     = '/api/auth/trocar-senha'; // POST { temp_token, nova_senha }
const SESSION_KEY     = 'ic_token';               // chave no sessionStorage
const POST_LOGIN_PAGE = 'admin.html';             // redirect após login
```

Se o projeto não tiver fluxo de troca de senha no primeiro acesso,
remova a função `doTrocarSenha` e o `#screen-trocar` do HTML.

---

## Logo

- Formato: PNG ou WEBP com fundo transparente ou circular
- Tamanho ideal: 220×220px (renderiza em 110×110)
- O CSS já aplica `border-radius: 50%` — logos quadradas ficam cortadas

---

## Cores

Todas as cores estão em variáveis CSS no `:root`. Para variar por projeto:

```css
--accent:   #FB6602;  /* laranja principal — identidade Sobral */
--accent-d: #d94e00;  /* laranja escuro (gradiente botão) */
--bg:       #1a0800;  /* base do fundo quente */
```

O fundo warm brown/orange é a identidade visual da empresa — mantenha.
Se o sistema tiver uma cor secundária forte, ajuste só `--accent`.

---

## Ícone decorativo (lado esquerdo)

Substitua o SVG placeholder dentro de `.brand-icon` por algo temático:
impressora, servidor, microscópio, pasta, etc. Mantenha `opacity: 0.18`
para não competir com o texto.
