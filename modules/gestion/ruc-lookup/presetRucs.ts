import { PresetRuc } from './types';

/**
 * Lista de RUCs de prueba preconfigurados para demostración y validación en entorno de desarrollo.
 * NOTA: En entorno de producción se consulta la API de SUNAT/RENIEC a través del backend (/api/v1/ruc/:ruc).
 */
export const PRESET_RUCS: PresetRuc[] = [
  { ruc: '20123456789', name: 'Corp. Textil Gamarra', regime: 'Régimen General', condition: 'HABIDO' },
  { ruc: '20601234567', name: 'SAMI Finanzas & Tech', regime: 'Régimen MYPE Tributario', condition: 'HABIDO' },
  { ruc: '20543210987', name: 'Inversiones Alimentos', regime: 'Régimen MYPE Tributario', condition: 'HABIDO' },
  { ruc: '20489218291', name: 'Metalúrgica Lima Norte', regime: 'Régimen General', condition: 'HABIDO' },
  { ruc: '10456782912', name: 'Juan Gómez (Bodega)', regime: 'Nuevo RUS', condition: 'HABIDO' }
];
