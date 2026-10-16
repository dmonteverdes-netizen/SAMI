import path from 'path';
import os from 'os';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Regla general de seguridad: Vite solo debe exponer variables con prefijo VITE_, y únicamente si son públicas por diseño.
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react() as any, tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    // Los almacenes JSON de prueba se escriben fuera del repositorio.
    env: { SAMI_DATA_DIR: path.join(os.tmpdir(), 'sami-test-data') },
    globalSetup: ['./tests/setup/cleanDataDir.ts'],
  }
});


