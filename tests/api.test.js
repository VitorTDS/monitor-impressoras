'use strict';

jest.mock('net-snmp', () => ({
    createSession: () => ({
        get: (_oids, cb) => cb(new Error('mocked')),
        close: () => {}
    })
}));

const request = require('supertest');
const { app, db, dbReady, estoqueTokens } = require('../server');

const IMP_VALIDA = { nome: 'Canon MF654', ip: '192.168.1.10', modelo: 'MF654Cdw', localizacao: 'Sala TI' };

function limparDB() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('DELETE FROM impressoras', err => { if (err) return reject(err); });
            db.run('DELETE FROM estoque', err => { if (err) return reject(err); });
            db.run('SELECT 1', resolve);
        });
    });
}

async function obterToken() {
    const res = await request(app)
        .post('/api/auth/estoque')
        .send({ senha: 'senha-de-teste' });
    return res.body.token;
}

async function criarImpressora(dados = IMP_VALIDA) {
    const res = await request(app).post('/api/impressoras').send(dados);
    const lista = await request(app).get('/api/estoque');
    // busca id via dashboard mock (offline), então consultamos direto
    return new Promise((resolve, reject) => {
        db.get('SELECT id FROM impressoras ORDER BY id DESC LIMIT 1', (err, row) => {
            if (err) return reject(err);
            resolve(row.id);
        });
    });
}

beforeAll(() => dbReady);
beforeEach(() => limparDB());
afterAll(() => new Promise(resolve => db.close(resolve)));

// ── POST /api/auth/estoque ────────────────────────────────────────────────────
describe('POST /api/auth/estoque', () => {
    it('deve retornar 401 quando senha incorreta', async () => {
        const res = await request(app)
            .post('/api/auth/estoque')
            .send({ senha: 'errada' });
        expect(res.status).toBe(401);
        expect(res.body.ok).toBe(false);
    });

    it('deve retornar 200 e token quando senha correta', async () => {
        const res = await request(app)
            .post('/api/auth/estoque')
            .send({ senha: 'senha-de-teste' });
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(typeof res.body.token).toBe('string');
        expect(res.body.token.length).toBeGreaterThan(0);
    });

    it('deve retornar 400 quando senha não enviada', async () => {
        const res = await request(app)
            .post('/api/auth/estoque')
            .send({});
        expect(res.status).toBe(400);
    });
});

// ── POST /api/impressoras ─────────────────────────────────────────────────────
describe('POST /api/impressoras', () => {
    it('deve retornar 201 quando dados válidos', async () => {
        const res = await request(app).post('/api/impressoras').send(IMP_VALIDA);
        expect(res.status).toBe(201);
        expect(res.body.sucesso).toBe(true);
    });

    it('deve retornar 400 quando nome ausente', async () => {
        const res = await request(app).post('/api/impressoras').send({ ...IMP_VALIDA, nome: '' });
        expect(res.status).toBe(400);
        expect(res.body.erro).toMatch(/nome/);
    });

    it('deve retornar 400 quando ip inválido', async () => {
        const res = await request(app).post('/api/impressoras').send({ ...IMP_VALIDA, ip: '999.0.0.1' });
        expect(res.status).toBe(400);
        expect(res.body.erro).toMatch(/ip/);
    });

    it('deve retornar 400 quando ip é texto livre', async () => {
        const res = await request(app).post('/api/impressoras').send({ ...IMP_VALIDA, ip: 'nao-e-um-ip' });
        expect(res.status).toBe(400);
    });

    it('deve retornar 400 quando modelo ausente', async () => {
        const res = await request(app).post('/api/impressoras').send({ ...IMP_VALIDA, modelo: '' });
        expect(res.status).toBe(400);
        expect(res.body.erro).toMatch(/modelo/);
    });
});

// ── PUT /api/impressoras/:id ──────────────────────────────────────────────────
describe('PUT /api/impressoras/:id', () => {
    it('deve retornar 404 quando id não existe', async () => {
        const res = await request(app).put('/api/impressoras/9999').send({ nome: 'X' });
        expect(res.status).toBe(404);
    });

    it('deve retornar 400 quando ip enviado é inválido', async () => {
        const id = await criarImpressora();
        const res = await request(app).put(`/api/impressoras/${id}`).send({ ip: '300.0.0.1' });
        expect(res.status).toBe(400);
    });

    it('deve retornar 200 e preservar campos não enviados', async () => {
        const id = await criarImpressora();
        const res = await request(app).put(`/api/impressoras/${id}`).send({ localizacao: 'Recepção' });
        expect(res.status).toBe(200);
        expect(res.body.sucesso).toBe(true);
    });
});

