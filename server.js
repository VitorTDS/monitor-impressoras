const express      = require('express');
const sqlite3      = require('sqlite3').verbose();
const snmp         = require('net-snmp');
const net          = require('net');
const http         = require('http');
const helmet       = require('helmet');
const cors         = require('cors');
const rateLimit    = require('express-rate-limit');
const crypto       = require('crypto');

const app = express();

// ── Validação de IP e campos de impressora ────────────────────────────────────
const IPV4_RE = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

function validarImpressora(body, obrigatorio = true) {
    const erros = [];
    const { nome, ip, modelo } = body;
    if (obrigatorio || nome !== undefined) {
        if (!nome || typeof nome !== 'string' || !nome.trim()) erros.push('nome é obrigatório');
    }
    if (obrigatorio || ip !== undefined) {
        if (ip !== undefined && !IPV4_RE.test(String(ip).trim())) erros.push('ip inválido (use formato IPv4)');
    }
    if (obrigatorio || modelo !== undefined) {
        if (!modelo || typeof modelo !== 'string' || !modelo.trim()) erros.push('modelo é obrigatório');
    }
    return erros;
}

function validarEstoque(body) {
    const erros = [];
    const { modelo, insumo, quantidade } = body;
    if (!modelo || typeof modelo !== 'string' || !modelo.trim()) erros.push('modelo é obrigatório');
    if (!insumo  || typeof insumo  !== 'string' || !insumo.trim())  erros.push('insumo é obrigatório');
    if (quantidade === undefined || quantidade === null) erros.push('quantidade é obrigatória');
    else if (!Number.isInteger(Number(quantidade)) || Number(quantidade) < 0) erros.push('quantidade deve ser inteiro >= 0');
    return erros;
}

// ── Tokens de estoque (memória, TTL 5 min) ────────────────────────────────────
const estoqueTokens = new Map();

function gerarTokenEstoque() {
    const token = crypto.randomBytes(24).toString('hex');
    estoqueTokens.set(token, Date.now() + 5 * 60 * 1000);
    return token;
}

function verificarTokenEstoque(req, res, next) {
    const auth  = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const exp   = estoqueTokens.get(token);
    if (!exp || Date.now() > exp) return res.status(401).json({ erro: 'Não autorizado' });
    next();
}

// Remove tokens expirados da memória a cada minuto
setInterval(() => {
    const now = Date.now();
    for (const [token, exp] of estoqueTokens) {
        if (now > exp) estoqueTokens.delete(token);
    }
}, 60_000).unref();

// ── Cache do dashboard (30 s) ─────────────────────────────────────────────────
let dashCache   = null;
let dashCacheAt = 0;
const DASH_TTL  = 30_000;

function invalidarCacheDash() { dashCacheAt = 0; }

// ── Credencial de estoque ─────────────────────────────────────────────────────
let ESTOQUE_SENHA = process.env.ESTOQUE_SENHA;
if (!ESTOQUE_SENHA) {
    ESTOQUE_SENHA = crypto.randomBytes(16).toString('hex');
    console.warn('⚠️  ESTOQUE_SENHA não definida. Token temporário gerado para esta sessão.');
    console.warn('   Defina a variável de ambiente para acesso persistente ao estoque.');
}

// ── Banco de dados ────────────────────────────────────────────────────────────
const DB_PATH = process.env.DATABASE_PATH || './banco.db';
const db = new sqlite3.Database(DB_PATH);

