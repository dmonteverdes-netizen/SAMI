import { describe, it, expect, vi, beforeEach } from 'vitest';

const getMock = vi.fn();
const postMock = vi.fn();
vi.mock('../../core/services/api', () => ({ api: { get: (...a: any[]) => getMock(...a), post: (...a: any[]) => postMock(...a) } }));

import { fetchRucDetails, validateRucWithSunat, submitInvoiceToPse, SIMULATED_LABEL } from '../../core/services/pseService';
import { calculateRiskMetrics } from '../../modules/gestion/ruc-lookup/riskCalculation';

describe('pseService — rotulado honesto de datos (AGENTS.md §3)', () => {
  beforeEach(() => { getMock.mockReset(); postMock.mockReset(); });

  it('sin padrón SUNAT cargado devuelve ficha demo rotulada y determinista', async () => {
    getMock.mockResolvedValue({ data: { found: false, padronLoaded: false } });
    const a = await fetchRucDetails('20999999999');
    const b = await fetchRucDetails('20999999999');
    expect(a?.isSimulated).toBe(true);
    expect(a?.dataSource).toBe('SIMULADO');
    expect(a?.dataSourceLabel).toBe(SIMULATED_LABEL);
    expect(a?.businessName).toContain('(DEMO)');
    expect(a).toEqual(b);
  });

  it('si el backend no responde también cae a demo rotulado', async () => {
    getMock.mockRejectedValue(new Error('network'));
    const r = await fetchRucDetails('20123456789');
    expect(r?.isSimulated).toBe(true);
  });

  it('con padrón cargado devuelve datos reales sin rótulo de simulación', async () => {
    getMock.mockResolvedValue({ data: { found: true, padronLoaded: true, padronDate: '2026-10-15', data: {
      ruc: '20100070970', businessName: 'SUPERMERCADOS PERUANOS SOCIEDAD ANONIMA', status: 'ACTIVO', condition: 'HABIDO',
      ubigeo: '150131', department: 'Lima', address: 'CAL. MORELLI 181' } } });
    const r = await fetchRucDetails('20100070970');
    expect(r?.isSimulated).toBe(false);
    expect(r?.dataSource).toBe('PADRON_SUNAT');
    expect(r?.active).toBe(true);
    expect(r?.dataSourceLabel).toContain('2026-10-15');
  });

  it('con padrón cargado y RUC inexistente devuelve null', async () => {
    getMock.mockResolvedValue({ data: { found: false, padronLoaded: true } });
    expect(await fetchRucDetails('20000000001')).toBeNull();
    const v = await validateRucWithSunat('20000000001');
    expect(v.active).toBe(false);
    expect(v.isSimulated).toBe(false);
  });

  it('validateRucWithSunat marca la validación como simulada sin padrón', async () => {
    getMock.mockResolvedValue({ data: { found: false, padronLoaded: false } });
    const v = await validateRucWithSunat('20123456789');
    expect(v.isSimulated).toBe(true);
    expect(v.sourceLabel).toBe(SIMULATED_LABEL);
  });

  it('submitInvoiceToPse no inventa aceptación de SUNAT si el backend falla', async () => {
    postMock.mockRejectedValue(new Error('offline'));
    const r = await submitInvoiceToPse({ id: 'x' } as any);
    expect(r.success).toBe(false);
    expect(r.isSimulated).toBe(true);
    expect(r.acceptedBySunat).toBeUndefined();
  });

  it('calculateRiskMetrics advierte cuando la ficha es simulada', () => {
    const r = calculateRiskMetrics({ active: true, condition: 'HABIDO', isSimulated: true });
    expect(r?.warnings.some(w => w.includes('Modo Demostración'))).toBe(true);
  });
});
