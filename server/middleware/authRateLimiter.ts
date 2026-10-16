import { Request, Response, NextFunction } from 'express';
import { logger } from '../../core/services/logger';

// ─── Tipos e Interfaces ───

interface FailedAttemptRecord {
  count: number;
  firstAttemptAt: number;
}

// ─── Constantes y Configuración ───

const loginAttempts = new Map<string, FailedAttemptRecord>();
const registerAttempts = new Map<string, FailedAttemptRecord>();
const MAX_ATTEMPTS = 5;
const BLOCK_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

// ─── Handlers y Lógica de Negocio ───

export function getAttemptKey(identifier: string, ip: string): string {
  return `${identifier.toLowerCase().trim()}_${ip.trim()}`;
}

export function checkLoginRateLimit(identifier: string, ip: string): { blocked: boolean; retryAfterSeconds?: number } {
  const key = getAttemptKey(identifier, ip);
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record) {
    return { blocked: false };
  }

  const elapsed = now - record.firstAttemptAt;
  if (elapsed >= BLOCK_WINDOW_MS) {
    loginAttempts.delete(key);
    return { blocked: false };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((BLOCK_WINDOW_MS - elapsed) / 1000);
    return { blocked: true, retryAfterSeconds };
  }

  return { blocked: false };
}

export function recordFailedLogin(identifier: string, ip: string): void {
  const key = getAttemptKey(identifier, ip);
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || (now - record.firstAttemptAt >= BLOCK_WINDOW_MS)) {
    loginAttempts.set(key, { count: 1, firstAttemptAt: now });
  } else {
    record.count += 1;
  }
}

export function clearFailedLogins(identifier: string, ip: string): void {
  const key = getAttemptKey(identifier, ip);
  loginAttempts.delete(key);
}

/**
 * Rate Limiter para Registro de Usuarios MYPE (POST /auth/register)
 * Protege contra abusos masivos de creación de cuentas por IP (5 intentos en 15 minutos).
 */
export function checkRegisterRateLimit(ip: string): { blocked: boolean; retryAfterSeconds?: number } {
  const key = ip.trim();
  const now = Date.now();
  const record = registerAttempts.get(key);

  if (!record) {
    return { blocked: false };
  }

  const elapsed = now - record.firstAttemptAt;
  if (elapsed >= BLOCK_WINDOW_MS) {
    registerAttempts.delete(key);
    return { blocked: false };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((BLOCK_WINDOW_MS - elapsed) / 1000);
    return { blocked: true, retryAfterSeconds };
  }

  return { blocked: false };
}

export function recordRegisterAttempt(ip: string): void {
  const key = ip.trim();
  const now = Date.now();
  const record = registerAttempts.get(key);

  if (!record || (now - record.firstAttemptAt >= BLOCK_WINDOW_MS)) {
    registerAttempts.set(key, { count: 1, firstAttemptAt: now });
  } else {
    record.count += 1;
  }
}

export function resetAuthRateLimiterStore(): void {
  loginAttempts.clear();
  registerAttempts.clear();
}