const dbReady = new Promise(resolve => {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS impressoras (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT, ip TEXT, modelo TEXT, localizacao TEXT, comunidade TEXT, tipo TEXT, material TEXT
        )`);
        db.run(`ALTER TABLE impressoras ADD COLUMN material TEXT`, () => {});
        db.run(`ALTER TABLE impressoras ADD COLUMN tipo TEXT`, () => {});
        db.run(`UPDATE impressoras SET material = 'Toner' WHERE material IS NULL`);
        db.run(`UPDATE impressoras SET tipo = 'Colorido' WHERE tipo IS NULL`);
        db.run(`CREATE TABLE IF NOT EXISTS estoque (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            modelo TEXT, insumo TEXT, quantidade INTEGER, estado TEXT,
            UNIQUE(modelo, insumo, estado)
        )`);
        db.run(`
            INSERT OR REPLACE INTO estoque (modelo, insumo, quantidade, estado)
            SELECT modelo, insumo, SUM(quantidade), 'Novo'
            FROM estoque
            GROUP BY modelo, insumo
            HAVING COUNT(*) > 1
        `, () => {
            db.run(`DELETE FROM estoque WHERE estado != 'Novo' AND rowid NOT IN (
                SELECT MIN(rowid) FROM estoque GROUP BY modelo, insumo
            )`);
        });
        db.run('SELECT 1', resolve);
    });
});

// ── Middleware stack (ordem: helmet → cors → rate limit → body → static) ─────
app.use(helmet());

app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
    credentials: true
}));

const limiterGlobal = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});

const limiterAuth = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

app.use(limiterGlobal);
app.use(express.json({ limit: '100kb' }));
app.use(express.static('public'));

// ── SNMP ──────────────────────────────────────────────────────────────────────
function obterDadosSNMP(ip, comunidade) {
    return new Promise((resolve) => {
        const session = snmp.createSession(ip, comunidade || 'public', { timeout: 2000, retries: 1 });
        const oids = [
            '1.3.6.1.2.1.43.11.1.1.8.1.1', '1.3.6.1.2.1.43.11.1.1.9.1.1',
            '1.3.6.1.2.1.43.11.1.1.8.1.2', '1.3.6.1.2.1.43.11.1.1.9.1.2',
            '1.3.6.1.2.1.43.11.1.1.8.1.3', '1.3.6.1.2.1.43.11.1.1.9.1.3',
            '1.3.6.1.2.1.43.11.1.1.8.1.4', '1.3.6.1.2.1.43.11.1.1.9.1.4'
        ];
        session.get(oids, (error, varbinds) => {
            if (error) {
                resolve({ online: false, suprimentos: [] });
            } else {
                const cores = ['Preto', 'Ciano', 'Magenta', 'Amarelo'];
                const suprimentos = [];
                for (let i = 0; i < cores.length; i++) {
                    const max   = varbinds[i * 2]?.value;
                    const atual = varbinds[i * 2 + 1]?.value;
                    if (max > 0) {
                        const perc = Math.round((atual / max) * 100);
                        suprimentos.push({ nome: cores[i], percentual: perc < 0 ? 0 : (perc > 100 ? 100 : perc) });
                    }
                }
                resolve({ online: true, suprimentos });
            }
            session.close();
        });
    });
}

// ── Rotas ─────────────────────────────────────────────────────────────────────

app.get('/api/dashboard', (req, res, next) => {
    if (dashCache && Date.now() - dashCacheAt < DASH_TTL) return res.json(dashCache);

    db.all('SELECT id, nome, ip, modelo, localizacao, comunidade, tipo, material FROM impressoras', [], async (err, rows) => {
        if (err) { console.error(err); return next(err); }
        try {
            const promessas = rows.map(async (imp) => {
                const snmpData = await obterDadosSNMP(imp.ip, imp.comunidade);
                return {
                    ...imp,
                    material: imp.material || 'Toner',
                    tipo: imp.tipo || 'Colorido',
                    online: snmpData.online,
                    suprimentos: snmpData.suprimentos
                };
            });
            const resultados = await Promise.all(promessas);
            dashCache   = resultados;
            dashCacheAt = Date.now();
            res.json(resultados);
        } catch (e) {
            console.error(e);
            next(e);
        }
    });
});

app.post('/api/impressoras', (req, res, next) => {
    const erros = validarImpressora(req.body, true);
    if (erros.length) return res.status(400).json({ erro: erros.join('; ') });

    const { nome, ip, modelo, localizacao, comunidade, tipo, material } = req.body;
    db.run(
        `INSERT INTO impressoras (nome, ip, modelo, localizacao, comunidade, tipo, material) VALUES (?,?,?,?,?,?,?)`,
        [nome.trim(), ip.trim(), modelo.trim(), localizacao, comunidade || 'public', tipo || 'Colorido', material || 'Toner'],
        (err) => {
            if (err) { console.error(err); return next(err); }
            invalidarCacheDash();
            res.status(201).json({ sucesso: true });
        }
    );
});

app.put('/api/impressoras/:id', (req, res, next) => {
    const erros = validarImpressora(req.body, false);
    if (erros.length) return res.status(400).json({ erro: erros.join('; ') });

    const { nome, modelo, ip, localizacao, comunidade, tipo, material } = req.body;
    db.get('SELECT * FROM impressoras WHERE id = ?', [req.params.id], (err, existing) => {
        if (err) { console.error(err); return next(err); }
        if (!existing) return res.status(404).json({ erro: 'Impressora não encontrada' });
        db.run(
            `UPDATE impressoras SET nome = ?, modelo = ?, ip = ?, localizacao = ?, comunidade = ?, tipo = ?, material = ? WHERE id = ?`,
            [
                (nome        ?? existing.nome)?.trim?.()    ?? existing.nome,
                (modelo      ?? existing.modelo)?.trim?.()  ?? existing.modelo,
                (ip          ?? existing.ip)?.trim?.()      ?? existing.ip,
                localizacao  ?? existing.localizacao,
                comunidade   ?? existing.comunidade,
                tipo         ?? existing.tipo,
                material     ?? existing.material,
                req.params.id
            ],
            function (err) {
                if (err) { console.error(err); return next(err); }
                invalidarCacheDash();
                res.json({ sucesso: true });
            }
        );
    });
});

app.delete('/api/impressoras/:id', (req, res, next) => {
    db.run('DELETE FROM impressoras WHERE id = ?', req.params.id, function (err) {
        if (err) { console.error(err); return next(err); }
        if (this.changes === 0) return res.status(404).json({ erro: 'Impressora não encontrada' });
        invalidarCacheDash();
        res.status(204).end();
    });
});

app.get('/api/estoque', (req, res) => {
    db.all('SELECT id, modelo, insumo, quantidade, estado FROM estoque ORDER BY modelo ASC, estado ASC', [], (err, rows) => {
        res.json(rows || []);
    });
});

app.post('/api/estoque', verificarTokenEstoque, (req, res, next) => {
    const erros = validarEstoque(req.body);
    if (erros.length) return res.status(400).json({ erro: erros.join('; ') });

    const { modelo, insumo, quantidade, estado } = req.body;
    db.run(
        `INSERT INTO estoque (modelo, insumo, quantidade, estado) VALUES (?,?,?,?)
         ON CONFLICT(modelo, insumo, estado) DO UPDATE SET quantidade = excluded.quantidade`,
        [modelo, insumo, quantidade, estado || 'Novo'],
        (err) => {
            if (err) { console.error(err); return next(err); }
            res.status(201).json({ sucesso: true });
        }
    );
});

app.delete('/api/estoque/:id', verificarTokenEstoque, (req, res, next) => {
    db.run('DELETE FROM estoque WHERE id = ?', req.params.id, function (err) {
        if (err) { console.error(err); return next(err); }
        if (this.changes === 0) return res.status(404).json({ erro: 'Item não encontrado' });
        res.status(204).end();
    });
});

// ── Autenticação de estoque ───────────────────────────────────────────────────
app.post('/api/auth/estoque', limiterAuth, (req, res) => {
    const { senha } = req.body;
    if (!senha) return res.status(400).json({ ok: false });
    if (senha === ESTOQUE_SENHA) return res.json({ ok: true, token: gerarTokenEstoque() });
    setTimeout(() => res.status(401).json({ ok: false }), 800);
});

// ── Impressão via IPP (porta 631) com fallback RAW 9100 ──────────────────────
app.post('/api/impressoras/:id/imprimir', (req, res, next) => {
    const { conteudo } = req.body;
    if (!conteudo) return res.status(400).json({ erro: 'Conteúdo não informado' });

    db.get('SELECT * FROM impressoras WHERE id = ?', [req.params.id], (err, imp) => {
        if (err || !imp) return res.status(404).json({ erro: 'Impressora não encontrada' });

        const ps =
            '%!PS-Adobe-3.0\n%%Pages: 1\n%%EndComments\n%%Page: 1 1\n' +
            '/Courier findfont 12 scalefont setfont\n72 750 moveto\n' +
            conteudo.split('\n').map((linha, i) => {
                const safe = linha.replace(/[()\\]/g, c => '\\' + c);
                return `72 ${750 - (i * 16)} moveto (${safe}) show`;
            }).join('\n') +
            '\nshowpage\n%%EOF\n';

        const psBuffer = Buffer.from(ps, 'utf8');

        function ippAttr(tag, name, value) {
            const nameBuf = Buffer.from(name, 'utf8');
            const valBuf  = Buffer.from(value, 'utf8');
            const b = Buffer.alloc(5 + nameBuf.length + valBuf.length);
            b.writeUInt8(tag, 0);
            b.writeUInt16BE(nameBuf.length, 1);
            nameBuf.copy(b, 3);
            b.writeUInt16BE(valBuf.length, 3 + nameBuf.length);
            valBuf.copy(b, 5 + nameBuf.length);
            return b;
        }

        const printerUri = `ipp://${imp.ip}/ipp/print`;
        const attrs = Buffer.concat([
            Buffer.from([0x01]),
            ippAttr(0x47, 'attributes-charset', 'utf-8'),
            ippAttr(0x48, 'attributes-natural-language', 'pt-br'),
            ippAttr(0x45, 'printer-uri', printerUri),
            ippAttr(0x42, 'requesting-user-name', 'imageCLASS'),
            ippAttr(0x42, 'job-name', 'Impressao-Sistema'),
            ippAttr(0x44, 'document-format', 'application/postscript'),
            Buffer.from([0x03])
        ]);

        const header = Buffer.alloc(8);
        header.writeUInt8(0x01, 0);
        header.writeUInt8(0x01, 1);
        header.writeUInt16BE(0x0002, 2);
        header.writeInt32BE(1, 4);

        const ippBody = Buffer.concat([header, attrs, psBuffer]);

        const reqHttp = http.request({
            hostname: imp.ip, port: 631, path: '/ipp/print', method: 'POST',
            headers: { 'Content-Type': 'application/ipp', 'Content-Length': ippBody.length }
        }, (ippRes) => {
            const data = [];
            ippRes.on('data', chunk => data.push(chunk));
            ippRes.on('end', () => {
                const buf = Buffer.concat(data);
                if (buf.length >= 4) {
                    const statusCode = buf.readUInt16BE(2);
                    if (statusCode >= 0x0400) {
                        return res.status(500).json({ erro: `Impressora recusou: código IPP ${statusCode.toString(16)}` });
                    }
                }
                res.json({ sucesso: true });
            });
        });

        reqHttp.on('error', () => {
            const socket = new net.Socket();
            let respondeu = false;
            socket.setTimeout(5000);
            socket.connect(9100, imp.ip, () => {
                socket.write(conteudo + '\r\n\f', 'utf8', () => {
                    socket.end();
                    if (!respondeu) { respondeu = true; res.json({ sucesso: true, aviso: 'Enviado via RAW' }); }
                });
            });
            socket.on('timeout', () => {
                socket.destroy();
                if (!respondeu) { respondeu = true; res.status(504).json({ erro: 'Timeout' }); }
            });
            socket.on('error', () => {
                if (!respondeu) { respondeu = true; res.status(500).json({ erro: 'Impressora não respondeu em IPP nem RAW. Verifique a rede.' }); }
            });
        });

        reqHttp.setTimeout(8000, () => reqHttp.destroy());
        reqHttp.write(ippBody);
        reqHttp.end();
    });
});

// ── Error handler centralizado (deve ser o último middleware) ─────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.url}`, err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
});

module.exports = { app, db, dbReady, estoqueTokens };

// ── Inicialização e graceful shutdown (apenas quando executado diretamente) ────
if (require.main === module) {
    const PORT   = process.env.PORT || 3000;
    const server = app.listen(PORT, () => console.log(`Servidor em http://localhost:${PORT}`));

    function encerrar(sinal) {
        console.log(`\n${sinal} recebido. Encerrando servidor...`);
        server.close(() => {
            db.close(() => process.exit(0));
        });
        setTimeout(() => process.exit(1), 10000).unref();
    }

    process.on('SIGTERM', () => encerrar('SIGTERM'));
    process.on('SIGINT',  () => encerrar('SIGINT'));

    process.on('unhandledRejection', (reason) => {
        console.error('unhandledRejection:', reason);
        process.exit(1);
    });

    process.on('uncaughtException', (err) => {
        console.error('uncaughtException:', err);
        process.exit(1);
    });
}
