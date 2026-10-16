// ─── Selección del Proveedor de Emisión Electrónica ───
// EINVOICE_PROVIDER fuerza un proveedor: NUBEFACT | SUNAT_DIRECTO | SIMULADO.
// Sin esa variable se elige automáticamente: Nubefact si está configurado, luego SUNAT directo (Lycet),
// y si no hay ninguno, Modo Demostración (no se envía nada a SUNAT).

import { Invoice } from '../../core/types/types';
import { getPrismaClient } from '../../core/services/db';
import { departmentFromUbigeo } from './padronParser';
import { emitWithNubefact, isNubefactConfigured } from './nubefactClient';
import { emitWithSunatDirect, isSunatDirectConfigured } from './sunatDirectClient';
import { EmissionCustomer, EmissionEmitter, EmissionProvider, EmissionResult } from './emissionTypes';

const PROVIDERS: EmissionProvider[] = ['NUBEFACT', 'SUNAT_DIRECTO', 'SIMULADO'];

export function resolveEmissionProvider(): EmissionProvider {
  const forced = (process.env.EINVOICE_PROVIDER || '').toUpperCase() as EmissionProvider;
  if (PROVIDERS.includes(forced)) return forced;
  if (isNubefactConfigured()) return 'NUBEFACT';
  if (isSunatDirectConfigured()) return 'SUNAT_DIRECTO';
  return 'SIMULADO';
}

export function simulatedEmission(): EmissionResult {
  return {
    success: true,
    isSimulated: true,
    provider: 'SIMULADO',
    environmentLabel: 'Modo Demostración — comprobante NO enviado a SUNAT (configure Nubefact o Lycet)',
    sunatMessage: 'Simulación: no hubo envío a SUNAT.',
  };
}

/**
 * Datos del emisor: razón social desde la tabla smes y dirección/ubigeo desde el padrón SUNAT.
 * Devuelve null si falta algo indispensable para firmar el comprobante.
 */
export async function loadEmitter(ruc: string | undefined): Promise<EmissionEmitter | null> {
  if (!ruc || !/^\d{11}$/.test(ruc) || !process.env.DATABASE_URL) return null;
  const prisma = getPrismaClient();
  const [sme, padron] = await Promise.all([
    prisma.sME.findUnique({ where: { ruc } }),
    prisma.rucPadron.findUnique({ where: { ruc } }),
  ]);
  const businessName = padron?.businessName || sme?.businessName;
  if (!businessName || !padron?.ubigeo || !padron.address) return null;
  return {
    ruc,
    businessName,
    address: padron.address,
    ubigeo: padron.ubigeo,
    department: departmentFromUbigeo(padron.ubigeo) || 'LIMA',
  };
}

/** Si el padrón SUNAT está cargado, completa la razón social y dirección del cliente. */
export async function completeCustomerFromPadron(ruc: string | undefined, customer: EmissionCustomer): Promise<EmissionCustomer> {
  if (customer.name || !ruc || !process.env.DATABASE_URL) return customer;
  try {
    const row = await getPrismaClient().rucPadron.findUnique({ where: { ruc } });
    return row ? { ...customer, name: row.businessName, address: customer.address || row.address } : customer;
  } catch {
    return customer;
  }
}

export async function emitInvoice(
  sale: Invoice,
  context: { customer: EmissionCustomer; emitterRuc?: string }
): Promise<EmissionResult> {
  const provider = resolveEmissionProvider();
  if (provider === 'NUBEFACT') return emitWithNubefact(sale, context.customer);
  if (provider === 'SUNAT_DIRECTO') {
    const emitter = await loadEmitter(context.emitterRuc).catch(() => null);
    return emitWithSunatDirect(sale, emitter, context.customer);
  }
  return simulatedEmission();
}
