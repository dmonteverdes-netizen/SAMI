import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import consentRouter from '../../server/routes/consent';
import { ConsentService, ConsentGrantModel, ArcoRequestModel } from '../../server/services/consentService';
import { generateToken, AuthUserPayload } from '../../server/middleware/auth';
import { requirePhase } from '../../server/middleware/phaseGuard';

// Instancia de Express aislada para pruebas de integración de consentimiento
const app = express();
app.use(express.json());
app.use('/api/v1', requirePhase(1), consentRouter);

describe('Integration Tests: Consent Router (Ley N° 29733 y Protección IDOR)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Helper para generar tokens con payload seguro
  const createTestToken = (payloadOverrides: Partial<AuthUserPayload> = {}) => {
    const basePayload: Omit<AuthUserPayload, 'iat' | 'exp'> = {
      id: 'test-user-1',
      email: 'mype@sami.pe',
      name: 'Usuario MYPE Prueba',
      role: 'MYPE_ADMIN',
      ruc: '20100070970',
      businessId: 'b1',
      mfaVerified: true,
      ...payloadOverrides
    };
    return generateToken(basePayload);
  };

  // ─── Test 1: POST /consent/grant ───
  it('1. POST /consent/grant: usuario autenticado y dueño del RUC otorga consentimiento exitosamente', async () => {
    const ruc = '20100070970';
    const token = createTestToken({ ruc, businessId: 'b1' });

    const mockGrant: ConsentGrantModel = {
      id: 'grant-123',
      ruc,
      purpose: 'TRANSMISION_DATOS_BANCOS',
      status: 'ACTIVE',
      privacyPolicyVersion: '2026.1',
      grantedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const grantSpy = vi.spyOn(ConsentService, 'grantConsent').mockResolvedValue(mockGrant);

    const response = await request(app)
      .post('/api/v1/consent/grant')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ruc,
        purpose: 'TRANSMISION_DATOS_BANCOS',
        privacyPolicyVersion: '2026.1'
      })
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('grant');
    expect(response.body.grant.status).toBe('ACTIVE');

    expect(grantSpy).toHaveBeenCalledTimes(1);
    expect(grantSpy).toHaveBeenCalledWith(
      ruc,
      'TRANSMISION_DATOS_BANCOS',
      expect.objectContaining({
        privacyPolicyVersion: '2026.1'
      })
    );
  });

  // ─── Test 2: POST /consent/revoke ───
  it('2. POST /consent/revoke: usuario revoca consentimiento de forma inmediata', async () => {
    const ruc = '20100070970';
    const token = createTestToken({ ruc, businessId: 'b1' });

    const mockRevocation: ConsentGrantModel = {
      id: 'grant-123',
      ruc,
      purpose: 'TRANSMISION_DATOS_BANCOS',
      status: 'REVOKED',
      privacyPolicyVersion: '2026.1',
      grantedAt: new Date(Date.now() - 3600000).toISOString(),
      revokedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const revokeSpy = vi.spyOn(ConsentService, 'revokeConsent').mockResolvedValue(mockRevocation);

    const response = await request(app)
      .post('/api/v1/consent/revoke')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ruc,
        purpose: 'TRANSMISION_DATOS_BANCOS'
      })
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body.grant.status).toBe('REVOKED');

    expect(revokeSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith(
      ruc,
      'TRANSMISION_DATOS_BANCOS',
      expect.objectContaining({
        ipAddress: expect.any(String),
        userAgent: expect.any(String)
      })
    );
  });

  // ─── Test 3: TEST DE IDOR (Insecure Direct Object Reference) ───
  it('3. [IDOR SHIELD] Bloquea con 403 si un usuario intenta acceder o modificar el consentimiento de un RUC ajeno sin llamar al servicio', async () => {
    // Usuario de la Empresa A (RUC: 20100070970, businessId: 'b-empresa-a')
    const tokenEmpresaA = createTestToken({
      id: 'user-a',
      ruc: '20100070970',
      businessId: 'b-empresa-a'
    });

    const targetRucAjeno = '20601234565'; // Empresa B

    const getStatusSpy = vi.spyOn(ConsentService, 'getConsentStatus');
    const grantSpy = vi.spyOn(ConsentService, 'grantConsent');

    // 3a. Intento de lectura ajena: GET /api/v1/consent/:ruc
    const resGet = await request(app)
      .get(`/api/v1/consent/${targetRucAjeno}`)
      .set('Authorization', `Bearer ${tokenEmpresaA}`)
      .expect(403);

    expect(resGet.body).toHaveProperty('code', 'IDOR_VIOLATION');
    expect(getStatusSpy).not.toHaveBeenCalled();

    // 3b. Intento de escritura ajena: POST /api/v1/consent/grant
    const resPost = await request(app)
      .post('/api/v1/consent/grant')
      .set('Authorization', `Bearer ${tokenEmpresaA}`)
      .send({
        ruc: targetRucAjeno,
        purpose: 'TRANSMISION_DATOS_BANCOS'
      })
      .expect(403);

    expect(resPost.body).toHaveProperty('code', 'IDOR_VIOLATION');
    expect(grantSpy).not.toHaveBeenCalled();
  });

  // ─── Test 4: Rechazo estricto sin excepción hardcodeada 'b1' / '20100070970' ───
  it('4. Token con businessId: b1 y ruc: undefined recibe 403 al intentar acceder a RUC 20100070970 (eliminación de excepción hardcodeada)', async () => {
    // Token sin ruc explícito en el payload y con businessId arbitrario ('b1')
    const tokenB1SinRuc = createTestToken({
      id: 'user-legacy-b1',
      ruc: undefined,
      businessId: 'b1'
    });

    const getStatusSpy = vi.spyOn(ConsentService, 'getConsentStatus');

    // Con el RUC 20100070970 -> Bloquea con 403 IDOR (ya no existe excepción b1)
    const resBloqueado = await request(app)
      .get('/api/v1/consent/20100070970')
      .set('Authorization', `Bearer ${tokenB1SinRuc}`)
      .expect(403);

    expect(resBloqueado.body).toHaveProperty('code', 'IDOR_VIOLATION');
    expect(getStatusSpy).not.toHaveBeenCalled();
  });

  // ─── Test 5: Comportamiento con roles BANK_ (requireOwnBusiness vs requirePermission) ───
  it('5. Usuario con rol BANK_ pasa requireOwnBusiness pero es bloqueado por requirePermission si carece de CONSENT_READ/CONSENT_WRITE', async () => {
    // 5a. Rol BANK_ANALYST sin permiso CONSENT_READ (según matriz ROLE_PERMISSIONS)
    const tokenBankSinPermiso = createTestToken({
      id: 'bank-analyst-1',
      role: 'BANK_ANALYST',
      institutionId: 'banco-aliado',
      ruc: undefined,
      businessId: 'none'
    });

    const getStatusSpy = vi.spyOn(ConsentService, 'getConsentStatus');

    const resBank = await request(app)
      .get('/api/v1/consent/20100070970')
      .set('Authorization', `Bearer ${tokenBankSinPermiso}`)
      .expect(403);

    // El bloqueo proviene de requirePermission ('FORBIDDEN'), NO de requireOwnBusiness ('IDOR_VIOLATION')
    expect(resBank.body).toHaveProperty('code', 'FORBIDDEN');
    expect(resBank.body).toHaveProperty('requiredPermission', 'CONSENT_READ');
    expect(getStatusSpy).not.toHaveBeenCalled();

    // 5b. Rol SAMI_ADMIN o MYPE_ADMIN (que sí cuenta con el permiso CONSENT_READ) -> Pasa con 200
    const tokenSamiAdmin = createTestToken({
      id: 'sami-admin-1',
      role: 'SAMI_ADMIN',
      businessId: 'sami-internal'
    });

    vi.spyOn(ConsentService, 'getConsentStatus').mockResolvedValue([]);

    const resAdmin = await request(app)
      .get('/api/v1/consent/20100070970')
      .set('Authorization', `Bearer ${tokenSamiAdmin}`)
      .expect(200);

    expect(resAdmin.body).toHaveProperty('success', true);
  });

  // ─── Test 6: POST /arco/requests (Ruta Pública de Derechos ARCO) ───
  it('6. POST /arco/requests: valida esquema con 400 si el email es inválido, y responde 200 con caseCode cuando es válido', async () => {
    // 6a. Payload inválido (email no válido y detalles muy cortos)
    const invalidPayload = {
      ruc: '20100070970',
      fullName: 'Carlos Gomez',
      email: 'correo_invalido_sin_arroba',
      rightType: 'ACCESO',
      details: 'corto'
    };

    const resInvalid = await request(app)
      .post('/api/v1/arco/requests')
      .send(invalidPayload)
      .expect(400);

    expect(resInvalid.body).toHaveProperty('error', 'invalid_payload');
    expect(resInvalid.body.details).toHaveProperty('email');
    expect(resInvalid.body.details).toHaveProperty('details');

    // 6b. Payload válido sin necesidad de token de autenticación (ejercicio público de derechos ARCO)
    const validPayload = {
      ruc: '20100070970',
      fullName: 'Carlos Gomez',
      email: 'carlos@bodegadoncarlos.pe',
      rightType: 'OPOSICION',
      details: 'Solicito formalmente la oposición al tratamiento de datos para fines comerciales.'
    };

    const mockArcoResponse: ArcoRequestModel = {
      id: 'arco-uuid-123',
      caseCode: 'ARCO-2026-0042',
      ruc: '20100070970',
      fullName: 'Carlos Gomez',
      email: 'carlos@bodegadoncarlos.pe',
      rightType: 'OPOSICION',
      status: 'PENDIENTE',
      details: validPayload.details,
      submittedAt: new Date().toISOString(),
      deadlineAt: new Date(Date.now() + 10 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };

    const arcoSpy = vi.spyOn(ConsentService, 'createArcoRequest').mockResolvedValue(mockArcoResponse);

    const resValid = await request(app)
      .post('/api/v1/arco/requests')
      .send(validPayload)
      .expect(200);

    expect(resValid.body).toHaveProperty('success', true);
    expect(resValid.body).toHaveProperty('request');
    expect(resValid.body.request.caseCode).toBe('ARCO-2026-0042');
    expect(resValid.body.request.status).toBe('PENDIENTE');

    expect(arcoSpy).toHaveBeenCalledTimes(1);
    expect(arcoSpy).toHaveBeenCalledWith(expect.objectContaining({
      ruc: '20100070970',
      email: 'carlos@bodegadoncarlos.pe',
      rightType: 'OPOSICION'
    }));
  });
});
