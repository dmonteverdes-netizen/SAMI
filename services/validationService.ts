
/**
 * Simulated external validation service for RUC and Email.
 */

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  data?: any;
}

/**
 * Validates a RUC with SUNAT (Simulated)
 */
export const validateRUC = async (ruc: string): Promise<ValidationResult> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  if (!/^\d{11}$/.test(ruc)) {
    return { isValid: false, message: 'El RUC debe tener 11 dígitos numéricos.' };
  }

  // Sample logic: RUCs starting with 20 are simulated as valid companies
  if (ruc.startsWith('20') || ruc.startsWith('10')) {
    return { 
      isValid: true, 
      data: {
        legalName: ruc.startsWith('20') ? 'Sami Tech Solutions S.A.C.' : 'MYPE Individual E.I.R.L.',
        status: 'ACTIVO',
        condition: 'HABIDO'
      }
    };
  }

  return { isValid: false, message: 'El RUC ingresado no se encuentra activo o no existe en los registros de SUNAT.' };
};

/**
 * Validates Email availability and format (Simulated)
 */
export const validateEmail = async (email: string): Promise<ValidationResult> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Formato de correo electrónico no válido.' };
  }

  // Simulate existing email check
  const blacklistedEmails = ['test@test.com', 'admin@sami.com', 'dmonteverdes@gmail.com'];
  if (blacklistedEmails.includes(email.toLowerCase())) {
    return { isValid: false, message: 'Este correo electrónico ya se encuentra registrado.' };
  }

  return { isValid: true };
};

/**
 * Validates Legal Representation via "Vigencia de Poder" (Simulated)
 */
export const validateLegalRepresentation = async (ruc: string, fileName: string): Promise<ValidationResult> => {
  // Simulate heavy AI processing / OCR delay
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Simulating that the document is analyzed against SUNAT/RR.PP records
  if (fileName.toLowerCase().endsWith('.pdf') || fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.png')) {
      return { 
          isValid: true, 
          message: 'Representatividad legal confirmada para el RUC ' + ruc,
          data: {
              representative: 'Deyvi Monteverde S.',
              entryRole: 'Gerente General',
              verifiedAt: new Date().toISOString()
          }
      };
  }

  return { 
      isValid: false, 
      message: 'El documento cargado no es legible o no corresponde a una Vigencia de Poder válida.' 
  };
};

/**
 * Validates a Bank Account with SSB (Superintendencia de Banca y Seguros) - Simulated
 */
export const validateBankAccount = async (accountNumber: string, bankId: string): Promise<ValidationResult> => {
  // Simulate network delay to SBS gateway
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Peruvian Bank Account formats vary, but let's assume a generic length check for simulation
  // Standard CCI (Código de Cuenta Interbancario) is 20 digits.
  // Standard simple account is often 10-14 digits.
  if (!/^\d{10,20}$/.test(accountNumber)) {
    return { 
      isValid: false, 
      message: 'El número de cuenta debe tener entre 10 y 20 dígitos numéricos.' 
    };
  }

  // Simulations based on bankId
  // In a real app, we would query the SBS database
  const validPrefixes: Record<string, string[]> = {
    'fintech_a': ['102', '103'],
    'caja_b': ['202', '203'],
    'banco_c': ['302', '303']
  };

  // Default successful simulation for most numbers
  // But let's fail if it ends in 000
  if (accountNumber.endsWith('000')) {
    return {
      isValid: false,
      message: 'La cuenta bancaria se encuentra bloqueada o inactiva según los registros de la SBS.'
    };
  }

  return {
    isValid: true,
    data: {
      accountHolder: 'BANCO ALIANZA MYPE CORPORATIVO',
      accountType: 'Cuenta Corriente MN',
      currency: 'PEN',
      status: 'ACTIVA',
      verifiedBy: 'SBS-GATEWAY-V2'
    }
  };
};
