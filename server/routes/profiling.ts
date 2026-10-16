import express from 'express';

const router = express.Router();

// GET /profiling (or /api/v1/profiling)
router.get('/', (req, res) => {
  res.json({
    success: true,
    module: 'profiling',
    phase: 2,
    message: 'Módulo de Perfil de Riesgo y Evaluación para Entidades Financieras'
  });
});

export default router;
