const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const snmp    = require('net-snmp');
const net     = require('net');
const path    = require('path');
const app     = express();

app.use(express.json());
app.use(express.static('public'));

const db = new sqlite3.Database('./banco.db');

// Inicialização do Banco
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS impressoras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT, ip TEXT, modelo TEXT, localizacao TEXT, comunidade TEXT, tipo TEXT, material TEXT
    )`);
    // Migração segura: adiciona colunas se ainda não existirem (erro ignorado caso já existam)
    db.run(`ALTER TABLE impressoras ADD COLUMN material TEXT`, () => {});
    db.run(`ALTER TABLE impressoras ADD COLUMN tipo TEXT`, () => {});
    // Impressoras antigas sem material definido assumem 'Toner' como padrão
    db.run(`UPDATE impressoras SET material = 'Toner' WHERE material IS NULL`);
    db.run(`UPDATE impressoras SET tipo = 'Colorido' WHERE tipo IS NULL`);
    db.run(`CREATE TABLE IF NOT EXISTS estoque (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        modelo TEXT, insumo TEXT, quantidade INTEGER, estado TEXT,
        UNIQUE(modelo, insumo, estado)
    )`);
    // Consolida registros duplicados de estoque (mesmo modelo+insumo, estados diferentes)
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
});

// --- FUNÇÃO SNMP ---
function obterDadosSNMP(ip, comunidade) {
    return new Promise((resolve) => {
        const session = snmp.createSession(ip, comunidade || "public", { timeout: 2000, retries: 1 });
        const oids = [
            "1.3.6.1.2.1.43.11.1.1.8.1.1", "1.3.6.1.2.1.43.11.1.1.9.1.1",
            "1.3.6.1.2.1.43.11.1.1.8.1.2", "1.3.6.1.2.1.43.11.1.1.9.1.2",
            "1.3.6.1.2.1.43.11.1.1.8.1.3", "1.3.6.1.2.1.43.11.1.1.9.1.3",
            "1.3.6.1.2.1.43.11.1.1.8.1.4", "1.3.6.1.2.1.43.11.1.1.9.1.4"
        ];
        session.get(oids, (error, varbinds) => {
            if (error) resolve({ online: false, suprimentos: [] });
            else {
                const cores = ["Preto", "Ciano", "Magenta", "Amarelo"];
                const suprimentos = [];
                for (let i = 0; i < cores.length; i++) {
                    const max = varbinds[i * 2]?.value;
                    const atual = varbinds[i * 2 + 1]?.value;
                    if (max > 0) {
                        let perc = Math.round((atual / max) * 100);
                        suprimentos.push({ nome: cores[i], percentual: perc < 0 ? 0 : (perc > 100 ? 100 : perc) });
                    }
                }
                resolve({ online: true, suprimentos });
            }
            session.close();
        });
    });
}

// --- ROTAS ---

app.get('/api/dashboard', (req, res) => {
    db.all("SELECT * FROM impressoras", [], async (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
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
        res.json(resultados);
    });
});

app.post('/api/impressoras', (req, res) => {
    const { nome, ip, modelo, localizacao, comunidade, tipo, material } = req.body;
    db.run(`INSERT INTO impressoras (nome, ip, modelo, localizacao, comunidade, tipo, material) VALUES (?,?,?,?,?,?,?)`,
        [nome, ip, modelo, localizacao, comunidade || 'public', tipo || 'Colorido', material || 'Toner'], (err) => {
            if (err) res.status(500).json({ erro: err.message });
            else res.json({ sucesso: true });
        });
});

app.put('/api/impressoras/:id', (req, res) => {
    const { nome, modelo, ip, localizacao, comunidade, tipo, material } = req.body;
    db.get("SELECT * FROM impressoras WHERE id = ?", [req.params.id], (err, existing) => {
        if (err) return res.status(500).json({ erro: err.message });
        if (!existing) return res.status(404).json({ erro: 'Impressora não encontrada' });
        db.run(
            `UPDATE impressoras SET nome = ?, modelo = ?, ip = ?, localizacao = ?, comunidade = ?, tipo = ?, material = ? WHERE id = ?`,
            [
                nome        ?? existing.nome,
                modelo      ?? existing.modelo,
                ip          ?? existing.ip,
                localizacao ?? existing.localizacao,
                comunidade  ?? existing.comunidade,
                tipo        ?? existing.tipo,
                material    ?? existing.material,
                req.params.id
            ],
            function (err) {
                if (err) return res.status(500).json({ erro: err.message });
                res.json({ sucesso: true });
            }
        );
    });
});

app.delete('/api/impressoras/:id', (req, res) => {
    db.run("DELETE FROM impressoras WHERE id = ?", req.params.id, (err) => {
        res.json({ sucesso: !err });
    });
});

// ROTAS DE ESTOQUE
app.get('/api/estoque', (req, res) => {
    db.all("SELECT * FROM estoque ORDER BY modelo ASC, estado ASC", [], (err, rows) => {
        res.json(rows);
    });
});

app.post('/api/estoque', (req, res) => {
    const { modelo, insumo, quantidade, estado } = req.body;
    db.run(`INSERT INTO estoque (modelo, insumo, quantidade, estado) VALUES (?,?,?,?) 
            ON CONFLICT(modelo, insumo, estado) DO UPDATE SET quantidade = excluded.quantidade`,
        [modelo, insumo, quantidade, estado], (err) => {
            if (err) res.status(500).json({ erro: err.message });
            else res.json({ sucesso: true });
        });
});

app.delete('/api/estoque/:id', (req, res) => {
    db.run("DELETE FROM estoque WHERE id = ?", req.params.id, (err) => {
        res.json({ sucesso: !err });
    });
});

// ── AUTENTICAÇÃO para edição de estoque ───────────────────────────────────────
// Defina a variável de ambiente ESTOQUE_SENHA no servidor (ex: no .env ou ao iniciar: ESTOQUE_SENHA=suasenha node server.js)
// Nunca deixe a senha hardcoded aqui em produção!
const ESTOQUE_SENHA = process.env.ESTOQUE_SENHA || 'admin123';

app.post('/api/auth/estoque', (req, res) => {
    const { senha } = req.body;
    if (!senha) return res.status(400).json({ ok: false });
    if (senha === ESTOQUE_SENHA) return res.json({ ok: true });
    // Delay proposital para dificultar brute-force
    setTimeout(() => res.status(401).json({ ok: false }), 800);
});

// ── IMPRIMIR via IPP (porta 631) ─────────────────────────────────────────────
app.post('/api/impressoras/:id/imprimir', (req, res) => {
    const { conteudo } = req.body;
    if (!conteudo) return res.status(400).json({ erro: 'Conteúdo não informado' });

    db.get("SELECT * FROM impressoras WHERE id = ?", [req.params.id], (err, imp) => {
        if (err || !imp) return res.status(404).json({ erro: 'Impressora não encontrada' });

        // Monta documento PDF simples em PostScript para envio via IPP
        // A Canon MF654Cdw aceita PostScript via IPP
        const ps =
            '%!PS-Adobe-3.0\n' +
            '%%Pages: 1\n' +
            '%%EndComments\n' +
            '%%Page: 1 1\n' +
            '/Courier findfont 12 scalefont setfont\n' +
            '72 750 moveto\n' +
            // Quebra o conteúdo em linhas e imprime cada uma
            conteudo.split('\n').map((linha, i) => {
                const safe = linha.replace(/[()\\]/g, c => '\\' + c);
                return `72 ${750 - (i * 16)} moveto (${safe}) show`;
            }).join('\n') +
            '\nshowpage\n' +
            '%%EOF\n';

        const psBuffer = Buffer.from(ps, 'utf8');

        // Monta requisição IPP Print-Job
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
            Buffer.from([0x01]), // operation-attributes-tag
            ippAttr(0x47, 'attributes-charset', 'utf-8'),
            ippAttr(0x48, 'attributes-natural-language', 'pt-br'),
            ippAttr(0x45, 'printer-uri', printerUri),
            ippAttr(0x42, 'requesting-user-name', 'imageCLASS'),
            ippAttr(0x42, 'job-name', 'Impressao-Sistema'),
            ippAttr(0x44, 'document-format', 'application/postscript'),
            Buffer.from([0x03]) // end-of-attributes-tag
        ]);

        // Header IPP: version=1.1, operation=Print-Job(0x0002), request-id=1
        const header = Buffer.alloc(8);
        header.writeUInt8(0x01, 0);  // major version
        header.writeUInt8(0x01, 1);  // minor version
        header.writeUInt16BE(0x0002, 2); // Print-Job
        header.writeInt32BE(1, 4);   // request-id

        const ippBody = Buffer.concat([header, attrs, psBuffer]);

        const options = {
            hostname: imp.ip,
            port: 631,
            path: '/ipp/print',
            method: 'POST',
            headers: {
                'Content-Type': 'application/ipp',
                'Content-Length': ippBody.length
            }
        };

        const http = require('http');
        const reqHttp = http.request(options, (ippRes) => {
            let data = [];
            ippRes.on('data', chunk => data.push(chunk));
            ippRes.on('end', () => {
                const buf = Buffer.concat(data);
                // Verifica status IPP — bytes 2-3 são o status code (0x0000 = sucesso)
                if (buf.length >= 4) {
                    const statusCode = buf.readUInt16BE(2);
                    if (statusCode >= 0x0400) {
                        return res.status(500).json({ erro: `Impressora recusou: código IPP ${statusCode.toString(16)}` });
                    }
                }
                res.json({ sucesso: true });
            });
        });

        reqHttp.on('error', (e) => {
            // Se IPP falhar, tenta RAW 9100 como fallback
            const socket = new net.Socket();
            let respondeu = false;
            socket.setTimeout(5000);
            socket.connect(9100, imp.ip, () => {
                socket.write(conteudo + '\r\n\f', 'utf8', () => {
                    socket.end();
                    if (!respondeu) { respondeu = true; res.json({ sucesso: true, aviso: 'Enviado via RAW' }); }
                });
            });
            socket.on('timeout', () => { socket.destroy(); if (!respondeu) { respondeu = true; res.status(504).json({ erro: 'Timeout' }); } });
            socket.on('error', () => { if (!respondeu) { respondeu = true; res.status(500).json({ erro: 'Impressora não respondeu em IPP nem RAW. Verifique a rede.' }); } });
        });

        reqHttp.setTimeout(8000, () => { reqHttp.destroy(); });
        reqHttp.write(ippBody);
        reqHttp.end();
    });
});

app.listen(3000, () => console.log("🚀 Servidor em http://localhost:3000"));