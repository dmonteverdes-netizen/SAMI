import { api } from './api';

export type ConsentPurpose =
  | 'TRANSMISION_DATOS_BANCOS'
  | 'ANALISIS_TRIBUTARIO'
  | 'COMUNICACIONES_COMERCIALES'
  | 'INTEGRACION_PSE';

export type ConsentStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';
export type ConsentAction = 'GRANTED' | 'REVOKED';

export type ArcoRightType = 'ACCESO' | 'RECTIFICACION' | 'CANCELACION' | 'OPOSICION';
export type ArcoRequestStatus = 'PENDIENTE' | 'EN_EVALUACION' | 'APROBADO' | 'DENEGADO' | 'COMPLETADO';

export interface ConsentGrant {
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

export interface ConsentEvent {
  id: string;
  ruc: string;
  purpose: ConsentPurpose;
  action: ConsentAction;
  privacyPolicyVersion: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface DataTransmissionLog {
  id: string;
  ruc: string;
  purpose: ConsentPurpose;
  recipientEntity: string;
  transmittedAt: string;
  consentGrantId?: string | null;
  payloadSummary?: string | null;
  status: string;
}

export interface ArcoRequest {
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

export interface PurposeDefinition {
  id: ConsentPurpose;
  title: string;
  shortLabel: string;
  description: string;
  legalBasis: string;
  category: 'bancario' | 'tributario' | 'comunicacion' | 'operativo';
  impactWhenRevoked: string;
  requiredForCore: boolean;
}

export const CONSENT_PURPOSES_META: Record<ConsentPurpose, PurposeDefinition> = {
  TRANSMISION_DATOS_BANCOS: {
    id: 'TRANSMISION_DATOS_BANCOS',
    title: 'Transmisión Segura a Entidades Financieras Aliadas',
    shortLabel: 'Bancos y Cajas Aliadas',
    description:
      'Permite estructurar y transferir de forma cifrada tu expediente de facturación electrónica y salud tributaria a bancos, cajas y fintechs aliadas cuando solicitas o cotizas financiamiento.',
    legalBasis: 'Art. 13.5 y 14 Ley N° 29733 (Consentimiento expreso e informado para transferencia de datos)',
    category: 'bancario',
    impactWhenRevoked:
      'Las entidades financieras no podrán recibir tu expediente tributario para evaluar ofertas de crédito preferenciales.',
    requiredForCore: false
  },
  ANALISIS_TRIBUTARIO: {
    id: 'ANALISIS_TRIBUTARIO',
    title: 'Análisis Tributario y Contabilidad Predictiva',
    shortLabel: 'Contabilidad Asistida',
    description:
      'Permite a los algoritmos de SAMI procesar tus comprobantes de venta y compra para calcular liquidaciones referenciales de IGV, Renta y detección de descalces.',
    legalBasis: 'Art. 18 Ley N° 29733 (Tratamiento necesario para la prestación del servicio contratado)',
    category: 'tributario',
    impactWhenRevoked:
      'Se suspenderán las proyecciones automáticas de liquidación mensual y alertas de vencimientos fiscales.',
    requiredForCore: false
  },
  COMUNICACIONES_COMERCIALES: {
    id: 'COMUNICACIONES_COMERCIALES',
    title: 'Comunicaciones Comerciales y Alertas de Beneficios',
    shortLabel: 'Novedades y Campañas',
    description:
      'Permite enviarte notificaciones push, correos o mensajes sobre nuevas convocatorias de crédito, fondos concursables, eventos de capacitación MYPE y actualizaciones del ecosistema.',
    legalBasis: 'Ley N° 29733 y Código de Protección al Consumidor (Ley N° 29571)',
    category: 'comunicacion',
    impactWhenRevoked:
      'No recibirás comunicaciones informativas de nuevos beneficios ni alertas comerciales de la plataforma.',
    requiredForCore: false
  },
  INTEGRACION_PSE: {
    id: 'INTEGRACION_PSE',
    title: 'Intermediación con Proveedor Electrónico (PSE / SUNAT)',
    shortLabel: 'Emisión PSE y Validez',
    description:
      'Permite conectar tu punto de venta con el PSE autorizado para el timbrado, generación de XML/CDR y validación de estado de comprobantes de pago.',
    legalBasis: 'Resolución de Superintendencia SUNAT N° 097-2012 / Art. 18 Ley 29733',
    category: 'operativo',
    impactWhenRevoked:
      'La sincronización técnica con el PSE quedará en pausa hasta que reactives la autorización.',
    requiredForCore: false
  }
};

export const ARCO_RIGHTS_META: Record<
  ArcoRightType,
  { title: string; legalDeadline: string; description: string }
> = {
  ACCESO: {
    title: 'Derecho de Acceso',
    legalDeadline: '20 días hábiles (Ley N° 29733)',
    description:
      'Solicitar información sobre tus datos personales almacenados en los bancos de datos de SAMI, su origen y las transferencias realizadas o previstas.'
  },
  RECTIFICACION: {
    title: 'Derecho de Rectificación / Actualización',
    legalDeadline: '10 días hábiles (Ley N° 29733)',
    description:
      'Solicitar la modificación o corrección de datos personales que resulten inexactos, desactualizados, incompletos o erróneos.'
  },
  CANCELACION: {
    title: 'Derecho de Cancelación / Supresión',
    legalDeadline: '10 días hábiles (Ley N° 29733)',
    description:
      'Solicitar la eliminación o bloqueo de tus datos personales cuando ya no sean necesarios para la finalidad para la cual fueron recopilados.'
  },
  OPOSICION: {
    title: 'Derecho de Oposición',
    legalDeadline: '10 días hábiles (Ley N° 29733)',
    description:
      'Oponerte al tratamiento de tus datos para finalidades específicas (por ejemplo, comunicaciones comerciales o transferencias a bancos terceros).'
  }
};

export const ARCO_STATUS_LABELS: Record<
  ArcoRequestStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  PENDIENTE: {
    label: 'Recepcionado / Pendiente',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800/60'
  },
  EN_EVALUACION: {
    label: 'En Evaluación Legal',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800/60'
  },
  APROBADO: {
    label: 'Procedente / En Ejecución',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800/60'
  },
  DENEGADO: {
    label: 'No Procedente (Fundamentado)',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800/60'
  },
  COMPLETADO: {
    label: 'Expediente Resuelto',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-700'
  }
};

/**
 * Consulta el estado de todos los consentimientos granulares para un RUC.
 */
export const fetchConsentStatus = async (ruc: string): Promise<ConsentGrant[]> => {
  try {
    const response = await api.get(`/consent/${ruc}`);
    return response.data.grants || [];
  } catch (err: any) {
    console.warn('[Consent Client] Error fetching consent status, using local fallback:', err);
    // Return default grant list
    return Object.keys(CONSENT_PURPOSES_META).map((p) => ({
      id: `fallback-${p}`,
      ruc,
      purpose: p as ConsentPurpose,
      status: 'ACTIVE',
      privacyPolicyVersion: '2026.1',
      grantedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }
};

/**
 * Otorga consentimiento granular para una finalidad específica.
 */
export const grantConsent = async (
  ruc: string,
  purpose: ConsentPurpose,
  privacyPolicyVersion?: string
): Promise<ConsentGrant> => {
  const response = await api.post('/consent/grant', {
    ruc,
    purpose,
    privacyPolicyVersion
  });
  return response.data.grant;
};

/**
 * Revoca de forma inmediata un consentimiento específico.
 */
export const revokeConsent = async (
  ruc: string,
  purpose: ConsentPurpose
): Promise<ConsentGrant> => {
  const response = await api.post('/consent/revoke', {
    ruc,
    purpose
  });
  return response.data.grant;
};

/**
 * Obtiene el historial inmutable de eventos de consentimiento (auditoría).
 */
export const fetchConsentHistory = async (ruc: string): Promise<ConsentEvent[]> => {
  try {
    const response = await api.get(`/consent/${ruc}/history`);
    return response.data.history || [];
  } catch (err: any) {
    console.warn('[Consent Client] Error fetching history:', err);
    return [];
  }
};

/**
 * Obtiene el registro de transferencias de datos realizadas a entidades terceras.
 */
export const fetchTransmissionLogs = async (ruc: string): Promise<DataTransmissionLog[]> => {
  try {
    const response = await api.get(`/consent/${ruc}/transmissions`);
    return response.data.transmissions || [];
  } catch (err: any) {
    console.warn('[Consent Client] Error fetching transmissions:', err);
    return [];
  }
};

/**
 * Registra una solicitud formal de ejercicio de derechos ARCO.
 */
export const submitArcoRequest = async (data: {
  ruc: string;
  fullName: string;
  email: string;
  rightType: ArcoRightType;
  details: string;
}): Promise<ArcoRequest> => {
  const response = await api.post('/arco/requests', data);
  return response.data.request;
};

/**
 * Consulta un expediente ARCO por código de seguimiento público.
 */
export const fetchArcoRequestByCode = async (caseCode: string): Promise<ArcoRequest> => {
  const response = await api.get(`/arco/requests/${encodeURIComponent(caseCode)}`);
  return response.data.request;
};

/**
 * Consulta los expedientes ARCO asociados al RUC del titular autenticado.
 */
export const fetchArcoRequestsByRuc = async (ruc: string): Promise<ArcoRequest[]> => {
  try {
    const response = await api.get(`/arco/requests/by-ruc/${ruc}`);
    return response.data.requests || [];
  } catch (err: any) {
    console.warn('[Consent Client] Error fetching ARCO requests by RUC:', err);
    return [];
  }
};
