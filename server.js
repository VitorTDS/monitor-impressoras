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

// ── Cache do dashboard ────────────────────────────────────────────────────────
let dashCache     = null;
let dashCacheAt   = 0;
let dashRefreshing = false;
const DASH_TTL    = 60_000;

function invalidarCacheDash() { dashCacheAt = 0; }

async function refreshDashCache(rows) {
    if (dashRefreshing) return;
    dashRefreshing = true;
    try {
        const resultados = await Promise.all(rows.map(async (imp) => {
            const snmpData = await obterDadosSNMP(imp.ip, imp.comunidade);
            return { ...imp, material: imp.material || 'Toner', tipo: imp.tipo || 'Colorido', ...snmpData };
        }));
        dashCache   = resultados;
        dashCacheAt = Date.now();
    } finally {
        dashRefreshing = false;
    }
}

// ── Credenciais de admin ──────────────────────────────────────────────────────
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
let   ADMIN_SENHA = process.env.ADMIN_SENHA;
if (!ADMIN_SENHA) {
    ADMIN_SENHA = crypto.randomBytes(8).toString('hex');
    console.warn('⚠️  ADMIN_SENHA não definida. Senha temporária gerada:', ADMIN_SENHA);
}

const adminTokens = new Map();

function gerarTokenAdmin() {
    const token = crypto.randomBytes(32).toString('hex');
    adminTokens.set(token, Date.now() + 8 * 60 * 60 * 1000);
    return token;
}

function verificarTokenAdmin(req, res, next) {
    const auth  = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const exp   = adminTokens.get(token);
    if (!exp || Date.now() > exp) return res.status(401).json({ erro: 'Não autorizado' });
    next();
}

setInterval(() => {
    const now = Date.now();
    for (const [token, exp] of adminTokens) {
        if (now > exp) adminTokens.delete(token);
    }
}, 60_000).unref();

// Tokens temporários para troca de senha obrigatória (TTL 15 min)
const tempTrocarSenhaTokens = new Map(); // token → { userId, exp }

function gerarTempToken(userId) {
    const token = crypto.randomBytes(24).toString('hex');
    tempTrocarSenhaTokens.set(token, { userId, exp: Date.now() + 15 * 60 * 1000 });
    return token;
}

setInterval(() => {
    const now = Date.now();
    for (const [token, { exp }] of tempTrocarSenhaTokens) {
        if (now > exp) tempTrocarSenhaTokens.delete(token);
    }
}, 60_000).unref();

// ── Hashing de senhas (scrypt) ────────────────────────────────────────────────
function hashSenha(senha) {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16).toString('hex');
        crypto.scrypt(senha, salt, 64, (err, hash) => {
            if (err) return reject(err);
            resolve(salt + ':' + hash.toString('hex'));
        });
    });
}

function verificarSenha(senha, armazenado) {
    return new Promise((resolve, reject) => {
        const [salt, key] = armazenado.split(':');
        crypto.scrypt(senha, salt, 64, (err, derived) => {
            if (err) return reject(err);
            resolve(derived.toString('hex') === key);
        });
    });
}

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
        db.run(`CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            usuario TEXT NOT NULL UNIQUE,
            senha_hash TEXT NOT NULL,
            trocar_senha INTEGER DEFAULT 0,
            ativo INTEGER DEFAULT 1,
            criado_em TEXT DEFAULT (datetime('now'))
        )`);
        db.run(`ALTER TABLE usuarios ADD COLUMN trocar_senha INTEGER DEFAULT 0`, () => {});
        db.run(`CREATE TABLE IF NOT EXISTS historico_paginas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            impressora_id INTEGER NOT NULL,
            paginas_total INTEGER,
            coletado_em TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (impressora_id) REFERENCES impressoras(id) ON DELETE CASCADE
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS historico_tinta (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            impressora_id INTEGER NOT NULL,
            cor TEXT NOT NULL,
            percentual INTEGER,
            coletado_em TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (impressora_id) REFERENCES impressoras(id) ON DELETE CASCADE
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS historico_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            impressora_id INTEGER NOT NULL,
            online INTEGER NOT NULL,
            registrado_em TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (impressora_id) REFERENCES impressoras(id) ON DELETE CASCADE
        )`);
        db.run('SELECT 1', resolve);
    });
});

