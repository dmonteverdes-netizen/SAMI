import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

/** Flujo completo de envío directo a SUNAT (Lycet simulado con fetch). Requiere TEST_DATABASE_URL. */
const TEST_DB = process.env.TEST_DATABASE_URL;
const RUC = '20333333333';

(TEST_DB ? describe : describe.skip)('Emisión SUNAT directo con PostgreSQL', () => {
  let app: express.Express;
  let prisma: Awaited<ReturnType<typeof import('../../core/services/db')['getPrismaClient']>>;
  let token: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    process.env.LYCET_API_URL = 'http://lycet.test';
    process.env.LYCET_API_TOKEN = 'tok';
    prisma = (await import('../../core/services/db')).getPrismaClient();
    const accountingRouter = (await import('../../server/routes/accounting')).default;
    const einvoiceRouter = (await import('../../server/routes/einvoice')).default;
    const { generateToken } = await import('../../server/middleware/auth');
    await prisma.invoice.deleteMany({ where: { smeId: RUC } });
    await prisma.sME.upsert({ where: { ruc: RUC }, update: {}, create: { ruc: RUC, businessName: 'BODEGA PRUEBA S.A.C.', email: `${RUC}@test.sami.pe` } });
    await prisma.rucPadron.upsert({ where: { ruc: RUC }, update: {}, create: { ruc: RUC, businessName: 'BODEGA PRUEBA S.A.C.', status: 'ACTIVO', condition: 'HABIDO', ubigeo: '150132', address: 'AV. LOS OLIVOS 100' } });
    app = express();
    app.use(express.json());
    app.use('/api/v1/accounting', accountingRouter);
    app.use('/api/v1/einvoice', einvoiceRouter);
    token = generateToken({ id: 'u-direct', email: 'd@test.sami.pe', name: 'D', role: 'MYPE_ADMIN', ruc: RUC, businessId: `b-${RUC}`, mfaVerified: true });
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    delete process.env.LYCET_API_URL;
    delete process.env.LYCET_API_TOKEN;
    await prisma.invoice.deleteMany({ where: { smeId: RUC } });
    await prisma.rucPadron.deleteMany({ where: { ruc: RUC } });
    await prisma.$disconnect();
  });

  it('firma con los datos del emisor, guarda XML y CDR y no los expone al navegador', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ xml: '<Invoice>firmado</Invoice>', hash: 'HASH=', sunatResponse: { success: true, cdrZip: 'UEsDBCDR', cdrResponse: { accepted: true, code: '0', description: 'La Boleta numero B001-5, ha sido aceptada' } } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const sale = await request(app).post('/api/v1/accounting/sales').set('Authorization', `Bearer ${token}`)
      .send({ type: 'sale', documentType: 'BOLETA_DE_VENTA', series: 'B001', correlative: 5, issueDate: '2026-10-16', totalAmount: 59 }).expect(201);

    const res = await request(app).post('/api/v1/einvoice/emit').set('Authorization', `Bearer ${token}`).send({ invoiceId: sale.body.sale.id }).expect(200);
    expect(res.body).toMatchObject({ provider: 'SUNAT_DIRECTO', isSimulated: false, acceptedBySunat: true, documentHash: 'HASH=' });
    expect(res.body.signedXml).toBeUndefined();

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.company).toMatchObject({ ruc: RUC, razonSocial: 'BODEGA PRUEBA S.A.C.', address: { ubigueo: '150132', departamento: 'LIMA', direccion: 'AV. LOS OLIVOS 100' } });

    const row = await prisma.invoice.findUnique({ where: { id: sale.body.sale.id } });
    expect(row).toMatchObject({ emissionProvider: 'SUNAT_DIRECTO', emissionSimulated: false, sunatAccepted: true, signedXml: '<Invoice>firmado</Invoice>', cdrZipBase64: 'UEsDBCDR' });

    const list = await request(app).get('/api/v1/accounting/sales').set('Authorization', `Bearer ${token}`).expect(200);
    const listed = list.body.sales.find((s: { id: string }) => s.id === sale.body.sale.id);
    expect(listed.emission).toMatchObject({ provider: 'SUNAT_DIRECTO', documentHash: 'HASH=' });
    expect(listed.emission.signedXml).toBeUndefined();
  });
});
