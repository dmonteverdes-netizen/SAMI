import { isValidRUC } from './accountingService';

// ─── Tipos e Interfaces ───

export interface ValidationResult<T = Record<string, unknown>> {
  isValid: boolean;
  message?: string;
  data?: T;
}

export interface RucValidationData {
  ruc: string;
  legalName: string;
  status: string;
  condition: string;
  isSimulated: boolean;
  simulatedEnvironment: string;
}

export interface LegalRepValidationData {
  representative: string;
  entryRole: string;
  verifiedAt: string;
  isSimulated: boolean;
  simulatedEnvironment: string;
  notice: string;
}

export interface BankAccountValidationData {
  accountHolder: string;
  accountType: string;
  currency: string;
  status: string;
  isSimulated: boolean;
  simulatedEnvironment: string;
  verifiedBy: string;
}

// ─── Constantes y Configuración ───

// LISTA_CORREOS_DEMO: Correos reservados en entorno de pruebas para verificar duplicidad
const DEMO_BLACKLISTED_EMAILS: readonly string[] = [
  'test@test.com',
  'admin@sami.com',
  'dmonteverdes@gmail.com'
];

// ─── Handlers y Lógica de Negocio ───

/**
 * Valida un número de RUC peruano.
 * Aplica el algoritmo oficial de SUNAT Módulo 11 para verificar la validez formal del RUC.
 * En esta fase MVP, la consulta de datos de la razón social es una simulación rotulada ("Modo Demostración").
 * 
 * REQUISITO DE PRODUCCIÓN:
 * Integración mediante API con la Plataforma de Interoperabilidad del Estado (PIDE)
 * o convenio de consulta RUC en tiempo real con SUNAT/PSE autorizado.
 */
export const validateRUC = async (ruc: string): Promise<ValidationResult<RucValidationData>> => {
  // Simulación de latencia de red
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (!ruc || typeof ruc !== 'string' || !/^\d{11}$/.test(ruc)) {
    return {
      isValid: false,
      message: 'El RUC debe constar de exactamente 11 dígitos numéricos.'
    };
  }

  // Verificación algorítmica canónica de Módulo 11 y prefijos válidos de SUNAT
  if (!isValidRUC(ruc)) {
    return {
      isValid: false,
      message: 'El RUC ingresado no es válido según el algoritmo SUNAT Módulo 11 (dígito verificador incorrecto).'
    };
  }

  // En entorno MVP, retornamos datos simulados rotulados transparentemente
  const isPersonaJuridica = ruc.startsWith('20');
  return {
    isValid: true,
    message: 'RUC con formato y checksum SUNAT válidos (Datos de razón social simulados en Modo Demostración).',
    data: {
      ruc,
      legalName: isPersonaJuridica ? 'Sami Tech Solutions S.A.C. (Simulado)' : 'MYPE Individual E.I.R.L. (Simulado)',
      status: 'ACTIVO',
      condition: 'HABIDO',
      isSimulated: true,
      simulatedEnvironment: 'Modo Demostración'
    }
  };
};

/**
 * Valida formato y disponibilidad de correo electrónico (Simulado para MVP).
 * 
 * REQUISITO DE PRODUCCIÓN:
 * Verificación SMTP real y envío de código de confirmación OTP (SendGrid/SES).
 */
export const validateEmail = async (email: string): Promise<ValidationResult> => {
  await new Promise(resolve => setTimeout(resolve, 600));

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Formato de correo electrónico no válido.' };
  }

  if (DEMO_BLACKLISTED_EMAILS.includes(email.toLowerCase())) {
    return { isValid: false, message: 'Este correo electrónico ya se encuentra registrado en el sistema.' };
  }

  return { isValid: true };
};

/**
 * Valida la representatividad legal mediante archivo de Vigencia de Poder (Simulado para MVP).
 * 
 * REQUISITO DE PRODUCCIÓN:
 * Integración con el servicio web de la Superintendencia Nacional de los Registros Públicos (SUNARP)
 * o consulta del asiento registral de poderes mediante la PIDE para verificar la vigencia de facultades.
 */
export const validateLegalRepresentation = async (
  ruc: string,
  fileName: string
): Promise<ValidationResult<LegalRepValidationData>> => {
  // Simulación de procesamiento OCR/IA
  await new Promise(resolve => setTimeout(resolve, 2000));

  const lowerName = fileName.toLowerCase();
  const isValidExtension = lowerName.endsWith('.pdf') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png');

  if (isValidExtension) {
    return {
      isValid: true,
      message: 'Documento procesado en Modo Demostración. La integración en vivo con SUNARP está en desarrollo.',
      data: {
        representative: 'Deyvi Monteverde S. (Simulado)',
        entryRole: 'Gerente General',
        verifiedAt: new Date().toISOString(),
        isSimulated: true,
        simulatedEnvironment: 'Modo Demostración',
        notice: 'Validación en entorno de prueba. Integración oficial SUNARP en proceso de homologación.'
      }
    };
  }

  return {
    isValid: false,
    message: 'El documento cargado no tiene un formato válido (se admiten archivos PDF, JPG o PNG).'
  };
};

/**
 * Valida un número de cuenta bancaria o CCI comercial (Simulado para MVP).
 * 
 * REQUISITO DE PRODUCCIÓN:
 * Convenio de conectividad directa con la entidad bancaria aliada o integración con la red
 * interbancaria (CCE / ACH Perú) para validación de titularidad de cuentas y estado activo.
 */
export const validateBankAccount = async (
  accountNumber: string,
  bankId: string
): Promise<ValidationResult<BankAccountValidationData>> => {
  // Simulación de latencia con pasarela bancaria
  await new Promise(resolve => setTimeout(resolve, 1500));

  if (!/^\d{10,20}$/.test(accountNumber)) {
    return {
      isValid: false,
      message: 'El número de cuenta o CCI debe tener entre 10 y 20 dígitos numéricos.'
    };
  }

  // Simulación: cuentas que terminan en 000 se marcan como inactivas para pruebas de rechazo
  if (accountNumber.endsWith('000')) {
    return {
      isValid: false,
      message: 'La cuenta bancaria simulada se encuentra bloqueada o inactiva (Prueba de rechazo).'
    };
  }

  return {
    isValid: true,
    message: 'Validación de cuenta completada en Modo Demostración.',
    data: {
      accountHolder: 'BANCO ALIANZA MYPE CORPORATIVO (DEMO)',
      accountType: 'Cuenta Corriente MN',
      currency: 'PEN',
      status: 'ACTIVA',
      isSimulated: true,
      simulatedEnvironment: 'Modo Demostración (Simulado)',
      verifiedBy: 'SIMULADOR-BANCARIO-DEMO'
    }
  };
};
