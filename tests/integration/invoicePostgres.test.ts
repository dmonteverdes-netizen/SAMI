import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';

/**
 * Prueba de persistencia real en PostgreSQL. Solo corre si TEST_DATABASE_URL apunta a una base
 * con las migraciones aplicadas (npx prisma migrate deploy). Sin ella se omite.
 */
const TEST_DB = process.env.TEST_DATABASE_URL;
const describeDb = TEST_DB ? describe : describe.skip;

describeDb('Integración PostgreSQL: ventas y compras en la tabla invoices', () => {
  let app: express.Express;
  let prisma: any;
  let token: (ruc: string) => string;
  const RUC_A = '20111111111';
  const RUC_B = '20222222222';

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    const { getPrismaClient } = await import('../../core/services/db');
    const accountingRouter = (await import('../../server/routes/accounting')).default;
    const expensesRouter = (await import('../../server/routes/expenses')).default;
    const { generateToken } = await import('../../server/middleware/auth');
    prisma = getPrismaClient();
    await prisma.invoice.deleteMany({ where: { smeId: { in: [RUC_A, RUC_B] } } });
    for (const ruc of [RUC_A, RUC_B]) {
      await prisma.sME.upsert({ where: { ruc }, update: {}, create: { ruc, businessName: `MYPE ${ruc}`, email: `${ruc}@test.sami.pe` } });
    }
    app = express();
    app.use(express.json());
    app.use('/api/v1/accounting', accountingRouter);
    app.use('/api/v1/expenses', expensesRouter);
    token = (ruc: string) => generateToken({ id: `u-${ruc}`, email: `${ruc}@test.sami.pe`, name: 'Dueño', role: 'MYPE_ADMIN', ruc, businessId: `b-${ruc}`, mfaVerified: true });
  });

  afterAll(async () => {
    await prisma?.invoice.deleteMany({ where: { smeId: { in: [RUC_A, RUC_B] } } });
    await prisma?.$disconnect();
  });

  const sale = { type: 'sale', documentType: 'BOLETA', series: 'B001', correlative: 7, issueDate: '2026-10-01', totalAmount: 118.5, category: 'Abarrotes' };

  it('registra una venta en PostgreSQL y la devuelve normalizada', async () => {
    const res = await request(app).post('/api/v1/accounting/sales').set('Authorization', `Bearer ${token(RUC_A)}`).send(sale).expect(201);
    expect(res.body.sale.documentType).toBe('BOLETA_DE_VENTA');
    expect(res.body.sale.totalAmount).toBe(118.5);
    const row = await prisma.invoice.findUnique({ where: { id: res.body.sale.id } });
    expect(row.smeId).toBe(RUC_A);
    expect(row.type).toBe('SALE');
  });

  it('rechaza la misma venta con 409', async () => {
    await request(app).post('/api/v1/accounting/sales').set('Authorization', `Bearer ${token(RUC_A)}`).send(sale).expect(409);
  });

  it('aísla negocios: B no ve ni modifica las ventas de A', async () => {
    const listA = await request(app).get('/api/v1/accounting/sales').set('Authorization', `Bearer ${token(RUC_A)}`).expect(200);
    const id = listA.body.sales[0].id;
    const listB = await request(app).get('/api/v1/accounting/sales').set('Authorization', `Bearer ${token(RUC_B)}`).expect(200);
    expect(listB.body.sales).toHaveLength(0);
    await request(app).put(`/api/v1/accounting/sales/${id}`).set('Authorization', `Bearer ${token(RUC_B)}`).send({ totalAmount: 1 }).expect(404);
    await request(app).delete(`/api/v1/accounting/sales/${id}`).set('Authorization', `Bearer ${token(RUC_B)}`).expect(404);
  });

  it('permite la misma serie-correlativo de compra si el proveedor es distinto', async () => {
    const p = { type: 'purchase', documentType: 'FACTURA', series: 'F001', correlative: 1, issueDate: '2026-10-02', totalAmount: 590 };
    await request(app).post('/api/v1/expenses/purchases').set('Authorization', `Bearer ${token(RUC_A)}`).send({ ...p, ruc: '20100070970' }).expect(201);
    await request(app).post('/api/v1/expenses/purchases').set('Authorization', `Bearer ${token(RUC_A)}`).send({ ...p, ruc: '20100047218' }).expect(201);
    await request(app).post('/api/v1/expenses/purchases').set('Authorization', `Bearer ${token(RUC_A)}`).send({ ...p, ruc: '20100070970' }).expect(409);
  });

  it('actualiza y elimina la venta propia', async () => {
    const listA = await request(app).get('/api/v1/accounting/sales').set('Authorization', `Bearer ${token(RUC_A)}`);
    const id = listA.body.sales[0].id;
    const upd = await request(app).put(`/api/v1/accounting/sales/${id}`).set('Authorization', `Bearer ${token(RUC_A)}`).send({ totalAmount: 200 }).expect(200);
    expect(upd.body.sale.totalAmount).toBe(200);
    await request(app).delete(`/api/v1/accounting/sales/${id}`).set('Authorization', `Bearer ${token(RUC_A)}`).expect(200);
  });
});
