-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('NEED', 'WANT', 'SAVING');

-- CreateEnum
CREATE TYPE "TxnSource" AS ENUM ('MANUAL', 'RECEIPT_OCR', 'STATEMENT_IMPORT');

-- CreateEnum
CREATE TYPE "OcrStatus" AS ENUM ('NONE', 'PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportFileType" AS ENUM ('PDF', 'CSV', 'IMAGE');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADED', 'EXTRACTING', 'NEEDS_REVIEW', 'PARTIALLY_APPROVED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TxnDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'EDITED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "BudgetProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthlyIncome" DECIMAL(65,30) NOT NULL,
    "needsPct" DECIMAL(65,30) NOT NULL DEFAULT 0.5,
    "wantsPct" DECIMAL(65,30) NOT NULL DEFAULT 0.3,
    "savingsPct" DECIMAL(65,30) NOT NULL DEFAULT 0.2,
    "weeklyLimit" DECIMAL(65,30) NOT NULL DEFAULT 10000,
    "annualGrowthPct" DECIMAL(65,30) NOT NULL DEFAULT 0.1,
    "effectiveYear" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BudgetProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "colorHex" TEXT NOT NULL DEFAULT '#64748b',
    "icon" TEXT NOT NULL DEFAULT 'Tag',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentMode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "paymentModeId" TEXT,
    "type" "CategoryType" NOT NULL,
    "notes" TEXT,
    "source" "TxnSource" NOT NULL DEFAULT 'MANUAL',
    "importBatchId" TEXT,
    "receiptIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT,
    "fileUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "ocrStatus" "OcrStatus" NOT NULL DEFAULT 'NONE',
    "extracted" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatementImport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "fileType" "ImportFileType" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "modelUsed" TEXT,
    "tokensUsed" INTEGER,
    "costEstimate" DECIMAL(65,30),
    "errorMessage" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "StatementImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StagedTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "rawDate" TIMESTAMP(3),
    "rawDescription" TEXT NOT NULL,
    "rawAmount" DECIMAL(65,30) NOT NULL,
    "direction" "TxnDirection" NOT NULL,
    "suggestedCategoryId" TEXT,
    "suggestedPaymentModeId" TEXT,
    "suggestedType" "CategoryType",
    "confidence" DECIMAL(65,30),
    "isDuplicateGuess" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOfTxnId" TEXT,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StagedTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "name" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetProfile_userId_isActive_idx" ON "BudgetProfile"("userId", "isActive");

-- CreateIndex
CREATE INDEX "BudgetProfile_userId_effectiveYear_idx" ON "BudgetProfile"("userId", "effectiveYear");

-- CreateIndex
CREATE INDEX "BudgetProfile_userId_updatedAt_idx" ON "BudgetProfile"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Category_userId_isArchived_idx" ON "Category"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "Category_userId_updatedAt_idx" ON "Category"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "PaymentMode_userId_isArchived_idx" ON "PaymentMode"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "PaymentMode_userId_updatedAt_idx" ON "PaymentMode"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex
CREATE INDEX "Transaction_userId_type_date_idx" ON "Transaction"("userId", "type", "date");

-- CreateIndex
CREATE INDEX "Transaction_userId_updatedAt_idx" ON "Transaction"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Transaction_importBatchId_idx" ON "Transaction"("importBatchId");

-- CreateIndex
CREATE INDEX "Receipt_userId_updatedAt_idx" ON "Receipt"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Receipt_transactionId_idx" ON "Receipt"("transactionId");

-- CreateIndex
CREATE INDEX "StatementImport_userId_status_idx" ON "StatementImport"("userId", "status");

-- CreateIndex
CREATE INDEX "StatementImport_userId_updatedAt_idx" ON "StatementImport"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "StagedTransaction_importBatchId_reviewStatus_idx" ON "StagedTransaction"("importBatchId", "reviewStatus");

-- CreateIndex
CREATE INDEX "StagedTransaction_userId_updatedAt_idx" ON "StagedTransaction"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiToken_userId_idx" ON "ApiToken"("userId");

-- AddForeignKey
ALTER TABLE "BudgetProfile" ADD CONSTRAINT "BudgetProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMode" ADD CONSTRAINT "PaymentMode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_paymentModeId_fkey" FOREIGN KEY ("paymentModeId") REFERENCES "PaymentMode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "StatementImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatementImport" ADD CONSTRAINT "StatementImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StagedTransaction" ADD CONSTRAINT "StagedTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StagedTransaction" ADD CONSTRAINT "StagedTransaction_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "StatementImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

