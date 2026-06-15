-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('Pending', 'Ordered', 'Received');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'auditor';

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "whatsappPhone",
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "contactLink" TEXT,
ADD COLUMN     "stockDeducted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PaymentTransaction" ADD COLUMN     "source" TEXT,
ADD COLUMN     "trxId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isFreeGift" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Supplier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "facebook" TEXT,
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'Pending',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "purchaseMoney" DOUBLE PRECISION,
    "orderedAt" TIMESTAMP(3),
    "note" TEXT,
    "stockUpdated" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3),
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" SERIAL NOT NULL,
    "purchaseId" INTEGER NOT NULL,
    "variantId" INTEGER NOT NULL,
    "variantTitle" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "purchasePrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_expense_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdBy" INTEGER,
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "office_expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_expenses" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdBy" INTEGER,
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "office_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_expense_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdBy" INTEGER,
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_expenses" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdBy" INTEGER,
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_activity_logs" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "note" TEXT,
    "amount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payrolls" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "salaryMonth" TEXT NOT NULL,
    "basicSalary" DOUBLE PRECISION NOT NULL,
    "overtime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPayable" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "note" TEXT,
    "paidAt" TIMESTAMP(3),
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_expenses" ADD CONSTRAINT "office_expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "office_expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_expenses" ADD CONSTRAINT "marketing_expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "marketing_expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

