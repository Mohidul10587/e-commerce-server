"use strict";
/**
 * steadfast.adapter.ts
 *
 * Implements ICourierProvider for SteadFast.
 * All SteadFast-specific API details stay here.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.STEADFAST_STATUS_MAP = exports.SteadFastAdapter = void 0;
exports.getStatusByConsignmentId = getStatusByConsignmentId;
exports.getStatusByInvoice = getStatusByInvoice;
exports.getStatusByTrackingCode = getStatusByTrackingCode;
exports.createBulkConsignments = createBulkConsignments;
const BASE_URL = "https://portal.packzy.com/api/v1";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
function buildHeaders() {
    return {
        "Api-Key": process.env.STEADFAST_API_KEY,
        "Secret-Key": process.env.STEADFAST_SECRET_KEY,
        "Content-Type": "application/json",
    };
}
function safeFetch(url, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield fetch(url, options);
        if (!res.ok) {
            const body = yield res.text().catch(() => "");
            throw new Error(`SteadFast API ${res.status}: ${body}`);
        }
        return res.json();
    });
}
function fetchWithRetry(url_1, options_1) {
    return __awaiter(this, arguments, void 0, function* (url, options, retries = MAX_RETRIES) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return yield safeFetch(url, options);
            }
            catch (err) {
                const isLast = attempt === retries;
                console.warn(`[SteadFast] Attempt ${attempt}/${retries} failed: ${err.message}${isLast ? " — giving up" : " — retrying"}`);
                if (isLast)
                    throw err;
                yield new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
            }
        }
    });
}
class SteadFastAdapter {
    constructor() {
        this.name = "steadfast";
    }
    createShipment(input) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            const payload = {
                invoice: input.invoice,
                recipient_name: input.recipientName,
                recipient_phone: input.recipientPhone,
                recipient_address: input.recipientAddress,
                cod_amount: input.codAmount,
                note: (_a = input.note) !== null && _a !== void 0 ? _a : "",
            };
            console.log(`[SteadFast] Creating shipment for invoice ${input.invoice}`);
            const raw = yield fetchWithRetry(`${BASE_URL}/create_order`, {
                method: "POST",
                headers: buildHeaders(),
                body: JSON.stringify(payload),
            });
            const c = (_b = raw.consignment) !== null && _b !== void 0 ? _b : raw;
            const result = {
                provider: "steadfast",
                consignmentId: String(c.consignment_id),
                trackingCode: (_c = c.tracking_code) !== null && _c !== void 0 ? _c : null,
                invoice: (_d = c.invoice) !== null && _d !== void 0 ? _d : input.invoice,
                courierStatus: (_e = c.status) !== null && _e !== void 0 ? _e : "in_review",
                codAmount: (_f = c.cod_amount) !== null && _f !== void 0 ? _f : input.codAmount,
                rawResponse: raw,
            };
            console.log(`[SteadFast] ✅ Shipment created — consignment_id: ${result.consignmentId}, tracking: ${result.trackingCode}`);
            return result;
        });
    }
}
exports.SteadFastAdapter = SteadFastAdapter;
// ─── Lower-level helpers (used by webhook + controller) ───────────────────────
function getStatusByConsignmentId(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return safeFetch(`${BASE_URL}/status_by_cid/${id}`, {
            method: "GET",
            headers: buildHeaders(),
        });
    });
}
function getStatusByInvoice(invoice) {
    return __awaiter(this, void 0, void 0, function* () {
        return safeFetch(`${BASE_URL}/status_by_invoice/${invoice}`, {
            method: "GET",
            headers: buildHeaders(),
        });
    });
}
function getStatusByTrackingCode(trackingCode) {
    return __awaiter(this, void 0, void 0, function* () {
        return safeFetch(`${BASE_URL}/status_by_trackingcode/${trackingCode}`, {
            method: "GET",
            headers: buildHeaders(),
        });
    });
}
function createBulkConsignments(orders) {
    return __awaiter(this, void 0, void 0, function* () {
        return safeFetch(`${BASE_URL}/create_order/bulk-order`, {
            method: "POST",
            headers: buildHeaders(),
            body: JSON.stringify({ data: orders }),
        });
    });
}
/** Map SteadFast status strings → our OrderStatus enum values */
exports.STEADFAST_STATUS_MAP = {
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
