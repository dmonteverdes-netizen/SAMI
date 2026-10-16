import fs from 'fs';
import path from 'path';
import { getPrismaClient } from '../../core/services/db';
import { logger } from '../../core/services/logger';

export type ConsentPurpose =
  | 'TRANSMISION_DATOS_BANCOS'
  | 'ANALISIS_TRIBUTARIO'
  | 'COMUNICACIONES_COMERCIALES'
  | 'INTEGRACION_PSE';

export type ConsentStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';
export type ConsentAction = 'GRANTED' | 'REVOKED';

export type ArcoRightType = 'ACCESO' | 'RECTIFICACION' | 'CANCELACION' | 'OPOSICION';
export type ArcoRequestStatus = 'PENDIENTE' | 'EN_EVALUACION' | 'APROBADO' | 'DENEGADO' | 'COMPLETADO';

export interface ConsentGrantModel {
  id: string;
  ruc: string;
  purpose: ConsentPurpose;
  status: ConsentStatus;
  privacyPolicyVersion: string;
  grantedAt: string;
  revokedAt?: string | null;
  expiresAt?: string | null;
  updatedAt: string;
}

export interface ConsentEventModel {
  id: string;
  ruc: string;
  purpose: ConsentPurpose;
  action: ConsentAction;
  privacyPolicyVersion: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface DataTransmissionLogModel {
  id: string;
  ruc: string;
  purpose: ConsentPurpose;
  recipientEntity: string;
  transmittedAt: string;
  consentGrantId?: string | null;
  payloadSummary?: string | null;
  status: string;
}

export interface ArcoRequestModel {
  id: string;
  caseCode: string;
  ruc: string;
  fullName: string;
  email: string;
  rightType: ArcoRightType;
  status: ArcoRequestStatus;
  details: string;
  responseNotes?: string | null;
  submittedAt: string;
  deadlineAt: string;
  resolvedAt?: string | null;
  updatedAt: string;
}

interface LocalConsentStore {
  grants: Record<string, ConsentGrantModel>; // key: `${ruc}_${purpose}`
  events: ConsentEventModel[];
  transmissions: DataTransmissionLogModel[];
  arcoRequests: ArcoRequestModel[];
}

const ALL_PURPOSES: ConsentPurpose[] = [
  'TRANSMISION_DATOS_BANCOS',
  'ANALISIS_TRIBUTARIO',
  'COMUNICACIONES_COMERCIALES',
  'INTEGRACION_PSE'
];

const storeFilePath = path.join(process.cwd(), 'data', 'consent_store.json');

function getStore(): LocalConsentStore {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(storeFilePath)) {
    try {
      return JSON.parse(fs.readFileSync(storeFilePath, 'utf-8'));
    } catch {
      // Fallback
    }
  }

  // Initial seed with demo grants for sandbox RUCs
  const initialStore: LocalConsentStore = {
    grants: {
      '20100070970_TRANSMISION_DATOS_BANCOS': {
        id: 'grant-seed-1',
        ruc: '20100070970',
        purpose: 'TRANSMISION_DATOS_BANCOS',
        status: 'ACTIVE',
        privacyPolicyVersion: '2026.1',
        grantedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
      },
      '20100070970_ANALISIS_TRIBUTARIO': {
        id: 'grant-seed-2',
        ruc: '20100070970',
        purpose: 'ANALISIS_TRIBUTARIO',
        status: 'ACTIVE',
        privacyPolicyVersion: '2026.1',
        grantedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
      },
      '20100070970_INTEGRACION_PSE': {
        id: 'grant-seed-3',
        ruc: '20100070970',
        purpose: 'INTEGRACION_PSE',
        status: 'ACTIVE',
        privacyPolicyVersion: '2026.1',
        grantedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
      }
    },
    events: [
      {
        id: 'event-seed-1',
        ruc: '20100070970',
        purpose: 'TRANSMISION_DATOS_BANCOS',
        action: 'GRANTED',
        privacyPolicyVersion: '2026.1',
        ipAddress: '190.235.12.84',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'event-seed-2',
        ruc: '20100070970',
        purpose: 'ANALISIS_TRIBUTARIO',
        action: 'GRANTED',
        privacyPolicyVersion: '2026.1',
        ipAddress: '190.235.12.84',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
      }
    ],
    transmissions: [
      {
        id: 'tx-seed-1',
        ruc: '20100070970',
        purpose: 'TRANSMISION_DATOS_BANCOS',
        recipientEntity: 'Banco Aliado S.A. (Interbank Open Finance)',
        transmittedAt: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
        consentGrantId: 'grant-seed-1',
        payloadSummary: 'Expediente tributario: 24 facturas de venta validadas SUNAT, ventas declaradas S/ 124,500.00',
        status: 'SUCCESS'
      }
    ],
    arcoRequests: [
      {
        id: 'arco-seed-1',
        caseCode: 'ARCO-2026-1048',
        ruc: '20100070970',
        fullName: 'Carlos Gómez Delgado',
        email: 'carlos@bodegacentral.pe',
        rightType: 'ACCESO',
        status: 'COMPLETADO',
        details: 'Solicitud de informe consolidado de bancos de datos personales registrados a nombre de Bodega Central S.A.C.',
        responseNotes: 'Expediente entregado vía correo electrónico con firma digital del Oficial de Privacidad SAMI.',
        submittedAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
        deadlineAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        resolvedAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString()
      }
    ]
  };