// Seed: cria admin inicial se não existir nenhum usuário
dbReady.then(() => {
    db.get('SELECT COUNT(*) AS total FROM usuarios', [], async (err, row) => {
        if (err || row.total > 0) return;
        try {
            const hash = await hashSenha(ADMIN_SENHA);
            db.run(
                `INSERT INTO usuarios (nome, usuario, senha_hash) VALUES (?, ?, ?)`,
                ['Administrador', ADMIN_USER, hash],
                (e) => { if (!e) console.log(`✅ Usuário admin criado: ${ADMIN_USER}`); }
            );
        } catch (e) { console.error('Erro ao criar admin:', e); }
    });
});

// ── Middleware stack (ordem: helmet → cors → rate limit → body → static) ─────
// useDefaults:false evita que o Helmet readicione upgrade-insecure-requests
// (sistema interno HTTP — sem TLS)
const cspDirectives = helmet.contentSecurityPolicy.getDefaultDirectives();
delete cspDirectives['upgrade-insecure-requests'];

app.use(helmet({
    hsts: false,
    contentSecurityPolicy: {
        useDefaults: false,
        directives: {
            ...cspDirectives,
            'script-src':      ["'self'", "'unsafe-inline'"],
            'script-src-attr': ["'unsafe-inline'"],
        }
    }
}));

app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
    credentials: true
}));

const limiterGlobal = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
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

const limiterDescoberta = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false
});

app.use(limiterGlobal);
app.use(express.json({ limit: '100kb' }));
app.use(express.static('public'));

// ── SNMP ──────────────────────────────────────────────────────────────────────

// Fallback Brother: OID proprietário com formato TLV binário
// Chaves 0x81-0x84 = níveis percentuais dos suprimentos 1-4
function obterNiveisBrother(ip, comunidade) {
    return new Promise((resolve) => {
        const BROTHER_OID  = '1.3.6.1.4.1.2435.2.3.9.4.2.1.5.5.8.0';
        const DESC_OIDS = [
            '1.3.6.1.2.1.43.11.1.1.6.1.1',
            '1.3.6.1.2.1.43.11.1.1.6.1.2',
            '1.3.6.1.2.1.43.11.1.1.6.1.3',
            '1.3.6.1.2.1.43.11.1.1.6.1.4',
        ];
        const NOME_MAP = { black: 'Preto', yellow: 'Amarelo', cyan: 'Ciano', magenta: 'Magenta' };
        const session = snmp.createSession(ip, comunidade || 'public', { timeout: 2000, retries: 0 });
        session.get([BROTHER_OID, ...DESC_OIDS], (err, vbs) => {
            session.close();
            if (err || !vbs[0] || snmp.isVarbindError(vbs[0])) { resolve([]); return; }
            const buf = vbs[0].value;
            if (!Buffer.isBuffer(buf)) { resolve([]); return; }
            // Parsear TLV: key(1) + type(1) + len(1) + value(len bytes)
            const percMap = {};
            let pos = 0;
            while (pos + 2 < buf.length) {
                const key = buf[pos];
                if (key === 0xFF) break;
                const len = buf[pos + 2];
                if (pos + 3 + len > buf.length) break;
                if ((key & 0x80) && len === 4) {
                    const val = buf.readInt32BE(pos + 3);
                    if (val >= 0 && val <= 100) percMap[key & 0x7F] = val;
                }
                pos += 3 + len;
            }
            const suprimentos = [];
            for (let i = 1; i <= 4; i++) {
                if (!(i in percMap)) continue;
                const descVb  = vbs[i];
                if (!descVb || snmp.isVarbindError(descVb)) continue;
                const descRaw = (Buffer.isBuffer(descVb.value) ? descVb.value.toString() : String(descVb.value)).toLowerCase();
                const nome = Object.entries(NOME_MAP).find(([k]) => descRaw.includes(k))?.[1];
                if (nome) suprimentos.push({ nome, percentual: percMap[i] });
            }
            resolve(suprimentos);
        });
    });
}

