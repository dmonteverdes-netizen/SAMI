import { describe, it, expect, vi, afterEach } from 'vitest';
import { 
  isValidRUC, 
  validateInvoice, 
  calculateTaxesSync, 
  calculateTaxes,
  IGV_RATE,
  RMT_INCOME_TAX_RATE,
  UIT_2026_VALUE,
  UIT_VALUE,
  getDigitoGrupo,
  getFechaVencimiento,
  CRONOGRAMA_SUNAT_2026,
  BANCARIZACION_THRESHOLD_PEN,
  getNextCorrelative,
  isDuplicateInvoice
} from '../../core/services/accountingService';
import { api } from '../../core/services/api';
import { DocumentType, InvoiceType, type Invoice, type TaxSummary } from '../../core/types/types';

describe('accountingService - Pruebas Unitarias', () => {

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── 1. Pruebas de Validación de RUC (Módulo 11 SUNAT) ───
  describe('isValidRUC', () => {
    it('debe aceptar RUCs válidos de 11 dígitos con dígito verificador Módulo 11 correcto', () => {
      // 20131312955: RUC oficial de SUNAT (Persona Jurídica - 20)
      expect(isValidRUC('20131312955')).toBe(true);

      // 20100047218: RUC de Banco de Crédito del Perú BCP (20)
      expect(isValidRUC('20100047218')).toBe(true);

      // 20100130204: RUC de BBVA Perú (20)
      expect(isValidRUC('20100130204')).toBe(true);

      // 10456782910: Persona Natural con DNI (Prefijo 10, checksum calculado)
      expect(isValidRUC('10456782910')).toBe(true);
    });

    it('debe rechazar RUCs con checksum Módulo 11 incorrecto', () => {
      // Modificamos el último dígito del RUC de SUNAT (debe ser 5, probamos con 4 y 9)
      expect(isValidRUC('20131312954')).toBe(false);
      expect(isValidRUC('20131312959')).toBe(false);

      // Modificamos el último dígito del RUC de BCP (debe ser 8, probamos con 1)
      expect(isValidRUC('20100047211')).toBe(false);
    });

    it('debe rechazar RUCs con longitud distinta a 11 dígitos o caracteres no numéricos', () => {
      expect(isValidRUC('2013131295')).toBe(false);      // 10 dígitos
      expect(isValidRUC('201313129555')).toBe(false);    // 12 dígitos
      expect(isValidRUC('')).toBe(false);                // vacío
      expect(isValidRUC('ABC12345678')).toBe(false);     // alfanumérico
      expect(isValidRUC('30131312955')).toBe(false);     // prefijo 30 no existe en SUNAT
    });
  });

  // ─── 2. Pruebas de Validación de Comprobantes (validateInvoice) ───
  describe('validateInvoice', () => {
    const validFactura: Omit<Invoice, 'id' | 'type'> = {
      documentType: DocumentType.FACTURA,
      series: 'F001',
      correlative: 1045,
      issueDate: '2026-08-16',
      ruc: '20131312955', // RUC válido SUNAT
      totalAmount: 1180.00,
      description: 'Venta de mercadería mayorista'
    };

    const validBoleta: Omit<Invoice, 'id' | 'type'> = {
      documentType: DocumentType.BOLETA,
      series: 'B001',
      correlative: 320,
      issueDate: '2026-08-16',
      totalAmount: 75.50,
      description: 'Venta al por menor'
    };

    it('debe aceptar una Factura válida con serie F y RUC válido', () => {
      expect(() => validateInvoice(validFactura)).not.toThrow();
    });

    it('debe aceptar una Boleta de Venta válida con serie B', () => {
      expect(() => validateInvoice(validBoleta)).not.toThrow();
    });

    it('debe rechazar comprobantes con monto total menor o igual a cero', () => {
      expect(() => validateInvoice({ ...validFactura, totalAmount: 0 }))
        .toThrow('El monto total debe ser positivo.');

      expect(() => validateInvoice({ ...validFactura, totalAmount: -150 }))
        .toThrow('El monto total debe ser positivo.');
    });

    it('debe rechazar Facturas sin RUC o con RUC inválido', () => {
      expect(() => validateInvoice({ ...validFactura, ruc: '' }))
        .toThrow('Una Factura debe tener un RUC válido de 11 dígitos');

      expect(() => validateInvoice({ ...validFactura, ruc: '20131312954' }))
        .toThrow('Una Factura debe tener un RUC válido de 11 dígitos');
    });

    it('debe rechazar comprobantes cuya serie no coincida con el tipo de documento', () => {
      // Factura con serie que inicia en B
      expect(() => validateInvoice({ ...validFactura, series: 'B001' }))
        .toThrow('Las series de Facturas deben empezar con "F".');

      // Boleta con serie que inicia en F
      expect(() => validateInvoice({ ...validBoleta, series: 'F001' }))
        .toThrow('Las series de Boletas de Venta deben empezar con "B".');
    });

    it('REGLA DE NEGOCIO NRUS: debe rechazar la emisión de Facturas si el contribuyente pertenece al Nuevo RUS', () => {
      // Contribuyente en NRUS intentando emitir Factura
      expect(() => validateInvoice(validFactura, 'NRUS'))
        .toThrow('Los contribuyentes en el Nuevo RUS (NRUS) no están autorizados a emitir Facturas');

      expect(() => validateInvoice(validFactura, 'Nuevo RUS'))
        .toThrow('Los contribuyentes en el Nuevo RUS (NRUS) no están autorizados a emitir Facturas');

      // Contribuyente en NRUS emitiendo Boleta de Venta debe ser aceptado
      expect(() => validateInvoice(validBoleta, 'NRUS')).not.toThrow();
    });
  });

  // ─── 3. Pruebas de Cálculo Tributario (calculateTaxesSync y calculateTaxes) ───
  describe('calculateTaxes & calculateTaxesSync', () => {
    const sampleSaleFactura: Invoice = {
      id: 'sale-1',
      type: InvoiceType.SALE,
      documentType: DocumentType.FACTURA,
      series: 'F001',
      correlative: 1,
      issueDate: '2026-08-01',
      ruc: '20131312955',
      totalAmount: 1180.00 // Base: S/ 1,000 | IGV: S/ 180
    };

    const samplePurchaseFactura: Invoice = {
      id: 'purch-1',
      type: InvoiceType.PURCHASE,
      documentType: DocumentType.FACTURA,
      series: 'F002',
      correlative: 10,
      issueDate: '2026-08-05',
      ruc: '20100047218',
      totalAmount: 590.00 // Base: S/ 500 | IGV: S/ 90
    };

    it('debe calcular el IGV (18%), Débito Fiscal, Crédito Fiscal e Impuesto a la Renta de forma exacta', () => {
      const summary = calculateTaxesSync([sampleSaleFactura], [samplePurchaseFactura]);

      // Ventas Totales: S/ 1,180.00 -> Base Imponible: S/ 1,000.00 -> IGV Débito: S/ 180.00
      expect(summary.totalSales).toBe(1180.00);
      expect(summary.igvDebit).toBe(180.00);

      // Compras Totales: S/ 590.00 -> Base Imponible: S/ 500.00 -> IGV Crédito: S/ 90.00
      expect(summary.totalPurchases).toBe(590.00);
      expect(summary.igvCredit).toBe(90.00);

      // IGV a pagar = Débito Fiscal (180) - Crédito Fiscal (90) = 90
      expect(summary.igvPayable).toBe(90.00);

      // Pago a cuenta Impuesto a la Renta RMT (1% de la base de ventas S/ 1,000) = S/ 10.00
      expect(summary.incomeTaxAdvance).toBe(10.00);
      expect(summary.appliedRmtRate).toBe(RMT_INCOME_TAX_RATE);
    });

    it('debe manejar arrays vacíos retornando ceros sin lanzar ninguna excepción', () => {
      const emptySummary = calculateTaxesSync([], []);

      expect(emptySummary.totalSales).toBe(0);
      expect(emptySummary.totalPurchases).toBe(0);
      expect(emptySummary.igvDebit).toBe(0);
      expect(emptySummary.igvCredit).toBe(0);
      expect(emptySummary.igvPayable).toBe(0);
      expect(emptySummary.incomeTaxAdvance).toBe(0);
      expect(emptySummary.verifiedInvoicesCount).toBe(0);
    });

    it('debe restar correctamente el crédito fiscal del débito fiscal y no generar saldo negativo a pagar', () => {
      const largePurchaseFactura: Invoice = {
        id: 'purch-large',
        type: InvoiceType.PURCHASE,
        documentType: DocumentType.FACTURA,
        series: 'F003',
        correlative: 99,
        issueDate: '2026-08-10',
        ruc: '20100130204',
        totalAmount: 2360.00, // Base: S/ 2,000 | IGV Crédito: S/ 360
        paymentMethod: 'TRANSFERENCIA' // Bancarizado (Ley 28194)
      };

      // Débito = 180, Crédito = 360. Saldo a pagar no debe ser negativo (debe ser 0)
      const summary = calculateTaxesSync([sampleSaleFactura], [largePurchaseFactura]);

      expect(summary.igvDebit).toBe(180.00);
      expect(summary.igvCredit).toBe(360.00);
      expect(summary.igvPayable).toBe(0); // Math.max(0, 180 - 360)
    });

    it('debe calcular impuestos comunicándose con el API Gateway real (camino feliz con mock de respuesta)', async () => {
      const mockBackendSummary: TaxSummary = {
        totalSales: 50000.00,
        totalPurchases: 20000.00,
        igvDebit: 7627.12,
        igvCredit: 3050.85,
        igvPayable: 4576.27,
        incomeTaxAdvance: 423.73,
        appliedRmtRate: 0.01,
        avgMonthlySales: 8333,
        avgMonthlyPurchases: 3333,
        verifiedInvoicesCount: 2,
        formalityRatio: 100,
        complianceStatus: 'Al día',
        regimeType: 'RMT',
        exceedsRegimeLimit: false,
        nonBancarizedAmount: 0
      };

      const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          summary: mockBackendSummary
        }
      });

      const summary = await calculateTaxes([sampleSaleFactura], [samplePurchaseFactura]);

      // Verifica que se llamó al endpoint oficial del backend con el payload correcto
      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(postSpy).toHaveBeenCalledWith('/accounting/calculate-taxes', {
        sales: [sampleSaleFactura],
        purchases: [samplePurchaseFactura],
        taxRegime: undefined
      });

      // Confirma que calculateTaxes devuelve la respuesta del backend tal cual, no el cálculo de fallback
      expect(summary).toEqual(mockBackendSummary);
      expect(summary.totalSales).toBe(50000.00);
      expect(summary.igvPayable).toBe(4576.27);
    });

    it('debe ejecutar el fallback síncrono si el API Gateway no está disponible por error de red', async () => {
      // Simular error de red sin err.response (ej. servidor caído o testing offline)
      vi.spyOn(api, 'post').mockRejectedValueOnce(new Error('Network Error / Gateway Offline'));

      const summary = await calculateTaxes([sampleSaleFactura], [samplePurchaseFactura]);

      // En el fallback calcula localmente en base a las facturas pasadas
      expect(summary.totalSales).toBe(1180.00);
      expect(summary.igvPayable).toBe(90.00);
    });
  });

  // ─── Pruebas de Indicadores de Salud Tributaria (Fase 2.5) ───
  describe('Cálculo Dinámico de formalityRatio y complianceStatus (calculateTaxHealthIndicators y calculateTaxesSync)', () => {
    const makeSale = (id: string, issueDate: string, amount: number = 1000): Invoice => ({
      id,
      type: InvoiceType.SALE,
      documentType: DocumentType.FACTURA,
      series: 'F001',
      correlative: 1,
      issueDate,
      ruc: '20131312955',
      totalAmount: amount
    });

    it('(a) debe calcular formalityRatio = 100 cuando hay ventas en todos los meses del rango', () => {
      const salesAllMonths = [
        makeSale('s1', '2026-01-10'),
        makeSale('s2', '2026-02-15'),
        makeSale('s3', '2026-03-20')
      ];

      const summary = calculateTaxesSync(salesAllMonths, []);
      expect(summary.formalityRatio).toBe(100);
    });

    it('(b) debe calcular formalityRatio exacto (67%) cuando hay huecos entre el primer y último mes', () => {
      // Rango: Enero 2026 a Junio 2026 = 6 meses en total.
      // Meses con ventas: Enero (01), Marzo (03), Abril (04), Junio (06) = 4 meses activos.
      // formalityRatio = (4 / 6) * 100 = 66.666... -> 67
      const salesWithGaps = [
        makeSale('s1', '2026-01-05'),
        makeSale('s2', '2026-03-12'),
        makeSale('s3', '2026-04-18'),
        makeSale('s4', '2026-06-25')
      ];

      const summary = calculateTaxesSync(salesWithGaps, []);
      expect(summary.formalityRatio).toBe(67);
    });

    it('(c) debe determinar complianceStatus determinísticamente usando referenceDate fijo', () => {
      const referenceDate = new Date('2026-08-16T12:00:00');

      // Escenario 1: Último comprobante hace 15 días (2026-08-01) -> 'Al día' (<= 30 días)
      const salesAlDia = [
        makeSale('s1', '2026-07-10'),
        makeSale('s2', '2026-08-01')
      ];
      const summaryAlDia = calculateTaxesSync(salesAlDia, [], { referenceDate });
      expect(summaryAlDia.complianceStatus).toBe('Al día');

      // Escenario 2: Último comprobante hace 60 días (2026-06-17) -> 'Registro desactualizado' (31 - 90 días)
      const salesDesactualizado = [
        makeSale('s1', '2026-05-10'),
        makeSale('s2', '2026-06-17')
      ];
      const summaryDesactualizado = calculateTaxesSync(salesDesactualizado, [], { referenceDate });
      expect(summaryDesactualizado.complianceStatus).toBe('Registro desactualizado');

      // Escenario 3: Último comprobante hace 120 días (2026-04-18) -> 'Sin actividad reciente' (> 90 días)
      const salesSinActividad = [
        makeSale('s1', '2026-03-10'),
        makeSale('s2', '2026-04-18')
      ];
      const summarySinActividad = calculateTaxesSync(salesSinActividad, [], { referenceDate });
      expect(summarySinActividad.complianceStatus).toBe('Sin actividad reciente');
    });

    it('debe retornar formalityRatio = 0 y complianceStatus = "Sin actividad reciente" si no hay ventas', () => {
      const summaryEmpty = calculateTaxesSync([], []);
      expect(summaryEmpty.formalityRatio).toBe(0);
      expect(summaryEmpty.complianceStatus).toBe('Sin actividad reciente');
    });
  });

  // ─── 4. Pruebas de Regímenes Tributarios Oficiales SUNAT 2026 ───
  describe('Motor Tributario por Régimen (NRUS, RER, RMT, RG) y UIT 2026', () => {
    it('debe tener configurada la UIT 2026 oficial en S/ 5,500 (D.S. N° 301-2025-EF)', () => {
      expect(UIT_2026_VALUE).toBe(5500);
      expect(UIT_VALUE).toBe(5500);
    });

    const createBoleta = (id: string, date: string, amount: number): Invoice => ({
      id,
      type: InvoiceType.SALE,
      documentType: DocumentType.BOLETA,
      series: 'B001',
      correlative: 1,
      issueDate: date,
      totalAmount: amount
    });

    const createFactura = (id: string, date: string, amount: number): Invoice => ({
      id,
      type: InvoiceType.SALE,
      documentType: DocumentType.FACTURA,
      series: 'F001',
      correlative: 1,
      issueDate: date,
      ruc: '20131312955',
      totalAmount: amount
    });

    const createPurchaseFactura = (id: string, date: string, amount: number): Invoice => ({
      id,
      type: InvoiceType.PURCHASE,
      documentType: DocumentType.FACTURA,
      series: 'F001',
      correlative: 1,
      issueDate: date,
      ruc: '20100047218',
      totalAmount: amount
    });

    // --- NRUS ---
    describe('Régimen NRUS (Nuevo RUS)', () => {
      it('Categoría 1: ingresos <= S/ 5,000 en el mes -> Cuota fija S/ 20, sin IGV ni Pago a Cuenta Renta', () => {
        const sales = [createBoleta('b1', '2026-01-10', 3500)];
        const purchases = [createPurchaseFactura('p1', '2026-01-15', 1000)];

        const result = calculateTaxesSync(sales, purchases, { taxRegime: 'NRUS' });

        expect(result.regimeType).toBe('NRUS');
        expect(result.igvDebit).toBe(0);
        expect(result.igvCredit).toBe(0);
        expect(result.igvPayable).toBe(0);
        expect(result.incomeTaxAdvance).toBe(0);
        expect(result.fixedQuota).toBe(20);
        expect(result.nrusCategory).toBe(1);
        expect(result.exceedsRegimeLimit).toBe(false);
      });

      it('Categoría 2: ingresos > S/ 5,000 y <= S/ 8,000 en el mes -> Cuota fija S/ 50', () => {
        const sales = [createBoleta('b1', '2026-01-10', 6500)];
        const result = calculateTaxesSync(sales, [], { taxRegime: 'NRUS' });

        expect(result.regimeType).toBe('NRUS');
        expect(result.fixedQuota).toBe(50);
        expect(result.nrusCategory).toBe(2);
        expect(result.exceedsRegimeLimit).toBe(false);
      });

      it('Exceso de límite mensual (> S/ 8,000 en cualquier mes) -> Marca exceedsRegimeLimit y mensaje de alerta', () => {
        const sales = [createBoleta('b1', '2026-01-10', 8500)];
        const result = calculateTaxesSync(sales, [], { taxRegime: 'NRUS' });

        expect(result.regimeType).toBe('NRUS');
        expect(result.exceedsRegimeLimit).toBe(true);
        expect(result.regimeLimitMessage).toContain('superan el límite mensual legal');
        expect(result.fixedQuota).toBeUndefined();
      });

      it('Exceso de límite anual (> S/ 96,000) -> Marca exceedsRegimeLimit', () => {
        // 13 meses simulados con 7,500 cada uno (total > 96,000 en el año)
        const sales: Invoice[] = [];
        for (let i = 1; i <= 13; i++) {
          const m = i <= 9 ? `0${i}` : `${i}`;
          sales.push(createBoleta(`b-${i}`, `2026-${m <= '12' ? m : '12'}-10`, 7500));
        }
        const result = calculateTaxesSync(sales, [], { taxRegime: 'NRUS' });

        expect(result.regimeType).toBe('NRUS');
        expect(result.exceedsRegimeLimit).toBe(true);
      });
    });

    // --- RER ---
    describe('Régimen Especial de Renta (RER)', () => {
      it('Calcula IGV (18%) y Pago a Cuenta Renta al 1.5% de la base imponible', () => {
        const sales = [createFactura('f1', '2026-01-10', 1180)]; // Base: 1,000, IGV: 180
        const purchases = [createPurchaseFactura('p1', '2026-01-15', 590)]; // Base: 500, IGV: 90

        const result = calculateTaxesSync(sales, purchases, { taxRegime: 'RER' });

        expect(result.regimeType).toBe('RER');
        expect(result.igvDebit).toBe(180);
        expect(result.igvCredit).toBe(90);
        expect(result.igvPayable).toBe(90);
        // Renta 1.5% de 1,000 = 15.00
        expect(result.incomeTaxAdvance).toBe(15.00);
        expect(result.appliedRmtRate).toBe(0.015);
        expect(result.exceedsRegimeLimit).toBe(false);
      });

      it('Detecta exceso de tope anual RER (S/ 525,000)', () => {
        const sales = [createFactura('f1', '2026-01-10', 600000)];
        const result = calculateTaxesSync(sales, [], { taxRegime: 'RER' });

        expect(result.regimeType).toBe('RER');
        expect(result.exceedsRegimeLimit).toBe(true);
        expect(result.regimeLimitMessage).toContain('525,000');
      });
    });

    // --- RMT ---
    describe('Régimen MYPE Tributario (RMT)', () => {
      it('Calcula IGV (18%) y Pago a Cuenta Renta al 1.0% de la base imponible', () => {
        const sales = [createFactura('f1', '2026-01-10', 1180)]; // Base: 1,000
        const result = calculateTaxesSync(sales, [], { taxRegime: 'RMT' });

        expect(result.regimeType).toBe('RMT');
        expect(result.incomeTaxAdvance).toBe(10.00); // 1% de 1,000
        expect(result.appliedRmtRate).toBe(0.01);
        expect(result.exceedsRegimeLimit).toBe(false);
      });

      it('Detecta exceso de límite de 1,700 UIT (S/ 9,350,000 con UIT 2026 de S/ 5,500)', () => {
        const sales = [createFactura('f1', '2026-01-10', 10000000)];
        const result = calculateTaxesSync(sales, [], { taxRegime: 'RMT' });

        expect(result.regimeType).toBe('RMT');
        expect(result.exceedsRegimeLimit).toBe(true);
        expect(result.regimeLimitMessage).toContain('1,700 UIT');
      });
    });

    // --- RG ---
    describe('Régimen General (RG)', () => {
      it('Calcula IGV (18%) y Pago a Cuenta Renta al 1.5% sin tope de ingresos', () => {
        const sales = [createFactura('f1', '2026-01-10', 2360000)]; // Base: 2,000,000
        const result = calculateTaxesSync(sales, [], { taxRegime: 'RG' });

        expect(result.regimeType).toBe('RG');
        expect(result.appliedRmtRate).toBe(0.015);
        expect(result.incomeTaxAdvance).toBe(30000.00); // 1.5% de 2,000,000
        expect(result.exceedsRegimeLimit).toBe(false);
      });
    });

    // --- Notas de Crédito y Débito ---
    describe('Notas de Crédito y Débito (UBL 2.1 SUNAT)', () => {
      it('Valida correctamente una Nota de Crédito sobre Factura con serie FC01 y referencia', () => {
        const nc: Invoice = {
          id: 'nc1',
          type: InvoiceType.SALE,
          documentType: DocumentType.NOTA_DE_CREDITO,
          series: 'FC01',
          correlative: 1,
          issueDate: '2026-01-15',
          totalAmount: 118,
          ruc: '20131312955',
          referencedDocumentType: DocumentType.FACTURA,
          referencedSeries: 'F001',
          referencedCorrelative: 100,
          noteReason: 'Anulación de la operación'
        };

        expect(() => validateInvoice(nc, 'RMT')).not.toThrow();
      });

      it('Rechaza Nota de Crédito si no especifica comprobante referenciado', () => {
        const nc: Invoice = {
          id: 'nc2',
          type: InvoiceType.SALE,
          documentType: DocumentType.NOTA_DE_CREDITO,
          series: 'FC01',
          correlative: 2,
          issueDate: '2026-01-15',
          totalAmount: 118,
          ruc: '20131312955'
        };

        expect(() => validateInvoice(nc, 'RMT')).toThrow('debe especificar la serie y correlativo');
      });

      it('Rechaza Nota con serie F que intenta modificar comprobante con serie B', () => {
        const nc: Invoice = {
          id: 'nc3',
          type: InvoiceType.SALE,
          documentType: DocumentType.NOTA_DE_CREDITO,
          series: 'FC01',
          correlative: 3,
          issueDate: '2026-01-15',
          totalAmount: 118,
          ruc: '20131312955',
          referencedSeries: 'B001',
          referencedCorrelative: 50
        };

        expect(() => validateInvoice(nc, 'RMT')).toThrow('Una Nota con serie F sólo puede modificar comprobantes con serie F');
      });

      it('Rechaza emisión de Nota sobre Factura para contribuyentes NRUS', () => {
        const nc: Invoice = {
          id: 'nc4',
          type: InvoiceType.SALE,
          documentType: DocumentType.NOTA_DE_CREDITO,
          series: 'FC01',
          correlative: 4,
          issueDate: '2026-01-15',
          totalAmount: 118,
          ruc: '20131312955',
          referencedSeries: 'F001',
          referencedCorrelative: 100
        };

        expect(() => validateInvoice(nc, 'NRUS')).toThrow('Nuevo RUS (NRUS) no están autorizados a emitir Notas');
      });

      it('Nota de Crédito reduce ventas e IGV Débito / Renta a cuenta', () => {
        const sales: Invoice[] = [
          createFactura('f1', '2026-01-10', 1180), // Base: 1,000, IGV: 180
          {
            id: 'nc1',
            type: InvoiceType.SALE,
            documentType: DocumentType.NOTA_DE_CREDITO,
            series: 'FC01',
            correlative: 1,
            issueDate: '2026-01-12',
            totalAmount: 236, // Base: 200, IGV: 36 a descontar
            ruc: '20131312955',
            referencedSeries: 'F001',
            referencedCorrelative: 1,
            noteReason: 'Descuento post-venta'
          }
        ];

        const result = calculateTaxesSync(sales, [], { taxRegime: 'RMT' });

        // Total ventas netas = 1,180 - 236 = 944. Base: 800. IGV: 144
        expect(result.totalSales).toBe(944);
        expect(result.igvDebit).toBe(144);
        expect(result.incomeTaxAdvance).toBe(8.00); // 1% de 800
      });

      it('Nota de Débito incrementa compras e IGV Crédito', () => {
        const purchases: Invoice[] = [
          createPurchaseFactura('p1', '2026-01-10', 1180), // Base: 1,000, IGV: 180
          {
            id: 'nd1',
            type: InvoiceType.PURCHASE,
            documentType: DocumentType.NOTA_DE_DEBITO,
            series: 'FD01',
            correlative: 1,
            issueDate: '2026-01-14',
            totalAmount: 118, // Base: 100, IGV: 18 adicional
            ruc: '20131312955',
            referencedSeries: 'F001',
            referencedCorrelative: 10,
            noteReason: 'Intereses por mora'
          }
        ];

        const result = calculateTaxesSync([], purchases, { taxRegime: 'RMT' });

        // Total compras = 1,180 + 118 = 1,298. Base: 1,100. Crédito: 198
        expect(result.totalPurchases).toBe(1298);
        expect(result.igvCredit).toBe(198);
      });
    });
  });

  // ─── 7. Pruebas de Cronograma de Vencimientos SUNAT 2026 (R.S. 281-2022/SUNAT) ───
  describe('Cronograma de Vencimientos Mensuales SUNAT 2026', () => {
    describe('getDigitoGrupo', () => {
      it('agrupa correctamente el último dígito del RUC en los 6 grupos estándar', () => {
        expect(getDigitoGrupo('20100070970')).toBe('0');
        expect(getDigitoGrupo('20131312951')).toBe('1');
        expect(getDigitoGrupo('20601234562')).toBe('2-3');
        expect(getDigitoGrupo('20601234563')).toBe('2-3');
        expect(getDigitoGrupo('20601234564')).toBe('4-5');
        expect(getDigitoGrupo('20601234565')).toBe('4-5');
        expect(getDigitoGrupo('20601234566')).toBe('6-7');
        expect(getDigitoGrupo('20601234567')).toBe('6-7');
        expect(getDigitoGrupo('20100047218')).toBe('8-9');
        expect(getDigitoGrupo('20131312959')).toBe('8-9');
      });
    });

    describe('getFechaVencimiento', () => {
      it('retorna la fecha exacta para RUC que termina en 0 en el periodo 2026-01 (16 de febrero 2026)', () => {
        const fecha = getFechaVencimiento('20100070970', '2026-01');
        expect(fecha).toBe('2026-02-16');
      });

      it('retorna la fecha exacta para RUC que termina en 5 (grupo 4-5) en el periodo 2026-06 (20 de julio 2026)', () => {
        const fecha = getFechaVencimiento('20601234565', '2026-06');
        expect(fecha).toBe('2026-07-20');
      });

      it('retorna la fecha de Buen Contribuyente (BC/UESP) cuando esBuenContribuyente es true (24 de julio 2026)', () => {
        const fecha = getFechaVencimiento('20601234565', '2026-06', true);
        expect(fecha).toBe('2026-07-24');
      });

      it('retorna null cuando el periodo consultado no pertenece al ejercicio 2026', () => {
        expect(getFechaVencimiento('20100070970', '2025-12')).toBeNull();
        expect(getFechaVencimiento('20100070970', '2027-01')).toBeNull();
      });

      it('contiene los 12 periodos del ejercicio 2026 en la tabla', () => {
        const periods = Object.keys(CRONOGRAMA_SUNAT_2026);
        expect(periods.length).toBe(12);
        expect(periods).toContain('2026-01');
        expect(periods).toContain('2026-12');
      });
    });

    describe('Integración de proximoVencimiento en calculateTaxesSync', () => {
      it('calcula proximoVencimiento con fecha y diasRestantes respecto al referenceDate', () => {
        const sales: Invoice[] = [
          {
            id: 's1',
            type: InvoiceType.SALE,
            documentType: DocumentType.FACTURA,
            series: 'F001',
            correlative: 1,
            issueDate: '2026-01-15',
            ruc: '20100070970', // termina en 0 -> vencimiento 2026-02-16
            totalAmount: 1180
          }
        ];

        const referenceDate = new Date('2026-02-01T12:00:00');
        const summary = calculateTaxesSync(sales, [], { referenceDate });

        expect(summary.proximoVencimiento).toBeDefined();
        expect(summary.proximoVencimiento?.periodo).toBe('2026-01');
        expect(summary.proximoVencimiento?.fecha).toBe('2026-02-16');
        expect(summary.proximoVencimiento?.diasRestantes).toBe(15);
      });
    });
  });

  // ─── 8. Pruebas de Bancarización (Ley N° 28194 / D.L. 1529) ───
  describe('Bancarización Obligatoria para Crédito Fiscal (Ley N° 28194)', () => {
    const createPurchaseFacturaWithPayment = (
      id: string, 
      issueDate: string, 
      totalAmount: number, 
      paymentMethod?: Invoice['paymentMethod']
    ): Invoice => ({
      id,
      type: InvoiceType.PURCHASE,
      documentType: DocumentType.FACTURA,
      series: 'F001',
      correlative: 100,
      issueDate,
      ruc: '20131312955',
      totalAmount,
      paymentMethod
    });

    it('permite crédito fiscal en compra menor al umbral (S/ 1,999) pagada en EFECTIVO', () => {
      const purchase = createPurchaseFacturaWithPayment('p1', '2026-01-10', 1999, 'EFECTIVO');
      const summary = calculateTaxesSync([], [purchase], { taxRegime: 'RMT' });

      // Base: 1,999 / 1.18 = 1694.0677..., Crédito = 304.93
      expect(summary.nonBancarizedAmount).toBe(0);
      expect(summary.igvCredit).toBeCloseTo(304.93, 2);
    });

    it('pierde crédito fiscal en compra igual o mayor a S/ 2,000 pagada en EFECTIVO', () => {
      const purchase = createPurchaseFacturaWithPayment('p2', '2026-01-10', 2000, 'EFECTIVO');
      const summary = calculateTaxesSync([], [purchase], { taxRegime: 'RMT' });

      expect(summary.nonBancarizedAmount).toBe(2000);
      expect(summary.igvCredit).toBe(0);
      expect(summary.nonBancarizedMessage).toContain('Ley N° 28194');
    });

    it('permite crédito fiscal en compra de S/ 3,500 pagada con TRANSFERENCIA', () => {
      const purchase = createPurchaseFacturaWithPayment('p3', '2026-01-10', 3500, 'TRANSFERENCIA');
      const summary = calculateTaxesSync([], [purchase], { taxRegime: 'RMT' });

      // Base: 3,500 / 1.18 = 2966.10, Crédito = 533.90
      expect(summary.nonBancarizedAmount).toBe(0);
      expect(summary.igvCredit).toBeCloseTo(533.90, 2);
    });

    it('permite crédito fiscal en compra de S/ 2,500 pagada con YAPE o TARJETA', () => {
      const purchaseYape = createPurchaseFacturaWithPayment('p4', '2026-01-10', 2500, 'YAPE');
      const summaryYape = calculateTaxesSync([], [purchaseYape], { taxRegime: 'RMT' });

      expect(summaryYape.nonBancarizedAmount).toBe(0);
      expect(summaryYape.igvCredit).toBeCloseTo(381.36, 2);

      const purchaseTarjeta = createPurchaseFacturaWithPayment('p5', '2026-01-10', 2500, 'TARJETA');
      const summaryTarjeta = calculateTaxesSync([], [purchaseTarjeta], { taxRegime: 'RMT' });

      expect(summaryTarjeta.nonBancarizedAmount).toBe(0);
      expect(summaryTarjeta.igvCredit).toBeCloseTo(381.36, 2);
    });

    it('pierde crédito fiscal en compra >= S/ 2,000 sin medio de pago especificado', () => {
      const purchaseNoMethod = createPurchaseFacturaWithPayment('p6', '2026-01-10', 2500, undefined);
      const summary = calculateTaxesSync([], [purchaseNoMethod], { taxRegime: 'RMT' });

      expect(summary.nonBancarizedAmount).toBe(2500);
      expect(summary.igvCredit).toBe(0);
    });

    it('no afecta el débito fiscal en ventas cobradas en efectivo', () => {
      const sale: Invoice = {
        id: 's1',
        type: InvoiceType.SALE,
        documentType: DocumentType.FACTURA,
        series: 'F001',
        correlative: 1,
        issueDate: '2026-01-15',
        ruc: '20131312955',
        totalAmount: 5000,
        paymentMethod: 'EFECTIVO'
      };

      const summary = calculateTaxesSync([sale], [], { taxRegime: 'RMT' });

      // Base: 5,000 / 1.18 = 4237.29, Débito = 762.71
      expect(summary.igvDebit).toBeCloseTo(762.71, 2);
      expect(summary.nonBancarizedAmount).toBe(0);
    });
  });

  // ─── 9. Pruebas de Correlativos Secuenciales Reales (getNextCorrelative) ───
  describe('getNextCorrelative', () => {
    it('debe retornar 1 si el historial de ventas está vacío', () => {
      expect(getNextCorrelative(DocumentType.BOLETA, [])).toBe(1);
      expect(getNextCorrelative(DocumentType.FACTURA, [])).toBe(1);
      expect(getNextCorrelative('BOLETA', [])).toBe(1);
      expect(getNextCorrelative('FACTURA', [])).toBe(1);
    });

    it('debe retornar 1 si no existen comprobantes del tipo solicitado en el historial', () => {
      const existingSales: Invoice[] = [
        {
          id: '1',
          type: InvoiceType.SALE,
          documentType: DocumentType.BOLETA,
          series: 'B001',
          correlative: 45,
          issueDate: '2026-08-01',
          totalAmount: 50
        }
      ];

      // Pidiendo Factura cuando solo hay Boletas
      expect(getNextCorrelative(DocumentType.FACTURA, existingSales)).toBe(1);
      expect(getNextCorrelative('FACTURA', existingSales)).toBe(1);
    });

    it('debe calcular el máximo correlativo + 1 de forma independiente por tipo de documento', () => {
      const existingSales: Invoice[] = [
        {
          id: '1',
          type: InvoiceType.SALE,
          documentType: DocumentType.BOLETA,
          series: 'B001',
          correlative: 10,
          issueDate: '2026-08-01',
          totalAmount: 30
        },
        {
          id: '2',
          type: InvoiceType.SALE,
          documentType: DocumentType.FACTURA,
          series: 'F001',
          correlative: 5,
          issueDate: '2026-08-02',
          ruc: '20131312955',
          totalAmount: 500
        },
        {
          id: '3',
          type: InvoiceType.SALE,
          documentType: DocumentType.BOLETA,
          series: 'B001',
          correlative: 25,
          issueDate: '2026-08-03',
          totalAmount: 80
        },
        {
          id: '4',
          type: InvoiceType.SALE,
          documentType: DocumentType.FACTURA,
          series: 'F001',
          correlative: 12,
          issueDate: '2026-08-04',
          ruc: '20131312955',
          totalAmount: 1200
        }
      ];

      // Boletas: máx es 25 -> siguiente debe ser 26
      expect(getNextCorrelative(DocumentType.BOLETA, existingSales)).toBe(26);
      expect(getNextCorrelative('BOLETA', existingSales)).toBe(26);

      // Facturas: máx es 12 -> siguiente debe ser 13
      expect(getNextCorrelative(DocumentType.FACTURA, existingSales)).toBe(13);
      expect(getNextCorrelative('FACTURA', existingSales)).toBe(13);
    });

    it('debe ignorar comprobantes de tipo COMPRA (PURCHASE) que estén en la lista', () => {
      const mixedList: Invoice[] = [
        {
          id: 'p1',
          type: InvoiceType.PURCHASE,
          documentType: DocumentType.FACTURA,
          series: 'F001',
          correlative: 999, // compra de proveedor con correlativo 999
          issueDate: '2026-08-01',
          ruc: '20100047218',
          totalAmount: 3000
        },
        {
          id: 's1',
          type: InvoiceType.SALE,
          documentType: DocumentType.FACTURA,
          series: 'F001',
          correlative: 3,
          issueDate: '2026-08-02',
          ruc: '20131312955',
          totalAmount: 400
        }
      ];

      // Para ventas de factura, debe dar 4 (3 + 1), ignorando el 999 de compras
      expect(getNextCorrelative(DocumentType.FACTURA, mixedList)).toBe(4);
    });
  });

  // ─── 10. Pruebas de Detección de Comprobantes Duplicados (isDuplicateInvoice) ───
  describe('isDuplicateInvoice', () => {
    const existingInvoices: Invoice[] = [
      {
        id: '1',
        type: InvoiceType.SALE,
        documentType: DocumentType.FACTURA,
        series: 'F001',
        correlative: 100,
        issueDate: '2026-08-01',
        ruc: '20131312955',
        totalAmount: 1000
      },
      {
        id: '2',
        type: InvoiceType.SALE,
        documentType: DocumentType.BOLETA,
        series: 'B001',
        correlative: 50,
        issueDate: '2026-08-02',
        totalAmount: 150
      },
      {
        id: '3',
        type: InvoiceType.PURCHASE,
        documentType: DocumentType.FACTURA,
        series: 'F001',
        correlative: 100, // Misma serie y correlativo que '1', pero es una COMPRA de proveedor
        issueDate: '2026-08-03',
        ruc: '20100047218',
        totalAmount: 2500
      }
    ];

    it('debe retornar false si la lista de comprobantes está vacía', () => {
      const newInvoice: Omit<Invoice, 'id'> = {
        type: InvoiceType.SALE,
        documentType: DocumentType.FACTURA,
        series: 'F001',
        correlative: 100,
        issueDate: '2026-08-05',
        ruc: '20131312955',
        totalAmount: 500
      };

      expect(isDuplicateInvoice(newInvoice, [])).toBe(false);
    });

    it('debe retornar true si existe un comprobante con el mismo tipo, serie y correlativo', () => {
      const duplicateSale: Omit<Invoice, 'id'> = {
        type: InvoiceType.SALE,
        documentType: DocumentType.FACTURA,
        series: 'F001',
        correlative: 100,
        issueDate: '2026-08-10',
        ruc: '20131312955',
        totalAmount: 800
      };

      expect(isDuplicateInvoice(duplicateSale, existingInvoices)).toBe(true);

      // Con minúsculas en serie
      const duplicateSaleLower: Omit<Invoice, 'id'> = {
        ...duplicateSale,
        series: 'f001'
      };
      expect(isDuplicateInvoice(duplicateSaleLower, existingInvoices)).toBe(true);
    });

    it('debe retornar false si la serie o el correlativo son diferentes', () => {
      const differentCorrelative: Omit<Invoice, 'id'> = {
        type: InvoiceType.SALE,
        documentType: DocumentType.FACTURA,
        series: 'F001',
        correlative: 101, // Diferente correlativo
        issueDate: '2026-08-10',
        ruc: '20131312955',
        totalAmount: 800
      };
      expect(isDuplicateInvoice(differentCorrelative, existingInvoices)).toBe(false);

      const differentSeries: Omit<Invoice, 'id'> = {
        type: InvoiceType.SALE,
        documentType: DocumentType.FACTURA,
        series: 'F002', // Diferente serie
        correlative: 100,
        issueDate: '2026-08-10',
        ruc: '20131312955',
        totalAmount: 800
      };
      expect(isDuplicateInvoice(differentSeries, existingInvoices)).toBe(false);
    });

    it('no debe confundir una VENTA con una COMPRA que coincidan en serie y correlativo', () => {
      // Registro de una nueva compra con serie F001 y correlativo 100 cuando ya existe una compra F001-100
      const duplicatePurchase: Omit<Invoice, 'id'> = {
        type: InvoiceType.PURCHASE,
        documentType: DocumentType.FACTURA,
        series: 'F001',
        correlative: 100,
        issueDate: '2026-08-12',
        ruc: '20100047218',
        totalAmount: 1200
      };
      expect(isDuplicateInvoice(duplicatePurchase, existingInvoices)).toBe(true);

      // Una nueva venta F001-50 cuando solo existe compra F001-100 y boleta venta B001-50
      const nonDuplicateSale: Omit<Invoice, 'id'> = {
        type: InvoiceType.SALE,
        documentType: DocumentType.FACTURA,
        series: 'F001',
        correlative: 50, // No existe venta F001-50 (solo boleta B001-50)
        issueDate: '2026-08-12',
        ruc: '20131312955',
        totalAmount: 1200
      };
      expect(isDuplicateInvoice(nonDuplicateSale, existingInvoices)).toBe(false);
    });
  });

});
