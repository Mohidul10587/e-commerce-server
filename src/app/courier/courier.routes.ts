import { Router } from "express";
import {
  trackByCid,
  trackByInvoice,
  trackByTrackingCode,
  dispatchOrder,
  getShipment,
} from "./courier.controller";
import { verifyAdminManagerOrSupport } from "../../middleware/auth";

export const courierRoutes = Router();

courierRoutes.use(verifyAdminManagerOrSupport);

// Tracking
courierRoutes.get("/status_by_cid/:id", trackByCid);
courierRoutes.get("/status_by_invoice/:invoice", trackByInvoice);
courierRoutes.get("/status_by_trackingcode/:trackingCode", trackByTrackingCode);

// Shipment management
courierRoutes.get("/shipment/:id", getShipment);        // GET /courier/shipment/:orderId
courierRoutes.post("/dispatch/:id", dispatchOrder);     // POST /courier/dispatch/:orderId (retry/manual)
