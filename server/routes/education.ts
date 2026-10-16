import express from 'express';

const router = express.Router();

// GET /education (or /api/v1/education)
router.get('/', (req, res) => {
  res.json({
    success: true,
    module: 'education',
    phase: 3,
    message: 'Módulo de Academia y Cursos SAMI'
  });
});

export default router;
