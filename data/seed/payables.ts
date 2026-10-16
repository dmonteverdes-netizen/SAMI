// ═══════════════════════════════════════════════════════════════
// ⚠️  DATOS DE DEMOSTRACIÓN — DOMINIO: CUENTAS POR PAGAR Y ALERTAS
// ═══════════════════════════════════════════════════════════════
// ADVERTENCIA DE SEGURIDAD Y CUMPLIMIENTO REGULATORIO:
// Estos datos son exclusivamente para entorno de desarrollo, pruebas y demostración.
// NO DEBEN USARSE EN PRODUCCIÓN. En entorno productivo, las cuentas por pagar,
// proveedores y alertas deben sincronizarse con la base de datos y/o facturas recibidas.
// ═══════════════════════════════════════════════════════════════

import { PaymentAlert } from '../../core/types/types';

export const SEED_PAYMENT_ALERTS: PaymentAlert[] = [
  { 
    id: 'a1', 
    vendorId: 'v1', 
    serviceName: 'Alquiler Local', 
    dueDate: '2026-05-20', 
    amount: 3500.00, 
    status: 'pending', 
    frequency: 'monthly' 
  },
  { 
    id: 'a2', 
    vendorId: 'v2', 
    serviceName: 'Servicio Internet Fibra', 
    dueDate: '2026-05-18', 
    amount: 189.90, 
    status: 'pending', 
    frequency: 'monthly' 
  }
];

export const SEED_VENDORS = [
  { id: 'v1', name: 'Inmobiliaria Los Olivos SAC', ruc: '20553467801', category: 'Alquiler' },
  { id: 'v2', name: 'Telefónica del Perú SAA', ruc: '20100017491', category: 'Telecomunicaciones' },
  { id: 'v3', name: 'Alicorp SAA', ruc: '20100070970', category: 'Mercadería y Abarrotes' }
];
