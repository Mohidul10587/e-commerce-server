-- Performance indexes migration
-- Run this manually against your PostgreSQL database

-- GIN index for JSONB courier consignment_id lookups (webhook)
CREATE INDEX IF NOT EXISTS idx_order_courier_cid ON "Order" USING GIN ((courier->'consignment_id'));
