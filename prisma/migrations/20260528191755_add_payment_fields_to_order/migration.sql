-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'partial', 'paid');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'unpaid';
