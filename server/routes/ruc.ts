// ─── Consulta de RUC contra el Padrón Reducido SUNAT ───
// GET /api/v1/ruc/:ruc
// Responde { padronLoaded:false } si no hay base de datos o no se importó el padrón;
// el frontend muestra entonces una ficha en Modo Demostración rotulada como tal.
import express from 'express';
import { getPrismaClient } from '../../core/services/db';
import { logger } from '../../core/services/logger';
import { createAuthenticateToken } from '../middleware/auth';
import { departmentFromUbigeo } from '../services/padronParser';

const router = express.Router();

router.get('/:ruc', createAuthenticateToken(), async (req, res) => {
  const ruc = String(req.params.ruc);
  if (!/^\d{11}$/.test(ruc)) {
    return res.status(400).json({ error: 'invalid_ruc', message: 'El RUC debe tener 11 dígitos numéricos.' });
  }

  if (!process.env.DATABASE_URL) {
    return res.json({ found: false, padronLoaded: false });
  }

  try {
    const prisma = getPrismaClient();
    const lastImport = await prisma.padronImport.findFirst({ orderBy: { importedAt: 'desc' } });
    if (!lastImport) {
      return res.json({ found: false, padronLoaded: false });
    }

    const padronDate = lastImport.importedAt.toISOString().slice(0, 10);
    const row = await prisma.rucPadron.findUnique({ where: { ruc } });
    if (!row) {
      return res.status(404).json({ found: false, padronLoaded: true, padronDate });
    }

    res.json({
      found: true,
      padronLoaded: true,
      padronDate,
      data: {
        ruc: row.ruc,
        businessName: row.businessName,
        status: row.status,
        condition: row.condition,
        ubigeo: row.ubigeo,
        department: departmentFromUbigeo(row.ubigeo),
        address: row.address,
      },
    });
  } catch (err: unknown) {
    logger.error('[RUC Router] Error consultando el padrón:', {}, err);
    res.status(500).json({ error: 'server_error', message: 'No se pudo consultar el padrón SUNAT.' });
  }
});

export default router;