function obterDadosSNMP(ip, comunidade) {
    return new Promise((resolve) => {
        const session = snmp.createSession(ip, comunidade || 'public', { timeout: 1500, retries: 0 });
        const oids = [
            '1.3.6.1.2.1.43.11.1.1.8.1.1', '1.3.6.1.2.1.43.11.1.1.9.1.1',
            '1.3.6.1.2.1.43.11.1.1.8.1.2', '1.3.6.1.2.1.43.11.1.1.9.1.2',
            '1.3.6.1.2.1.43.11.1.1.8.1.3', '1.3.6.1.2.1.43.11.1.1.9.1.3',
            '1.3.6.1.2.1.43.11.1.1.8.1.4', '1.3.6.1.2.1.43.11.1.1.9.1.4'
        ];
        session.get(oids, async (error, varbinds) => {
            session.close();
            if (error) { resolve({ online: false, suprimentos: [] }); return; }
            const cores = ['Preto', 'Ciano', 'Magenta', 'Amarelo'];
            const suprimentos = [];
            for (let i = 0; i < cores.length; i++) {
                const vbMax  = varbinds[i * 2];
                const vbAtual = varbinds[i * 2 + 1];
                if (!vbMax || !vbAtual) continue;
                if (snmp.isVarbindError(vbMax) || snmp.isVarbindError(vbAtual)) continue;
                const max   = vbMax.value;
                const atual = vbAtual.value;
                let perc;
                if (max > 0) {
                    perc = Math.round((atual / max) * 100);
                } else if (max === -2 && typeof atual === 'number' && atual >= 0) {
                    perc = atual > 100 ? Math.round((atual / 255) * 100) : atual;
                } else {
                    continue;
                }
                suprimentos.push({ nome: cores[i], percentual: Math.max(0, Math.min(100, perc)) });
            }
            // Nenhum suprimento legível — tentar OID proprietário Brother
            if (suprimentos.length === 0) {
                const sups = await obterNiveisBrother(ip, comunidade);
                resolve({ online: true, suprimentos: sups });
                return;
            }
            resolve({ online: true, suprimentos });
        });
    });
}

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
            const toStr = (vb) => {
                if (!vb || snmp.isVarbindError(vb)) return '';
                return Buffer.isBuffer(vb.value) ? vb.value.toString('utf8') : String(vb.value ?? '');
            };
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

// ── Rotas ─────────────────────────────────────────────────────────────────────

app.get('/api/dashboard', (req, res, next) => {
    db.all('SELECT id, nome, ip, modelo, localizacao, comunidade, tipo, material FROM impressoras', [], async (err, rows) => {
        if (err) { console.error(err); return next(err); }

        const cacheValido = dashCache && Date.now() - dashCacheAt < DASH_TTL;

        if (cacheValido) {
            res.json(dashCache);
            if (Date.now() - dashCacheAt > DASH_TTL / 2) refreshDashCache(rows);
            return;
        }

        if (dashCache) {
            res.json(dashCache);
            refreshDashCache(rows);
            return;
        }

        try {
            await refreshDashCache(rows);
            res.json(dashCache || []);
        } catch (e) {
            console.error(e);
            next(e);
        }
    });
});

