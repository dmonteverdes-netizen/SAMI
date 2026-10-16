import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

let prismaInstance: PrismaClient | null = null;

/**
 * Instantiates the Prisma Client strictly connected to the configured PostgreSQL endpoint.
 * Implements strict Fail-Fast validation.
 */
export function getPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    logger.error('DATABASE_URL environment variable is missing. Failed to initialize database client (Fail-Fast policy).');
    throw new Error('DATABASE_URL environment variable is required.');
  }

  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });
  }
  return prismaInstance;
}

/**
 * Checks database health strictly by executing a live raw ping to PostgreSQL.
 * Propagates failure directly to prevent downstream false positives.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    logger.error('[DB HEALTH CHECK] Missing DATABASE_URL (Fail-Fast).');
    return false;
  }
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (err: any) {
    logger.error('[DB HEALTH CHECK] Connection to PostgreSQL cluster failed', {}, err);
    return false;
  }
}
