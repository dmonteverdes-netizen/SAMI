import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role, Permission, roleHasPermission, requiresTwoFactor, isMypeRole } from '../auth/permissions';
import { logger } from '../../core/services/logger';

// ─── Configuración de Seguridad JWT ───
// En producción es mandatorio que JWT_SECRET provenga de variables de entorno seguras.
export const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET no está configurado. El servidor no puede iniciar en producción sin este valor.');
  }
  console.warn('[SAMI] ADVERTENCIA: JWT_SECRET no configurado, usando valor temporal solo para desarrollo local.');
}

export const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'dev-only-insecure-secret-do-not-deploy';
export const JWT_EXPIRES_IN = '24h';
export const JWT_TEMP_EXPIRES_IN = '10m';

export interface AuthUserPayload {
  id: string;
  email: string;
  name: string;
  role: Role;
  ruc?: string;
  businessId?: string;
  institutionId?: string;
  mfaVerified: boolean;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export function generateToken(
  payload: Omit<AuthUserPayload, 'iat' | 'exp'>,
  expiresIn: string = JWT_EXPIRES_IN
): string {
  return jwt.sign(payload, EFFECTIVE_JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthUserPayload {
  return jwt.verify(token, EFFECTIVE_JWT_SECRET) as AuthUserPayload;
}

/**
 * 1. createAuthenticateToken
 * Lee el token Bearer del header Authorization, lo verifica con JWT_SECRET,
 * extrae los datos del usuario y los adjunta a req.user.
 * Si el token no existe, está vencido o es inválido, responde 401 Unauthorized sin tocar la base de datos.
 */
export const createAuthenticateToken = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: 'No autorizado: Token de sesión ausente en la petición',
        code: 'UNAUTHORIZED'
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'No autorizado: Formato de encabezado Bearer inválido',
        code: 'INVALID_AUTH_HEADER'
      });
    }

    const token = parts[1];
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
      next();
    } catch (err: any) {
      return res.status(401).json({
        error: 'No autorizado: Token vencido, manipulado o firma inválida',
        code: 'INVALID_TOKEN',
        details: err.message
      });
    }
  };
};

/**
 * 2. createOptionalSession
 * Para rutas que pueden funcionar con o sin usuario autenticado (como landing o diagnóstico público).
 * Si hay token válido, carga req.user; si no hay token o es inválido, deja req.user como undefined y continúa.
 */
export const createOptionalSession = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      req.user = undefined;
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      try {
        const decoded = verifyToken(parts[1]);
        req.user = decoded;
      } catch {
        req.user = undefined;
      }
    }
    next();
  };
};

/**
 * 3. requirePermission(permission)
 * Middleware de orden superior que verifica que el rol del usuario en req.user
 * tenga el permiso solicitado según la matriz ROLE_PERMISSIONS.
 * Si no lo tiene, responde 403 Forbidden antes de que el controlador comience.
 */
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado: Se requiere inicio de sesión para acceder a este recurso',
        code: 'UNAUTHENTICATED'
      });
    }

    if (!roleHasPermission(req.user.role, permission)) {
      return res.status(403).json({
        error: `Acceso denegado: El rol ${req.user.role} no cuenta con el permiso requerido (${permission})`,
        code: 'FORBIDDEN',
        requiredPermission: permission,
        userRole: req.user.role
      });
    }

    next();
  };
};

/**
 * 4. requireMfa
 * Verifica que req.user.mfaVerified sea true.
 * Si el rol del usuario está en ROLES_REQUIRING_2FA y no ha completado el segundo factor en esta sesión,
 * responde 403 con código MFA_REQUIRED para que el frontend abra el modal de 2FA.
 */
export const requireMfa = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'No autenticado: Se requiere inicio de sesión',
      code: 'UNAUTHENTICATED'
    });
  }

  if (requiresTwoFactor(req.user.role) && !req.user.mfaVerified) {
    return res.status(403).json({
      error: 'Se requiere verificación de segundo factor (2FA) para este rol administrativo/bancario',
      code: 'MFA_REQUIRED',
      mfaMethod: 'SMS'
    });
  }

  next();
};

/**
 * 5. requireOwnBusiness
 * Protección estricta contra IDOR (Insecure Direct Object Reference).
 * Verifica que el RUC solicitado en params, query, body o headers coincida con el RUC
 * del usuario autenticado en su token JWT, a menos que el usuario tenga un rol autorizado
 * (como SAMI_ADMIN o entidad financiera con consentimiento previo).
 */
export const requireOwnBusiness = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'No autenticado: Se requiere inicio de sesión',
      code: 'UNAUTHENTICATED'
    });
  }

  // SAMI_ADMIN tiene acceso global de auditoría técnica
  if (req.user.role === 'SAMI_ADMIN') {
    return next();
  }

  // Entidades financieras acceden vía Consent assertion (ConsentService.assertConsent)
  if (req.user.role.startsWith('BANK_')) {
    return next();
  }

  // Extraer el RUC objetivo de la solicitud
  const targetRuc = req.params.ruc || req.query.ruc || req.body.ruc || (req.headers['x-target-ruc'] as string);

  if (!targetRuc) {
    return next();
  }

  const userRuc = req.user.ruc;
  const userBusinessId = req.user.businessId;

  if (isMypeRole(req.user.role)) {
    // Si el usuario MYPE intenta consultar un RUC que no le pertenece
    const isOwner = (userRuc && userRuc === targetRuc) || (userBusinessId && userBusinessId === targetRuc);
    if (!isOwner) {
      logger.warn('[IDOR Shield] Intento de acceso a RUC ajeno bloqueado:', {
        userId: req.user.id,
        userRole: req.user.role,
        userRuc,
        targetRuc
      });
      return res.status(403).json({
        error: 'Acceso denegado: No tiene autorización para acceder a los datos de este RUC (Protección contra IDOR)',
        code: 'IDOR_VIOLATION',
        targetRuc
      });
    }
  }

  next();
};
