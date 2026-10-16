/**
 * SAMI Financial-Grade Structured JSON Logger.
 * Outputs parseable single-line JSON logs to stdout/stderr.
 * Automatically masks PII data (RUCs, emails, tokens, secrets) to maintain security compliance.
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SECURITY_AUDIT';

interface LogContext {
  [key: string]: any;
}

/**
 * Robust masking utility for sensitive data
 */
export function maskPIIValue(key: string, value: any): any {
  if (value === null || value === undefined) return value;
  
  const searchKey = key.toLowerCase();
  
  // 1. Mask RUC numbers (11 digits, e.g., 20123456789 -> 20*****6789)
  if (searchKey.includes('ruc') && typeof value === 'string' && value.length === 11) {
    return `${value.slice(0, 2)}*****${value.slice(7)}`;
  }
  
  // 2. Mask emails (e.g., dmonteverdes@gmail.com -> dm*********@gmail.com)
  if (searchKey.includes('email') && typeof value === 'string' && value.includes('@')) {
    const [localPart, domain] = value.split('@');
    if (localPart.length <= 2) {
      return `*@${domain}`;
    }
    return `${localPart.slice(0, 2)}*********@${domain}`;
  }
  
  // 3. Mask tokens, secrets, client secrets
  if (
    searchKey.includes('secret') || 
    searchKey.includes('token') || 
    searchKey.includes('password') ||
    searchKey.includes('authorization') ||
    searchKey.includes('jwt')
  ) {
    if (typeof value === 'string') {
      if (value.startsWith('Bearer ')) {
        return 'Bearer [MASKED]';
      }
      return '[REDACTED_SECRET]';
    }
  }

  // Recursive masking for nested objects
  if (typeof value === 'object' && !Array.isArray(value)) {
    const maskedObj: LogContext = {};
    for (const [k, v] of Object.entries(value)) {
      maskedObj[k] = maskPIIValue(k, v);
    }
    return maskedObj;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => maskPIIValue(`item_${index}`, item));
  }

  return value;
}

/**
 * Core logging engine
 */
function logStructured(level: LogLevel, message: string, context: LogContext = {}) {
  const timestamp = new Date().toISOString();
  
  // Mask PII context data before emission
  const cleanContext: LogContext = {};
  for (const [k, v] of Object.entries(context)) {
    cleanContext[k] = maskPIIValue(k, v);
  }

  const logPayload = {
    timestamp,
    level,
    message,
    application: 'SAMI_B2B_GATEWAY',
    env: process.env.NODE_ENV || 'development',
    ...(Object.keys(cleanContext).length > 0 ? { context: cleanContext } : {})
  };

  const serializedLog = JSON.stringify(logPayload);

  if (level === 'ERROR') {
    process.stderr.write(`${serializedLog}\n`);
  } else {
    process.stdout.write(`${serializedLog}\n`);
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => logStructured('INFO', message, context),
  warn: (message: string, context?: LogContext) => logStructured('WARN', message, context),
  error: (message: string, context?: LogContext, errorStack?: any) => {
    const ctx = {
      ...context,
      ...(errorStack instanceof Error ? { errorMsg: errorStack.message, stack: errorStack.stack } : { errorDetails: errorStack })
    };
    logStructured('ERROR', message, ctx);
  },
  security: (message: string, context?: LogContext) => logStructured('SECURITY_AUDIT', message, context)
};
