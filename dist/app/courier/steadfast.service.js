"use strict";
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
exports.createConsignment = createConsignment;
exports.getStatusByConsignmentId = getStatusByConsignmentId;
exports.getStatusByInvoice = getStatusByInvoice;
exports.getStatusByTrackingCode = getStatusByTrackingCode;
exports.createBulkConsignments = createBulkConsignments;
const BASE_URL = "https://portal.packzy.com/api/v1";
function headers() {
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
            throw new Error(`SteadFast API error ${res.status}: ${body}`);
        }
        return res.json();
    });
}
function createConsignment(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const data = yield safeFetch(`${BASE_URL}/create_order`, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify(payload),
        });
        const c = (_a = data.consignment) !== null && _a !== void 0 ? _a : data;
        return {
            consignment_id: c.consignment_id,
            tracking_code: c.tracking_code,
            invoice: c.invoice,
            status: c.status,
            cod_amount: c.cod_amount,
        };
    });
}
function getStatusByConsignmentId(consignment_id) {
    return __awaiter(this, void 0, void 0, function* () {
        return safeFetch(`${BASE_URL}/status_by_cid/${consignment_id}`, {
            method: "GET",
            headers: headers(),
        });
    });
}
function getStatusByInvoice(invoice) {
    return __awaiter(this, void 0, void 0, function* () {
        return safeFetch(`${BASE_URL}/status_by_invoice/${invoice}`, {
            method: "GET",
            headers: headers(),
        });
    });
}
function getStatusByTrackingCode(trackingCode) {
    return __awaiter(this, void 0, void 0, function* () {
        return safeFetch(`${BASE_URL}/status_by_trackingcode/${trackingCode}`, {
            method: "GET",
            headers: headers(),
        });
    });
}
function createBulkConsignments(orders) {
    return __awaiter(this, void 0, void 0, function* () {
        return safeFetch(`${BASE_URL}/create_order/bulk-order`, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({ data: orders }),
        });
    });
}
