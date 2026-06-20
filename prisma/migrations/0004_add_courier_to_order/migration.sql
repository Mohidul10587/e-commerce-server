-- Add courier JSON column to Order table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "courier" JSONB;
