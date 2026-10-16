-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "cdrZipBase64" TEXT,
ADD COLUMN     "documentHash" TEXT,
ADD COLUMN     "signedXml" TEXT;

