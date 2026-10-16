import { TaxRiskEvaluation } from './types';

/**
 * Evalúa factores cualitativos de salud tributaria y verificación documental de un contribuyente en base a datos SUNAT.
 * NOTA: Esta evaluación es puramente informativa y referencial para la MYPE. No constituye un scoring, puntaje ni calificación crediticia SBS.
 */
export function calculateRiskMetrics(details: any, options?: {
  powerExpiryDate?: string;
  pkiStatus?: 'valid' | 'invalid' | 'verifying' | 'analyzing' | 'none';
  bankSynchronized?: boolean;
}): TaxRiskEvaluation | null {
  if (!details) return null;

  const positiveFactors: string[] = [];
  const warningFactors: string[] = [];

  if (details.isSimulated) {
    warningFactors.push('Datos del RUC simulados (Modo Demostración): estos factores no reflejan información real de SUNAT');
  }

  // 1. Estado Activo en SUNAT
  if (details.active) {
    positiveFactors.push('Contribuyente ACTIVO en SUNAT');
  } else {
    warningFactors.push('BAJA DE OFICIO o INACTIVO (Estado no operativo en SUNAT)');
  }

  // 2. Condición de Domicilio Fiscal
  if (details.condition === 'HABIDO') {
    positiveFactors.push('Domicilio Fiscal HABIDO (Localizable y verificado por SUNAT)');
  } else if (details.condition) {
    warningFactors.push(`Condición de Domicilio: ${details.condition} (Local no confirmado por SUNAT)`);
  } else {
    warningFactors.push('Domicilio Fiscal NO HABIDO');
  }

  // 3. Régimen Tributario
  const regime = (details.taxRegime || '').toUpperCase();
  if (regime.includes('MYPE TRIBUTARIO') || regime.includes('RMT')) {
    positiveFactors.push('Régimen MYPE Tributario (Contabilidad simplificada formal)');
  } else if (regime.includes('GENERAL')) {
    positiveFactors.push('Régimen General (Régimen tributario consolidado)');
  } else if (regime.includes('ESPECIAL') || regime.includes('RER')) {
    positiveFactors.push('Régimen Especial (RER) de comercio o servicios');
  } else if (regime.includes('RUS') || regime.includes('SIMPLE')) {
    warningFactors.push('Nuevo RUS (Régimen simplificado con topes máximos de facturación)');
  }

  // 4. Facturación Electrónica
  if (details.electronicBilling) {
    positiveFactors.push('Facturación Electrónica Activa (Emisión digital de comprobantes)');
  } else {
    warningFactors.push('Sin registro de Facturación Electrónica activa');
  }

  // 5. Agentes de Retención y Percepción
  if (details.retainingAgent) {
    positiveFactors.push('AGENTE DE RETENCIÓN (Designación formal por SUNAT)');
  }
  if (details.agentOfPerception) {
    positiveFactors.push('AGENTE DE PERCEPCIÓN (Designación formal por SUNAT)');
  }

  // 6. Antigüedad en SUNAT
  const regDate = details.registrationDate || '';
  if (regDate) {
    const match = regDate.match(/\d{4}/);
    if (match) {
      const year = parseInt(match[0], 10);
      const currentYear = new Date().getFullYear();
      const years = currentYear - year;
      if (years >= 8) {
        positiveFactors.push(`Sólida trayectoria: +${years} años registrado en SUNAT`);
      } else if (years >= 3) {
        positiveFactors.push(`Antigüedad: ${years} años operando en SUNAT`);
      } else {
        warningFactors.push(`RUC de reciente inscripción: ${years} años de antigüedad`);
      }
    }
  }

  // 7. Factores Documentales Opcionales (Vigencia de Poder y PKI)
  const powerDate = options?.powerExpiryDate || details.powerExpiryDate;
  if (powerDate) {
    try {
      const expiryDateObj = new Date(powerDate + 'T00:00:00');
      const now = new Date();
      const diffDays = Math.ceil((expiryDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        warningFactors.push('Poder de representación legal vencido en SUNARP');
      } else if (diffDays <= 30) {
        warningFactors.push(`Vigencia de poder próxima a vencer (${diffDays} días restantes)`);
      } else {
        positiveFactors.push('Vigencia de poder legal confirmada ante SUNARP');
      }
    } catch {}
  }

  const pki = options?.pkiStatus || details.pkiStatus;
  if (pki === 'valid') {
    positiveFactors.push('Firma digital criptográfica PKI válida en vigencia de poder');
  } else if (pki === 'invalid') {
    warningFactors.push('Firma digital en documento de poder alterada o no válida');
  }

  if (options?.bankSynchronized || details.bankSynchronized) {
    positiveFactors.push('Cuenta bancaria validada y asociada al titular');
  }

  return {
    positives: positiveFactors,
    warnings: warningFactors
  };
}
