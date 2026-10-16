import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import accountingRouter from '../../server/routes/accounting';
import einvoiceRouter from '../../server/routes/einvoice';
import { generateToken } from '../../server/middleware/auth';
import { resetBusinessStores } from '../../server/services/businessStore';

const app = express();
app.use(express.json());
app.use('/api/v1/accounting', accountingRouter);
app.use('/api/v1/einvoice', einvoiceRouter);

// Sin RUC en el token se usa el almacén JSON (no requiere base de datos).
const token = (businessId: string) => generateToken({ id: `u-${businessId}`, email: 'a@b.pe', name: 'A', role: 'MYPE_ADMIN', businessId, mfaVerified: true });

describe('POST /api/v1/einvoice/emit', () => {
  beforeEach(() => resetBusinessStores());
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NUBEFACT_API_URL;
    delete process.env.NUBEFACT_API_TOKEN;
  });

  const createSale = async (businessId: string) => {
    const res = await request(app).post('/api/v1/accounting/sales').set('Authorization', `Bearer ${token(businessId)}`)
      .send({ type: 'sale', documentType: 'BOLETA_DE_VENTA', series: 'B001', correlative: 9, issueDate: '2026-10-15', totalAmount: 59 }).expect(201);
    return res.body.sale.id as string;
  };

  it('sin credenciales emite en Modo Demostración y lo guarda en la venta', async () => {
    const id = await createSale('biz_e1');
    const res = await request(app).post('/api/v1/einvoice/emit').set('Authorization', `Bearer ${token('biz_e1')}`).send({ invoiceId: id }).expect(200);
    expect(res.body.isSimulated).toBe(true);
    expect(res.body.acceptedBySunat).toBeUndefined();
    const list = await request(app).get('/api/v1/accounting/sales').set('Authorization', `Bearer ${token('biz_e1')}`);
    expect(list.body.sales.find((s: any) => s.id === id).emission).toMatchObject({ provider: 'SIMULADO', isSimulated: true });
  });

  it('otro negocio no puede emitir una venta ajena', async () => {
    const id = await createSale('biz_e2');
    await request(app).post('/api/v1/einvoice/emit').set('Authorization', `Bearer ${token('biz_otro')}`).send({ invoiceId: id }).expect(404);
  });

  it('con Nubefact configurado registra la respuesta real', async () => {
    process.env.NUBEFACT_API_URL = 'https://api.nubefact.test/api/v1/abc';
    process.env.NUBEFACT_API_TOKEN = 'tok';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ aceptada_por_sunat: true, sunat_description: 'Aceptada', enlace_del_pdf: 'https://x/pdf' }) }));
    const id = await createSale('biz_e3');
    const res = await request(app).post('/api/v1/einvoice/emit').set('Authorization', `Bearer ${token('biz_e3')}`).send({ invoiceId: id }).expect(200);
    expect(res.body).toMatchObject({ isSimulated: false, provider: 'NUBEFACT', acceptedBySunat: true });
    await request(app).post('/api/v1/einvoice/emit').set('Authorization', `Bearer ${token('biz_e3')}`).send({ invoiceId: id }).expect(409);
  });

  it('valida el payload', async () => {
    await request(app).post('/api/v1/einvoice/emit').set('Authorization', `Bearer ${token('biz_e4')}`).send({}).expect(400);
  });
});
