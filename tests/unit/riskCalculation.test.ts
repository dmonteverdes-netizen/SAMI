import { describe, it, expect } from 'vitest';
import { calculateRiskMetrics } from '../../modules/gestion/ruc-lookup/riskCalculation';

describe('riskCalculation (Salud Tributaria y Documental)', () => {
  // ─── 1. Contribuyente Óptimo ───
  it('1. debe evaluar contribuyente óptimo con todos los factores positivos y 0 advertencias', () => {
    const optimalDetails = {
      active: true,
      condition: 'HABIDO',
      taxRegime: 'RMT',
      electronicBilling: true,
      retainingAgent: true,
      agentOfPerception: true,
      registrationDate: '2015-01-01'
    };

    const result = calculateRiskMetrics(optimalDetails);

    expect(result).not.toBeNull();
    expect(result?.warnings).toEqual([]);
    expect(result?.positives.length).toBeGreaterThanOrEqual(6);

    // Verificación de factores esperados
    expect(result?.positives).toContain('Contribuyente ACTIVO en SUNAT');
    expect(result?.positives).toContain('Domicilio Fiscal HABIDO (Localizable y verificado por SUNAT)');
    expect(result?.positives).toContain('Régimen MYPE Tributario (Contabilidad simplificada formal)');
    expect(result?.positives).toContain('Facturación Electrónica Activa (Emisión digital de comprobantes)');
    expect(result?.positives).toContain('AGENTE DE RETENCIÓN (Designación formal por SUNAT)');
    expect(result?.positives).toContain('AGENTE DE PERCEPCIÓN (Designación formal por SUNAT)');
    expect(result?.positives.some(p => p.includes('Sólida trayectoria'))).toBe(true);

    // ─── 6. Regla de Negocio: No debe contener score ni riskLevel ───
    expect(result).not.toHaveProperty('score');
    expect(result).not.toHaveProperty('riskLevel');
    expect(result).not.toHaveProperty('riskColor');
    expect(result).not.toHaveProperty('label');
  });

  // ─── 2. Contribuyente con Observaciones Críticas ───
  it('2. debe identificar factores de advertencia en contribuyente con observaciones críticas', () => {
    const criticalDetails = {
      active: false,
      condition: 'NO HABIDO',
      taxRegime: 'NRUS',
      electronicBilling: false,
      registrationDate: '2025-06-01'
    };

    const result = calculateRiskMetrics(criticalDetails);

    expect(result).not.toBeNull();
    expect(result?.positives).toEqual([]);
    expect(result?.warnings.length).toBeGreaterThanOrEqual(5);

    expect(result?.warnings).toContain('BAJA DE OFICIO o INACTIVO (Estado no operativo en SUNAT)');
    expect(result?.warnings).toContain('Condición de Domicilio: NO HABIDO (Local no confirmado por SUNAT)');
    expect(result?.warnings).toContain('Nuevo RUS (Régimen simplificado con topes máximos de facturación)');
    expect(result?.warnings).toContain('Sin registro de Facturación Electrónica activa');
    expect(result?.warnings.some(w => w.includes('RUC de reciente inscripción'))).toBe(true);

    // Regla de Negocio: Regresión de no scoring
    expect(result).not.toHaveProperty('score');
    expect(result).not.toHaveProperty('riskLevel');
  });

  // ─── 3. Caso Mixto ───
  it('3. debe clasificar adecuadamente factores positivos y advertencias en un caso mixto sin mezclarlos', () => {
    const mixedDetails = {
      active: true,
      condition: 'HABIDO',
      taxRegime: 'RER',
      electronicBilling: false,
      registrationDate: '2025-01-10'
    };

    const result = calculateRiskMetrics(mixedDetails);

    expect(result).not.toBeNull();

    // Positivos
    expect(result?.positives).toContain('Contribuyente ACTIVO en SUNAT');
    expect(result?.positives).toContain('Domicilio Fiscal HABIDO (Localizable y verificado por SUNAT)');
    expect(result?.positives).toContain('Régimen Especial (RER) de comercio o servicios');

    // Advertencias
    expect(result?.warnings).toContain('Sin registro de Facturación Electrónica activa');
    expect(result?.warnings.some(w => w.includes('RUC de reciente inscripción'))).toBe(true);

    // Garantizar que no se crucen
    expect(result?.positives).not.toContain('Sin registro de Facturación Electrónica activa');
    expect(result?.warnings).not.toContain('Contribuyente ACTIVO en SUNAT');
  });

  // ─── 4. Details Nulo o Indefinido ───
  it('4. debe retornar null si details es null o undefined sin lanzar excepción', () => {
    expect(calculateRiskMetrics(null)).toBeNull();
    expect(calculateRiskMetrics(undefined)).toBeNull();
    expect(() => calculateRiskMetrics(null)).not.toThrow();
    expect(() => calculateRiskMetrics(undefined)).not.toThrow();
  });

  // ─── 5. Factores Documentales Opcionales ───
  describe('5. Factores Documentales Opcionales (options)', () => {
    const baseContribuyente = {
      active: true,
      condition: 'HABIDO',
      taxRegime: 'RMT'
    };

    it('debe registrar advertencia si powerExpiryDate está vencido (fecha pasada)', () => {
      const result = calculateRiskMetrics(baseContribuyente, {
        powerExpiryDate: '2020-01-01'
      });

      expect(result?.warnings).toContain('Poder de representación legal vencido en SUNARP');
    });

    it('debe registrar factor positivo si powerExpiryDate está vigente y lejano (>30 días)', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90);
      const isoFuture = futureDate.toISOString().split('T')[0];

      const result = calculateRiskMetrics(baseContribuyente, {
        powerExpiryDate: isoFuture
      });

      expect(result?.positives).toContain('Vigencia de poder legal confirmada ante SUNARP');
      expect(result?.warnings.some(w => w.includes('Poder'))).toBe(false);
    });

    it('debe evaluar pkiStatus valid como positivo e invalid como advertencia', () => {
      const validPKIResult = calculateRiskMetrics(baseContribuyente, {
        pkiStatus: 'valid'
      });
      expect(validPKIResult?.positives).toContain('Firma digital criptográfica PKI válida en vigencia de poder');

      const invalidPKIResult = calculateRiskMetrics(baseContribuyente, {
        pkiStatus: 'invalid'
      });
      expect(invalidPKIResult?.warnings).toContain('Firma digital en documento de poder alterada o no válida');
    });

    it('debe registrar factor positivo si bankSynchronized es true', () => {
      const result = calculateRiskMetrics(baseContribuyente, {
        bankSynchronized: true
      });

      expect(result?.positives).toContain('Cuenta bancaria validada y asociada al titular');
    });
  });

  // ─── 6. Test de Regresión Obligatorio ───
  it('6. TEST DE REGRESIÓN: garantiza que el resultado no tenga propiedades de scoring ni calificaciones SBS', () => {
    const testCases = [
      { active: true, condition: 'HABIDO' },
      { active: false, condition: 'NO HABIDO' },
      { active: true, condition: 'HABIDO', taxRegime: 'GENERAL', electronicBilling: true }
    ];

    testCases.forEach((tc) => {
      const evalResult = calculateRiskMetrics(tc);
      expect(evalResult).not.toBeNull();
      expect(evalResult).not.toHaveProperty('score');
      expect(evalResult).not.toHaveProperty('riskLevel');
      expect(evalResult).not.toHaveProperty('riskColor');
      expect(evalResult).not.toHaveProperty('label');
      expect(Array.isArray(evalResult?.positives)).toBe(true);
      expect(Array.isArray(evalResult?.warnings)).toBe(true);
    });
  });
});
