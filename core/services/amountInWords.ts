// ─── Monto en Letras (es-PE) ───
// Leyenda obligatoria (código 1000) en comprobantes electrónicos y texto impreso del comprobante.
// Ej.: 236 → "SON: DOSCIENTOS TREINTA Y SEIS CON 00/100 SOLES"

const UNITS = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const TEENS = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const TENS = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const HUNDREDS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

/** Convierte 0–999 a letras. */
function convertGroup(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rem = n % 100;
  if (h > 0) parts.push(HUNDREDS[h]);
  if (rem >= 10 && rem < 20) parts.push(TEENS[rem - 10]);
  else if (rem === 20) parts.push('VEINTE');
  else if (rem > 20 && rem < 30) parts.push(`VEINTI${UNITS[rem - 20]}`);
  else if (rem >= 30) parts.push(rem % 10 > 0 ? `${TENS[Math.floor(rem / 10)]} Y ${UNITS[rem % 10]}` : TENS[Math.floor(rem / 10)]);
  else if (rem > 0) parts.push(UNITS[rem]);
  return parts.join(' ');
}

/** Convierte un entero (hasta 999 999 999) a letras. */
function integerToWords(n: number): string {
  if (n === 0) return 'CERO';
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (millions > 0) parts.push(millions === 1 ? 'UN MILLÓN' : `${convertGroup(millions)} MILLONES`);
  if (thousands > 0) parts.push(thousands === 1 ? 'MIL' : `${convertGroup(thousands)} MIL`);
  if (rest > 0) parts.push(convertGroup(rest));
  return parts.join(' ');
}

export function amountInWordsPE(amount: number): string {
  // Se trabaja en céntimos para evitar errores de redondeo (p. ej. 10.995 → 11.00).
  const totalCents = Math.round(Math.abs(amount) * 100);
  const whole = Math.floor(totalCents / 100);
  const cents = String(totalCents % 100).padStart(2, '0');
  return `SON: ${integerToWords(whole)} CON ${cents}/100 SOLES`;
}
