
# Documentación de la API de SAMI para Bancos Socios

Bienvenido a la red de banca aliada de SAMI. Nuestra API permite a las instituciones financieras acceder a data tributaria consolidada y evaluación de Salud Tributaria de MYPES peruanas, bajo consentimiento explícito del titular y protocolos de seguridad bancaria.

## 1. Autenticación (OAuth2)

SAMI utiliza OAuth 2.0 para autorizar peticiones.

**Endpoint de Token:** `POST https://api.sami.pe/oauth/token`

**Cuerpo (Grant Type: Client Credentials):**
```json
{
  "client_id": "TU_ID_DE_BANCO",
  "client_secret": "TU_SECRET_DE_BANCO",
  "grant_type": "client_credentials",
  "scope": "read:tax_health read:financials"
}
```

## 2. Endpoints Principales

### Obtener Expediente y Evaluación de Salud Tributaria
Retorna la Salud Tributaria y un resumen de cumplimiento tributario bajo consentimiento del titular.

**GET** `/api/v1/bank/scoring/:ruc`

**Cabeceras:**
`Authorization: Bearer <access_token>`

**Respuesta Exitosa (200 OK):**
```json
{
  "businessRuc": "20123456789",
  "taxHealth": 745,
  "tier": "Excelente",
  "riskLevel": "Low",
  "avgMonthlySales": 12500.50,
  "taxCompliance": "HABIDO",
  "lastUpdated": "2026-05-13T03:00:00Z",
  "authorizedScopes": ["read:tax_health", "read:financials"]
}
```

## 3. Scopes y Seguridad

Para garantizar la privacidad de las MYPES, implementamos un sistema de scopes granulares:

| Scope | Descripción |
|-------|-------------|
| `read:tax_health` | Acceso a la evaluación de Salud Tributaria y nivel de cumplimiento. |
| `read:financials` | Acceso a promedios de ventas y salud financiera. |
| `read:identity` | Validación de RUC y Representante Legal. |

**Aislamiento de Entidades:** Cada banco socio tiene un `client_id` único. El sistema garantiza que un banco solo pueda consultar MYPES que le hayan otorgado consentimiento explícito (vía App SAMI).

## 4. Webhooks de Eventos

SAMI puede notificar proactivamente cuando un cliente mejora su índice de Salud Tributaria:

- `tax_health.improved`: Notificación cuando un cliente incrementa su índice de cumplimiento tributario.
- `document.validated`: Notificación cuando el cliente sube activos validados (Perfilamiento Profundo).

---
© 2026 SAMI - Innovación Financiera para el Perú.

