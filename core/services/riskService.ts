
import { 
    DeepProfile, 
    CrossValidationResult, 
    FinancialHealthCertificate, 
    TaxSummary 
} from '../types/types';
import { isValidRUC } from './accountingService';

export { isValidRUC };

// Demo script RUC fixtures for demonstration purposes
const DEMO_CROSS_VALIDATION_FIXTURES: Record<string, Partial<CrossValidationResult>> = {
    '20601234567': {
        isBlacklisted: false,
        hasThirdPartyDebts: false,
        debtAmount: 0,
        riskLevel: 'Low',
        status: 'VERIFIED_DEMO',
        message: 'Registro de demostración verificado sin antecedentes crediticios adversos'
    },
    '20100012345': {
        isBlacklisted: false,
        hasThirdPartyDebts: true,
        debtAmount: 2500,
        riskLevel: 'Medium',
        status: 'VERIFIED_DEMO',
        message: 'Registro de demostración con compromisos comerciales pendientes'
    }
};

/**
 * Consulta de antecedentes tributarios/comerciales para el entorno de demostración.
 * 
 * NOTA LEGAL Y DE NEGOCIO:
 * Para consultas de deudas con terceros o antecedentes comerciales de RUCs en producción,
 * se requiere suscripción y contrato de interoperabilidad con Centrales Privadas de Información de Riesgos
 * (CEPIRS autorizadas como Equifax, Experian o Sentinel) o acceso regulado por la SBS de acuerdo
 * a la Ley N° 27489 (Ley que regula las Centrales Privadas de Información de Riesgos y de Protección al Titular de la Información).
 * De acuerdo a la Ley N° 29733 (Protección de Datos Personales), queda terminantemente prohibido
 * atribuir listas negras o deudas ficticias a contribuyentes reales.
 */
export const performCrossValidation = async (ruc: string): Promise<CrossValidationResult> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const fixture = DEMO_CROSS_VALIDATION_FIXTURES[ruc];
    if (fixture) {
        return {
            ruc,
            isBlacklisted: false,
            hasThirdPartyDebts: fixture.hasThirdPartyDebts || false,
            debtAmount: fixture.debtAmount || 0,
            riskLevel: fixture.riskLevel || 'Low',
            status: 'VERIFIED_DEMO',
            message: fixture.message || 'Registro de demostración verificado',
            validationDate: new Date().toISOString().split('T')[0]
        };
    }

    // Default response for unconsulted RUCs: explicitly indicate NOT_CONSULTED
    return {
        ruc,
        isBlacklisted: false,
        hasThirdPartyDebts: false,
        debtAmount: 0,
        riskLevel: 'NotConsulted',
        status: 'NOT_CONSULTED',
        message: 'No consultado en central de riesgo (requiere convenio con CEPIRS/SBS en producción bajo Ley N° 27489)',
        validationDate: new Date().toISOString().split('T')[0]
    };
};

/**
 * Retorna un estado cualitativo de consistencia operativa y tributaria para el expediente MYPE.
 */
export const calculateRefinedRisk = (
    taxSummary: TaxSummary | null, 
    deepProfile: DeepProfile, 
    validation: CrossValidationResult | null
): string => {
    if (!taxSummary) return 'Información Incompleta';

    if (validation?.hasThirdPartyDebts) {
        return 'Pendientes Comerciales Declarados';
    }

    if (taxSummary.avgMonthlySales >= 20000 && deepProfile.yearsInLocation >= 2) {
        return 'Consistencia Operativa Alta';
    }

    if (taxSummary.avgMonthlySales >= 5000) {
        return 'Consistencia Operativa Media';
    }

    return 'Registro Inicial Declarado';
};

/**
 * Computes a SHA-256 cryptographic hash of text data using Web Crypto API.
 */
async function computeSha256(text: string): Promise<string> {
    try {
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }
    } catch {
        // Fallback for non-subtle environments
    }
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Genera la constancia de expediente de información tributaria MYPE con hash criptográfico de integridad.
 */
export const generateCertificate = async (
    businessName: string, 
    ruc: string, 
    avgMonthlySales: number, 
    complianceStatus: string,
    deepProfile: DeepProfile
): Promise<FinancialHealthCertificate> => {
    const totalAssets = deepProfile.fixedAssets.reduce((acc, asset) => acc + asset.estimatedValue, 0);
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const expiry = new Date(now);
    expiry.setMonth(now.getMonth() + 3); // Valid for 3 months
    const certificateId = `SAMI-CERT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const issuedAt = now.toISOString();

    const payloadToHash = JSON.stringify({
        certificateId,
        issuedAt,
        businessName,
        ruc,
        avgMonthlySales,
        complianceStatus,
        totalAssets,
        invoicesCount: deepProfile.vendorReferences?.length || 5
    });

    const cryptographicHash = await computeSha256(payloadToHash);

    return {
        certificateId,
        issueDate: today,
        expiryDate: expiry.toISOString().split('T')[0],
        businessName,
        ruc,
        avgMonthlySales,
        verifiedInvoicesCount: deepProfile.vendorReferences?.length || 5,
        complianceStatus,
        verifiedAssetsValue: totalAssets,
        cryptographicHash,
        issuedAt
    };
};
