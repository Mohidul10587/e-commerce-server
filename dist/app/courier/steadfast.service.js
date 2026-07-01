"use strict";
/**
 * steadfast.service.ts
 *
 * Backward-compatibility re-export.
 * New code should use steadfast.adapter.ts directly.
 * This file is kept so any external imports still resolve.
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
exports.STEADFAST_STATUS_MAP = exports.createBulkConsignments = exports.getStatusByTrackingCode = exports.getStatusByInvoice = exports.getStatusByConsignmentId = void 0;
exports.createConsignment = createConsignment;
var steadfast_adapter_1 = require("./steadfast.adapter");
Object.defineProperty(exports, "getStatusByConsignmentId", { enumerable: true, get: function () { return steadfast_adapter_1.getStatusByConsignmentId; } });
Object.defineProperty(exports, "getStatusByInvoice", { enumerable: true, get: function () { return steadfast_adapter_1.getStatusByInvoice; } });
Object.defineProperty(exports, "getStatusByTrackingCode", { enumerable: true, get: function () { return steadfast_adapter_1.getStatusByTrackingCode; } });
Object.defineProperty(exports, "createBulkConsignments", { enumerable: true, get: function () { return steadfast_adapter_1.createBulkConsignments; } });
Object.defineProperty(exports, "STEADFAST_STATUS_MAP", { enumerable: true, get: function () { return steadfast_adapter_1.STEADFAST_STATUS_MAP; } });
// Legacy createConsignment export — wraps the new adapter
const steadfast_adapter_2 = require("./steadfast.adapter");
const _adapter = new steadfast_adapter_2.SteadFastAdapter();
function createConsignment(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const input = {
            invoice: payload.invoice,
            recipientName: payload.recipient_name,
            recipientPhone: payload.recipient_phone,
            recipientAddress: payload.recipient_address,
            codAmount: payload.cod_amount,
            note: payload.note,
        };
        const result = yield _adapter.createShipment(input);
        return {
            consignment_id: Number(result.consignmentId),
            tracking_code: (_a = result.trackingCode) !== null && _a !== void 0 ? _a : "",
            invoice: (_b = result.invoice) !== null && _b !== void 0 ? _b : payload.invoice,
            status: result.courierStatus,
            cod_amount: result.codAmount,
        };
    });
}
