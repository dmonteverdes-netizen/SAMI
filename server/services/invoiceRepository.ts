// ─── Repositorio de Comprobantes (Ventas y Compras) ───
// Fuente de verdad en servidor para comprobantes de la MYPE.
// - Con DATABASE_URL y un RUC válido en el token: PostgreSQL vía Prisma (tabla "invoices").
// - Sin base de datos (desarrollo / demo): almacén JSON de businessStore.ts.

import { Prisma } from '@prisma/client';
import { Invoice, InvoiceType } from '../../core/types/types';
import { getPrismaClient } from '../../core/services/db';
import {
  getSalesForBusiness,
  saveSaleForBusiness,
  updateSaleForBusiness,
  deleteSaleForBusiness,
  getPurchasesForBusiness,
  savePurchaseForBusiness,
  updatePurchaseForBusiness,
  deletePurchaseForBusiness
} from './businessStore';

// ─── Tipos e Interfaces ───

export type InvoiceKind = 'sale' | 'purchase';

/** Dueño de los comprobantes: negocio autenticado. */
export interface InvoiceOwner {
  businessId: string;
  ruc?: string;
}

/** Resultado de emisión electrónica que se guarda junto a la venta. */
export interface EmissionRecord {
  provider: 'NUBEFACT' | 'SIMULADO';
  isSimulated: boolean;
  acceptedBySunat?: boolean;
  sunatDescription?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  cdrUrl?: string;
}

export type StoredInvoice = Invoice & {
  emission?: EmissionRecord & { emittedAt?: string };
};

export class DuplicateInvoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateInvoiceError';
  }
}

// ─── Constantes y Configuración ───

const RUC_PATTERN = /^\d{11}$/;

const DOCUMENT_TYPE_ALIASES: Record<string, string> = {
  BOLETA: 'BOLETA_DE_VENTA',
};

const VALID_DOCUMENT_TYPES = ['FACTURA', 'BOLETA_DE_VENTA', 'NOTA_DE_CREDITO', 'NOTA_DE_DEBITO'] as const;

export function normalizeDocumentType(value: string): string {
  const upper = String(value || '').toUpperCase();
  return DOCUMENT_TYPE_ALIASES[upper] || upper;
}

/** PostgreSQL se usa solo si hay DATABASE_URL y el negocio tiene RUC (clave de la tabla smes). */
export function usesDatabase(owner: InvoiceOwner): boolean {
  return Boolean(process.env.DATABASE_URL) && RUC_PATTERN.test(owner.ruc || '');
}

// ─── Mapeo Prisma ↔ Dominio ───

type InvoiceRow = Prisma.InvoiceGetPayload<object>;

function toDomain(row: InvoiceRow): StoredInvoice {
  const invoice: StoredInvoice = {
    id: row.id,
    type: row.type === 'SALE' ? InvoiceType.SALE : InvoiceType.PURCHASE,
    documentType: row.documentType as Invoice['documentType'],
    series: row.series,
    correlative: row.correlative,
    issueDate: row.issueDate.toISOString().slice(0, 10),
    totalAmount: Number(row.totalAmount),
  };
  if (row.ruc) invoice.ruc = row.ruc;
  if (row.category) invoice.category = row.category;
  if (row.description) invoice.description = row.description;
  if (row.paymentMethod) invoice.paymentMethod = row.paymentMethod as Invoice['paymentMethod'];
  if (row.aiCategorizedReason) invoice.aiCategorizedReason = row.aiCategorizedReason;
  if (row.referencedDocumentType) invoice.referencedDocumentType = row.referencedDocumentType as Invoice['documentType'];
  if (row.referencedSeries) invoice.referencedSeries = row.referencedSeries;
  if (row.referencedCorrelative != null) invoice.referencedCorrelative = row.referencedCorrelative;
  if (row.noteReason) invoice.noteReason = row.noteReason;
  if (row.referencedInvoiceId) invoice.referencedInvoiceId = row.referencedInvoiceId;
  if (row.emissionProvider) {
    invoice.emission = {
      provider: row.emissionProvider as EmissionRecord['provider'],
      isSimulated: row.emissionSimulated ?? true,
      acceptedBySunat: row.sunatAccepted ?? undefined,
      sunatDescription: row.sunatDescription ?? undefined,
      pdfUrl: row.pdfUrl ?? undefined,
      xmlUrl: row.xmlUrl ?? undefined,
      cdrUrl: row.cdrUrl ?? undefined,
      emittedAt: row.emittedAt?.toISOString(),
    };
  }
  return invoice;
}

