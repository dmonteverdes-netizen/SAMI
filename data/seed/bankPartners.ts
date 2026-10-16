// ═══════════════════════════════════════════════════════════════
// ⚠️  DATOS DE DEMOSTRACIÓN — DOMINIO: ENTIDADES FINANCIERAS ALIADAS (B2B)
// ═══════════════════════════════════════════════════════════════
// ADVERTENCIA DE SEGURIDAD:
// Estos datos corresponden a entidades financieras simuladas para pruebas en sandbox/desarrollo.
// Las contraseñas/secretos se almacenan hasheados con bcrypt.
// En producción, los convenios y credenciales B2B se aprovisionan vía backoffice seguro.
// Credencial de prueba para desarrollo:
// - clientId: 'bank-aliado-id'
// - clientSecret en texto plano: 'bank-aliado-secret-2026'
// ═══════════════════════════════════════════════════════════════

import bcrypt from 'bcryptjs';

export interface SeedBankPartner {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string; // Hash bcrypt
  apiUrl?: string;
  isActive: boolean;
}

// Hash bcrypt precalculado para 'bank-aliado-secret-2026' (salt rounds = 10)
const DEMO_SECRET_HASH = bcrypt.hashSync('bank-aliado-secret-2026', 10);

export const SEED_BANK_PARTNERS: SeedBankPartner[] = [
  {
    id: 'bank-partner-demo-1',
    name: 'Banco Financiero Aliado MYPE',
    clientId: 'bank-aliado-id',
    clientSecret: DEMO_SECRET_HASH,
    apiUrl: 'https://sandbox.bancoaliado.pe/api/v1',
    isActive: true
  },
  {
    id: 'bank-partner-demo-2',
    name: 'Caja Municipal Confianza',
    clientId: 'caja-confianza-id',
    clientSecret: bcrypt.hashSync('caja-secret-2026', 10),
    apiUrl: 'https://sandbox.cajaconfianza.pe/api/v1',
    isActive: true
  }
];
