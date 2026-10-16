import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildNubefactPayload, emitWithNubefact, toNubefactDate } from '../../server/services/nubefactClient';
import { InvoiceType, DocumentType } from '../../core/types/types';

const factura = {
  id: 's1', type: InvoiceType.SALE, documentType: DocumentType.FACTURA, series: 'f001', correlative: 25,
  issueDate: '2026-10-15', ruc: '20100070970', totalAmount: 118, description: 'Abarrotes surtidos',
};

describe('nubefactClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NUBEFACT_API_URL;
    delete process.env.NUBEFACT_API_TOKEN;
  });

  it('formatea la fecha como DD-MM-YYYY', () => {
    expect(toNubefactDate('2026-10-05')).toBe('05-10-2026');
  });

  it('arma una factura con base imponible e IGV al 18%', () => {
    const p: any = buildNubefactPayload(factura, { name: 'SUPERMERCADOS PERUANOS S.A.' });
    expect(p.operacion).toBe('generar_comprobante');
    expect(p.tipo_de_comprobante).toBe(1);
    expect(p.serie).toBe('F001');
    expect(p.cliente_tipo_de_documento).toBe('6');
    expect(p.total_gravada).toBe(100);
    expect(p.total_igv).toBe(18);
    expect(p.total).toBe(118);
    expect(p.items[0]).toMatchObject({ valor_unitario: 100, precio_unitario: 118, igv: 18, tipo_de_igv: 1 });
  });

  it('boleta sin RUC usa cliente varios', () => {
    const p: any = buildNubefactPayload({ ...factura, documentType: DocumentType.BOLETA, series: 'B001', ruc: undefined });
    expect(p.tipo_de_comprobante).toBe(2);
    expect(p.cliente_tipo_de_documento).toBe('-');
    expect(p.cliente_denominacion).toBe('CLIENTES VARIOS');
  });

  it('exige razón social para facturas y comprobante de referencia para notas', () => {
    expect(() => buildNubefactPayload(factura)).toThrow(/razón social/);
    expect(() => buildNubefactPayload({ ...factura, documentType: DocumentType.NOTA_DE_CREDITO }, { name: 'X' })).toThrow(/modifica/);
  });

  it('sin credenciales no envía nada y lo informa', async () => {
    const r = await emitWithNubefact(factura, { name: 'X' });
    expect(r.success).toBe(false);
    expect(r.acceptedBySunat).toBeUndefined();
    expect(r.errors?.[0]).toMatch(/NUBEFACT_API_URL/);
  });

  it('con credenciales envía el token y mapea la respuesta', async () => {
    process.env.NUBEFACT_API_URL = 'https://api.nubefact.test/api/v1/abc';
    process.env.NUBEFACT_API_TOKEN = 'tok123';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ aceptada_por_sunat: true, sunat_description: 'La Factura numero F001-25, ha sido aceptada', sunat_responsecode: '0', enlace_del_pdf: 'https://x/pdf', enlace_del_xml: 'https://x/xml', enlace_del_cdr: 'https://x/cdr' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const r = await emitWithNubefact(factura, { name: 'SUPERMERCADOS PERUANOS S.A.' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.nubefact.test/api/v1/abc');
    expect(init.headers.Authorization).toBe('Token token="tok123"');
    expect(r).toMatchObject({ success: true, isSimulated: false, provider: 'NUBEFACT', acceptedBySunat: true, sunatCode: '0', pdfUrl: 'https://x/pdf' });
  });

  it('propaga los errores de Nubefact', async () => {
    process.env.NUBEFACT_API_URL = 'https://api.nubefact.test/api/v1/abc';
    process.env.NUBEFACT_API_TOKEN = 'tok123';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ errors: 'El documento ya existe', codigo: 23 }) }));
    const r = await emitWithNubefact(factura, { name: 'X' });
    expect(r).toMatchObject({ success: false, isSimulated: false, sunatCode: '23', errors: ['El documento ya existe'] });
  });
});