// ── DELETE /api/impressoras/:id ───────────────────────────────────────────────
describe('DELETE /api/impressoras/:id', () => {
    it('deve retornar 404 quando id não existe', async () => {
        const res = await request(app).delete('/api/impressoras/9999');
        expect(res.status).toBe(404);
    });

    it('deve retornar 204 quando impressora existe', async () => {
        const id = await criarImpressora();
        const res = await request(app).delete(`/api/impressoras/${id}`);
        expect(res.status).toBe(204);
    });
});

// ── POST /api/estoque ─────────────────────────────────────────────────────────
describe('POST /api/estoque', () => {
    it('deve retornar 401 sem token', async () => {
        const res = await request(app)
            .post('/api/estoque')
            .send({ modelo: 'X', insumo: 'Preto', quantidade: 5, estado: 'Novo' });
        expect(res.status).toBe(401);
    });

    it('deve retornar 401 com token expirado', async () => {
        const token = await obterToken();
        estoqueTokens.set(token, Date.now() - 1);
        const res = await request(app)
            .post('/api/estoque')
            .set('Authorization', `Bearer ${token}`)
            .send({ modelo: 'X', insumo: 'Preto', quantidade: 5, estado: 'Novo' });
        expect(res.status).toBe(401);
    });

    it('deve retornar 201 quando dados válidos e token correto', async () => {
        const token = await obterToken();
        const res = await request(app)
            .post('/api/estoque')
            .set('Authorization', `Bearer ${token}`)
            .send({ modelo: 'MF654', insumo: 'Preto', quantidade: 3, estado: 'Novo' });
        expect(res.status).toBe(201);
        expect(res.body.sucesso).toBe(true);
    });

    it('deve retornar 400 quando modelo ausente', async () => {
        const token = await obterToken();
        const res = await request(app)
            .post('/api/estoque')
            .set('Authorization', `Bearer ${token}`)
            .send({ insumo: 'Preto', quantidade: 3, estado: 'Novo' });
        expect(res.status).toBe(400);
        expect(res.body.erro).toMatch(/modelo/);
    });

    it('deve retornar 400 quando insumo ausente', async () => {
        const token = await obterToken();
        const res = await request(app)
            .post('/api/estoque')
            .set('Authorization', `Bearer ${token}`)
            .send({ modelo: 'MF654', quantidade: 3, estado: 'Novo' });
        expect(res.status).toBe(400);
        expect(res.body.erro).toMatch(/insumo/);
    });

    it('deve retornar 400 quando quantidade ausente', async () => {
        const token = await obterToken();
        const res = await request(app)
            .post('/api/estoque')
            .set('Authorization', `Bearer ${token}`)
            .send({ modelo: 'MF654', insumo: 'Preto', estado: 'Novo' });
        expect(res.status).toBe(400);
        expect(res.body.erro).toMatch(/quantidade/);
    });

    it('deve retornar 400 quando quantidade é negativa', async () => {
        const token = await obterToken();
        const res = await request(app)
            .post('/api/estoque')
            .set('Authorization', `Bearer ${token}`)
            .send({ modelo: 'MF654', insumo: 'Preto', quantidade: -1, estado: 'Novo' });
        expect(res.status).toBe(400);
    });

    it('deve retornar 400 quando quantidade é texto', async () => {
        const token = await obterToken();
        const res = await request(app)
            .post('/api/estoque')
            .set('Authorization', `Bearer ${token}`)
            .send({ modelo: 'MF654', insumo: 'Preto', quantidade: 'abc', estado: 'Novo' });
        expect(res.status).toBe(400);
    });
});

// ── DELETE /api/estoque/:id ───────────────────────────────────────────────────
describe('DELETE /api/estoque/:id', () => {
    it('deve retornar 401 sem token', async () => {
        const res = await request(app).delete('/api/estoque/1');
        expect(res.status).toBe(401);
    });

    it('deve retornar 404 quando item não existe', async () => {
        const token = await obterToken();
        const res = await request(app)
            .delete('/api/estoque/9999')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(404);
    });
});

// ── GET /api/dashboard ────────────────────────────────────────────────────────
describe('GET /api/dashboard', () => {
    it('deve retornar array vazio quando não há impressoras', async () => {
        const res = await request(app).get('/api/dashboard');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(0);
    });

    it('deve retornar impressoras com campo online', async () => {
        await criarImpressora();
        const res = await request(app).get('/api/dashboard');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0]).toHaveProperty('online');
        expect(res.body[0]).toHaveProperty('suprimentos');
    });
});

// ── GET /api/estoque ──────────────────────────────────────────────────────────
describe('GET /api/estoque', () => {
    it('deve retornar array (público, sem autenticação)', async () => {
        const res = await request(app).get('/api/estoque');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});
