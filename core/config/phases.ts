import { AppRole, View } from '../types/types';
import { ModuleConfig, ModulePhase, MODULES } from './modules';

/**
 * Fase activa de despliegue de SAMI.
 * Fase 1 = MVP Contable (dashboard, accounting, expenses, management, admin).
 * Valores permitidos: 1 | 2 | 3 | 4.
 */
export const FASE_ACTIVA: ModulePhase = 1;

/**
 * ADVERTENCIA DE SEGURIDAD Y ARQUITECTURA:
 * El filtrado por fases y la anulación en cliente (localStorage) es una capa de 
 * PRESENTACIÓN Y EXPERIENCIA DE USUARIO, NO UN CONTROL DE SEGURIDAD NI AUTORIZACIÓN.
 * 
 * Un usuario técnico o desarrollador con las DevTools del navegador abiertas puede alterar
 * las variables en memoria o en localStorage (`localStorage.setItem('sami_override_phase', '4')`).
 * La verdadera barrera de seguridad, confidencialidad y control de acceso por roles reside 
 * estrictamente en el backend (servidor Node.js/Express, middlewares de autorización y 
 * compuertas de consentimiento expreso del titular según la Ley N° 29733).
 */

/**
 * Obtiene la fase activa actual considerando posibles anulaciones locales (modo demo/reunión).
 */
export const obtenerFaseActiva = (): ModulePhase => {
  if (typeof window !== 'undefined') {
    try {
      const override = localStorage.getItem('sami_override_phase');
      if (override) {
        const parsed = parseInt(override, 10);
        if (parsed >= 1 && parsed <= 4) {
          return parsed as ModulePhase;
        }
      }
    } catch {
      // Ignorar errores de acceso a localStorage (ej. modo incógnito restringido)
    }
  }
  return FASE_ACTIVA;
};

/**
 * Determina si un módulo está disponible para un rol específico según la fase activa y los permisos de rol.
 * 
 * @param modulo Configuración del módulo a verificar (o su id)
 * @param rol Rol del usuario autenticado
 * @returns boolean Verdadero si el módulo pertenece a la fase activa (o anterior) y el rol tiene acceso
 */
export const moduloDisponible = (
  modulo: ModuleConfig | View, 
  rol: AppRole
): boolean => {
  const modConfig = typeof modulo === 'string' ? MODULES[modulo] : modulo;
  if (!modConfig) return false;

  const faseActual = obtenerFaseActiva();
  
  // 1. Filtro de fase: el módulo debe pertenecer a la fase activa o anterior
  const fasePermitida = modConfig.phase <= faseActual;
  
  // 2. Filtro de rol: el rol del usuario debe estar en la lista de roles autorizados
  const rolPermitido = modConfig.roles.includes(rol);

  return fasePermitida && rolPermitido;
};

/**
 * Obtiene la lista completa de módulos navegables disponibles para un rol según la fase activa actual.
 * Excluye vistas de sistema o paneles modales (como 'notifications').
 */
export const modulosDisponiblesParaRol = (rol: AppRole): ModuleConfig[] => {
  return Object.values(MODULES).filter(mod => {
    if (mod.id === 'notifications') return false;
    return moduloDisponible(mod, rol);
  });
};

export { SAMI_COMMERCIAL_EMAIL } from './constants';

