// ═══════════════════════════════════════════════════════════════
// ⚠️  DATOS DE DEMOSTRACIÓN — DOMINIO: TAREAS Y CALENDARIO TRIBUTARIO
// ═══════════════════════════════════════════════════════════════
// ADVERTENCIA DE SEGURIDAD Y CUMPLIMIENTO REGULATORIO:
// Estos datos son exclusivamente para entorno de desarrollo, pruebas y demostración.
// NO DEBEN USARSE EN PRODUCCIÓN.
// ═══════════════════════════════════════════════════════════════

import { Task, TaskStatus } from '../../core/types/types';

const generateId = () => Math.random().toString(36).substring(2, 11);

export const SEED_TASKS: Task[] = [
  { 
    id: generateId(), 
    title: 'Declaración mensual IGV', 
    description: 'Presentar PDT 621 en SUNAT Virtual. Usar tu Clave SOL.', 
    category: 'SUNAT', 
    status: TaskStatus.PENDING, 
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), 
    priority: 'high', 
    assignedTo: 'u2' 
  },
  { 
    id: generateId(), 
    title: 'Pago a Alicorp (proveedor)', 
    description: 'Pago de factura F001-00890 por S/ 3,500', 
    category: 'Pagos', 
    status: TaskStatus.PENDING, 
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), 
    priority: 'medium', 
    assignedTo: 'u2' 
  },
  { 
    id: generateId(), 
    title: 'Actualizar stock bebidas', 
    description: 'Revisar inventario de gaseosas y jugos. Hacer pedido si es necesario.', 
    category: 'Inventario', 
    status: TaskStatus.IN_PROGRESS, 
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), 
    priority: 'low', 
    assignedTo: 'u3' 
  },
  { 
    id: generateId(), 
    title: 'Renovar licencia de funcionamiento', 
    description: 'Municipalidad de Los Olivos. Llevar: DNI, recibo de luz, formulario.', 
    category: 'Legal', 
    status: TaskStatus.COMPLETED, 
    dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), 
    priority: 'high', 
    assignedTo: 'u2' 
  },
];
