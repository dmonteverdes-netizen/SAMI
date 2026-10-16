import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import chatRouter from '../../server/routes/chat';

// Instancia aislada de Express para pruebas de la ruta /chat
const app = express();
app.use(express.json());
app.use('/api/v1/chat', chatRouter);

describe('Integration Tests: SAMI Coach Chat Route (POST /api/v1/chat)', () => {
  const originalApiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    // Asegurar que GEMINI_API_KEY no esté presente para probar el fallback determinista
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    if (originalApiKey) {
      process.env.GEMINI_API_KEY = originalApiKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  });

  it('1. Debe responder 400 con error si no se envía el campo message', async () => {
    const response = await request(app)
      .post('/api/v1/chat')
      .send({})
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/mensaje requerido/i);
  });

  it('2. En fallback (sin API key), la respuesta sobre crédito NO debe contener "1.2%" ni la palabra "calificas"', async () => {
    const response = await request(app)
      .post('/api/v1/chat')
      .send({ message: '¿Cómo funciona el crédito o financiamiento para mi bodega?' })
      .expect(200);

    expect(response.body).toHaveProperty('text');
    const text = response.body.text;

    // Regla 1: No prometer tasas arbitrarias tipo "1.2%"
    expect(text).not.toContain('1.2%');
    expect(text).not.toContain('1.2');

    // Regla 2: No afirmar que SAMI califica o evalúa ("calificas")
    expect(text.toLowerCase()).not.toContain('calificas');
    expect(text.toLowerCase()).not.toContain('califica ');

    // Debe orientar al Marketplace y a la Academia SAMI (C08)
    expect(text).toContain('Marketplace');
    expect(text).toContain('C08');
  });

  it('3. En fallback sobre salud tributaria, NO debe prometer tasa fija y debe respetar la Ley Peruana', async () => {
    const response = await request(app)
      .post('/api/v1/chat')
      .send({ message: '¿Cómo mejoro mi salud tributaria o score ante los bancos?' })
      .expect(200);

    expect(response.body).toHaveProperty('text');
    const text = response.body.text;

    // No debe contener tasas fijas prometidas por SAMI
    expect(text).not.toContain('1.2%');
    expect(text.toLowerCase()).not.toContain('calificas');

    // Debe mencionar el curso de obligaciones tributarias C13
    expect(text).toContain('Salud Tributaria');
    expect(text).toContain('C13');
  });

  it('4. En fallback sobre usuarios/colaboradores, debe describir el flujo real con contraseña temporal', async () => {
    const response = await request(app)
      .post('/api/v1/chat')
      .send({ message: '¿Cómo puedo crear un nuevo usuario o invitar a mi trabajador?' })
      .expect(200);

    expect(response.body).toHaveProperty('text');
    const text = response.body.text;

    // Debe mencionar la contraseña temporal generada en pantalla
    expect(text.toLowerCase()).toContain('contraseña temporal');
    // NO debe prometer enlace por correo inexistente
    expect(text.toLowerCase()).not.toContain('enlace de confirmación');
  });
});
