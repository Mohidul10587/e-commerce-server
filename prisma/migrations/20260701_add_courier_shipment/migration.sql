-- Migration: add_courier_shipment
-- Adds CourierShipment table for scalable multi-courier support.
-- The legacy Order.courier JSON column is kept for backward compatibility.

-- Courier provider enum
CREATE TYPE "CourierProvider" AS ENUM (
  'steadfast',
  'pathao',
  'redx',
  'paperfly'
);

-- CourierShipment table: one record per order, provider-agnostic
CREATE TABLE "CourierShipment" (
  "id"                SERIAL PRIMARY KEY,
  "orderId"           INTEGER NOT NULL UNIQUE,
  "provider"          "CourierProvider" NOT NULL,
  "consignmentId"     TEXT NOT NULL,
  "trackingCode"      TEXT,
  "invoice"           TEXT,
  "courierStatus"     TEXT NOT NULL,
  "codAmount"         DOUBLE PRECISION NOT NULL,
  "deliveryCharge"    DOUBLE PRECISION,
  "rawResponse"       JSONB,
  "lastStatusPayload" JSONB,
  "submittedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSyncAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CourierShipment_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE
);

-- Indexes for fast lookups
CREATE INDEX "CourierShipment_provider_consignmentId_idx"
  ON "CourierShipment" ("provider", "consignmentId");

CREATE INDEX "CourierShipment_orderId_idx"
  ON "CourierShipment" ("orderId");