function toDbFields(data: Partial<Invoice>): Prisma.InvoiceUncheckedUpdateInput {
  const out: Prisma.InvoiceUncheckedUpdateInput = {};
  if (data.documentType !== undefined) {
    const doc = normalizeDocumentType(data.documentType);
    if (!(VALID_DOCUMENT_TYPES as readonly string[]).includes(doc)) {
      throw new Error(`Tipo de comprobante no soportado: ${data.documentType}`);
    }
    out.documentType = doc as (typeof VALID_DOCUMENT_TYPES)[number];
  }
  if (data.series !== undefined) out.series = data.series.toUpperCase();
  if (data.correlative !== undefined) out.correlative = Number(data.correlative);
  if (data.issueDate !== undefined) out.issueDate = new Date(`${data.issueDate.slice(0, 10)}T00:00:00.000Z`);
  if (data.totalAmount !== undefined) out.totalAmount = new Prisma.Decimal(data.totalAmount);
  if (data.ruc !== undefined) out.ruc = data.ruc || null;
  if (data.category !== undefined) out.category = data.category;
  if (data.description !== undefined) out.description = data.description;
  if (data.paymentMethod !== undefined) out.paymentMethod = data.paymentMethod;
  if (data.aiCategorizedReason !== undefined) out.aiCategorizedReason = data.aiCategorizedReason;
  if (data.referencedDocumentType !== undefined) out.referencedDocumentType = normalizeDocumentType(data.referencedDocumentType) as (typeof VALID_DOCUMENT_TYPES)[number];
  if (data.referencedSeries !== undefined) out.referencedSeries = data.referencedSeries;
  if (data.referencedCorrelative !== undefined) out.referencedCorrelative = data.referencedCorrelative;
  if (data.noteReason !== undefined) out.noteReason = data.noteReason;
  if (data.referencedInvoiceId !== undefined) out.referencedInvoiceId = data.referencedInvoiceId;
  return out;
}

const dbType = (kind: InvoiceKind): 'SALE' | 'PURCHASE' => (kind === 'sale' ? 'SALE' : 'PURCHASE');

// ─── Detección de Duplicados ───

/** Venta duplicada: mismo tipo, serie y correlativo. Compra duplicada: además mismo RUC de proveedor. */
function isSameDocument(kind: InvoiceKind, a: Partial<Invoice>, b: Partial<Invoice>): boolean {
  const same =
    normalizeDocumentType(a.documentType || '') === normalizeDocumentType(b.documentType || '') &&
    String(a.series || '').toUpperCase() === String(b.series || '').toUpperCase() &&
    Number(a.correlative) === Number(b.correlative);
  return kind === 'sale' ? same : same && (a.ruc || '') === (b.ruc || '');
}

function duplicateMessage(kind: InvoiceKind, inv: Partial<Invoice>): string {
  const label = kind === 'sale' ? 'venta' : 'compra';
  return `Ya existe una ${label} registrada con ${inv.series}-${inv.correlative}${kind === 'purchase' && inv.ruc ? ` del proveedor ${inv.ruc}` : ''}.`;
}

// ─── Operaciones Públicas ───

export async function listInvoices(owner: InvoiceOwner, kind: InvoiceKind): Promise<StoredInvoice[]> {
  if (!usesDatabase(owner)) {
    return kind === 'sale' ? getSalesForBusiness(owner.businessId) : getPurchasesForBusiness(owner.businessId);
  }
  const rows = await getPrismaClient().invoice.findMany({
    where: { smeId: owner.ruc!, type: dbType(kind) },
    orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
  });
  return rows.map(toDomain);
}

