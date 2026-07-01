/**
 * courier.types.ts
 *
 * Provider-agnostic interfaces for the courier layer.
 * Adding a new courier (Pathao, RedX, …) only requires implementing
 * CourierProvider and registering it — no changes to order logic.
 */

export type CourierProviderName = "steadfast" | "pathao" | "redx" | "paperfly";

/** Minimal payload needed to create a shipment with any provider */
export interface CreateShipmentInput {
  /** Our internal invoice reference, e.g. "ORD-123" */
  invoice: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  codAmount: number;
  note?: string;
}

/** Normalised result returned after successfully creating a shipment */
export interface ShipmentCreatedResult {
  provider: CourierProviderName;
  consignmentId: string;
  trackingCode: string | null;
  invoice: string;
  courierStatus: string;
  codAmount: number;
  /** Full raw API response stored for audit */
  rawResponse: Record<string, unknown>;
}

/** Normalised status update received from a provider (webhook or poll) */
export interface ShipmentStatusUpdate {
  provider: CourierProviderName;
  consignmentId: string | number;
  invoice?: string;
  courierStatus: string;
  deliveryCharge?: number;
  codAmount?: number;
  trackingMessage?: string;
  updatedAt?: string;
  /** Full raw payload stored for audit */
  rawPayload: Record<string, unknown>;
}

/** Every courier adapter must implement this contract */
export interface ICourierProvider {
  readonly name: CourierProviderName;
  createShipment(input: CreateShipmentInput): Promise<ShipmentCreatedResult>;
}
