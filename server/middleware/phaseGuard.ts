import { Request, Response, NextFunction } from 'express';

/**
 * Regla de Arquitectura de Seguridad: La fase del servidor manda. Si el frontend tiene fase 2 y el servidor fase 1, gana el servidor.
 *
 * En SAMI, el control de activación por fases en el frontend es puramente una capa
 * de presentación y UX. La verdadera barrera de seguridad contra accesos a endpoints
 * no auditados o no desplegados reside en este servidor Express.
 * 
 * Variable de entorno: SAMI_ACTIVE_PHASE (Valores válidos: 1 | 2 | 3 | 4, por defecto: 1)
 */
export function getServerActivePhase(): number {
  const envVal = process.env.SAMI_ACTIVE_PHASE;
  if (!envVal) return 1;
  const parsed = parseInt(envVal, 10);
  if (parsed >= 1 && parsed <= 4) {
    return parsed;
  }
  return 1;
}

/**
 * Middleware que restringe el acceso a módulos o rutas según la fase activa del servidor.
 * Si la fase requerida por el módulo es mayor que SAMI_ACTIVE_PHASE, responde con HTTP 404
 * (no con 403, para no confirmar la existencia de la ruta ni revelar endpoints no auditados).
 */
export function requirePhase(minPhase: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const currentPhase = getServerActivePhase();
    if (minPhase > currentPhase) {
      // Retornar 404 Not Found estricto para no revelar que la ruta existe en fases superiores
      return res.status(404).json({
        error: 'Not Found',
        message: 'Ruta no encontrada'
      });
    }
    next();
  };
}
