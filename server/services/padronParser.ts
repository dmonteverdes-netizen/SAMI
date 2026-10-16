// ─── Lector del Padrón Reducido del RUC (SUNAT) ───
// Archivo público: padron_reducido_ruc.txt (dentro de padron_reducido_ruc.zip), separado por "|",
// codificación ISO-8859-1 (latin1), primera fila con encabezados. Las columnas se ubican por nombre
// del encabezado para tolerar cambios de orden. Los campos vacíos vienen como "-".

// ─── Tipos e Interfaces ───

export interface PadronRecord {
  ruc: string;
  businessName: string;
  status: string;
  condition: string;
  ubigeo: string;
  address: string;
}

export type PadronColumns = Record<string, number>;

// ─── Constantes y Configuración ───

export const PADRON_DOWNLOAD_URL = 'https://www2.sunat.gob.pe/padron_reducido_ruc.zip';

/** Departamentos por los dos primeros dígitos del ubigeo (INEI). */
const DEPARTMENTS: Record<string, string> = {
  '01': 'Amazonas', '02': 'Áncash', '03': 'Apurímac', '04': 'Arequipa', '05': 'Ayacucho',
  '06': 'Cajamarca', '07': 'Callao', '08': 'Cusco', '09': 'Huancavelica', '10': 'Huánuco',
  '11': 'Ica', '12': 'Junín', '13': 'La Libertad', '14': 'Lambayeque', '15': 'Lima',
  '16': 'Loreto', '17': 'Madre de Dios', '18': 'Moquegua', '19': 'Pasco', '20': 'Piura',
  '21': 'Puno', '22': 'San Martín', '23': 'Tacna', '24': 'Tumbes', '25': 'Ucayali',
};

// Partes de la dirección en el orden en que se leen en una ficha RUC.
const ADDRESS_PARTS: Array<{ key: string; prefix?: string }> = [
  { key: 'TIPO DE VIA' },
  { key: 'NOMBRE DE VIA' },
  { key: 'NUMERO', prefix: 'NRO. ' },
  { key: 'KILOMETRO', prefix: 'KM. ' },
  { key: 'MANZANA', prefix: 'MZA. ' },
  { key: 'LOTE', prefix: 'LOTE ' },
  { key: 'DEPARTAMENTO', prefix: 'DPTO. ' },
  { key: 'INTERIOR', prefix: 'INT. ' },
  { key: 'CODIGO DE ZONA' },
  { key: 'TIPO DE ZONA' },
];

// ─── Handlers y Lógica de Negocio ───

/** Mayúsculas sin tildes ni espacios repetidos: "CONDICIÓN DE DOMICILIO" → "CONDICION DE DOMICILIO". */
export function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/�/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseHeader(line: string): PadronColumns {
  const columns: PadronColumns = {};
  line.split('|').forEach((name, index) => {
    const key = normalizeHeader(name);
    if (key) columns[key] = index;
  });

  const find = (prefix: string) => Object.keys(columns).find(k => k.startsWith(prefix));
  const required: Array<[string, string]> = [
    ['RUC', 'RUC'],
    ['NOMBRE', 'NOMBRE O RAZON SOCIAL'],
    ['ESTADO', 'ESTADO DEL CONTRIBUYENTE'],
    ['CONDICION', 'CONDICION DE DOMICILIO'],
    ['UBIGEO', 'UBIGEO'],
  ];
  for (const [prefix, canonical] of required) {
    const found = find(prefix);
    if (found === undefined) {
      throw new Error(`Encabezado del padrón no reconocido: falta la columna "${canonical}".`);
    }
    columns[canonical] = columns[found];
  }
  return columns;
}

const clean = (value: string | undefined) => {
  const v = (value ?? '').trim();
  return v === '-' ? '' : v;
};

export function parseLine(line: string, columns: PadronColumns): PadronRecord | null {
  if (!line) return null;
  const cells = line.split('|');
  const get = (key: string) => (columns[key] === undefined ? '' : clean(cells[columns[key]]));

  const ruc = get('RUC');
  if (!/^\d{11}$/.test(ruc)) return null;

  const address = ADDRESS_PARTS
    .map(({ key, prefix }) => {
      const v = get(key);
      if (!v) return '';
      return prefix && !v.toUpperCase().startsWith(prefix.trim()) ? `${prefix}${v}` : v;
    })
    .filter(Boolean)
    .join(' ');

  return {
    ruc,
    businessName: get('NOMBRE O RAZON SOCIAL'),
    status: get('ESTADO DEL CONTRIBUYENTE'),
    condition: get('CONDICION DE DOMICILIO'),
    ubigeo: get('UBIGEO').slice(0, 6),
    address,
  };
}

export function departmentFromUbigeo(ubigeo: string): string {
  return DEPARTMENTS[ubigeo.slice(0, 2)] || '';
}
