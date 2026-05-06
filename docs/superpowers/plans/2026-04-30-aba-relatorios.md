# Aba Relatorios — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Adicionar aba "Relatorios" com 5 secoes: ficha tecnica, impressoes por periodo, consumo de tinta, disponibilidade/uptime, estoque x consumo.

**Architecture:** Tres novas tabelas SQLite (historico_paginas, historico_tinta, historico_status) alimentadas por job SNMP horario. Novos endpoints /api/relatorios/* agregam os dados. Frontend relatorios.html usa Chart.js 4.x (CDN) no layout admin existente.

**Tech Stack:** Node.js/Express/SQLite (server.js existente), net-snmp (ja instalado), Chart.js 4.4.3 via CDN, HTML/CSS/JS puro.

---

## Mapa de Arquivos

| Arquivo | Acao |
|---|---|
| server.js | Novas tabelas, job coleta horario, endpoints /api/relatorios/* |
| public/relatorios.html | Criar pagina com 5 abas de relatorio |
| public/admin.html | Adicionar link Relatorios ao sb-nav |
| public/dispositivos.html | Adicionar link Relatorios ao sb-nav |
| public/cadastrar.html | Adicionar link Relatorios ao sb-nav |
| public/tinta.html | Adicionar link Relatorios ao sb-nav |
| public/estoque.html | Adicionar link Relatorios ao sb-nav |
| public/usuarios.html | Adicionar link Relatorios ao sb-nav |

---

## Task 1: Tabelas de historico no banco

**Files:** Modify server.js (dentro do bloco db.serialize(), antes de db.run("SELECT 1", resolve))

- [ ] Step 1: Localizar db.run("SELECT 1", resolve) e inserir ANTES:

  db.run("CREATE TABLE IF NOT EXISTS historico_paginas (id INTEGER PRIMARY KEY AUTOINCREMENT, impressora_id INTEGER NOT NULL, paginas_total INTEGER, coletado_em TEXT DEFAULT (datetime('now')), FOREIGN KEY (impressora_id) REFERENCES impressoras(id) ON DELETE CASCADE)");
  db.run("CREATE TABLE IF NOT EXISTS historico_tinta (id INTEGER PRIMARY KEY AUTOINCREMENT, impressora_id INTEGER NOT NULL, cor TEXT NOT NULL, percentual INTEGER, coletado_em TEXT DEFAULT (datetime('now')), FOREIGN KEY (impressora_id) REFERENCES impressoras(id) ON DELETE CASCADE)");
  db.run("CREATE TABLE IF NOT EXISTS historico_status (id INTEGER PRIMARY KEY AUTOINCREMENT, impressora_id INTEGER NOT NULL, online INTEGER NOT NULL, registrado_em TEXT DEFAULT (datetime('now')), FOREIGN KEY (impressora_id) REFERENCES impressoras(id) ON DELETE CASCADE)");

- [ ] Step 2: Verificar sintaxe: node -e "require('./server.js')" 2>&1 | head -5

- [ ] Step 3: git add server.js && git commit -m "feat: criar tabelas historico_paginas, historico_tinta, historico_status"

---

## Task 2: Funcao SNMP de paginas + job horario

**Files:** Modify server.js (apos obterDadosSNMP, antes de // -- Descoberta)

- [ ] Step 1: Apos o fechamento de obterDadosSNMP, adicionar:

  function obterContadorPaginas(ip, comunidade) {
      return new Promise((resolve) => {
          const session = snmp.createSession(ip, comunidade || 'public', { timeout: 2000, retries: 0 });
          session.get(['1.3.6.1.2.1.43.10.2.1.4.1.1'], (err, varbinds) => {
              session.close();
              if (err || !varbinds[0] || snmp.isVarbindError(varbinds[0])) { resolve(null); return; }
              const val = Number(varbinds[0].value);
              resolve(isNaN(val) || val < 0 ? null : val);
          });
      });
  }

  async function coletarHistorico() {
      db.all('SELECT id, ip, comunidade FROM impressoras', [], async (err, rows) => {
          if (err || !rows.length) return;
          const agora = new Date().toISOString();
          for (const imp of rows) {
              const [snmpData, paginas] = await Promise.all([
                  obterDadosSNMP(imp.ip, imp.comunidade),
                  obterContadorPaginas(imp.ip, imp.comunidade)
              ]);
              db.run('INSERT INTO historico_status (impressora_id, online, registrado_em) VALUES (?, ?, ?)',
                  [imp.id, snmpData.online ? 1 : 0, agora]);
              for (const s of (snmpData.suprimentos || [])) {
                  db.run('INSERT INTO historico_tinta (impressora_id, cor, percentual, coletado_em) VALUES (?, ?, ?, ?)',
                      [imp.id, s.nome, s.percentual, agora]);
              }
              if (paginas !== null) {
                  db.run('INSERT INTO historico_paginas (impressora_id, paginas_total, coletado_em) VALUES (?, ?, ?)',
                      [imp.id, paginas, agora]);
              }
          }
      });
  }

- [ ] Step 2: Dentro de if (require.main === module), apos app.listen():
  dbReady.then(() => { coletarHistorico(); setInterval(coletarHistorico, 60 * 60 * 1000).unref(); });

- [ ] Step 3: node -e "require('./server.js')" 2>&1 | head -5

- [ ] Step 4: git add server.js && git commit -m "feat: job horario de coleta SNMP (paginas, tinta, status)"

---

## Task 3: Endpoints /api/relatorios/*

**Files:** Modify server.js (antes de // -- Error handler centralizado)

- [ ] Step 1: Adicionar 5 endpoints antes do error handler:

  // GET /api/relatorios/impressoras — lista impressoras com SNMP atual e contador de paginas
  app.get('/api/relatorios/impressoras', verificarTokenAdmin, (req, res, next) => {
      db.all('SELECT id, nome, ip, modelo, localizacao, tipo, material, comunidade FROM impressoras ORDER BY nome ASC', [], async (err, rows) => {
          if (err) return next(err);
          const resultados = await Promise.all(rows.map(async (imp) => {
              const [snmpData, paginas] = await Promise.all([
                  obterDadosSNMP(imp.ip, imp.comunidade || 'public'),
                  obterContadorPaginas(imp.ip, imp.comunidade || 'public')
              ]);
              return { ...imp, ...snmpData, paginas_total: paginas };
          }));
          res.json(resultados);
      });
  });

  // GET /api/relatorios/paginas/:id?periodo=hora|dia|mes|ano
  app.get('/api/relatorios/paginas/:id', verificarTokenAdmin, (req, res, next) => {
      const fmtMap = { hora: '%Y-%m-%dT%H:00', dia: '%Y-%m-%d', mes: '%Y-%m', ano: '%Y' };
      const janMap = { hora: '-2 days', dia: '-30 days', mes: '-12 months', ano: '-5 years' };
      const fmt = fmtMap[req.query.periodo] || fmtMap.dia;
      const jan = janMap[req.query.periodo] || janMap.dia;
      db.all(
          "SELECT strftime('" + fmt + "', coletado_em) AS periodo, MAX(paginas_total) - MIN(paginas_total) AS paginas_impressas FROM historico_paginas WHERE impressora_id = ? AND coletado_em >= datetime('now', '" + jan + "') GROUP BY strftime('" + fmt + "', coletado_em) ORDER BY periodo ASC",
          [req.params.id], (err, rows) => {
              if (err) return next(err);
              res.json(rows.filter(r => (r.paginas_impressas || 0) > 0));
          });
  });

  // GET /api/relatorios/tinta/:id
  app.get('/api/relatorios/tinta/:id', verificarTokenAdmin, (req, res, next) => {
      db.all("SELECT cor, strftime('%Y-%m-%d', coletado_em) AS dia, ROUND(AVG(percentual)) AS percentual_medio, MIN(percentual) AS percentual_min FROM historico_tinta WHERE impressora_id = ? AND coletado_em >= datetime('now', '-30 days') GROUP BY cor, strftime('%Y-%m-%d', coletado_em) ORDER BY dia ASC, cor ASC",
          [req.params.id], (err, rows) => { if (err) return next(err); res.json(rows); });
  });

  // GET /api/relatorios/disponibilidade
  app.get('/api/relatorios/disponibilidade', verificarTokenAdmin, (req, res, next) => {
      db.all("SELECT i.id, i.nome, i.ip, i.modelo, i.localizacao, COUNT(h.id) AS total_checkins, SUM(COALESCE(h.online, 0)) AS checkins_online, ROUND(100.0 * SUM(COALESCE(h.online, 0)) / MAX(COUNT(h.id), 1), 1) AS uptime_pct, MAX(CASE WHEN h.online = 0 THEN h.registrado_em END) AS ultimo_offline FROM impressoras i LEFT JOIN historico_status h ON h.impressora_id = i.id AND h.registrado_em >= datetime('now', '-30 days') GROUP BY i.id ORDER BY uptime_pct ASC, i.nome ASC",
          [], (err, rows) => { if (err) return next(err); res.json(rows); });
  });

  // GET /api/relatorios/estoque
  app.get('/api/relatorios/estoque', verificarTokenAdmin, (req, res, next) => {
      db.all("SELECT e.modelo, e.insumo, e.quantidade AS estoque_atual, ROUND(AVG(c.consumo_dia), 3) AS consumo_dia_medio, CASE WHEN ROUND(AVG(c.consumo_dia), 3) > 0 THEN ROUND(e.quantidade / ROUND(AVG(c.consumo_dia), 3)) ELSE NULL END AS dias_estimados FROM estoque e LEFT JOIN (SELECT impressora_id, cor, (MAX(percentual) - MIN(percentual)) / MAX(julianday(MAX(coletado_em)) - julianday(MIN(coletado_em)), 1) AS consumo_dia FROM historico_tinta WHERE coletado_em >= datetime('now', '-30 days') GROUP BY impressora_id, cor) c ON LOWER(c.cor) = LOWER(CASE WHEN LOWER(e.insumo) LIKE '%preto%' OR LOWER(e.insumo) LIKE '%black%' THEN 'preto' WHEN LOWER(e.insumo) LIKE '%ciano%' OR LOWER(e.insumo) LIKE '%cyan%' THEN 'ciano' WHEN LOWER(e.insumo) LIKE '%magenta%' THEN 'magenta' WHEN LOWER(e.insumo) LIKE '%amarelo%' OR LOWER(e.insumo) LIKE '%yellow%' THEN 'amarelo' ELSE e.insumo END) GROUP BY e.id ORDER BY dias_estimados ASC, e.modelo ASC",
          [], (err, rows) => { if (err) return next(err); res.json(rows); });
  });

- [ ] Step 2: node -e "require('./server.js')" 2>&1 | head -5

- [ ] Step 3: git add server.js && git commit -m "feat: endpoints /api/relatorios/*"

---

## Task 4: Criar public/relatorios.html

**Files:** Create public/relatorios.html

Caracteristicas:
- head: shared.css, admin.css, Chart.js 4.4.3 CDN (cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js)
- body: admin-auth.js + requireAuth() + initTheme()
- Sidebar identica ao admin.html com link Relatorios incluido
- 5 abas via .rel-tab / .rel-panel (display:none / display:block)
- Todos os valores dinamicos passam por escHTML() antes de innerHTML
- Fetch autenticado: { headers: { Authorization: 'Bearer ' + localStorage.getItem('adminToken') } }

Abas:
1. Ficha Tecnica: select impressora -> GET /api/relatorios/impressoras -> cards + barras de tinta
2. Impressoes: select + periodo -> GET /api/relatorios/paginas/:id?periodo=X -> Chart.js bar
3. Consumo de Tinta: select -> GET /api/relatorios/tinta/:id -> Chart.js line por cor
4. Disponibilidade: auto-load -> GET /api/relatorios/disponibilidade -> tabela + barras CSS uptime
5. Estoque x Consumo: auto-load -> GET /api/relatorios/estoque -> tabela com previsao em dias

- [ ] Step 1: Criar o arquivo completo (implementado diretamente, nao via heredoc)

- [ ] Step 2: ls -la public/relatorios.html && wc -l public/relatorios.html (esperar > 200 linhas)

- [ ] Step 3: git add public/relatorios.html && git commit -m "feat: criar relatorios.html com 5 abas"

---

## Task 5: Adicionar link Relatorios ao nav de 6 paginas

**Files:** admin.html, dispositivos.html, cadastrar.html, tinta.html, estoque.html, usuarios.html

Em cada arquivo, apos a linha com usuarios.html no sb-nav, adicionar:
    <a href="relatorios.html"   class="sb-item">📈 Relatorios</a>

- [ ] Step 1: Editar os 6 arquivos

- [ ] Step 2: grep -c "relatorios.html" public/admin.html public/dispositivos.html public/cadastrar.html public/tinta.html public/estoque.html public/usuarios.html (esperar 1 em cada)

- [ ] Step 3: git add public/admin.html public/dispositivos.html public/cadastrar.html public/tinta.html public/estoque.html public/usuarios.html && git commit -m "feat: adicionar link Relatorios ao nav de todas as paginas admin"

---

## Task 6: Deploy no servidor remoto

Servidor remoto (192.86.221.214) tem divergencia: commit 6559423 (docker port) nao esta no origin.

- [ ] Step 1: git push origin master

- [ ] Step 2: Via SSH no servidor:
  cd /home/sobral/Documentos/sbr-prints/monitor-impressoras
  git stash
  git fetch origin
  git rebase origin/master
  git stash pop || true
  pkill -f "node server.js" || true
  nohup node server.js > /tmp/monitor.log 2>&1 &

- [ ] Step 3: curl -s -o /dev/null -w "%{http_code}" http://192.86.221.214:3001/relatorios.html (esperar 200)

- [ ] Step 4: Testar no browser — navegar ate http://192.86.221.214:3001/relatorios.html e verificar 5 abas
