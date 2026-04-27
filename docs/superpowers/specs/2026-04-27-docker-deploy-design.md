# Docker Deploy Design — monitor-impressoras

**Data:** 2026-04-27
**Status:** Aprovado

## Objetivo

Containerizar o projeto `monitor-impressoras` para deploy em VPS externo, com nginx instalado diretamente no VPS fora do Docker fazendo proxy reverso para o container.

## Arquivos a criar

| Arquivo | Descrição |
|---|---|
| `Dockerfile` | Imagem Node 20 Alpine com ferramentas nativas para `net-snmp` |
| `docker-compose.yml` | Sobe o container, volume para SQLite, carrega `.env` |
| `.env.example` | Template das variáveis de ambiente sem valores reais |
| `.dockerignore` | Exclui `node_modules`, `banco.db`, `.git` da imagem |

## Dockerfile

- Base: `node:20-alpine`
- Instala `python3 make g++` para compilar `net-snmp` (módulo nativo)
- `npm ci --only=production`
- Diretório `/data` para o SQLite
- `ENV DATABASE_PATH=/data/banco.db`
- `EXPOSE 3000`
- `CMD ["node", "server.js"]`

## docker-compose.yml

- Serviço `app` buildado do Dockerfile local
- Porta: `3000:3000`
- Volume nomeado `db_data` montado em `/data`
- `env_file: .env`
- `restart: unless-stopped`

## Variáveis de ambiente (.env.example)

```
PORT=3000
DATABASE_PATH=/data/banco.db
ADMIN_USER=admin
ADMIN_SENHA=troque-esta-senha
ESTOQUE_SENHA=troque-este-token
ALLOWED_ORIGIN=https://seudominio.com
```

## Fluxo de deploy no VPS

```
nginx (80/443) → proxy_pass http://localhost:3000 → container Docker → /data/banco.db (volume)
```

## Preservação do estado anterior

Tag git `pre-docker` criada antes de qualquer alteração. Para reverter:
```bash
git checkout pre-docker
```

## O que NÃO muda

- Código da aplicação (`server.js`) — zero alterações
- Banco SQLite — persiste via volume Docker nomeado
- nginx — configurado no VPS diretamente, fora do Docker

## Observação sobre SNMP

O VPS é externo à rede da empresa. O SNMP (`net-snmp`) tenta alcançar as impressoras pelo IP de rede local — isso **não funcionará** a partir de um VPS externo. A funcionalidade de monitoramento de tinta ficará indisponível, mas o restante do sistema (gestão de impressoras, estoque, autenticação) funcionará normalmente.
