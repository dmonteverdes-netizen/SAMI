import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import rucRouter from '../../server/routes/ruc';
import { generateToken } from '../../server/middleware/auth';

const token = generateToken({ id: 'u1', email: 'a@b.pe', name: 'A', role: 'MYPE_ADMIN', ruc: '20111111111', businessId: 'b1', mfaVerified: true });
const makeApp = () => {
  const app = express();
  app.use('/api/v1/ruc', rucRouter);
  return app;
};

describe('GET /api/v1/ruc/:ruc sin base de datos', () => {
  it('exige autenticación', async () => {
    await request(makeApp()).get('/api/v1/ruc/20100070970').expect(401);
  });
  it('valida el formato del RUC', async () => {
    await request(makeApp()).get('/api/v1/ruc/123').set('Authorization', `Bearer ${token}`).expect(400);
  });
  it('indica que el padrón no está cargado', async () => {
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const res = await request(makeApp()).get('/api/v1/ruc/20100070970').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body).toEqual({ found: false, padronLoaded: false });
    if (saved) process.env.DATABASE_URL = saved;
  });
});

const TEST_DB = process.env.TEST_DATABASE_URL;
(TEST_DB ? describe : describe.skip)('GET /api/v1/ruc/:ruc con padrón en PostgreSQL', () => {
  let prisma: any;
  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    prisma = (await import('../../core/services/db')).getPrismaClient();
    await prisma.rucPadron.upsert({
      where: { ruc: '20100070970' }, update: {},
      create: { ruc: '20100070970', businessName: 'SUPERMERCADOS PERUANOS S.A.', status: 'ACTIVO', condition: 'HABIDO', ubigeo: '150131', address: 'CAL. MORELLI NRO. 181' },
    });
    await prisma.padronImport.create({ data: { sourceFile: 'test.txt', rowCount: 1 } });
  });
  afterAll(async () => {
    await prisma.padronImport.deleteMany({ where: { sourceFile: 'test.txt' } });
    await prisma.$disconnect();
  });

  it('devuelve la ficha real con departamento y fecha de carga', async () => {
    const res = await request(makeApp()).get('/api/v1/ruc/20100070970').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.found).toBe(true);
    expect(res.body.data.department).toBe('Lima');
    expect(res.body.padronDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('responde 404 si el RUC no está en el padrón', async () => {
    const res = await request(makeApp()).get('/api/v1/ruc/20000000001').set('Authorization', `Bearer ${token}`).expect(404);
    expect(res.body).toMatchObject({ found: false, padronLoaded: true });
  });
});
