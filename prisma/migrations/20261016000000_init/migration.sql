-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('SALE', 'PURCHASE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('FACTURA', 'BOLETA_DE_VENTA', 'NOTA_DE_CREDITO', 'NOTA_DE_DEBITO');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('TRANSMISION_DATOS_BANCOS', 'ANALISIS_TRIBUTARIO', 'COMUNICACIONES_COMERCIALES', 'INTEGRACION_PSE');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ConsentAction" AS ENUM ('GRANTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ArcoRightType" AS ENUM ('ACCESO', 'RECTIFICACION', 'CANCELACION', 'OPOSICION');

-- CreateEnum
CREATE TYPE "ArcoRequestStatus" AS ENUM ('PENDIENTE', 'EN_EVALUACION', 'APROBADO', 'DENEGADO', 'COMPLETADO');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MYPE_ADMIN', 'MYPE_WORKER', 'MYPE_ACCOUNTANT', 'BANK_ANALYST', 'BANK_SUPERVISOR', 'BANK_ADMIN', 'SAMI_ADMIN', 'SAMI_ANALYST');

-- CreateTable
CREATE TABLE "smes" (
    "ruc" VARCHAR(11) NOT NULL,
    "businessName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "sector" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smes_pkey" PRIMARY KEY ("ruc")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "identifier" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MYPE_ADMIN',
    "businessId" TEXT NOT NULL,
    "ruc" VARCHAR(11),
    "institutionId" TEXT,
    "twoFactorSecret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "apiUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "series" VARCHAR(4) NOT NULL,
    "correlative" INTEGER NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "category" TEXT,
    "ruc" VARCHAR(11),
    "referencedDocumentType" "DocumentType",
    "referencedSeries" VARCHAR(4),
    "referencedCorrelative" INTEGER,
    "noteReason" TEXT,
    "referencedInvoiceId" TEXT,
    "description" TEXT,
    "paymentMethod" TEXT,
    "aiCategorizedReason" TEXT,
    "emissionProvider" TEXT,
    "emissionSimulated" BOOLEAN,
    "sunatAccepted" BOOLEAN,
    "sunatDescription" TEXT,
    "pdfUrl" TEXT,
    "xmlUrl" TEXT,
    "cdrUrl" TEXT,
    "emittedAt" TIMESTAMP(3),
    "smeId" VARCHAR(11) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ruc_padron" (
    "ruc" VARCHAR(11) NOT NULL,
    "businessName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "ubigeo" VARCHAR(6) NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "ruc_padron_pkey" PRIMARY KEY ("ruc")
);

-- CreateTable
CREATE TABLE "padron_imports" (
    "id" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "padron_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_grants" (
    "id" TEXT NOT NULL,
    "ruc" VARCHAR(11) NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'ACTIVE',
    "privacyPolicyVersion" TEXT NOT NULL DEFAULT '2026.1',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_events" (
    "id" TEXT NOT NULL,
    "ruc" VARCHAR(11) NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "action" "ConsentAction" NOT NULL,
    "privacyPolicyVersion" TEXT NOT NULL DEFAULT '2026.1',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_transmission_logs" (
    "id" TEXT NOT NULL,
    "ruc" VARCHAR(11) NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL DEFAULT 'TRANSMISION_DATOS_BANCOS',
    "recipientEntity" TEXT NOT NULL,
    "transmittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentGrantId" TEXT,
    "payloadSummary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',

    CONSTRAINT "data_transmission_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arco_requests" (
    "id" TEXT NOT NULL,
    "caseCode" TEXT NOT NULL,
    "ruc" VARCHAR(11) NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rightType" "ArcoRightType" NOT NULL,
    "status" "ArcoRequestStatus" NOT NULL DEFAULT 'PENDIENTE',
    "details" TEXT NOT NULL,
    "responseNotes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arco_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "smes_email_key" ON "smes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_identifier_key" ON "users"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_businessId_idx" ON "users"("businessId");

-- CreateIndex
CREATE INDEX "users_ruc_idx" ON "users"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "bank_partners_clientId_key" ON "bank_partners"("clientId");

-- CreateIndex
CREATE INDEX "invoices_smeId_type_issueDate_idx" ON "invoices"("smeId", "type", "issueDate");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_smeId_type_series_correlative_ruc_key" ON "invoices"("smeId", "type", "series", "correlative", "ruc");

-- CreateIndex
CREATE UNIQUE INDEX "consent_grants_ruc_purpose_key" ON "consent_grants"("ruc", "purpose");

-- CreateIndex
CREATE INDEX "consent_events_ruc_idx" ON "consent_events"("ruc");

-- CreateIndex
CREATE INDEX "data_transmission_logs_ruc_idx" ON "data_transmission_logs"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "arco_requests_caseCode_key" ON "arco_requests"("caseCode");

-- CreateIndex
CREATE INDEX "arco_requests_ruc_idx" ON "arco_requests"("ruc");

-- CreateIndex
CREATE INDEX "arco_requests_caseCode_idx" ON "arco_requests"("caseCode");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_ruc_fkey" FOREIGN KEY ("ruc") REFERENCES "smes"("ruc") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_smeId_fkey" FOREIGN KEY ("smeId") REFERENCES "smes"("ruc") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_grants" ADD CONSTRAINT "consent_grants_ruc_fkey" FOREIGN KEY ("ruc") REFERENCES "smes"("ruc") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_transmission_logs" ADD CONSTRAINT "data_transmission_logs_consentGrantId_fkey" FOREIGN KEY ("consentGrantId") REFERENCES "consent_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

