/**
 * steadfast.service.ts
 *
 * Backward-compatibility re-export.
 * New code should use steadfast.adapter.ts directly.
 * This file is kept so any external imports still resolve.
 */

export {
  getStatusByConsignmentId,
  getStatusByInvoice,
  getStatusByTrackingCode,
  createBulkConsignments,
  STEADFAST_STATUS_MAP,
} from "./steadfast.adapter";

// Legacy createConsignment export — wraps the new adapter
import { SteadFastAdapter } from "./steadfast.adapter";
import type { CreateShipmentInput } from "./courier.types";

export interface CreateOrderPayload {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  note?: string;
}

export interface CourierConsignment {
  consignment_id: number;
  tracking_code: string;
  invoice: string;
  status: string;
  cod_amount: number;
}

const _adapter = new SteadFastAdapter();

export async function createConsignment(payload: CreateOrderPayload): Promise<CourierConsignment> {
  const input: CreateShipmentInput = {
    invoice: payload.invoice,
    recipientName: payload.recipient_name,
    recipientPhone: payload.recipient_phone,
    recipientAddress: payload.recipient_address,
    codAmount: payload.cod_amount,
    note: payload.note,
  };
  const result = await _adapter.createShipment(input);
  return {
    consignment_id: Number(result.consignmentId),
    tracking_code: result.trackingCode ?? "",
    invoice: result.invoice ?? payload.invoice,
    status: result.courierStatus,
    cod_amount: result.codAmount,
  };
}