export async function createInvoice(owner: InvoiceOwner, kind: InvoiceKind, data: Invoice): Promise<StoredInvoice> {
  const existing = await listInvoices(owner, kind);
  if (existing.some(inv => isSameDocument(kind, inv, data))) {
    throw new DuplicateInvoiceError(duplicateMessage(kind, data));
  }

  if (!usesDatabase(owner)) {
    const normalized = { ...data, documentType: normalizeDocumentType(data.documentType) } as Invoice;
    return kind === 'sale'
      ? saveSaleForBusiness(owner.businessId, normalized)
      : savePurchaseForBusiness(owner.businessId, normalized);
  }

  try {
    const row = await getPrismaClient().invoice.create({
      data: {
        ...(toDbFields(data) as Prisma.InvoiceUncheckedCreateInput),
        type: dbType(kind),
        smeId: owner.ruc!,
      },
    });
    return toDomain(row);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new DuplicateInvoiceError(duplicateMessage(kind, data));
    }
    throw err;
  }
}

export async function updateInvoice(
  owner: InvoiceOwner,
  kind: InvoiceKind,
  id: string,
  updates: Partial<Invoice>
): Promise<StoredInvoice | null> {
  if (!usesDatabase(owner)) {
    return kind === 'sale'
      ? updateSaleForBusiness(owner.businessId, id, updates)
      : updatePurchaseForBusiness(owner.businessId, id, updates);
  }
  const prisma = getPrismaClient();
  // updateMany filtra por dueño: un negocio nunca puede modificar comprobantes de otro (IDOR).
  const result = await prisma.invoice.updateMany({
    where: { id, smeId: owner.ruc!, type: dbType(kind) },
    data: toDbFields(updates) as Prisma.InvoiceUncheckedUpdateManyInput,
  });
  if (result.count === 0) return null;
  const row = await prisma.invoice.findUnique({ where: { id } });
  return row ? toDomain(row) : null;
}

export async function deleteInvoice(owner: InvoiceOwner, kind: InvoiceKind, id: string): Promise<boolean> {
  if (!usesDatabase(owner)) {
    return kind === 'sale' ? deleteSaleForBusiness(owner.businessId, id) : deletePurchaseForBusiness(owner.businessId, id);
  }
  const result = await getPrismaClient().invoice.deleteMany({
    where: { id, smeId: owner.ruc!, type: dbType(kind) },
  });
  return result.count > 0;
}

/** Guarda en la venta el resultado de la emisión electrónica (real o simulada). */
export async function recordEmission(owner: InvoiceOwner, id: string, emission: EmissionRecord): Promise<StoredInvoice | null> {
  const emittedAt = new Date();
  if (!usesDatabase(owner)) {
    return updateSaleForBusiness(owner.businessId, id, {
      emission: { ...emission, emittedAt: emittedAt.toISOString() },
    } as Partial<Invoice>);
  }
  const prisma = getPrismaClient();
  const result = await prisma.invoice.updateMany({
    where: { id, smeId: owner.ruc!, type: 'SALE' },
    data: {
      emissionProvider: emission.provider,
      emissionSimulated: emission.isSimulated,
      sunatAccepted: emission.acceptedBySunat ?? null,
      sunatDescription: emission.sunatDescription ?? null,
      pdfUrl: emission.pdfUrl ?? null,
      xmlUrl: emission.xmlUrl ?? null,
      cdrUrl: emission.cdrUrl ?? null,
      emittedAt,
    },
  });
  if (result.count === 0) return null;
  const row = await prisma.invoice.findUnique({ where: { id } });
  return row ? toDomain(row) : null;
}

/** Busca una venta del negocio por id (para emitirla). */
export async function findSale(owner: InvoiceOwner, id: string): Promise<StoredInvoice | null> {
  if (!usesDatabase(owner)) {
    return getSalesForBusiness(owner.businessId).find(s => s.id === id) || null;
  }
  const row = await getPrismaClient().invoice.findFirst({ where: { id, smeId: owner.ruc!, type: 'SALE' } });
  return row ? toDomain(row) : null;
}
