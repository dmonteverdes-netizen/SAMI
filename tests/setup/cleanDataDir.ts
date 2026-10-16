import fs from 'fs';
import os from 'os';
import path from 'path';

/** Parte de cada corrida de tests con almacenes JSON vacíos (se regeneran desde data/seed). */
export default function setup() {
  fs.rmSync(path.join(os.tmpdir(), 'sami-test-data'), { recursive: true, force: true });
}
