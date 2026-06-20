const BASE_URL = "https://portal.packzy.com/api/v1";

function headers() {
  return {
    "Api-Key": process.env.STEADFAST_API_KEY!,
    "Secret-Key": process.env.STEADFAST_SECRET_KEY!,
    "Content-Type": "application/json",
  };
}

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

async function safeFetch(url: string, options: RequestInit): Promise<any> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SteadFast API error ${res.status}: ${body}`);
  }
  return res.json();
}

export async function createConsignment(payload: CreateOrderPayload): Promise<CourierConsignment> {
  const data = await safeFetch(`${BASE_URL}/create_order`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const c = data.consignment ?? data;
  return {
    consignment_id: c.consignment_id,
    tracking_code: c.tracking_code,
    invoice: c.invoice,
    status: c.status,
    cod_amount: c.cod_amount,
  };
}

export async function getStatusByConsignmentId(consignment_id: number | string) {
  return safeFetch(`${BASE_URL}/status_by_cid/${consignment_id}`, {
    method: "GET",
    headers: headers(),
  });
}

export async function getStatusByInvoice(invoice: string) {
  return safeFetch(`${BASE_URL}/status_by_invoice/${invoice}`, {
    method: "GET",
    headers: headers(),
  });
}

export async function getStatusByTrackingCode(trackingCode: string) {
  return safeFetch(`${BASE_URL}/status_by_trackingcode/${trackingCode}`, {
    method: "GET",
    headers: headers(),
  });
}

export async function createBulkConsignments(orders: CreateOrderPayload[]) {
  return safeFetch(`${BASE_URL}/create_order/bulk-order`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ data: orders }),
  });
}
