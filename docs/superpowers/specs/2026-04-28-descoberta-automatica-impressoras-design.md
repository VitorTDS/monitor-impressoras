# Descoberta Automática de Impressoras via IP

**Data:** 2026-04-28  
**Status:** Aprovado

## Resumo

Ao cadastrar uma impressora, o usuário informa apenas o IP e clica em "Buscar". O sistema consulta o dispositivo via SNMP e preenche automaticamente os campos do formulário. O usuário revisa, preenche a localização e confirma o cadastro.

---

## Fluxo do Usuário

1. Usuário acessa `cadastrar.html`
2. Vê apenas o campo IP + botão "Buscar"
3. Digita o IP e clica em "Buscar"
4. Sistema consulta SNMP; campos aparecem pré-preenchidos e editáveis
5. Se dispositivo offline/sem SNMP: campos aparecem vazios com aviso `⚠️ Dispositivo não respondeu — preencha manualmente`
6. Usuário preenche Localização (único campo sempre em branco)
7. Clica em "Registrar Equipamento" → POST /api/impressoras (sem alterações)

---

## Backend

### Novo endpoint

```
GET /api/descobrir?ip=<IPv4>
```

**Validação:** rejeita com `400` se o IP não passar na regex IPv4 já existente no projeto.

**OIDs consultados em paralelo (timeout 2 s, sem retries):**

| OID | Nome | Uso |
|-----|------|-----|
| 1.3.6.1.2.1.1.1.0 | sysDescr | Texto livre com fabricante/modelo |
| 1.3.6.1.2.1.25.3.2.1.3.1 | hrDeviceDescr | Descrição do dispositivo (mais precisa) |
| 1.3.6.1.2.1.43.11.1.1.8.1.1–4 | prtMarkerSuppliesMaxCapacity | Detectar suprimentos coloridos |
| 1.3.6.1.2.1.43.11.1.1.9.1.1–4 | prtMarkerSuppliesLevel | Detectar suprimentos coloridos |

**Parsing:**

- **fabricante:** busca keywords `Canon`, `HP`, `Epson`, `Brother`, `Kyocera` no texto dos OIDs (case-insensitive). Primeiro match vence.
- **modelo:** usa `hrDeviceDescr` se não-vazio; fallback para `sysDescr`; fallback para `""`.
- **tipo:** se OIDs de ciano/magenta/amarelo (índices 2, 3, 4) retornarem `max > 0` → `"Colorido"`; caso contrário → `"Mono"`.
- **material:** busca `"laser"` ou `"toner"` no texto (case-insensitive) → `"Toner"`; caso contrário → `"Tinta"`.

**Resposta (sempre 200):**

```json
{
  "online": true,
  "fabricante": "Canon",
  "modelo": "Canon imageCLASS MF654Cdw",
  "tipo": "Colorido",
  "material": "Toner",
  "comunidade": "public"
}
```

Quando offline, todos os campos de string retornam `""` e `online: false`.

---

## Frontend (`cadastrar.html`)

### Estado inicial
Exibe apenas:
```
[ IP / Endereço          ]  [ 🔍 Buscar ]
```

### Durante a busca
- Botão vira `Buscando...` e fica desabilitado
- Campo IP fica desabilitado

### Após a busca
Os campos restantes aparecem (CSS `display:none` → `display:block` com fade):

```
Fabricante [select]        Material [select]
Modelo     [text input]
IP         [text — pré-preenchido, editável]
Localização[text — sempre vazio]
Comunidade [text — "public"]
Tipo       [select]

[⚠️ aviso se offline]

[ + Registrar Equipamento ]
```

Todos os campos são editáveis antes de registrar. O botão Buscar permanece visível para permitir nova consulta (ex: usuário errou o IP).

### Sem alterações
- `POST /api/impressoras` — payload e validações inalterados
- Demais páginas — nenhuma mudança

---

## Tratamento de Erros

| Situação | Comportamento |
|----------|--------------|
| IP inválido | Mensagem inline, sem chamada ao backend |
| SNMP timeout / offline | `online: false`, campos em branco, aviso visual |
| Erro 500 no backend | Mensagem de erro, campos não aparecem |

---

## O que não muda

- Schema do banco de dados
- Endpoint `POST /api/impressoras`
- Todas as outras páginas do frontend
- Lógica SNMP do dashboard (`/api/dashboard`)
