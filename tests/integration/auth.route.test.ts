import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRouter, { resetKnownUsersStore } from '../../server/routes/auth';
import { generateToken, AuthUserPayload } from '../../server/middleware/auth';
import { resetAuthRateLimiterStore } from '../../server/middleware/authRateLimiter';
import { requirePhase } from '../../server/middleware/phaseGuard';

// Instancia de Express aislada para pruebas de integración de autenticación y registro
const app = express();
app.use(express.json());
app.use('/api/v1/auth', requirePhase(1), authRouter);

describe('Integration Tests: Auth & Onboarding Router (POST /register & POST /invite)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetKnownUsersStore();
    resetAuthRateLimiterStore();
  });

  // Helper para generar tokens de prueba con payload seguro
  const createTestToken = (payloadOverrides: Partial<AuthUserPayload> = {}) => {
    const basePayload: Omit<AuthUserPayload, 'iat' | 'exp'> = {
      id: 'admin-test-user-1',
      email: 'bodega_admin@sami.pe',
      name: 'Carlos Gomez Admin',
      role: 'MYPE_ADMIN',
      ruc: '20100070970',
      businessId: 'b_test_admin_123',
      mfaVerified: true,
      ...payloadOverrides
    };
    return generateToken(basePayload);
  };

  // ─── PARTE 1: POST /api/v1/auth/register ───

  describe('1. POST /api/v1/auth/register - Registro de Negocio y Usuario MYPE', () => {
    it('1. Registro con DNI válido, nombre de negocio y contraseña válida -> 201, JWT presente y datos de usuario', async () => {
      const payload = {
        identifier: '48927182', // DNI 8 dígitos
        businessName: 'Bodega Santa Rosa de Lima',
        ownerName: 'Rosa Flores Quispe',
        password: 'PasswordSeguro2026!'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(payload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.name).toBe('Rosa Flores Quispe');
      expect(response.body.user.email).toBe('48927182@mype.sami.pe');
      expect(response.body.user.role).toBe('MYPE_ADMIN');
      expect(response.body.user.businessId).toBe('b_48927182');
    });

    it('1b. Registro con persistencia en Base de Datos (mock de Prisma client) -> verifica inserción en modelo User', async () => {
      const dbUrlBackup = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://sami_user:secret@localhost:5432/sami_db';

      // Importar dinámicamente o mockear db
      const dbModule = await import('../../core/services/db');
      const mockPrisma = {
        user: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation(({ data }) => Promise.resolve({
            id: 'usr_prisma_123',
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
          }))
        },
        sME: {
          upsert: vi.fn().mockResolvedValue({})
        }
      };

      const dbSpy = vi.spyOn(dbModule, 'getPrismaClient').mockReturnValue(mockPrisma as any);

      const payload = {
        identifier: '988112233', // Celular único
        businessName: 'Bodega San Martín',
        ownerName: 'José San Martín',
        password: 'Password2026!',
        ruc: '20131312955' // RUC válido con checksum (SUNAT)
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(payload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          identifier: '988112233',
          role: 'MYPE_ADMIN',
          ruc: '20131312955'
        })
      }));

      dbSpy.mockRestore();
      if (dbUrlBackup !== undefined) {
        process.env.DATABASE_URL = dbUrlBackup;
      } else {
        delete process.env.DATABASE_URL;
      }
    });

    it('2. Registro con identifier duplicado -> 409 Conflict', async () => {
      // Registrar primero una cuenta
      const initialPayload = {
        identifier: '72345678',
        businessName: 'Minimarket Los Andes',
        ownerName: 'Luis Morales',
        password: 'Password2026!'
      };

      await request(app)
        .post('/api/v1/auth/register')
        .send(initialPayload)
        .expect(201);

      // Intentar registrar el mismo identificador
      const duplicatePayload = {
        identifier: '72345678',
        businessName: 'Otro Negocio',
        ownerName: 'Otro Nombre',
        password: 'Password2026!'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(duplicatePayload)
        .expect(409);

      expect(response.body.error).toBe('conflict');
      expect(response.body.message).toContain('ya se encuentra registrado');
    });

    it('3. Registro con RUC de checksum inválido -> 400 Bad Request', async () => {
      const payloadWithBadRuc = {
        identifier: '987654321', // Celular 9 dígitos
        businessName: 'Comercializadora El Sol',
        ownerName: 'Juan Carlos Pérez',
        password: 'Password2026!',
        ruc: '20100070979' // Checksum Módulo 11 inválido (el correcto para 2010007097 es 0)
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(payloadWithBadRuc)
        .expect(400);

      expect(response.body.error).toBe('invalid_ruc');
      expect(response.body.message).toContain('algoritmo SUNAT Módulo 11');
    });

    it('4. Registro con contraseña débil (ej. "12345") -> 400 Bad Request', async () => {
      const payloadWeakPassword = {
        identifier: '71829304',
        businessName: 'Bazar Central',
        ownerName: 'Ana María Santos',
        password: '12345' // Menos de 8 caracteres y sin mezcla de letras/números
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(payloadWeakPassword)
        .expect(400);

      expect(response.body.error).toBe('invalid_payload');
    });
  });

  // ─── PARTE 2: POST /api/v1/auth/invite - Invitar Colaborador ───

  describe('2. POST /api/v1/auth/invite - Invitar Colaborador (MYPE_ADMIN)', () => {
    it('5. MYPE_ADMIN autenticado invita con éxito -> 201, businessId coincide con admin, rol asignado, contraseña temporal generada', async () => {
      const adminBusinessId = 'b_bodega_central_456';
      const adminToken = createTestToken({
        role: 'MYPE_ADMIN',
        businessId: adminBusinessId,
        ruc: '20100070970'
      });

      const invitePayload = {
        email: 'colaborador.ventas@bodegacentral.pe',
        name: 'Mariela Alva',
        role: 'MYPE_WORKER'
      };

      const response = await request(app)
        .post('/api/v1/auth/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invitePayload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('colaborador.ventas@bodegacentral.pe');
      expect(response.body.user.name).toBe('Mariela Alva');
      expect(response.body.user.role).toBe('MYPE_WORKER');
      expect(response.body.user.businessId).toBe(adminBusinessId);
      expect(response.body.temporaryPassword).toBeDefined();
      expect(typeof response.body.temporaryPassword).toBe('string');
      expect(response.body.temporaryPassword.length).toBeGreaterThanOrEqual(8);
    });

    it('6. Test de Seguridad (Protección IDOR): si el body incluye un businessId ajeno, la ruta lo IGNORA y usa req.user.businessId', async () => {
      const authenticAdminBusinessId = 'b_empresa_legitima_888';
      const adminToken = createTestToken({
        role: 'MYPE_ADMIN',
        businessId: authenticAdminBusinessId,
        ruc: '20100070970'
      });

      // El atacante intenta inyectar un colaborador en un negocio ajeno mediante el body
      const maliciousPayload = {
        email: 'contador.externo@estudioaudit.pe',
        name: 'Roberto Contador',
        role: 'MYPE_ACCOUNTANT',
        businessId: 'b_negocio_ajeno_hackeado_999', // Campo malicioso en el body
        ruc: '20601234567' // RUC ajeno en el body
      };

      const response = await request(app)
        .post('/api/v1/auth/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(maliciousPayload)
        .expect(201);

      // Confirmar que el nuevo colaborador fue vinculado estrictamente al negocio del admin autenticado
      expect(response.body.user.businessId).toBe(authenticAdminBusinessId);
      expect(response.body.user.businessId).not.toBe('b_negocio_ajeno_hackeado_999');
      expect(response.body.user.role).toBe('MYPE_ACCOUNTANT');
    });

    it('7. Un usuario con rol MYPE_WORKER (no admin) intenta invitar a alguien -> 403 Forbidden', async () => {
      const workerToken = createTestToken({
        role: 'MYPE_WORKER',
        businessId: 'b_bodega_central_456'
      });

      const unauthorizedPayload = {
        email: 'amigo@gmail.com',
        name: 'Amigo No Autorizado',
        role: 'MYPE_WORKER'
      };

      const response = await request(app)
        .post('/api/v1/auth/invite')
        .set('Authorization', `Bearer ${workerToken}`)
        .send(unauthorizedPayload)
        .expect(403);

      expect(response.body.error).toBe('forbidden');
      expect(response.body.message).toContain('Solo un Administrador MYPE (MYPE_ADMIN) puede invitar');
    });
  });

  // ─── PARTE 3: POST /api/v1/auth/login - Autenticación con Base de Datos y Memoria ───

  describe('3. POST /api/v1/auth/login - Soporte de Autenticación Híbrida (Semillas + PostgreSQL)', () => {
    it('8. Usuario registrado en PostgreSQL (inexistente en KNOWN_USERS de memoria) inicia sesión exitosamente tras reinicio', async () => {
      const dbUrlBackup = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://sami_user:secret@localhost:5432/sami_db';

      // Importar módulos de hash y db
      const { hashPassword } = await import('../../server/auth/password');
      const dbModule = await import('../../core/services/db');

      const plainPassword = 'PasswordDBReal2026!';
      const dbPasswordHash = await hashPassword(plainPassword);

      const dbUserRecord = {
        id: 'usr_db_persisted_999',
        identifier: '44556677',
        email: 'cliente.real.persisted@bodegamype.pe',
        name: 'Dario Monteverde',
        passwordHash: dbPasswordHash,
        role: 'MYPE_ADMIN',
        businessId: 'b_44556677',
        ruc: '20100070970',
        institutionId: null,
        twoFactorSecret: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockPrisma = {
        user: {
          findFirst: vi.fn().mockResolvedValue(dbUserRecord)
        }
      };

      const dbSpy = vi.spyOn(dbModule, 'getPrismaClient').mockReturnValue(mockPrisma as any);

      // Petición de login con credenciales del usuario que solo existe en PostgreSQL
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'cliente.real.persisted@bodegamype.pe',
          password: plainPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe('usr_db_persisted_999');
      expect(response.body.user.email).toBe('cliente.real.persisted@bodegamype.pe');
      expect(response.body.user.name).toBe('Dario Monteverde');
      expect(response.body.user.role).toBe('MYPE_ADMIN');
      expect(response.body.user.businessId).toBe('b_44556677');
      expect(mockPrisma.user.findFirst).toHaveBeenCalledTimes(1);

      dbSpy.mockRestore();
      if (dbUrlBackup !== undefined) {
        process.env.DATABASE_URL = dbUrlBackup;
      } else {
        delete process.env.DATABASE_URL;
      }
    });

    it('9. Usuario en PostgreSQL con contraseña errónea -> 401 Unauthorized', async () => {
      const dbUrlBackup = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://sami_user:secret@localhost:5432/sami_db';

      const { hashPassword } = await import('../../server/auth/password');
      const dbModule = await import('../../core/services/db');

      const correctPassword = 'PasswordCorrecta2026!';
      const dbPasswordHash = await hashPassword(correctPassword);

      const dbUserRecord = {
        id: 'usr_db_persisted_888',
        identifier: '77889900',
        email: 'usuario.db.error@bodega.pe',
        name: 'Usuario Prueba DB',
        passwordHash: dbPasswordHash,
        role: 'MYPE_ADMIN',
        businessId: 'b_77889900',
        ruc: null,
        institutionId: null,
        twoFactorSecret: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockPrisma = {
        user: {
          findFirst: vi.fn().mockResolvedValue(dbUserRecord)
        }
      };

      const dbSpy = vi.spyOn(dbModule, 'getPrismaClient').mockReturnValue(mockPrisma as any);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'usuario.db.error@bodega.pe',
          password: 'PasswordIncorrecta!'
        })
        .expect(401);

      expect(response.body.error).toContain('Credenciales inválidas');
      expect(response.body.code).toBe('INVALID_CREDENTIALS');

      dbSpy.mockRestore();
      if (dbUrlBackup !== undefined) {
        process.env.DATABASE_URL = dbUrlBackup;
      } else {
        delete process.env.DATABASE_URL;
      }
    });

    it('10. Usuario semilla de demostración (en memoria) autentica de inmediato sin requerir consulta a base de datos', async () => {
      const dbUrlBackup = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://sami_user:secret@localhost:5432/sami_db';

      const dbModule = await import('../../core/services/db');
      const mockPrisma = {
        user: {
          findFirst: vi.fn().mockResolvedValue(null)
        }
      };

      const dbSpy = vi.spyOn(dbModule, 'getPrismaClient').mockReturnValue(mockPrisma as any);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'bodega@sami.pe',
          password: 'Mype2024!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('bodega@sami.pe');
      expect(response.body.user.role).toBe('MYPE_ADMIN');
      // La base de datos no debe haber sido consultada porque se resolvió directamente en memoria
      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();

      dbSpy.mockRestore();
      if (dbUrlBackup !== undefined) {
        process.env.DATABASE_URL = dbUrlBackup;
      } else {
        delete process.env.DATABASE_URL;
      }
    });
  });

  // ─── PARTE 4: Rate Limiting en /auth/login y /auth/register ───

  describe('4. Rate Limiting en Autenticación y Registro (authRateLimiter)', () => {
    it('11. Exceder 5 intentos fallidos consecutivos en /login bloquea con HTTP 429', async () => {
      const targetEmail = 'ratelimit.test@bodega.pe';

      // 5 intentos fallidos con contraseña incorrecta
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: targetEmail,
            password: 'BadPassword123!'
          })
          .expect(401);
      }

      // El 6to intento debe recibir 429 Too Many Requests
      const blockedResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: targetEmail,
          password: 'BadPassword123!'
        })
        .expect(429);

      expect(blockedResponse.body.error).toBe('rate_limit_exceeded');
      expect(blockedResponse.body.code).toBe('TOO_MANY_FAILED_ATTEMPTS');
      expect(blockedResponse.body.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('11b. Exceder 5 intentos de registro desde la misma IP bloquea POST /register con HTTP 429', async () => {
      // 5 intentos de registro (cada uno con datos distintos)
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post('/api/v1/auth/register')
          .send({
            identifier: `91000000${i}`,
            businessName: `Negocio RateLimit ${i}`,
            ownerName: `Titular ${i}`,
            password: 'PasswordSeguro2026!'
          })
          .expect(201);
      }

      // El 6to intento desde la misma IP debe ser bloqueado con 429
      const blockedResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          identifier: '910000006',
          businessName: 'Negocio RateLimit 6',
          ownerName: 'Titular 6',
          password: 'PasswordSeguro2026!'
        })
        .expect(429);

      expect(blockedResponse.body.error).toBe('rate_limit_exceeded');
      expect(blockedResponse.body.code).toBe('TOO_MANY_REGISTRATION_ATTEMPTS');
      expect(blockedResponse.body.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  // ─── PARTE 5: Verificación de Endpoints Huérfanos Depurados ───

  describe('5. Endpoints Huérfanos Depurados (No Expuestos)', () => {
    it('11c. POST /api/v1/auth/validate-ruc y GET /api/v1/auth/permissions-matrix retornan 404', async () => {
      await request(app)
        .post('/api/v1/auth/validate-ruc')
        .send({ ruc: '20100070970' })
        .expect(404);

      await request(app)
        .get('/api/v1/auth/permissions-matrix')
        .expect(404);
    });
  });

  // ─── PARTE 6: POST /api/v1/auth/reset-collaborator-password ───

  describe('6. POST /api/v1/auth/reset-collaborator-password', () => {
    it('12. MYPE_ADMIN restablece contraseña de colaborador de su propio negocio -> 200 y emite password temporal', async () => {
      const adminToken = createTestToken({
        role: 'MYPE_ADMIN',
        businessId: 'b1'
      });

      const response = await request(app)
        .post('/api/v1/auth/reset-collaborator-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'empleado@sami.pe' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.temporaryPassword).toBeDefined();
      expect(typeof response.body.temporaryPassword).toBe('string');
      expect(response.body.temporaryPassword).toMatch(/^Sami[a-f0-9]{8}2026!$/);
      expect(response.body.user.email).toBe('empleado@sami.pe');
    });

    it('13. No-admin (MYPE_WORKER) intenta restablecer contraseña -> 403 Forbidden', async () => {
      const workerToken = createTestToken({
        role: 'MYPE_WORKER',
        businessId: 'b1'
      });

      const response = await request(app)
        .post('/api/v1/auth/reset-collaborator-password')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ email: 'contador@sami.pe' })
        .expect(403);

      expect(response.body.error).toBe('forbidden');
    });

    it('14. Protección IDOR: MYPE_ADMIN intenta restablecer contraseña de usuario de otro negocio -> 403 Forbidden', async () => {
      const adminToken = createTestToken({
        role: 'MYPE_ADMIN',
        businessId: 'b_otro_negocio_777' // Negocio diferente de b1
      });

      const response = await request(app)
        .post('/api/v1/auth/reset-collaborator-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'empleado@sami.pe' }) // Pertenece a b1
        .expect(403);

      expect(response.body.error).toBe('forbidden');
      expect(response.body.message).toContain('no pertenece a tu negocio');
    });
  });

  // ─── PARTE 7: POST /api/v1/auth/deactivate-account y GET /api/v1/auth/export-my-data ───

  describe('7. Desafiliación y Portabilidad de Datos', () => {
    it('15. MYPE_ADMIN solicita desactivación de cuenta -> 200, y no puede volver a iniciar sesión (403)', async () => {
      const adminToken = createTestToken({
        id: 'u2',
        role: 'MYPE_ADMIN',
        businessId: 'b1',
        email: 'bodega@sami.pe'
      });

      // 1. Solicitar desactivación
      const deactivateRes = await request(app)
        .post('/api/v1/auth/deactivate-account')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(deactivateRes.body.success).toBe(true);
      expect(deactivateRes.body.message).toContain('desactivada exitosamente');

      // 2. Intentar login con la cuenta desactivada -> 403 ACCOUNT_DEACTIVATED
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'bodega@sami.pe',
          password: 'Mype2024!'
        })
        .expect(403);

      expect(loginRes.body.code).toBe('ACCOUNT_DEACTIVATED');
      expect(loginRes.body.message).toContain('se encuentra desactivada');
    });

    it('16. GET /api/v1/auth/export-my-data -> 200 con payload estructurado JSON y aviso legal de retención', async () => {
      const adminToken = createTestToken({
        id: 'u2',
        role: 'MYPE_ADMIN',
        businessId: 'b1',
        ruc: '20100070970',
        email: 'bodega@sami.pe'
      });

      const response = await request(app)
        .get('/api/v1/auth/export-my-data')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.legalNotice).toContain('Ley N° 29733');
      expect(response.body.legalNotice).toContain('Código Tributario');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.user.email).toBe('bodega@sami.pe');
      expect(Array.isArray(response.body.data.collaborators)).toBe(true);
      expect(Array.isArray(response.body.data.sales)).toBe(true);
      expect(Array.isArray(response.body.data.purchases)).toBe(true);
    });
  });
});
