-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MYPE_ADMIN', 'MYPE_WORKER', 'MYPE_ACCOUNTANT', 'BANK_ANALYST', 'BANK_SUPERVISOR', 'BANK_ADMIN', 'SAMI_ADMIN', 'SAMI_ANALYST');

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_identifier_key" ON "users"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_businessId_idx" ON "users"("businessId");

-- CreateIndex
CREATE INDEX "users_ruc_idx" ON "users"("ruc");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_ruc_fkey" FOREIGN KEY ("ruc") REFERENCES "smes"("ruc") ON DELETE SET NULL ON UPDATE CASCADE;
