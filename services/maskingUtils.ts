
/**
 * Utility for masking sensitive data in non-production environments.
 */

const isDev = import.meta.env.DEV;

/**
 * Checks if data masking is currently enabled.
 * Masking is enabled by default in development mode, but can be disabled
 * via a localStorage flag set by the eye toggle button.
 */
export const isMaskingEnabled = (): boolean => {
    if (typeof window !== 'undefined') {
        const disabled = localStorage.getItem('sami_disable_masking') === 'true';
        if (disabled) return false;
    }
    return isDev;
};

/**
 * Masks a RUC string (e.g., 10443322119 -> 10******119)
 */
export const maskRUC = (ruc: string | undefined): string => {
    if (!ruc) return '---';
    if (!isMaskingEnabled()) return ruc;
    
    if (ruc.length < 5) return '***';
    return `${ruc.substring(0, 2)}******${ruc.substring(ruc.length - 3)}`;
};

/**
 * Masks a financial amount (e.g., 1250.50 -> *,***.**)
 * or simply replaces it with a generic mask.
 */
export const maskCurrency = (amount: number | undefined | null, originalFormatted: string): string => {
    if (amount === undefined || amount === null) return originalFormatted;
    if (!isMaskingEnabled()) return originalFormatted;
    
    // In dev, we show a generic pattern but keep the currency symbol if possible
    // or just return a string of asterisks
    return originalFormatted.replace(/[0-9]/g, '*');
};

/**
 * Masks a phone number (e.g., 999888777 -> 999***777)
 */
export const maskPhone = (phone: string | undefined): string => {
    if (!phone) return '---';
    if (!isMaskingEnabled()) return phone;
    
    if (phone.length < 6) return '***';
    return `${phone.substring(0, 3)}***${phone.substring(phone.length - 3)}`;
};

/**
 * Masks any string if in dev mode
 */
export const maskText = (text: string | undefined): string => {
    if (!text) return '---';
    if (!isMaskingEnabled()) return text;
    return '***';
};

