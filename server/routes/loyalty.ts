import express from 'express';

const router = express.Router();

// GET /loyalty (or /api/v1/loyalty)
router.get('/', (req, res) => {
  res.json({
    success: true,
    module: 'loyalty',
    phase: 4,
    message: 'Módulo de Fidelización y SAMI Coins'
  });
});

export default router;
