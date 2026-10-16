-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'NOTA_DE_CREDITO';
ALTER TYPE "DocumentType" ADD VALUE 'NOTA_DE_DEBITO';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "referencedDocumentType" "DocumentType",
ADD COLUMN "referencedSeries" VARCHAR(4),
ADD COLUMN "referencedCorrelative" INTEGER,
ADD COLUMN "noteReason" TEXT,
ADD COLUMN "referencedInvoiceId" TEXT;