  try {
    fs.writeFileSync(storeFilePath, JSON.stringify(initialStore, null, 2), 'utf-8');
  } catch {
    // Ignore
  }

  return initialStore;
}

function saveStore(store: LocalConsentStore): void {
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(storeFilePath, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Consent Store] Error writing local store file:', err);
  }
}

/**
 * Service to manage granular consent, immutable audit events, data transmissions,
 * and ARCO rights according to Peruvian Law N° 29733 (Protección de Datos Personales).
 */
export class ConsentService {
  private static getPolicyVersion(): string {
    return process.env.PRIVACY_POLICY_VERSION || '2026.1';
  }

  /**
   * Retrieves active or latest consent status for all granular purposes for a given RUC.
   */
  static async getConsentStatus(ruc: string): Promise<ConsentGrantModel[]> {
    const cleanRuc = ruc.trim();

    // Check DB first if configured
    if (process.env.DATABASE_URL) {
      try {
        const prisma = getPrismaClient();
        const dbGrants = await prisma.consentGrant.findMany({
          where: { ruc: cleanRuc }
        });

        const grantsByPurpose = new Map<string, any>();
        dbGrants.forEach((g) => grantsByPurpose.set(g.purpose, g));

        return ALL_PURPOSES.map((purpose) => {
          const found = grantsByPurpose.get(purpose);
          if (found) {
            return {
              id: found.id,
              ruc: found.ruc,
              purpose: found.purpose as ConsentPurpose,
              status: found.status as ConsentStatus,
              privacyPolicyVersion: found.privacyPolicyVersion,
              grantedAt: found.grantedAt.toISOString(),
              revokedAt: found.revokedAt ? found.revokedAt.toISOString() : null,
              expiresAt: found.expiresAt ? found.expiresAt.toISOString() : null,
              updatedAt: found.updatedAt.toISOString()
            };
          }
          return {
            id: `default_${cleanRuc}_${purpose}`,
            ruc: cleanRuc,
            purpose,
            status: 'REVOKED' as ConsentStatus,
            privacyPolicyVersion: this.getPolicyVersion(),
            grantedAt: new Date().toISOString(),
            revokedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        });
      } catch (err: any) {
        logger.warn('[ConsentService] DB query failed, falling back to local store.', { ruc: cleanRuc, error: err?.message });
      }
    }

    // Fallback store
    const store = getStore();
    return ALL_PURPOSES.map((purpose) => {
      const key = `${cleanRuc}_${purpose}`;
      const found = store.grants[key];
      if (found) {
        return found;
      }
      return {
        id: `default_${cleanRuc}_${purpose}`,
        ruc: cleanRuc,
        purpose,
        status: 'REVOKED',
        privacyPolicyVersion: this.getPolicyVersion(),
        grantedAt: new Date().toISOString(),
        revokedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
  }

  /**
   * Grants granular consent for a specific purpose.
   * Records an immutable ConsentEvent for legal proof under Ley N° 29733.
   */
  static async grantConsent(
    ruc: string,
    purpose: ConsentPurpose,
    metadata: {
      ipAddress?: string;
      userAgent?: string;
      privacyPolicyVersion?: string;
      expiresAt?: Date | null;
    } = {}
  ): Promise<ConsentGrantModel> {
    const cleanRuc = ruc.trim();
    const policyVersion = metadata.privacyPolicyVersion || this.getPolicyVersion();
    const now = new Date();

    // 1. Try DB execution
    if (process.env.DATABASE_URL) {
      try {
        const prisma = getPrismaClient();

        // Ensure SME record exists
        await prisma.sME.upsert({
          where: { ruc: cleanRuc },
          update: {},
          create: {
            ruc: cleanRuc,
            businessName: `Empresa ${cleanRuc}`,
            email: `${cleanRuc}@sami-titular.pe`
          }
        });

        // Upsert ConsentGrant
        const grant = await prisma.consentGrant.upsert({
          where: {
            ruc_purpose: {
              ruc: cleanRuc,
              purpose: purpose as any
            }
          },
          update: {
            status: 'ACTIVE',
            privacyPolicyVersion: policyVersion,
            grantedAt: now,
            revokedAt: null,
            expiresAt: metadata.expiresAt || null
          },
          create: {
            ruc: cleanRuc,
            purpose: purpose as any,
            status: 'ACTIVE',
            privacyPolicyVersion: policyVersion,
            grantedAt: now,
            expiresAt: metadata.expiresAt || null
          }
        });

        // Add Immutable Audit Event
        await prisma.consentEvent.create({
          data: {
            ruc: cleanRuc,
            purpose: purpose as any,
            action: 'GRANTED',
            privacyPolicyVersion: policyVersion,
            ipAddress: metadata.ipAddress || null,
            userAgent: metadata.userAgent || null
          }
        });

        logger.info('[ConsentService] Consent GRANTED in PostgreSQL', {
          ruc: cleanRuc,
          purpose,
          policyVersion
        });

        return {
          id: grant.id,
          ruc: grant.ruc,
          purpose: grant.purpose as ConsentPurpose,
          status: grant.status as ConsentStatus,
          privacyPolicyVersion: grant.privacyPolicyVersion,
          grantedAt: grant.grantedAt.toISOString(),
          revokedAt: grant.revokedAt ? grant.revokedAt.toISOString() : null,
          expiresAt: grant.expiresAt ? grant.expiresAt.toISOString() : null,
          updatedAt: grant.updatedAt.toISOString()
        };
      } catch (err: any) {
        logger.warn('[ConsentService] DB grant failed, fallback to local store.', { ruc: cleanRuc, error: err?.message });
      }
    }

    // Fallback store execution
    const store = getStore();
    const key = `${cleanRuc}_${purpose}`;
    const grant: ConsentGrantModel = {
      id: store.grants[key]?.id || `grant-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ruc: cleanRuc,
      purpose,
      status: 'ACTIVE',
      privacyPolicyVersion: policyVersion,
      grantedAt: now.toISOString(),
      revokedAt: null,
      expiresAt: metadata.expiresAt ? metadata.expiresAt.toISOString() : null,
      updatedAt: now.toISOString()
    };

    store.grants[key] = grant;

    // Append immutable event
    const event: ConsentEventModel = {
      id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ruc: cleanRuc,
      purpose,
      action: 'GRANTED',
      privacyPolicyVersion: policyVersion,
      ipAddress: metadata.ipAddress || '127.0.0.1',
      userAgent: metadata.userAgent || 'Web Browser',
      createdAt: now.toISOString()
    };
    store.events.unshift(event);
    saveStore(store);

    logger.info('[ConsentService] Consent GRANTED and persisted in local store', {
      ruc: cleanRuc,
      purpose,
      policyVersion
    });

    return grant;
  }

  /**
   * Revokes consent immediately for a specific purpose without requiring human intervention.
   * Records an immutable ConsentEvent for audit.
   */
  static async revokeConsent(
    ruc: string,
    purpose: ConsentPurpose,
    metadata: {
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<ConsentGrantModel> {
    const cleanRuc = ruc.trim();
    const policyVersion = this.getPolicyVersion();
    const now = new Date();

    // 1. Try DB execution
    if (process.env.DATABASE_URL) {
      try {
        const prisma = getPrismaClient();

        const grant = await prisma.consentGrant.upsert({
          where: {
            ruc_purpose: {
              ruc: cleanRuc,
              purpose: purpose as any
            }
          },
          update: {
            status: 'REVOKED',
            revokedAt: now
          },
          create: {
            ruc: cleanRuc,
            purpose: purpose as any,
            status: 'REVOKED',
            privacyPolicyVersion: policyVersion,
            grantedAt: now,
            revokedAt: now
          }
        });

        // Add Immutable Audit Event
        await prisma.consentEvent.create({
          data: {
            ruc: cleanRuc,
            purpose: purpose as any,
            action: 'REVOKED',
            privacyPolicyVersion: policyVersion,
            ipAddress: metadata.ipAddress || null,
            userAgent: metadata.userAgent || null
          }
        });

        logger.info('[ConsentService] Consent REVOKED in PostgreSQL (Immediate)', {
          ruc: cleanRuc,
          purpose
        });

        return {
          id: grant.id,
          ruc: grant.ruc,
          purpose: grant.purpose as ConsentPurpose,
          status: grant.status as ConsentStatus,
          privacyPolicyVersion: grant.privacyPolicyVersion,
          grantedAt: grant.grantedAt.toISOString(),
          revokedAt: grant.revokedAt ? grant.revokedAt.toISOString() : null,
          expiresAt: grant.expiresAt ? grant.expiresAt.toISOString() : null,
          updatedAt: grant.updatedAt.toISOString()
        };
      } catch (err: any) {
        logger.warn('[ConsentService] DB revoke failed, fallback to local store.', { ruc: cleanRuc, error: err?.message });
      }
    }

    // Fallback store
    const store = getStore();
    const key = `${cleanRuc}_${purpose}`;
    const grant: ConsentGrantModel = {
      id: store.grants[key]?.id || `grant-${Date.now()}`,
      ruc: cleanRuc,
      purpose,
      status: 'REVOKED',
      privacyPolicyVersion: store.grants[key]?.privacyPolicyVersion || policyVersion,
      grantedAt: store.grants[key]?.grantedAt || now.toISOString(),
      revokedAt: now.toISOString(),
      expiresAt: store.grants[key]?.expiresAt || null,
      updatedAt: now.toISOString()
    };

    store.grants[key] = grant;

    // Append immutable event
    const event: ConsentEventModel = {
      id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ruc: cleanRuc,
      purpose,
      action: 'REVOKED',
      privacyPolicyVersion: policyVersion,
      ipAddress: metadata.ipAddress || '127.0.0.1',
      userAgent: metadata.userAgent || 'Web Browser',
      createdAt: now.toISOString()
    };
    store.events.unshift(event);
    saveStore(store);

    logger.info('[ConsentService] Consent REVOKED and persisted in local store', {
      ruc: cleanRuc,
      purpose
    });

    return grant;
  }

  /**
   * Retrieves the immutable audit log of consent events (grants and revocations).
   */
  static async getConsentHistory(ruc: string): Promise<ConsentEventModel[]> {
    const cleanRuc = ruc.trim();

    if (process.env.DATABASE_URL) {
      try {
        const prisma = getPrismaClient();
        const events = await prisma.consentEvent.findMany({
          where: { ruc: cleanRuc },
          orderBy: { createdAt: 'desc' }
        });

        return events.map((e) => ({
          id: e.id,
          ruc: e.ruc,
          purpose: e.purpose as ConsentPurpose,
          action: e.action as ConsentAction,
          privacyPolicyVersion: e.privacyPolicyVersion,
          ipAddress: e.ipAddress,
          userAgent: e.userAgent,
          createdAt: e.createdAt.toISOString()
        }));
      } catch (err: any) {
        logger.warn('[ConsentService] DB history query failed, using fallback store.', { ruc: cleanRuc, error: err?.message });
      }
    }

    const store = getStore();
    return store.events.filter((e) => e.ruc === cleanRuc);
  }

  /**
   * Verification function: Asserts that active, unexpired consent exists for the specified purpose.
   * MUST be called before transmitting any data to a third party.
   */
  static async assertConsent(
    ruc: string,
    purpose: ConsentPurpose = 'TRANSMISION_DATOS_BANCOS'
  ): Promise<{ allowed: boolean; grant?: ConsentGrantModel; reason?: string }> {
    const cleanRuc = ruc.trim();
    const grants = await this.getConsentStatus(cleanRuc);
    const grant = grants.find((g) => g.purpose === purpose);

    if (!grant || grant.status !== 'ACTIVE') {
      return {
        allowed: false,
        reason: `El titular del RUC ${cleanRuc} no cuenta con consentimiento activo para la finalidad '${purpose}' (Ley N° 29733).`
      };
    }

    if (grant.expiresAt && new Date(grant.expiresAt) < new Date()) {
      return {
        allowed: false,
        reason: `El consentimiento para '${purpose}' otorgado por el RUC ${cleanRuc} ha expirado el ${grant.expiresAt}.`
      };
    }

    return {
      allowed: true,
      grant
    };
  }

  /**
   * Logs a data transmission event in the audit trail.
   */
  static async logDataTransmission(data: {
    ruc: string;
    recipientEntity: string;
    purpose?: ConsentPurpose;
    payloadSummary?: string;
    status?: string;
    consentGrantId?: string | null;
  }): Promise<DataTransmissionLogModel> {
    const cleanRuc = data.ruc.trim();
    const purpose = data.purpose || 'TRANSMISION_DATOS_BANCOS';
    const status = data.status || 'SUCCESS';
    const now = new Date();

    if (process.env.DATABASE_URL) {
      try {
        const prisma = getPrismaClient();
        const record = await prisma.dataTransmissionLog.create({
          data: {
            ruc: cleanRuc,
            purpose: purpose as any,
            recipientEntity: data.recipientEntity,
            transmittedAt: now,
            consentGrantId: data.consentGrantId || null,
            payloadSummary: data.payloadSummary || null,
            status
          }
        });

        logger.info('[ConsentService] Data transmission logged in PostgreSQL', {
          ruc: cleanRuc,
          recipient: data.recipientEntity
        });

        return {
          id: record.id,
          ruc: record.ruc,
          purpose: record.purpose as ConsentPurpose,
          recipientEntity: record.recipientEntity,
          transmittedAt: record.transmittedAt.toISOString(),
          consentGrantId: record.consentGrantId,
          payloadSummary: record.payloadSummary,
          status: record.status
        };
      } catch (err: any) {
        logger.warn('[ConsentService] DB log transmission failed, using fallback store.', { ruc: cleanRuc, error: err?.message });
      }
    }

    const store = getStore();
    const log: DataTransmissionLogModel = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ruc: cleanRuc,
      purpose,
      recipientEntity: data.recipientEntity,
      transmittedAt: now.toISOString(),
      consentGrantId: data.consentGrantId || null,
      payloadSummary: data.payloadSummary || null,
      status
    };

    store.transmissions.unshift(log);
    saveStore(store);

    logger.info('[ConsentService] Data transmission logged in fallback store', {
      ruc: cleanRuc,
      recipient: data.recipientEntity
    });

    return log;
  }

  /**
   * Retrieves all logged data transmissions for a RUC ("¿A quién le dieron mis datos?").
   */
  static async getTransmissionLogs(ruc: string): Promise<DataTransmissionLogModel[]> {
    const cleanRuc = ruc.trim();

    if (process.env.DATABASE_URL) {
      try {
        const prisma = getPrismaClient();
        const logs = await prisma.dataTransmissionLog.findMany({
          where: { ruc: cleanRuc },
          orderBy: { transmittedAt: 'desc' }
        });

        return logs.map((l) => ({
          id: l.id,
          ruc: l.ruc,
          purpose: l.purpose as ConsentPurpose,
          recipientEntity: l.recipientEntity,
          transmittedAt: l.transmittedAt.toISOString(),
          consentGrantId: l.consentGrantId,
          payloadSummary: l.payloadSummary,
          status: l.status
        }));
      } catch (err: any) {
        logger.warn('[ConsentService] DB transmissions query failed, using fallback.', { ruc: cleanRuc, error: err?.message });
      }
    }

    const store = getStore();
    return store.transmissions.filter((t) => t.ruc === cleanRuc);
  }

  /**
   * Registers a new ARCO request (Acceso, Rectificación, Cancelación, Oposición).
   * Calculates legal response deadlines per Ley N° 29733:
   * - Acceso (Información): 20 días hábiles (aprox. 28 días calendario).
   * - Rectificación, Cancelación, Oposición: 10 días hábiles (aprox. 14 días calendario).
   */
  static async createArcoRequest(data: {
    ruc: string;
    fullName: string;
    email: string;
    rightType: ArcoRightType;
    details: string;
  }): Promise<ArcoRequestModel> {
    const cleanRuc = data.ruc.trim();
    const caseNumber = Math.floor(1000 + Math.random() * 9000);
    const caseCode = `ARCO-2026-${caseNumber}`;
    const now = new Date();

    // Legal deadlines in calendar days equivalent to Peruvian working days
    const daysToAdd = data.rightType === 'ACCESO' ? 28 : 14;
    const deadlineAt = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    if (process.env.DATABASE_URL) {
      try {
        const prisma = getPrismaClient();
        const req = await prisma.arcoRequest.create({
          data: {
            caseCode,
            ruc: cleanRuc,
            fullName: data.fullName.trim(),
            email: data.email.trim(),
            rightType: data.rightType as any,
            status: 'PENDIENTE',
            details: data.details.trim(),
            submittedAt: now,
            deadlineAt
          }
        });

        logger.info('[ConsentService] ARCO request created in PostgreSQL', {
          caseCode,
          ruc: cleanRuc,
          rightType: data.rightType
        });

        return {
          id: req.id,
          caseCode: req.caseCode,
          ruc: req.ruc,
          fullName: req.fullName,
          email: req.email,
          rightType: req.rightType as ArcoRightType,
          status: req.status as ArcoRequestStatus,
          details: req.details,
          responseNotes: req.responseNotes,
          submittedAt: req.submittedAt.toISOString(),
          deadlineAt: req.deadlineAt.toISOString(),
          resolvedAt: req.resolvedAt ? req.resolvedAt.toISOString() : null,
          updatedAt: req.updatedAt.toISOString()
        };
      } catch (err: any) {
        logger.warn('[ConsentService] DB ARCO creation failed, using fallback store.', { caseCode, error: err?.message });
      }
    }

    const store = getStore();
    const req: ArcoRequestModel = {
      id: `arco-${Date.now()}`,
      caseCode,
      ruc: cleanRuc,
      fullName: data.fullName.trim(),
      email: data.email.trim(),
      rightType: data.rightType,
      status: 'PENDIENTE',
      details: data.details.trim(),
      responseNotes: 'Expediente recepcionado por Mesa de Partes Digital. En evaluación por el Oficial de Privacidad.',
      submittedAt: now.toISOString(),
      deadlineAt: deadlineAt.toISOString(),
      resolvedAt: null,
      updatedAt: now.toISOString()
    };

    store.arcoRequests.unshift(req);
    saveStore(store);

    logger.info('[ConsentService] ARCO request created in local store', {
      caseCode,
      ruc: cleanRuc,
      rightType: data.rightType
    });

    return req;
  }

  /**
   * Looks up an ARCO request by unique case code (public tracking).
   */
  static async getArcoRequestByCaseCode(caseCode: string): Promise<ArcoRequestModel | null> {
    const cleanCode = caseCode.trim().toUpperCase().replace('#', '');

    if (process.env.DATABASE_URL) {
      try {
        const prisma = getPrismaClient();
        const req = await prisma.arcoRequest.findUnique({
          where: { caseCode: cleanCode }
        });

        if (req) {
          return {
            id: req.id,
            caseCode: req.caseCode,
            ruc: req.ruc,
            fullName: req.fullName,
            email: req.email,
            rightType: req.rightType as ArcoRightType,
            status: req.status as ArcoRequestStatus,
            details: req.details,
            responseNotes: req.responseNotes,
            submittedAt: req.submittedAt.toISOString(),
            deadlineAt: req.deadlineAt.toISOString(),
            resolvedAt: req.resolvedAt ? req.resolvedAt.toISOString() : null,
            updatedAt: req.updatedAt.toISOString()
          };
        }
      } catch (err: any) {
        logger.warn('[ConsentService] DB ARCO query by case code failed, checking fallback.', { caseCode: cleanCode, error: err?.message });
      }
    }

    const store = getStore();
    const found = store.arcoRequests.find(
      (r) => r.caseCode.toUpperCase().replace('#', '') === cleanCode
    );
    return found || null;
  }

  /**
   * Looks up all ARCO requests submitted for a given RUC (owner-authenticated).
   */
  static async getArcoRequestsByRuc(ruc: string): Promise<ArcoRequestModel[]> {
    const cleanRuc = ruc.trim();

    if (process.env.DATABASE_URL) {
      try {
        const prisma = getPrismaClient();
        const reqs = await prisma.arcoRequest.findMany({
          where: { ruc: cleanRuc },
          orderBy: { submittedAt: 'desc' }
        });

        return reqs.map((r) => ({
          id: r.id,
          caseCode: r.caseCode,
          ruc: r.ruc,
          fullName: r.fullName,
          email: r.email,
          rightType: r.rightType as ArcoRightType,
          status: r.status as ArcoRequestStatus,
          details: r.details,
          responseNotes: r.responseNotes,
          submittedAt: r.submittedAt.toISOString(),
          deadlineAt: r.deadlineAt.toISOString(),
          resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
          updatedAt: r.updatedAt.toISOString()
        }));
      } catch (err: any) {
        logger.warn('[ConsentService] DB ARCO query by RUC failed, checking fallback.', { ruc: cleanRuc, error: err?.message });
      }
    }

    const store = getStore();
    return store.arcoRequests.filter((r) => r.ruc === cleanRuc);
  }
}
