import bcrypt from 'bcryptjs';

// ─── Configuración y Constantes ───
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Genera un hash seguro con salt para contraseñas en texto plano usando bcrypt.
 * @param plain Contraseña en texto plano
 * @returns Hash bcrypt con salt incorporado
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_SALT_ROUNDS);
}

/**
 * Verifica si una contraseña en texto plano coincide con un hash bcrypt previamente almacenado.
 * Implementa comparación segura resistente a timing attacks.
 * @param plain Contraseña ingresada por el usuario
 * @param hash Hash almacenado en base de datos
 * @returns true si coincide, false en caso contrario
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) {
    return false;
  }
  return bcrypt.compare(plain, hash);
}
