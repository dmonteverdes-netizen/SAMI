import express from 'express';
import { z } from 'zod';
import { ConsentService, ConsentPurpose, ArcoRightType } from '../services/consentService';
import { logger } from '../../core/services/logger';
import {
  createAuthenticateToken,
  requireOwnBusiness,
  requirePermission,
  createOptionalSession
} from '../middleware/auth';

const router = express.Router();

// Validation Schemas
const RucParamSchema = z.object({
  ruc: z.string().regex(/^\d{11}$/, 'El RUC debe contener exactamente 11 dígitos numéricos')
});

const GrantConsentSchema = z.object({
  ruc: z.string().regex(/^\d{11}$/, 'El RUC debe tener 11 dígitos'),
  purpose: z.enum([
    'TRANSMISION_DATOS_BANCOS',
    'ANALISIS_TRIBUTARIO',
    'COMUNICACIONES_COMERCIALES',
    'INTEGRACION_PSE'
  ]),
  privacyPolicyVersion: z.string().optional()
});

const RevokeConsentSchema = z.object({
  ruc: z.string().regex(/^\d{11}$/, 'El RUC debe tener 11 dígitos'),
  purpose: z.enum([
    'TRANSMISION_DATOS_BANCOS',
    'ANALISIS_TRIBUTARIO',
    'COMUNICACIONES_COMERCIALES',
    'INTEGRACION_PSE'
  ])
});

const CreateArcoSchema = z.object({
  ruc: z.string().regex(/^\d{11}$/, 'El RUC debe tener 11 dígitos'),
  fullName: z.string().min(3, 'Ingrese el nombre completo o razón social'),
  email: z.string().email('Ingrese un correo electrónico válido'),
  rightType: z.enum(['ACCESO', 'RECTIFICACION', 'CANCELACION', 'OPOSICION']),
  details: z.string().min(10, 'Detalle los motivos y alcance de su solicitud ARCO (mínimo 10 caracteres)')
});

/**
 * 1. GET /consent/:ruc
 * Consulta el estado de consentimiento vigente para todas las finalidades de un RUC.
 * Protegido por autenticación, IDOR check (requireOwnBusiness) y permiso CONSENT_READ.
 */
router.get(
  '/consent/:ruc',
  createAuthenticateToken(),
  requireOwnBusiness,
  requirePermission('CONSENT_READ'),
  async (req, res) => {
    try {
      const parseParam = RucParamSchema.safeParse(req.params);
      if (!parseParam.success) {
        return res.status(400).json({ error: 'invalid_ruc', details: parseParam.error.format() });
      }

      const { ruc } = parseParam.data;
      const grants = await ConsentService.getConsentStatus(ruc);

      res.json({
        success: true,
        ruc,
        grants
      });
    } catch (err: any) {
      logger.error('[Consent Router] Error fetching consent status:', { ruc: req.params.ruc }, err);
      res.status(500).json({ error: 'server_error', message: 'Error al consultar el estado de consentimiento.' });
    }
  }
);

/**
 * 2. GET /consent/:ruc/history
 * Devuelve el historial inmutable de otorgamientos y revocaciones para auditoría (Ley N° 29733).
 */
router.get(
  '/consent/:ruc/history',
  createAuthenticateToken(),
  requireOwnBusiness,
  requirePermission('CONSENT_READ'),
  async (req, res) => {
    try {
      const parseParam = RucParamSchema.safeParse(req.params);
      if (!parseParam.success) {
        return res.status(400).json({ error: 'invalid_ruc', details: parseParam.error.format() });
      }

      const { ruc } = parseParam.data;
      const history = await ConsentService.getConsentHistory(ruc);

      res.json({
        success: true,
        ruc,
        history
      });
    } catch (err: any) {
      logger.error('[Consent Router] Error fetching consent history:', { ruc: req.params.ruc }, err);
      res.status(500).json({ error: 'server_error', message: 'Error al consultar el historial inmutable de consentimiento.' });
    }
  }
);

/**
 * 3. GET /consent/:ruc/transmissions
 * Consulta las transmisiones de datos realizadas a entidades terceras ("¿A quién le dieron mis datos?").
 */
router.get(
  '/consent/:ruc/transmissions',
  createAuthenticateToken(),
  requireOwnBusiness,
  requirePermission('TRANSMISSIONS_READ'),
  async (req, res) => {
    try {
      const parseParam = RucParamSchema.safeParse(req.params);
      if (!parseParam.success) {
        return res.status(400).json({ error: 'invalid_ruc', details: parseParam.error.format() });
      }

      const { ruc } = parseParam.data;
      const transmissions = await ConsentService.getTransmissionLogs(ruc);

      res.json({
        success: true,
        ruc,
        transmissions
      });
    } catch (err: any) {
      logger.error('[Consent Router] Error fetching transmissions:', { ruc: req.params.ruc }, err);
      res.status(500).json({ error: 'server_error', message: 'Error al consultar el registro de transmisiones.' });
    }
  }
);

/**
 * 4. POST /consent/grant
 * Otorga consentimiento granular para una finalidad específica con registro de IP y User-Agent.
 */
