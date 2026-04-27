# Docker Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Containerizar o projeto monitor-impressoras com Docker para deploy em VPS externo, com nginx no VPS fazendo proxy reverso para o container.

**Architecture:** Container único Node.js 20 Alpine com SQLite persistido em volume Docker nomeado. O nginx é instalado direto no VPS (fora do Docker) e redireciona `porta 80/443 → localhost:3000`. Variáveis de ambiente injetadas via arquivo `.env` em tempo de execução.

**Tech Stack:** Docker, docker-compose v2, Node.js 20 Alpine, sqlite3 (com compilação nativa via python3/make/g++)

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `.dockerignore` | Criar | Excluir arquivos desnecessários da imagem |
| `Dockerfile` | Criar | Definir imagem de produção do app |
| `.env.example` | Criar | Template de variáveis de ambiente |
| `docker-compose.yml` | Criar | Orquestrar container + volume SQLite |
| `.gitignore` | Modificar | Adicionar `.env` para não commitar segredos |

---

### Task 1: Criar .dockerignore

**Files:**
- Create: `.dockerignore`

- [ ] **Step 1: Criar o arquivo**

```
node_modules
banco.db
.git
.env
tests
ecosystem.config.js
docs
```

- [ ] **Step 2: Verificar que o arquivo foi criado**

```bash
cat .dockerignore
```
Esperado: conteúdo acima listado.

- [ ] **Step 3: Commit**

```bash
git add .dockerignore
git commit -m "chore: adicionar .dockerignore"
```

---

### Task 2: Criar Dockerfile

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Criar o arquivo**

```dockerfile
FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p /data

ENV DATABASE_PATH=/data/banco.db
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
```

> `python3 make g++` são necessários para compilar o módulo nativo `net-snmp`.

- [ ] **Step 2: Verificar build da imagem**

```bash
docker build -t monitor-impressoras:test .
```
Esperado: `Successfully built <id>` sem erros. O passo de `npm ci` vai compilar o `net-snmp` — pode demorar 1-2 minutos na primeira vez.

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "chore: adicionar Dockerfile"
```

---

### Task 3: Criar .env.example e proteger .env no git

**Files:**
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Criar .env.example**

```
PORT=3000
DATABASE_PATH=/data/banco.db
ADMIN_USER=admin
ADMIN_SENHA=troque-esta-senha
ESTOQUE_SENHA=troque-este-token
ALLOWED_ORIGIN=https://seudominio.com
```

- [ ] **Step 2: Adicionar .env ao .gitignore**

No arquivo `.gitignore`, adicionar a linha abaixo ao final:

```
.env
```

- [ ] **Step 3: Verificar que .env não seria commitado**

```bash
echo "ADMIN_SENHA=teste" > .env
git status
```
Esperado: `.env` NÃO aparece como "untracked" ou "modified" — confirma que está ignorado.

```bash
rm .env
```

- [ ] **Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: adicionar .env.example e proteger .env no gitignore"
```

---

### Task 4: Criar docker-compose.yml

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Criar o arquivo**

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - db_data:/data
    env_file:
      - .env
    restart: unless-stopped

volumes:
  db_data:
```

- [ ] **Step 2: Criar .env local para teste (NÃO commitar)**

```bash
cp .env.example .env
```

Editar `.env` com valores reais para teste local:
```
PORT=3000
DATABASE_PATH=/data/banco.db
ADMIN_USER=admin
ADMIN_SENHA=senha-local-teste
ESTOQUE_SENHA=token-local-teste
ALLOWED_ORIGIN=http://localhost:3000
```

- [ ] **Step 3: Subir o container e verificar**

```bash
docker compose up --build
```

Esperado no log:
```
⚠️  ADMIN_SENHA não definida...   <- NÃO deve aparecer (senha está no .env)
Servidor em http://localhost:3000
```

Se `ADMIN_SENHA não definida` aparecer, confirmar que o `.env` está no mesmo diretório do `docker-compose.yml` e que a senha está preenchida.

- [ ] **Step 4: Testar acesso**

Abrir `http://localhost:3000` no browser. A tela de login deve carregar.

- [ ] **Step 5: Parar o container**

```bash
docker compose down
```

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: adicionar docker-compose.yml"
```

---

### Task 5: Verificar persistência do banco

**Files:** nenhum — verificação funcional

- [ ] **Step 1: Subir o container**

```bash
docker compose up -d
```

- [ ] **Step 2: Adicionar uma impressora via interface**

Acessar `http://localhost:3000`, fazer login e cadastrar uma impressora de teste.

- [ ] **Step 3: Recriar o container (simula restart no VPS)**

```bash
docker compose down
docker compose up -d
```

- [ ] **Step 4: Verificar que a impressora ainda está lá**

Acessar `http://localhost:3000` novamente. A impressora cadastrada deve aparecer.

Esperado: dados persistidos no volume `db_data`.

- [ ] **Step 5: Parar**

```bash
docker compose down
```

---

## Instruções de deploy no VPS (referência)

Após os commits, no VPS:

```bash
# 1. Clonar o repo
git clone <url-do-repo> monitor-impressoras
cd monitor-impressoras

# 2. Criar .env com valores de produção
cp .env.example .env
nano .env   # preencher ADMIN_SENHA, ESTOQUE_SENHA, ALLOWED_ORIGIN

# 3. Subir
docker compose up -d --build

# 4. Verificar logs
docker compose logs -f
```

**Configuração nginx no VPS (fora do Docker):**

```nginx
server {
    listen 80;
    server_name seudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
