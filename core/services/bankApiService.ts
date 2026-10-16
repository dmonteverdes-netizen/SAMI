import { TransactionalDataBundle } from '../types/types';
import { api } from './api';

/**
 * Service to handle data sharing with Partner Banks.
 * Implements security scopes to ensure a bank only sees data it's authorized for.
 */

export const generateSecureDataBundle = async (
    userData: any, 
    accountingData: any, 
    taxSummary: any
): Promise<TransactionalDataBundle> => {
    try {
        const response = await api.post('/bank/generate-bundle', {
            userData,
            accountingData,
            taxSummary
        });
        return response.data.bundle;
    } catch (err: any) {
        console.error('[SAMI API Gateway Exception] Failed to pack secure data bundle:', err);
        throw new Error(err.response?.data?.message || 'No se pudo generar el lote seguro de datos.');
    }
};

/**
 * Validates that the requesting bank has the correct scopes for the requested data.
 * @param token The OAuth2 token provided by the bank
 * @param requiredScopes e.g., ['read:score', 'read:financials']
 */
export const validateBankAccess = async (token: string, requiredScopes: string[]): Promise<boolean> => {
    try {
        console.log(`[AUTH] Validating bank token for scopes via API Gateway: ${requiredScopes.join(', ')}`);
        const response = await api.post('/bank/validate-access', {
            token,
            requiredScopes
        });
        return !!response.data.valid;
    } catch (err: any) {
        console.error('[SAMI API Gateway Exception] Access token verification failed:', err);
        return false;
    }
};
