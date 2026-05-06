// tests/descobrir.test.js
'use strict';

let mockSnmpCallback = (_oids, cb) => cb(new Error('timeout'));

jest.mock('net-snmp', () => ({
    createSession: () => ({
        get: (oids, cb) => mockSnmpCallback(oids, cb),
        close: () => {}
    }),
    isVarbindError: () => false
}));

const request  = require('supertest');
const { app, db, dbReady } = require('../server');

beforeAll(() => dbReady);
afterAll(() => new Promise(resolve => db.close(resolve)));
afterEach(() => { mockSnmpCallback = (_oids, cb) => cb(new Error('timeout')); });

describe('GET /api/descobrir', () => {
    it('deve retornar 400 quando ip ausente', async () => {
        const res = await request(app).get('/api/descobrir');
        expect(res.status).toBe(400);
        expect(res.body.erro).toMatch(/IP/i);
    });

    it('deve retornar 400 quando ip inválido', async () => {
        const res = await request(app).get('/api/descobrir?ip=999.0.0.1');
        expect(res.status).toBe(400);
        expect(res.body.erro).toMatch(/IP/i);
    });

    it('deve retornar online:false e campos vazios quando SNMP não responde', async () => {
        mockSnmpCallback = (_oids, cb) => cb(new Error('timeout'));
        const res = await request(app).get('/api/descobrir?ip=192.168.1.50');
        expect(res.status).toBe(200);
        expect(res.body.online).toBe(false);
        expect(res.body.fabricante).toBe('');
        expect(res.body.modelo).toBe('');
    });

    it('deve detectar fabricante Canon e tipo Colorido', async () => {
        mockSnmpCallback = (_oids, cb) => cb(null, [
            { value: Buffer.from('Canon imageCLASS MF654Cdw') }, // sysDescr
            { value: Buffer.from('Canon imageCLASS MF654Cdw') }, // hrDeviceDescr
            { value: 100 }, { value: 80 },  // C max, cur
            { value: 100 }, { value: 60 },  // M max, cur
            { value: 100 }, { value: 40 },  // Y max, cur
        ]);
        const res = await request(app).get('/api/descobrir?ip=192.168.1.50');
        expect(res.status).toBe(200);
        expect(res.body.online).toBe(true);
        expect(res.body.fabricante).toBe('Canon');
        expect(res.body.tipo).toBe('Colorido');
        expect(res.body.modelo).toBe('Canon imageCLASS MF654Cdw');
    });

    it('deve detectar tipo Mono quando suprimentos CMY retornam 0', async () => {
        mockSnmpCallback = (_oids, cb) => cb(null, [
            { value: Buffer.from('HP LaserJet Pro MFP 4103fdw') },
            { value: Buffer.from('HP LaserJet Pro MFP 4103fdw') },
            { value: 0 }, { value: 0 },
            { value: 0 }, { value: 0 },
            { value: 0 }, { value: 0 },
        ]);
        const res = await request(app).get('/api/descobrir?ip=192.168.1.50');
        expect(res.status).toBe(200);
        expect(res.body.tipo).toBe('Mono');
        expect(res.body.fabricante).toBe('HP');
    });

    it('deve detectar material Toner quando texto contém "laser"', async () => {
        mockSnmpCallback = (_oids, cb) => cb(null, [
            { value: Buffer.from('HP LaserJet Pro MFP 4103fdw') },
            { value: Buffer.from('HP LaserJet Pro MFP 4103fdw') },
            { value: 0 }, { value: 0 },
            { value: 0 }, { value: 0 },
            { value: 0 }, { value: 0 },
        ]);
        const res = await request(app).get('/api/descobrir?ip=192.168.1.50');
        expect(res.status).toBe(200);
        expect(res.body.material).toBe('Toner');
    });

    it('deve detectar material Tinta quando texto não contém laser/toner', async () => {
        mockSnmpCallback = (_oids, cb) => cb(null, [
            { value: Buffer.from('Epson EcoTank L3150') },
            { value: Buffer.from('Epson EcoTank L3150') },
            { value: 100 }, { value: 90 },
            { value: 100 }, { value: 80 },
            { value: 100 }, { value: 70 },
        ]);
        const res = await request(app).get('/api/descobrir?ip=192.168.1.50');
        expect(res.status).toBe(200);
        expect(res.body.material).toBe('Tinta');
        expect(res.body.fabricante).toBe('Epson');
    });
});