router.post(
  '/consent/grant',
  createAuthenticateToken(),
  requireOwnBusiness,
  requirePermission('CONSENT_WRITE'),
  async (req, res) => {
    try {
      const parsed = GrantConsentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_payload', details: parsed.error.format() });
      }

      const { ruc, purpose, privacyPolicyVersion } = parsed.data;
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Desconocido';

      const grant = await ConsentService.grantConsent(ruc, purpose as ConsentPurpose, {
        ipAddress,
        userAgent,
        privacyPolicyVersion
      });

      res.json({
        success: true,
        message: `Consentimiento para '${purpose}' otorgado exitosamente.`,
        grant
      });
    } catch (err: any) {
      logger.error('[Consent Router] Error granting consent:', req.body, err);
      res.status(500).json({ error: 'server_error', message: 'No se pudo registrar el otorgamiento de consentimiento.' });
    }
  }
);

/**
 * 5. POST /consent/revoke
 * Revoca el consentimiento de forma inmediata sin intervención humana.
 */
router.post(
  '/consent/revoke',
  createAuthenticateToken(),
  requireOwnBusiness,
  requirePermission('CONSENT_WRITE'),
  async (req, res) => {
    try {
      const parsed = RevokeConsentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_payload', details: parsed.error.format() });
      }

      const { ruc, purpose } = parsed.data;
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Desconocido';

      const grant = await ConsentService.revokeConsent(ruc, purpose as ConsentPurpose, {
        ipAddress,
        userAgent
      });

      res.json({
        success: true,
        message: `Consentimiento para '${purpose}' revocado de forma inmediata.`,
        grant
      });
    } catch (err: any) {
      logger.error('[Consent Router] Error revoking consent:', req.body, err);
      res.status(500).json({ error: 'server_error', message: 'No se pudo procesar la revocación de consentimiento.' });
    }
  }
);

/**
 * 6. POST /arco/requests
 * Presenta una solicitud formal de ejercicio de derechos ARCO.
 * Se acepta tanto con sesión como sin sesión iniciada para permitir a cualquier titular ejercer sus derechos.
 */
router.post('/arco/requests', createOptionalSession(), async (req, res) => {
  try {
    const parsed = CreateArcoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_payload', details: parsed.error.format() });
    }

    const { ruc, fullName, email, rightType, details } = parsed.data;
    const arcoRequest = await ConsentService.createArcoRequest({
      ruc,
      fullName,
      email,
      rightType: rightType as ArcoRightType,
      details
    });

    logger.security('[ARCO EVENT] Formal ARCO request registered', {
      caseCode: arcoRequest.caseCode,
      ruc,
      rightType
    });

    res.json({
      success: true,
      message: `Expediente ARCO ${arcoRequest.caseCode} registrado exitosamente bajo la Ley N° 29733.`,
      request: arcoRequest
    });
  } catch (err: any) {
    logger.error('[Consent Router] Error creating ARCO request:', req.body, err);
    res.status(500).json({ error: 'server_error', message: 'No se pudo registrar la solicitud ARCO.' });
  }
});

/**
 * 7. GET /arco/requests/:caseCode
 * Consulta el estado y expediente de un trámite ARCO por su código de caso único (público para el solicitante con su código).
 */
router.get('/arco/requests/:caseCode', createOptionalSession(), async (req, res) => {
  try {
    const caseCodeParam = req.params.caseCode;
    const caseCode = Array.isArray(caseCodeParam) ? caseCodeParam[0] : caseCodeParam;
    if (!caseCode || typeof caseCode !== 'string' || caseCode.length < 5) {
      return res.status(400).json({ error: 'invalid_case_code', message: 'Código de expediente inválido.' });
    }

    const request = await ConsentService.getArcoRequestByCaseCode(caseCode);
    if (!request) {
      return res.status(404).json({ error: 'not_found', message: 'No se encontró ningún expediente ARCO con el código proporcionado.' });
    }

    res.json({
      success: true,
      request
    });
  } catch (err: any) {
    logger.error('[Consent Router] Error fetching ARCO request by code:', { caseCode: req.params.caseCode }, err);
    res.status(500).json({ error: 'server_error', message: 'Error al consultar el expediente ARCO.' });
  }
});

/**
 * 8. GET /arco/requests/by-ruc/:ruc
 * Consulta todos los expedientes ARCO asociados a un RUC (requiere autenticación y requireOwnBusiness).
 */
router.get(
  '/arco/requests/by-ruc/:ruc',
  createAuthenticateToken(),
  requireOwnBusiness,
  requirePermission('CONSENT_READ'),
  async (req, res) => {
    try {
      const parseParam = RucParamSchema.safeParse(req.params);
      if (!parseParam.success) {
        return res.status(400).json({ error: 'invalid_ruc', details: parseParam.error.format() });
      }

      const { ruc } = parseParam.data;
      const requests = await ConsentService.getArcoRequestsByRuc(ruc);

      res.json({
        success: true,
        ruc,
        requests
      });
    } catch (err: any) {
      logger.error('[Consent Router] Error fetching ARCO requests by RUC:', { ruc: req.params.ruc }, err);
      res.status(500).json({ error: 'server_error', message: 'Error al consultar los trámites ARCO del RUC.' });
    }
  }
);

export default router;