app.get('/api/impressoras', (req, res, next) => {
    db.all('SELECT id, nome AS fabricante, ip, modelo, localizacao, comunidade, tipo, material FROM impressoras ORDER BY id ASC', [], (err, rows) => {
        if (err) return next(err);
        res.json(rows);
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

// ── Autenticação de admin ─────────────────────────────────────────────────────
app.post('/api/auth/login', limiterAuth, (req, res) => {
    const { usuario, senha } = req.body;
    if (!usuario || !senha) return res.status(400).json({ ok: false, erro: 'Preencha usuário e senha.' });

    db.get('SELECT * FROM usuarios WHERE usuario = ? AND ativo = 1', [usuario.trim()], async (err, user) => {
        if (err || !user) {
            return setTimeout(() => res.status(401).json({ ok: false, erro: 'Usuário ou senha incorretos.' }), 800);
        }
        try {
            const ok = await verificarSenha(senha, user.senha_hash);
            if (!ok) return setTimeout(() => res.status(401).json({ ok: false, erro: 'Usuário ou senha incorretos.' }), 800);
            if (user.trocar_senha) {
                return res.json({ ok: true, trocar_senha: true, temp_token: gerarTempToken(user.id), usuario: user.usuario, nome: user.nome });
            }
            res.json({ ok: true, token: gerarTokenAdmin(), usuario: user.usuario, nome: user.nome });
        } catch {
            res.status(500).json({ ok: false, erro: 'Erro interno.' });
        }
    });
});

app.post('/api/auth/trocar-senha', async (req, res) => {
    const { temp_token, nova_senha } = req.body;
    if (!temp_token || !nova_senha) return res.status(400).json({ ok: false, erro: 'Dados incompletos.' });
    if (nova_senha.length < 6) return res.status(400).json({ ok: false, erro: 'Senha deve ter ao menos 6 caracteres.' });

    const entry = tempTrocarSenhaTokens.get(temp_token);
    if (!entry || Date.now() > entry.exp) return res.status(401).json({ ok: false, erro: 'Sessão expirada. Faça login novamente.' });

    try {
        const hash = await hashSenha(nova_senha);
        db.run(
            `UPDATE usuarios SET senha_hash = ?, trocar_senha = 0 WHERE id = ?`,
            [hash, entry.userId],
            function(err) {
                if (err || this.changes === 0) return res.status(500).json({ ok: false, erro: 'Erro ao atualizar senha.' });
                tempTrocarSenhaTokens.delete(temp_token);
                db.get('SELECT usuario, nome FROM usuarios WHERE id = ?', [entry.userId], (e, user) => {
                    if (e || !user) return res.status(500).json({ ok: false, erro: 'Erro interno.' });
                    res.json({ ok: true, token: gerarTokenAdmin(), usuario: user.usuario, nome: user.nome });
                });
            }
        );
    } catch { res.status(500).json({ ok: false, erro: 'Erro interno.' }); }
});

app.get('/api/auth/verify', (req, res) => {
    const auth  = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const exp   = adminTokens.get(token);
    if (!exp || Date.now() > exp) return res.status(401).json({ ok: false });
    res.json({ ok: true });
});

// ── Gestão de usuários ────────────────────────────────────────────────────────
app.get('/api/usuarios', (req, res) => {
    db.all('SELECT id, nome, usuario, ativo, criado_em FROM usuarios ORDER BY criado_em', [], (err, rows) => {
        if (err) return res.status(500).json({ erro: 'Erro ao listar usuários.' });
        res.json(rows);
    });
});

app.post('/api/usuarios', async (req, res) => {
    const { nome, usuario, senha } = req.body;
    if (!nome || !usuario || !senha) return res.status(400).json({ erro: 'Nome, usuário e senha são obrigatórios.' });
    if (senha.length < 6) return res.status(400).json({ erro: 'Senha deve ter ao menos 6 caracteres.' });
    try {
        const hash = await hashSenha(senha);
        db.run(
            `INSERT INTO usuarios (nome, usuario, senha_hash, trocar_senha) VALUES (?, ?, ?, 1)`,
            [nome.trim(), usuario.trim().toLowerCase(), hash],
            function(err) {
                if (err) return res.status(409).json({ erro: 'Usuário já existe.' });
                res.status(201).json({ ok: true, id: this.lastID });
            }
        );
    } catch { res.status(500).json({ erro: 'Erro interno.' }); }
});

app.put('/api/usuarios/:id', async (req, res) => {
    const { nome, senha, ativo } = req.body;
    const fields = [];
    const vals   = [];
    if (nome  !== undefined) { fields.push('nome = ?');  vals.push(nome.trim()); }
    if (ativo !== undefined) { fields.push('ativo = ?'); vals.push(ativo ? 1 : 0); }
    if (senha) {
        if (senha.length < 6) return res.status(400).json({ erro: 'Senha deve ter ao menos 6 caracteres.' });
        try { fields.push('senha_hash = ?'); vals.push(await hashSenha(senha)); } catch { return res.status(500).json({ erro: 'Erro interno.' }); }
    }
    if (!fields.length) return res.status(400).json({ erro: 'Nenhum campo para atualizar.' });
    vals.push(req.params.id);
    db.run(`UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`, vals, function(err) {
        if (err) return res.status(500).json({ erro: 'Erro ao atualizar.' });
        if (this.changes === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });
        res.json({ ok: true });
    });
});

app.delete('/api/usuarios/:id', (req, res) => {
    db.get('SELECT COUNT(*) AS total FROM usuarios WHERE ativo = 1', [], (err, row) => {
        if (err) return res.status(500).json({ erro: 'Erro interno.' });
        if (row.total <= 1) return res.status(400).json({ erro: 'Não é possível remover o único usuário ativo.' });
        db.run('DELETE FROM usuarios WHERE id = ?', [req.params.id], function(err) {
            if (err) return res.status(500).json({ erro: 'Erro ao remover.' });
            if (this.changes === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });
            res.status(204).end();
        });
    });
});

// ── Autenticação de estoque ───────────────────────────────────────────────────
app.post('/api/auth/estoque', limiterAuth, (req, res) => {
    const { senha } = req.body;
    if (!senha) return res.status(400).json({ ok: false });
    if (senha === ESTOQUE_SENHA) return res.json({ ok: true, token: gerarTokenEstoque() });
    setTimeout(() => res.status(401).json({ ok: false }), 800);
});

// ── Gerador de PDF mínimo para impressão ─────────────────────────────────────
function gerarPDF(texto) {
    const esc = s => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const linhas = texto.split('\n');

    const ops = ['BT', '/F1 10 Tf', '50 800 Td', '14 TL',
        ...linhas.map(l => `(${esc(l)}) Tj T*`), 'ET'].join('\n');
    const streamLen = Buffer.byteLength(ops, 'latin1');

    const s1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
    const s2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
    const s3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';
    const s4 = `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${ops}\nendstream\nendobj\n`;
    const s5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n';
    const hdr = '%PDF-1.4\n';

    const blen = s => Buffer.byteLength(s, 'latin1');
    const off1 = blen(hdr);
    const off2 = off1 + blen(s1);
    const off3 = off2 + blen(s2);
    const off4 = off3 + blen(s3);
    const off5 = off4 + blen(s4);
    const xrefPos = off5 + blen(s5);
    const p = n => String(n).padStart(10, '0');

    const xref =
        'xref\n0 6\n' +
        `0000000000 65535 f \r\n` +
        `${p(off1)} 00000 n \r\n${p(off2)} 00000 n \r\n` +
        `${p(off3)} 00000 n \r\n${p(off4)} 00000 n \r\n${p(off5)} 00000 n \r\n`;
    const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;

    return Buffer.concat([hdr, s1, s2, s3, s4, s5, xref, trailer].map(s => Buffer.from(s, 'latin1')));
}

// ── Impressão via IPP + PDF (Canon MF / AirPrint) ────────────────────────────
app.post('/api/impressoras/:id/imprimir', (req, res, next) => {
    const { conteudo } = req.body;
    if (!conteudo) return res.status(400).json({ erro: 'Conteúdo não informado' });

    db.get('SELECT * FROM impressoras WHERE id = ?', [req.params.id], (err, imp) => {
        if (err || !imp) return res.status(404).json({ erro: 'Impressora não encontrada' });

        const docBuf = gerarPDF(conteudo);

        function ippAttr(tag, name, value) {
            const nb = Buffer.from(name, 'utf8'), vb = Buffer.from(value, 'utf8');
            const b  = Buffer.alloc(5 + nb.length + vb.length);
            b.writeUInt8(tag, 0); b.writeUInt16BE(nb.length, 1); nb.copy(b, 3);
            b.writeUInt16BE(vb.length, 3 + nb.length); vb.copy(b, 5 + nb.length);
            return b;
        }

        const printerUri = `ipp://${imp.ip}/ipp/print`;

        function enviarIPP(docFormat, docBuffer, onSuccess, onFail) {
            const a = Buffer.concat([
                Buffer.from([0x01]),
                ippAttr(0x47, 'attributes-charset',         'utf-8'),
                ippAttr(0x48, 'attributes-natural-language', 'pt-br'),
                ippAttr(0x45, 'printer-uri',                 printerUri),
                ippAttr(0x42, 'requesting-user-name',        'Sistema'),
                ippAttr(0x42, 'job-name',                    'Impressao'),
                ippAttr(0x44, 'document-format',             docFormat),
                Buffer.from([0x03])
            ]);
            const h = Buffer.alloc(8);
            h.writeUInt8(0x01,0); h.writeUInt8(0x01,1);
            h.writeUInt16BE(0x0002,2); h.writeInt32BE(1,4);
            const body = Buffer.concat([h, a, docBuffer]);

            const r = http.request({
                hostname: imp.ip, port: 631, path: '/ipp/print', method: 'POST',
                headers: { 'Content-Type': 'application/ipp', 'Content-Length': body.length }
            }, ippRes => {
                const chunks = [];
                ippRes.on('data', c => chunks.push(c));
                ippRes.on('end', () => {
                    const buf = Buffer.concat(chunks);
                    const sc  = buf.length >= 4 ? buf.readUInt16BE(2) : 0;
                    if (sc >= 0x0400) return onFail(sc);
                    onSuccess();
                });
            });
            r.on('error', () => onFail(null));
            r.setTimeout(10000, () => r.destroy());
            r.write(body); r.end();
        }

        function enviarRaw(onSuccess, onFail) {
            const socket = new net.Socket();
            const buf = Buffer.from(conteudo.split('\n').join('\r\n') + '\r\n\f', 'utf8');
            socket.setTimeout(5000);
            socket.connect(9100, imp.ip, () => {
                socket.write(buf, () => { socket.end(); onSuccess('RAW'); });
            });
            socket.on('timeout', () => { socket.destroy(); onFail('Timeout na porta 9100'); });
            socket.on('error',   () => onFail('Impressora não respondeu em IPP nem RAW'));
        }

        // Cascata: PDF → octet-stream → RAW
        const textBuf = Buffer.from(conteudo + '\n', 'utf8');
        enviarIPP('application/pdf', docBuf,
            () => res.json({ sucesso: true }),
            sc1 => enviarIPP('application/octet-stream', textBuf,
                () => res.json({ sucesso: true }),
                sc2 => enviarRaw(
                    via  => res.json({ sucesso: true, aviso: `Enviado via ${via}` }),
                    msg  => res.status(500).json({ erro: msg || `IPP ${sc1 ? sc1.toString(16) : sc2 ? sc2.toString(16) : '?'}` })
                )
            )
        );
    });
});

app.get('/api/descobrir', limiterDescoberta, async (req, res, next) => {
    const ip = String(req.query.ip || '').trim();
    if (!IPV4_RE.test(ip)) return res.status(400).json({ erro: 'IP inválido' });
    try {
        res.json(await descobrirImpressora(ip));
    } catch (e) {
        next(e);
    }
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

    dbReady.then(() => {
        coletarHistorico();
        setInterval(coletarHistorico, 60 * 60 * 1000).unref();
    });

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
