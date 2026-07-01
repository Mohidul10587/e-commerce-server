"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courierRoutes = void 0;
const express_1 = require("express");
const courier_controller_1 = require("./courier.controller");
const auth_1 = require("../../middleware/auth");
exports.courierRoutes = (0, express_1.Router)();
exports.courierRoutes.use(auth_1.verifyAdminManagerOrSupport);
// Tracking
exports.courierRoutes.get("/status_by_cid/:id", courier_controller_1.trackByCid);
exports.courierRoutes.get("/status_by_invoice/:invoice", courier_controller_1.trackByInvoice);
exports.courierRoutes.get("/status_by_trackingcode/:trackingCode", courier_controller_1.trackByTrackingCode);
// Shipment management
exports.courierRoutes.get("/shipment/:id", courier_controller_1.getShipment); // GET /courier/shipment/:orderId
exports.courierRoutes.post("/dispatch/:id", courier_controller_1.dispatchOrder); // POST /courier/dispatch/:orderId (retry/manual)
