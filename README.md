<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/4cc6fd17-efc9-4917-9e52-2bfa97bb2bdd

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Pruebas automáticas

[![CI](https://github.com/dmonteverdes-netizen/SAMI/actions/workflows/ci.yml/badge.svg)](https://github.com/dmonteverdes-netizen/SAMI/actions/workflows/ci.yml)

Cada push a `main` y cada pull request ejecutan en GitHub Actions: instalación limpia, verificación de tipos, migraciones en una base PostgreSQL vacía, los tests (incluidos los de PostgreSQL real) y el build. Ver `.github/workflows/ci.yml`.

## Backend y base de datos

SAMI usa Express + PostgreSQL (Prisma). Instalación, padrón RUC de SUNAT y emisión con Nubefact: ver **[BACKEND_GUIDE.md](BACKEND_GUIDE.md)**.

```bash
npm ci
npm run db:migrate-deploy   # requiere DATABASE_URL
npm run dev
npm test
```
