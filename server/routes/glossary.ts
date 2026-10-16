import express from 'express';

const router = express.Router();

// GET /glossary (or /api/v1/glossary)
router.get('/', (req, res) => {
  res.json({
    success: true,
    module: 'glossary',
    phase: 3,
    message: 'Módulo de Glosario Financiero y Tributario MYPE'
  });
});

export default router;
