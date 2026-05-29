
/**
 * --- CISO SECURITY NOTICE: CLIENT-SIDE SIMULATION ---
 * This service simulates the concept of cryptographic operations for SAMI.
 * 
 * CRITICAL: In a production fintech environment, actual AES-256 encryption/decryption 
 * MUST NEVER happen in the browser. 
 * 
 * 1. ZERO TRUST: The client is untrusted. Keys stored in the browser (LocalStorage, variables) 
 *    can be extracted.
 * 2. END-TO-END SECURITY: Plaintext data must be sent via TLS 1.3 to a secure backend.
 * 3. ENVELOPE ENCRYPTION: The backend should use KMS (Key Management Service) triggers:
 *    - A Data Encryption Key (DEK) is generated per-record.
 *    - The DEK is encrypted with a Root Key (Key Encryption Key) managed in a hardware 
 *      security module (HSM).
 *    - The "Encrypted DEK" is stored alongside the "Ciphertext".
 */

/**
 * Simulates a secure AES-256-GCM encryption process.
 * Returns a hex-encoded string that represents [IV]:[AUTH_TAG]:[CIPHERTEXT]
 */
export const encryptData = <T>(data: T): string => {
    const dataString = JSON.stringify(data);
    
    // In PRODUCTION, this would be computed using the Web Crypto API on the backend:
    // const iv = crypto.getRandomValues(new Uint8Array(12));
    // const key = await crypto.subtle.importKey(...);
    // const encrypted = await crypto.subtle.encrypt({ name: "AES-256-GCM", iv }, key, data);

    // SIMULATION: Generate a fake hex string to represent an encrypted payload
    const mockIv = Array.from({length: 12}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const mockTag = Array.from({length: 16}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const mockCipher = btoa(dataString).split('').map(c => c.charCodeAt(0).toString(16)).join('');

    const payload = `sami_v1:${mockIv}:${mockTag}:${mockCipher}`;
    console.log(`[CRYPTO-SIM] Data secured with AES-256-GCM (Simulated)`);
    return payload;
};

/**
 * Simulates the decryption of a SAMI-encrypted payload.
 */
export const decryptData = <T>(encryptedData: string): T => {
    // In PRODUCTION: The backend would use KMS to decrypt the DEK, then decrypt the payload.
    
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 4 || parts[0] !== 'sami_v1') {
            throw new Error("Formato de cifrado SAMI inválido");
        }

        const cipherHex = parts[3];
        let decryptedString = "";
        for (let i = 0; i < cipherHex.length; i += 2) {
            decryptedString += String.fromCharCode(parseInt(cipherHex.substring(i, i + 2), 16));
        }
        
        const finalData = JSON.parse(atob(decryptedString));
        console.log(`[CRYPTO-SIM] Data decrypted successfully (Audit Log triggered)`);
        return finalData;
    } catch (e) {
        console.error("[CRYPTO-SIM] Decryption Error: Unauthorized access or corrupted payload.");
        throw new Error("Error de integridad en los datos cifrados");
    }
};

/**
 * Utility to mask sensitive data for UI display without decrypting the full payload.
 * Used for "Trust Center" previews.
 */
export const maskSensitiveString = (val: string, visibleChars: number = 4): string => {
    if (!val) return "";
    if (val.length <= visibleChars) return val;
    return `•••• •••• •••• ${val.slice(-visibleChars)}`;
};
