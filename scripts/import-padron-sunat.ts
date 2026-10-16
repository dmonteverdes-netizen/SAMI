/**
 * Importa el Padrón Reducido del RUC de SUNAT a PostgreSQL (tabla ruc_padron).
 *
 * Uso:
 *   npm run padron:import -- --download                 # descarga el ZIP oficial y lo importa
 *   npm run padron:import -- ./padron_reducido_ruc.zip  # ZIP ya descargado
 *   npm run padron:import -- ./padron_reducido_ruc.txt  # TXT ya descomprimido
 * Opciones:
 *   --limit=N      importa solo las primeras N filas válidas (útil para demos)
 *   --only-active  importa solo contribuyentes con estado ACTIVO
 *
 * Requiere DATABASE_URL y las migraciones aplicadas (npm run db:migrate-deploy).
 * El padrón completo tiene más de 14 millones de filas: la carga toma varios minutos y reemplaza
 * los datos anteriores de ruc_padron.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';
import { spawn } from 'child_process';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { PrismaClient } from '@prisma/client';
import { PADRON_DOWNLOAD_URL, PadronRecord, parseHeader, parseLine } from '../server/services/padronParser';

const BATCH_SIZE = 5000;

function parseArgs(argv: string[]) {
  const opts = { file: '', download: false, limit: Infinity, onlyActive: false };
  for (const arg of argv) {
    if (arg === '--download') opts.download = true;
    else if (arg === '--only-active') opts.onlyActive = true;
    else if (arg.startsWith('--limit=')) opts.limit = Number(arg.split('=')[1]);
    else if (!arg.startsWith('--')) opts.file = arg;
  }
  if (!opts.file && !opts.download) {
    throw new Error('Indica la ruta del padrón (.zip o .txt) o usa --download.');
  }
  return opts;
}

async function download(dest: string): Promise<void> {
  console.log(`Descargando ${PADRON_DOWNLOAD_URL} ...`);
  const res = await fetch(PADRON_DOWNLOAD_URL);
  if (!res.ok || !res.body) throw new Error(`SUNAT respondió ${res.status} al descargar el padrón.`);
  await pipeline(Readable.fromWeb(res.body as any), fs.createWriteStream(dest));
}

/** Abre el TXT directamente o lo extrae del ZIP con `unzip -p` (Linux/macOS) o `tar -xOf` (Windows 10+). */
function openPadronStream(file: string): Readable {
  if (!file.toLowerCase().endsWith('.zip')) return fs.createReadStream(file);
  const tryCmd = (cmd: string, args: string[]) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'inherit'] });
    return child;
  };
  const unzip = tryCmd('unzip', ['-p', file]);
  const out = new Readable({ read() {} });
  let fellBack = false;
  unzip.on('error', () => {
    fellBack = true;
    const tar = tryCmd('tar', ['-xOf', file]);
    tar.on('error', err => out.destroy(new Error(`No se pudo descomprimir el ZIP (instala unzip o descomprímelo a mano): ${err.message}`)));
    tar.stdout!.on('data', chunk => out.push(chunk));
    tar.stdout!.on('end', () => out.push(null));
  });
  unzip.stdout!.on('data', chunk => out.push(chunk));
  unzip.stdout!.on('end', () => { if (!fellBack) out.push(null); });
  return out;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.');

  let file = opts.file;
  if (opts.download) {
    file = path.join(os.tmpdir(), 'padron_reducido_ruc.zip');
    await download(file);
  }

  const prisma = new PrismaClient();
  // Vaciar ANTES de abrir el archivo: si se espera entre crear el lector y recorrerlo, se pierden líneas.
  console.log('Vaciando ruc_padron ...');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "ruc_padron"');

  const input = openPadronStream(file);
  input.setEncoding('latin1');
  const lines = readline.createInterface({ input, crlfDelay: Infinity });

  let columns: ReturnType<typeof parseHeader> | null = null;
  let batch: PadronRecord[] = [];
  let imported = 0;
  let skipped = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    await prisma.rucPadron.createMany({ data: batch, skipDuplicates: true });
    imported += batch.length;
    batch = [];
    if (imported % 100000 < BATCH_SIZE) console.log(`  ${imported.toLocaleString('es-PE')} filas importadas`);
  };

  for await (const line of lines) {
    if (!columns) {
      columns = parseHeader(line);
      continue;
    }
    const record = parseLine(line, columns);
    if (!record || (opts.onlyActive && record.status !== 'ACTIVO')) {
      skipped++;
      continue;
    }
    batch.push(record);
    if (batch.length >= BATCH_SIZE) await flush();
    if (imported + batch.length >= opts.limit) break;
  }
  await flush();
  lines.close();
  input.destroy();

  await prisma.padronImport.create({ data: { sourceFile: path.basename(file), rowCount: imported } });
  await prisma.$disconnect();
  console.log(`Listo: ${imported.toLocaleString('es-PE')} RUC importados, ${skipped.toLocaleString('es-PE')} filas omitidas.`);
}

main().catch(err => {
  console.error(`Error importando el padrón: ${err.message}`);
  process.exit(1);
});
