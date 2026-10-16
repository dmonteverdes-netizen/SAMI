import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { logger } from '../../core/services/logger';

const router = express.Router();

// 1. POST /ocr/analyze-trade-name
router.post('/analyze-trade-name', async (req, res) => {
  const { image, ruc } = req.body;

  if (!image) {
    return res.status(400).json({ success: false, error: 'Image data is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    logger.info('[SAMI OCR Router] GEMINI_API_KEY is missing. Using heuristic fallback.');
    await new Promise((resolve) => setTimeout(resolve, 1400));

    let matchedTradeName = 'MYPE Innovación S.A.';
    if (ruc === '20123456789') {
      matchedTradeName = 'Gamarra Premium Outlet';
    } else if (ruc === '20601234567') {
      matchedTradeName = 'SAMI Fintech Hub';
    } else if (ruc === '20543210987') {
      matchedTradeName = 'Sabores del Perú Culinario';
    } else if (ruc === '20489218291') {
      matchedTradeName = 'Metalúrgica CNC Lima';
    } else if (ruc === '10456782912') {
      matchedTradeName = 'Bodega San Carlos';
    } else {
      const prefixes = ['Corporación', 'Inversiones', 'Comercializadora', 'Distribuidora', 'Bodegas'];
      const suffixes = [' del Sur', ' El Sol', ' Prosperidad', ' Innovación', ' Líder'];
      const r = Math.floor(Math.random() * 5);
      matchedTradeName = `${prefixes[r]}${suffixes[r]}`;
    }

    return res.json({
      success: true,
      tradeName: matchedTradeName,
      confidence: 0.94,
      source: 'mock-ocr'
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    let mimeType = 'image/jpeg';
    let base64Data = image;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }

    logger.info(`[SAMI OCR Router] Contacting Gemini-2.5-flash for trade name extraction...`);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        {
          text: "Analyze this image representing a Peruvian SUNAT MYPE document or receipt. Your objective is to extract the trade name ('Nombre Comercial' or 'Nombre de Fantasía' or commercial name). Under Peruvian fiscal standards, this is distinct from the Legal Entity Name (Razón Social). If there is no explicit trade name legible in the document, analyze the business details and suggest a natural, matching, commercial trade name for the MYPE based on its context. Respond strictly with a JSON object holding a single string property named 'tradeName', e.g. {\"tradeName\": \"Gamarra Premium\"}. Do not include markdown brackets or any explanation, just raw JSON."
        }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const resultText = response.text || '{}';
    const resultJson = JSON.parse(resultText.trim());

    res.json({
      success: true,
      tradeName: resultJson.tradeName || 'MYPE Innovación S.A.',
      confidence: 0.98,
      source: 'gemini-ocr'
    });
  } catch (err: any) {
    logger.error('[SAMI OCR Router Error]', {}, err);
    res.status(500).json({
      success: false,
      error: 'Failed to parse document via AI OCR: ' + err.message,
      fallbackTradeName: 'MYPE Innovación S.A.'
    });
  }
});

export default router;
