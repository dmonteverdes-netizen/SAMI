// ─── Tipos Compartidos de Emisión Electrónica ───
// Usados por todos los proveedores (Nubefact, SUNAT directo vía Lycet, simulado).

export type EmissionProvider = 'NUBEFACT' | 'SUNAT_DIRECTO' | 'SIMULADO';

/** Datos del cliente (receptor) que el comprobante necesita además de su RUC. */
export interface EmissionCustomer {
  name?: string;
  address?: string;
  email?: string;
}

/** Datos del emisor (la MYPE). Necesarios para firmar y enviar directo a SUNAT. */
export interface EmissionEmitter {
  ruc: string;
  businessName: string;
  tradeName?: string;
  address: string;
  ubigeo: string;
  department: string;
}

export interface EmissionResult {
  success: boolean;
  /** true = el comprobante NO fue enviado a SUNAT (Modo Demostración). */
  isSimulated: boolean;
  provider: EmissionProvider;
  environmentLabel: string;
  acceptedBySunat?: boolean;
  sunatCode?: string;
  sunatMessage?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  cdrUrl?: string;
  /** XML UBL 2.1 firmado (envío directo). El emisor debe conservarlo junto con el CDR. */
  signedXml?: string;
  /** Constancia de recepción (CDR) de SUNAT, ZIP en base64 (envío directo). */
  cdrZipBase64?: string;
  /** Resumen (hash) de la firma digital, impreso en la representación del comprobante. */
  documentHash?: string;
  errors?: string[];
}

export const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));
