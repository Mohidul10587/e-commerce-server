/**
 * steadfast.adapter.ts
 *
 * Implements ICourierProvider for SteadFast.
 * All SteadFast-specific API details stay here.
 */

import type {
  ICourierProvider,
  CreateShipmentInput,
  ShipmentCreatedResult,
} from "./courier.types";

const BASE_URL = "https://portal.packzy.com/api/v1";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function buildHeaders() {
  return {
    "Api-Key": process.env.STEADFAST_API_KEY!,
    "Secret-Key": process.env.STEADFAST_SECRET_KEY!,
    "Content-Type": "application/json",
  };
}

async function safeFetch(url: string, options: RequestInit): Promise<any> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SteadFast API ${res.status}: ${body}`);
  }
  return res.json();
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await safeFetch(url, options);
    } catch (err: any) {
      const isLast = attempt === retries;
      console.warn(
        `[SteadFast] Attempt ${attempt}/${retries} failed: ${err.message}${isLast ? " — giving up" : " — retrying"}`
      );
      if (isLast) throw err;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
  }
}

export class SteadFastAdapter implements ICourierProvider {
  readonly name = "steadfast" as const;

  async createShipment(input: CreateShipmentInput): Promise<ShipmentCreatedResult> {
    const payload = {
      invoice: input.invoice,
      recipient_name: input.recipientName,
      recipient_phone: input.recipientPhone,
      recipient_address: input.recipientAddress,
      cod_amount: input.codAmount,
      note: input.note ?? "",
    };

    console.log(`[SteadFast] Creating shipment for invoice ${input.invoice}`);

    const raw = await fetchWithRetry(`${BASE_URL}/create_order`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(payload),
    });

    const c = raw.consignment ?? raw;

    const result: ShipmentCreatedResult = {
      provider: "steadfast",
      consignmentId: String(c.consignment_id),
      trackingCode: c.tracking_code ?? null,
      invoice: c.invoice ?? input.invoice,
      courierStatus: c.status ?? "in_review",
      codAmount: c.cod_amount ?? input.codAmount,
      rawResponse: raw,
    };

    console.log(
      `[SteadFast] ✅ Shipment created — consignment_id: ${result.consignmentId}, tracking: ${result.trackingCode}`
    );

    return result;
  }
}

// ─── Lower-level helpers (used by webhook + controller) ───────────────────────

export async function getStatusByConsignmentId(id: number | string) {
  return safeFetch(`${BASE_URL}/status_by_cid/${id}`, {
    method: "GET",
    headers: buildHeaders(),
  });
}

export async function getStatusByInvoice(invoice: string) {
  return safeFetch(`${BASE_URL}/status_by_invoice/${invoice}`, {
    method: "GET",
    headers: buildHeaders(),
  });
}

export async function getStatusByTrackingCode(trackingCode: string) {
  return safeFetch(`${BASE_URL}/status_by_trackingcode/${trackingCode}`, {
    method: "GET",
    headers: buildHeaders(),
  });
}

export async function createBulkConsignments(orders: any[]) {
  return safeFetch(`${BASE_URL}/create_order/bulk-order`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ data: orders }),
  });
}

/** Map SteadFast status strings → our OrderStatus enum values */
export const STEADFAST_STATUS_MAP: Record<string, string> = {
  in_review: "InReview",
  pending: "Pending",
  delivered: "Delivered",
  partial_delivered: "PartlyDelivered",
  cancelled: "Cancel",
  hold: "CourierHold",
  delivered_approval_pending: "DeliveredApprovalPending",
  partial_delivered_approval_pending: "PartialDeliveredApprovalPending",
  cancelled_approval_pending: "CancelledApprovalPending",
  unknown_approval_pending: "UnknownApprovalPending",
  unknown: "CourierUnknown",
};
