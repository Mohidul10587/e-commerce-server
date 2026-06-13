-- CreateTable
CREATE TABLE "office_expense_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdBy" INTEGER,
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

-- AddForeignKey
ALTER TABLE "office_expenses" ADD CONSTRAINT "office_expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "office_expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_expenses" ADD CONSTRAINT "marketing_expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "marketing_expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
