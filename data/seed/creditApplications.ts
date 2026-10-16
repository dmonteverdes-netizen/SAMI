// ═══════════════════════════════════════════════════════════════
// ⚠️  DATOS DE DEMOSTRACIÓN — DOMINIO: SOLICITUDES DE CRÉDITO Y FACTORING
// ═══════════════════════════════════════════════════════════════
// ADVERTENCIA DE SEGURIDAD Y CUMPLIMIENTO REGULATORIO:
// Estos datos son exclusivamente para entorno de desarrollo, pruebas y demostración.
// NO DEBEN USARSE EN PRODUCCIÓN. En entorno productivo, las solicitudes y estados de
// financiamiento deben gestionarse mediante APIs seguras con entidades financieras aliadas.
// ═══════════════════════════════════════════════════════════════

import { CreditApplication } from '../../core/types/types';

export const SEED_CREDIT_APPLICATIONS: CreditApplication[] = [
  {
    id: 'app-991',
    userId: 'default',
    type: 'loan',
    amount: 5000,
    partner: { 
      id: 'fintech_a', 
      name: 'Fintech Veloz', 
      logoUrl: 'https://placehold.co/100x40/007bff/ffffff?text=Veloz' 
    },
    status: 'approved',
    timestamp: '2026-03-15T10:00:00Z',
    details: 'Capital de trabajo para campaña escolar'
  },
  {
    id: 'app-992',
    userId: 'default',
    type: 'factoring',
    amount: 1250.50,
    partner: { 
      id: 'caja_b', 
      name: 'Caja Confianza', 
      logoUrl: 'https://placehold.co/100x40/28a745/ffffff?text=Confianza' 
    },
    status: 'disbursed',
    timestamp: '2026-04-02T15:30:00Z',
    details: 'Adelanto Factura F001-442'
  },
  {
    id: 'app-993',
    userId: 'default',
    type: 'loan',
    amount: 15000,
    partner: { 
      id: 'banco_c', 
      name: 'Banco ProMYPE', 
      logoUrl: 'https://placehold.co/100x40/ffc107/000000?text=ProMYPE' 
    },
    status: 'pending',
    timestamp: '2026-05-12T09:15:00Z',
    details: 'Expansión de inventario de bebidas y abarrotes'
  }
];
