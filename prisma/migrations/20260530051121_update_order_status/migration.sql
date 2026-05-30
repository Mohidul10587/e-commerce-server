-- AlterEnum: replace OrderStatus with new values, migrating existing data
BEGIN;

-- 1. Add a temporary text column
ALTER TABLE "Order" ADD COLUMN "status_text" TEXT;

-- 2. Copy current enum value as text
UPDATE "Order" SET "status_text" = "status"::text;

-- 3. Drop the old column
ALTER TABLE "Order" DROP COLUMN "status";

-- 4. Drop old enum type
DROP TYPE "OrderStatus";

-- 5. Create new enum type
CREATE TYPE "OrderStatus" AS ENUM ('Processing', 'WaitForDesign', 'DesignSubmitted', 'Revision', 'CustomerInformed', 'NeedToCall', 'NoResponse', 'OrderConfirmed', 'InProduction', 'InReview', 'Pending', 'Delivered', 'PartlyDelivered', 'Cancel');

-- 6. Add new status column with default
ALTER TABLE "Order" ADD COLUMN "status" "OrderStatus" NOT NULL DEFAULT 'Processing';

-- 7. Migrate old values to new enum values
UPDATE "Order" SET "status" = 'Processing'     WHERE "status_text" = 'processing';
UPDATE "Order" SET "status" = 'OrderConfirmed' WHERE "status_text" = 'confirmed';
UPDATE "Order" SET "status" = 'Pending'        WHERE "status_text" = 'pending';
UPDATE "Order" SET "status" = 'Delivered'      WHERE "status_text" = 'delivered';
UPDATE "Order" SET "status" = 'Cancel'         WHERE "status_text" = 'cancelled';
UPDATE "Order" SET "status" = 'InProduction'   WHERE "status_text" = 'shipped';

-- 8. Drop temp column
ALTER TABLE "Order" DROP COLUMN "status_text";

COMMIT;
