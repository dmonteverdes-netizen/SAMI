
import { 
    DeepProfile, 
    CrossValidationResult, 
    FinancialHealthCertificate, 
    SamiScoreResult 
} from '../types';

/**
 * Computes and checks if the given 11-digit string satisfies the Modulo 11 checksum
 * for Peruvian RUCs.
 */
export const isModulo11Valid = (ruc: string): boolean => {
    if (!ruc || ruc.length !== 11 || !/^\d+$/.test(ruc)) {
        return false;
    }

    const factors = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(ruc[i], 10) * factors[i];
    }

    const remainder = sum % 11;
    let checkDigit = 11 - remainder;

    if (checkDigit === 10) checkDigit = 0;
    if (checkDigit === 11) checkDigit = 1;

    return checkDigit === parseInt(ruc[10], 10);
};

/**
 * Validates a Peruvian RUC (Registro Único de Contribuyentes)
 * RUC is 11 digits long and uses a modulo 11 checksum.
 */
export const isValidRUC = (ruc: string): boolean => {
    if (!ruc || ruc.length !== 11 || !/^\d+$/.test(ruc)) {
        return false;
    }

    const prefixes = ['10', '15', '17', '20'];
    if (!prefixes.includes(ruc.substring(0, 2))) {
        // While there might be other rare prefixes, these are the standard ones
        // In a real app we might be less strict or allow all numeric 11-digit strings
    }

    return isModulo11Valid(ruc);
};

/**
 * Simulates a cross-validation of the RUC against public blacklists and debt reports.
 */
export const performCrossValidation = async (ruc: string): Promise<CrossValidationResult> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock logic: RUCs ending in '7' or '13' are flagged for demo purposes
    const isBlacklisted = ruc.endsWith('7');
    const hasThirdPartyDebts = ruc.includes('13');
    
    let riskLevel: CrossValidationResult['riskLevel'] = 'Low';
    if (isBlacklisted) riskLevel = 'High';
    else if (hasThirdPartyDebts) riskLevel = 'Medium';

    return {
        ruc,
        isBlacklisted,
        hasThirdPartyDebts,
        debtAmount: hasThirdPartyDebts ? 5000 : 0,
        riskLevel,
        validationDate: new Date().toISOString().split('T')[0]
    };
};

/**
 * Calculates a refined risk score based on traditional and non-traditional data.
 */
export const calculateRefinedRisk = (
    samiScore: SamiScoreResult | null, 
    deepProfile: DeepProfile, 
    validation: CrossValidationResult | null
): string => {
    if (!samiScore) return 'Indeterminado';

    let baseScore = samiScore.score;

    // Stability bonus (non-traditional)
    if (deepProfile.yearsInLocation > 5) baseScore += 30;
    if (deepProfile.isOwnerOfLocation) baseScore += 50;
    
    // Asset bonus
    const totalAssets = deepProfile.fixedAssets.reduce((acc, asset) => acc + asset.estimatedValue, 0);
    if (totalAssets > 50000) baseScore += 40;

    // Validation penalty
    if (validation?.isBlacklisted) baseScore -= 200;
    if (validation?.hasThirdPartyDebts) baseScore -= 100;

    if (baseScore > 750) return 'Bajo Riesgo (A+)';
    if (baseScore > 650) return 'Riesgo Moderado (B)';
    if (baseScore > 500) return 'Riesgo Medio (C)';
    return 'Alto Riesgo (D)';
};

/**
 * Generates the data for the Financial Health Certificate.
 */
export const generateCertificate = (
    businessName: string, 
    ruc: string, 
    samiScore: number, 
    riskLevel: string,
    deepProfile: DeepProfile
): FinancialHealthCertificate => {
    const totalAssets = deepProfile.fixedAssets.reduce((acc, asset) => acc + asset.estimatedValue, 0);
    const today = new Date();
    const expiry = new Date();
    expiry.setMonth(today.getMonth() + 3); // Valid for 3 months

    return {
        certificateId: `SAMI-CERT-${Math.random().toString(36).substring(7).toUpperCase()}`,
        issueDate: today.toISOString().split('T')[0],
        expiryDate: expiry.toISOString().split('T')[0],
        businessName,
        ruc,
        samiScore,
        riskLevel,
        verifiedAssetsValue: totalAssets
    };
};
