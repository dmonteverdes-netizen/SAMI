import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildLycetRequest, emitWithSunatDirect } from '../../server/services/sunatDirectClient';
import { resolveEmissionProvider } from '../../server/services/emissionProvider';
import { InvoiceType, DocumentType } from '../../core/types/types';

const emitter = { ruc: '20000000001', businessName: 'MYPE PRUEBA S.A.C.', address: 'AV. PRUEBA 123', ubigeo: '150101', department: 'Lima' };
const factura = {
  id: 's1', type: InvoiceType.SALE, documentType: DocumentType.FACTURA, series: 'f001', correlative: 7,
  issueDate: '2026-10-16', ruc: '20100070970', totalAmount: 236, description: 'Abarrotes',
};

const setLycet = () => {
  process.env.LYCET_API_URL = 'http://lycet.test/';
  process.env.LYCET_API_TOKEN = 'tok 123';
};

describe('sunatDirectClient (Lycet)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    for (const k of ['LYCET_API_URL', 'LYCET_API_TOKEN', 'LYCET_SUNAT_ENV', 'NUBEFACT_API_URL', 'NUBEFACT_API_TOKEN', 'EINVOICE_PROVIDER']) delete process.env[k];
  });

  it('arma una factura UBL con base, IGV y monto en letras', () => {
    const { path, body } = buildLycetRequest(factura, emitter, { name: "SUPERMERCADOS PERUANOS S.A." });
    const details = body.details as Array<Record<string, unknown>>;
    const legends = body.legends as Array<Record<string, unknown>>;
    expect(path).toBe('/api/v1/invoice/send');
    expect(body).toMatchObject({
      ublVersion: '2.1', tipoDoc: '01', serie: 'F001', correlativo: '7', tipoOperacion: '0101',
      fechaEmision: '2026-10-16T00:00:00-05:00', mtoOperGravadas: 200, mtoIGV: 36, mtoImpVenta: 236,
      formaPago: { moneda: 'PEN', tipo: 'Contado' },
      client: { tipoDoc: '6', numDoc: '20100070970' },
      company: { ruc: '20000000001', address: { ubigueo: '150101', departamento: 'LIMA' } },
    });
    expect(details[0]).toMatchObject({ mtoValorUnitario: 200, igv: 36, tipAfeIgv: '10', mtoPrecioUnitario: 236 });
    expect(legends[0]).toEqual({ code: '1000', value: 'SON: DOSCIENTOS TREINTA Y SEIS CON 00/100 SOLES' });
  });

  it('arma una nota de crédito con el comprobante que modifica', () => {
    const nc = { ...factura, documentType: DocumentType.NOTA_DE_CREDITO, series: 'FC01', referencedDocumentType: DocumentType.FACTURA, referencedSeries: 'F001', referencedCorrelative: 7 };
    const { path, body } = buildLycetRequest(nc, emitter, { name: 'X' });
    expect(path).toBe('/api/v1/note/send');
    expect(body).toMatchObject({ tipoDoc: '07', tipDocAfectado: '01', numDocfectado: 'F001-7', codMotivo: '01' });
  });

  it('exige identificar al cliente en boletas desde S/ 700', () => {
    const boleta = { ...factura, documentType: DocumentType.BOLETA, series: 'B001', ruc: undefined };
    expect(() => buildLycetRequest({ ...boleta, totalAmount: 750 }, emitter)).toThrow(/700/);
    expect(buildLycetRequest({ ...boleta, totalAmount: 50 }, emitter).body).toMatchObject({ tipoDoc: '03', client: { tipoDoc: '0' } });
  });

  it('sin emisor no envía', async () => {
    setLycet();
    const r = await emitWithSunatDirect(factura, null, { name: 'X' });
    expect(r).toMatchObject({ success: false, provider: 'SUNAT_DIRECTO' });
  });

  it('envía a Lycet con token y mapea el CDR aceptado', async () => {
    setLycet();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ xml: '<Invoice/>', hash: 'abc=', sunatResponse: { success: true, cdrZip: 'UEsDB', cdrResponse: { accepted: true, id: 'F001-7', code: '0', description: 'La Factura numero F001-7, ha sido aceptada', notes: [] } } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const r = await emitWithSunatDirect(factura, emitter, { name: 'SUPERMERCADOS PERUANOS S.A.' });
    expect(fetchMock.mock.calls[0][0]).toBe('http://lycet.test/api/v1/invoice/send?token=tok%20123');
    expect(r).toMatchObject({ success: true, isSimulated: false, acceptedBySunat: true, sunatCode: '0', signedXml: '<Invoice/>', cdrZipBase64: 'UEsDB', documentHash: 'abc=' });
    expect(r.environmentLabel).toMatch(/beta/);
  });

  it('informa cuando SUNAT no recibe el comprobante (p. ej. sin conexión)', async () => {
    setLycet();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ xml: '<Invoice/>', hash: 'h', sunatResponse: { success: false, error: { code: 'HTTP', message: 'Could not connect to host' } } }) }));
    const r = await emitWithSunatDirect(factura, emitter, { name: 'X' });
    expect(r.success).toBe(false);
    expect(r.errors?.[0]).toMatch(/Could not connect to host/);
  });

  it('propaga errores de validación de Lycet (HTTP 400)', async () => {
    setLycet();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => [{ field: 'company.ruc', message: 'RUC inválido' }] }));
    const r = await emitWithSunatDirect(factura, emitter, { name: 'X' });
    expect(r.errors).toEqual(['company.ruc: RUC inválido']);
  });

  it('elige proveedor: forzado, Nubefact, Lycet o simulado', () => {
    expect(resolveEmissionProvider()).toBe('SIMULADO');
    setLycet();
    expect(resolveEmissionProvider()).toBe('SUNAT_DIRECTO');
    process.env.NUBEFACT_API_URL = 'x'; process.env.NUBEFACT_API_TOKEN = 'y';
    expect(resolveEmissionProvider()).toBe('NUBEFACT');
    process.env.EINVOICE_PROVIDER = 'sunat_directo';
    expect(resolveEmissionProvider()).toBe('SUNAT_DIRECTO');
  });
});
