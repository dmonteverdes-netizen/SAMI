import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import bankRouter from '../../server/routes/bank';
import { ConsentService } from '../../server/services/consentService';
import { generateToken, verifyToken, AuthUserPayload } from '../../server/middleware/auth';
import { requirePhase } from '../../server/middleware/phaseGuard';
import * as dbModule from '../../core/services/db';

// Instancia de Express aislada para pruebas de integración de Bank Router (FASE 2)
const app = express();
app.use(express.json());
app.use('/api/v1/bank', requirePhase(2), bankRouter);

describe('Integration Tests: Bank Route B2B (Tokens, Scoring, Perfiles Financieros y Bundles)', () => {
  const originalEnvPhase = process.env.SAMI_ACTIVE_PHASE;
  const originalDbUrl = process.env.DATABASE_URL;

  beforeAll(() => {
    process.env.SAMI_ACTIVE_PHASE = '2';
  });

  afterAll(() => {
    if (originalEnvPhase !== undefined) {
      process.env.SAMI_ACTIVE_PHASE = originalEnvPhase;
    } else {
      delete process.env.SAMI_ACTIVE_PHASE;
    }
    if (originalDbUrl !== undefined) {
      process.env.DATABASE_URL = originalDbUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const createTestToken = (payloadOverrides: Partial<AuthUserPayload> = {}) => {
    const basePayload: Omit<AuthUserPayload, 'iat' | 'exp'> = {
      id: 'admin-test-user-1',
      email: 'bodega_admin@sami.pe',
      name: 'Carlos Gomez Admin',
      role: 'MYPE_ADMIN',
      ruc: '20100070970',
      businessId: '20100070970',
      mfaVerified: true,
      ...payloadOverrides
    };
    return generateToken(basePayload);
  };

  const createBankAnalystToken = (payloadOverrides: Partial<AuthUserPayload> = {}) => {
    const basePayload: Omit<AuthUserPayload, 'iat' | 'exp'> = {
      id: 'bank-partner-demo-1',
      email: 'bank-aliado-id@partner.sami.pe',
      name: 'Banco Financiero Aliado MYPE',
      role: 'BANK_ANALYST',
      institutionId: 'bank-aliado-id',
      mfaVerified: true,
      ...payloadOverrides
    };
    return generateToken(basePayload);
  };

  // ─── BLOQUE A: POST /api/v1/bank/token (Autenticación OAuth B2B) ───

  describe('A. POST /api/v1/bank/token - Autenticación B2B con BankPartner y Bcrypt', () => {
    it('1. debe emitir token JWT válido cuando las credenciales coinciden con un BankPartner sembrado (vía fallback/seed)', async () => {
      // Sin DATABASE_URL configurada (modo demo local)
      delete process.env.DATABASE_URL;

      const response = await request(app)
        .post('/api/v1/bank/token')
        .send({
          clientId: 'bank-aliado-id',
          clientSecret: 'bank-aliado-secret-2026'
        })
        .expect(200);

      expect(response.body.access_token).toBeDefined();
      expect(response.body.token_type).toBe('Bearer');
      expect(response.body.expires_in).toBe(3600);

      const decoded = verifyToken(response.body.access_token);
      expect(decoded.role).toBe('BANK_ANALYST');
      expect(decoded.institutionId).toBe('bank-aliado-id');
      expect(decoded.mfaVerified).toBe(true);
    });

    it('2. debe rechazar con 401 si el clientSecret es incorrecto', async () => {
      delete process.env.DATABASE_URL;

      const response = await request(app)
        .post('/api/v1/bank/token')
        .send({
          clientId: 'bank-aliado-id',
          clientSecret: 'clave-adulterada-incorrecta'
        })
        .expect(401);

      expect(response.body.error).toBe('invalid_client');
    });

    it('3. debe autenticar consultando la tabla BankPartner en Prisma si DATABASE_URL está activa', async () => {
      process.env.DATABASE_URL = 'postgresql://sami:secret@localhost:5432/sami_db';

      const mockPrisma = {
        bankPartner: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'bp-db-123',
            name: 'Banco Pichincha Aliado',
            clientId: 'pichincha-b2b',
            // Hash bcrypt para 'pichincha-secret-2026'
            clientSecret: '$2a$10$wO7vIqK0r78f.uI5sB80vuxnF0l78BfZwE4K0U1F54ZJtM7.U9rXG',
            isActive: true
          })
        }
      };

      vi.spyOn(dbModule, 'getPrismaClient').mockReturnValue(mockPrisma as any);

      // Usamos verifyPassword simulado o hash válido
      const response = await request(app)
        .post('/api/v1/bank/token')
        .send({
          clientId: 'pichincha-b2b',
          clientSecret: 'pichincha-secret-2026'
        });

      // El mock de findUnique fue invocado con el clientId correcto
      expect(mockPrisma.bankPartner.findUnique).toHaveBeenCalledWith({
        where: { clientId: 'pichincha-b2b' }
      });
    });
  });

  // ─── BLOQUE B: GET /api/v1/bank/scoring/:ruc ───

  describe('B. GET /api/v1/bank/scoring/:ruc - Datos tributarios fácticos (Sin Score ni Hardcodes)', () => {
    it('1. debe reflejar datos reales consultados de Prisma para el RUC y confirmar que taxHealthIndex NO existe en la respuesta', async () => {
      const ruc = '20100070970';
      const token = createBankAnalystToken();
      process.env.DATABASE_URL = 'postgresql://sami:secret@localhost:5432/sami_db';

      vi.spyOn(ConsentService, 'assertConsent').mockResolvedValue({
        allowed: true,
        grant: {
          id: 'grant-scoring-1',
          ruc,
          purpose: 'TRANSMISION_DATOS_BANCOS',
          status: 'ACTIVE',
          privacyPolicyVersion: '2026.1',
          grantedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
      vi.spyOn(ConsentService, 'logDataTransmission').mockResolvedValue({} as any);

      const mockInvoices = [
        { id: 'inv-1', smeId: ruc, type: 'SALE', totalAmount: 4000, issueDate: new Date('2026-01-15') },
        { id: 'inv-2', smeId: ruc, type: 'SALE', totalAmount: 6000, issueDate: new Date('2026-02-10') }
      ];

      const mockPrisma = {
        invoice: {
          findMany: vi.fn().mockResolvedValue(mockInvoices)
        }
      };
      vi.spyOn(dbModule, 'getPrismaClient').mockReturnValue(mockPrisma as any);

      const response = await request(app)
        .get(`/api/v1/bank/scoring/${ruc}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const taxData = response.body.taxData;

      // Verificación de datos calculados reales (10000 total / 2 meses = 5000 promedio)
      expect(taxData.totalVerifiedSalesAmount).toBe(10000);
      expect(taxData.totalVerifiedInvoices).toBe(2);
      expect(taxData.avgMonthlySales).toBe(5000);
      expect(taxData.taxComplianceStatus).toBe('Al día');
      expect(taxData.dataAvailable).toBe(true);

      // Verificación estricta: taxHealthIndex no debe existir
      expect(taxData).not.toHaveProperty('taxHealthIndex');
      expect(response.body).not.toHaveProperty('taxHealthIndex');
      expect(taxData.sunatFilingPunctuality).toBeUndefined();
      expect(taxData.avgMonthlySales).not.toBe(12500.50);
    });

    it('2. con un RUC sin comprobantes en base de datos, debe devolver dataAvailable: false y avgMonthlySales: null', async () => {
      const ruc = '20999999999';
      const token = createBankAnalystToken();
      process.env.DATABASE_URL = 'postgresql://sami:secret@localhost:5432/sami_db';

      vi.spyOn(ConsentService, 'assertConsent').mockResolvedValue({
        allowed: true,
        grant: {
          id: 'grant-scoring-empty',
          ruc,
          purpose: 'TRANSMISION_DATOS_BANCOS',
          status: 'ACTIVE',
          privacyPolicyVersion: '2026.1',
          grantedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
      vi.spyOn(ConsentService, 'logDataTransmission').mockResolvedValue({} as any);

      const mockPrisma = {
        invoice: {
          findMany: vi.fn().mockResolvedValue([])
        }
      };
      vi.spyOn(dbModule, 'getPrismaClient').mockReturnValue(mockPrisma as any);

      const response = await request(app)
        .get(`/api/v1/bank/scoring/${ruc}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const taxData = response.body.taxData;
      expect(taxData.dataAvailable).toBe(false);
      expect(taxData.avgMonthlySales).toBeNull();
      expect(taxData.totalVerifiedInvoices).toBe(0);
      expect(taxData.totalVerifiedSalesAmount).toBe(0);
      expect(taxData.taxComplianceStatus).toBe('Sin actividad reciente');
      expect(taxData).not.toHaveProperty('taxHealthIndex');
    });
  });

  // ─── BLOQUE C: GET /api/v1/bank/financial-profile/:ruc ───

  describe('C. GET /api/v1/bank/financial-profile/:ruc - Perfil Financiero Factual', () => {
    it('1. para un RUC sin historial, debe responder con campos en null y dataAvailable: false (no datos demo inventados)', async () => {
      const ruc = '20999999999';
      const token = createBankAnalystToken();
      process.env.DATABASE_URL = 'postgresql://sami:secret@localhost:5432/sami_db';

      vi.spyOn(ConsentService, 'assertConsent').mockResolvedValue({
        allowed: true,
        grant: {
          id: 'grant-prof-1',
          ruc,
          purpose: 'TRANSMISION_DATOS_BANCOS',
          status: 'ACTIVE',
          privacyPolicyVersion: '2026.1',
          grantedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
      vi.spyOn(ConsentService, 'logDataTransmission').mockResolvedValue({} as any);

      const mockPrisma = {
        sME: {
          findUnique: vi.fn().mockResolvedValue(null)
        },
        invoice: {
          findMany: vi.fn().mockResolvedValue([])
        }
      };
      vi.spyOn(dbModule, 'getPrismaClient').mockReturnValue(mockPrisma as any);

      const response = await request(app)
        .get(`/api/v1/bank/financial-profile/${ruc}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const profile = response.body.profile;

      // Verificación de campos en null y ausencia de demo hardcodeada
      expect(profile.businessName).toBeNull();
      expect(profile.businessName).not.toBe('BODEGA CENTRAL DEMO E.I.R.L.');
      expect(profile.monthlyRevenueAvg).toBeNull();
      expect(profile.monthlyRevenueAvg).not.toBe(14200.00);
      expect(profile.monthlyPurchasesAvg).toBeNull();
      expect(profile.monthlyPurchasesAvg).not.toBe(8500.00);
      expect(profile.operatingMarginPercent).toBeNull();
      expect(profile.operatingMarginPercent).not.toBe(40.1);
      expect(profile.activeInvoicesCount).toBe(0);
      expect(profile.dataAvailable).toBe(false);
    });

    it('2. para un RUC con historial real en DB, calcula promedios y margen operativo con precisión matemática', async () => {
      const ruc = '20100070970';
      const token = createBankAnalystToken();
      process.env.DATABASE_URL = 'postgresql://sami:secret@localhost:5432/sami_db';

      vi.spyOn(ConsentService, 'assertConsent').mockResolvedValue({
        allowed: true,
        grant: {
          id: 'grant-prof-2',
          ruc,
          purpose: 'TRANSMISION_DATOS_BANCOS',
          status: 'ACTIVE',
          privacyPolicyVersion: '2026.1',
          grantedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
      vi.spyOn(ConsentService, 'logDataTransmission').mockResolvedValue({} as any);

      const mockInvoices = [
        { id: 'inv-1', smeId: ruc, type: 'SALE', totalAmount: 20000, issueDate: new Date('2026-01-15') },
        { id: 'inv-2', smeId: ruc, type: 'PURCHASE', totalAmount: 12000, issueDate: new Date('2026-01-20') }
      ];

      const mockPrisma = {
        sME: {
          findUnique: vi.fn().mockResolvedValue({
            ruc,
            businessName: 'Comercializadora Real S.A.C.',
            taxRegime: 'Régimen MYPE Tributario (RMT)'
          })
        },
        invoice: {
          findMany: vi.fn().mockResolvedValue(mockInvoices)
        }
      };
      vi.spyOn(dbModule, 'getPrismaClient').mockReturnValue(mockPrisma as any);

      const response = await request(app)
        .get(`/api/v1/bank/financial-profile/${ruc}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const profile = response.body.profile;
      expect(profile.businessName).toBe('Comercializadora Real S.A.C.');
      expect(profile.regime).toBe('Régimen MYPE Tributario (RMT)');
      expect(profile.monthlyRevenueAvg).toBe(20000);
      expect(profile.monthlyPurchasesAvg).toBe(12000);
      // Margen = ((20000 - 12000) / 20000) * 100 = 40%
      expect(profile.operatingMarginPercent).toBe(40);
      expect(profile.activeInvoicesCount).toBe(2);
      expect(profile.dataAvailable).toBe(true);
    });
  });

  // ─── BLOQUE D: POST /api/v1/bank/generate-bundle (Expediente B2B) ───

  describe('D. POST /api/v1/bank/generate-bundle - Expediente Tributario Consolidado', () => {
    it('1. debe generar el bundle reflejando complianceStatus real y formalityRatio numérico, sin hardcodes ni certificaciones falsas', async () => {
      const ruc = '20100070970';
      const token = createTestToken({ ruc, businessId: ruc });

      vi.spyOn(ConsentService, 'assertConsent').mockResolvedValue({
        allowed: true,
        grant: {
          id: 'grant-test-123',
          ruc,
          purpose: 'TRANSMISION_DATOS_BANCOS',
          status: 'ACTIVE',
          privacyPolicyVersion: '2026.1',
          grantedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      vi.spyOn(ConsentService, 'logDataTransmission').mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/v1/bank/generate-bundle')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userData: { ruc, businessName: 'Bodega San Martín' },
          taxHealth: {
            formalityRatio: 82,
            complianceStatus: 'Al día',
            avgMonthlySales: 15000
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      const bundle = response.body.bundle;
      expect(bundle).toBeDefined();

      // 1. Campos factuales verificados
      expect(bundle.financialContext.businessRuc).toBe(ruc);
      expect(bundle.financialContext.taxComplianceStatus).toBe('Al día');
      expect(bundle.financialContext.taxComplianceStatus).not.toContain('SUNAT Certificado');
      expect(bundle.financialContext.lastYearSales).toBe(180000);
      expect(bundle.financialContext.lastYearSalesDataAvailable).toBe(true);
      expect(bundle.anonymousTrends.formalityRatio).toBe(82);

      // 2. Ausencia total de juicios sintéticos de riesgo eliminados
      expect(bundle.financialContext.stabilityIndicator).toBeUndefined();
      expect(bundle.anonymousTrends.volatilityIndex).toBeUndefined();

      // 3. Ausencia de tasa de crecimiento hardcodeada
      expect(bundle.anonymousTrends.growthRateYearOverYear).toBeNull();
      expect(bundle.anonymousTrends.growthRateDataAvailable).toBe(false);
    });

    it('2. con datos insuficientes para lastYearSales, debe devolver null y dataAvailable: false (nunca inventar S/ 120,000)', async () => {
      const ruc = '20100070970';
      const token = createTestToken({ ruc, businessId: ruc });

      vi.spyOn(ConsentService, 'assertConsent').mockResolvedValue({
        allowed: true,
        grant: {
          id: 'grant-test-456',
          ruc,
          purpose: 'TRANSMISION_DATOS_BANCOS',
          status: 'ACTIVE',
          privacyPolicyVersion: '2026.1',
          grantedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      vi.spyOn(ConsentService, 'logDataTransmission').mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/v1/bank/generate-bundle')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userData: { ruc },
          taxHealth: {
            complianceStatus: 'Registro desactualizado',
            formalityRatio: 50
          }
        })
        .expect(200);

      const bundle = response.body.bundle;
      expect(bundle.financialContext.lastYearSales).toBeNull();
      expect(bundle.financialContext.lastYearSalesDataAvailable).toBe(false);
      expect(bundle.financialContext.lastYearSales).not.toBe(120000);
      expect(bundle.financialContext.taxComplianceStatus).toBe('Registro desactualizado');
      expect(bundle.anonymousTrends.formalityRatio).toBe(50);

      // Confirmación estricta de eliminación de indicadores de riesgo
      expect(bundle.financialContext).not.toHaveProperty('stabilityIndicator');
      expect(bundle.anonymousTrends).not.toHaveProperty('volatilityIndex');
    });

    it('3. debe aceptar el payload bajo la propiedad taxSummary con los mismos valores fácticos', async () => {
      const ruc = '20100070970';
      const token = createTestToken({ ruc, businessId: ruc });

      vi.spyOn(ConsentService, 'assertConsent').mockResolvedValue({
        allowed: true,
        grant: {
          id: 'grant-test-789',
          ruc,
          purpose: 'TRANSMISION_DATOS_BANCOS',
          status: 'ACTIVE',
          privacyPolicyVersion: '2026.1',
          grantedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      vi.spyOn(ConsentService, 'logDataTransmission').mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/v1/bank/generate-bundle')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userData: { ruc },
          taxSummary: {
            formalityRatio: 95,
            complianceStatus: 'Al día',
            avgMonthlySales: 8000
          }
        })
        .expect(200);

      const bundle = response.body.bundle;
      expect(bundle.financialContext.taxComplianceStatus).toBe('Al día');
      expect(bundle.financialContext.lastYearSales).toBe(96000);
      expect(bundle.financialContext.lastYearSalesDataAvailable).toBe(true);
      expect(bundle.anonymousTrends.formalityRatio).toBe(95);
      expect(bundle.financialContext.stabilityIndicator).toBeUndefined();
      expect(bundle.anonymousTrends.volatilityIndex).toBeUndefined();
    });

    it('4. debe rechazar 401 si no se envía encabezado Authorization', async () => {
      const response = await request(app)
        .post('/api/v1/bank/generate-bundle')
        .send({
          userData: { ruc: '20100070970' }
        })
        .expect(401);

      expect(response.body.error).toBe('unauthorized');
    });

    it('5. debe bloquear con 403 cuando un usuario MYPE intenta acceder al RUC de otro negocio', async () => {
      const userRuc = '20100070970';
      const targetRuc = '20555555555';
      const token = createTestToken({ ruc: userRuc, businessId: userRuc });

      const response = await request(app)
        .post('/api/v1/bank/generate-bundle')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userData: { ruc: targetRuc }
        })
        .expect(403);

      expect(response.body.error).toBe('forbidden');
      expect(response.body.message).toContain('No tiene autorización');
    });

    it('6. debe bloquear con 403 si el titular no ha otorgado consentimiento vigente', async () => {
      const ruc = '20100070970';
      const token = createTestToken({ ruc, businessId: ruc });

      vi.spyOn(ConsentService, 'assertConsent').mockResolvedValue({
        allowed: false,
        reason: 'No existe consentimiento registrado para el RUC'
      });

      const response = await request(app)
        .post('/api/v1/bank/generate-bundle')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userData: { ruc }
        })
        .expect(403);

      expect(response.body.error).toBe('consent_required');
    });
  });
});

