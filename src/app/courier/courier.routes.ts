import { Router } from "express";
import { trackByCid, trackByInvoice, trackByTrackingCode, dispatchOrder } from "./courier.controller";
import { verifyAdminManagerOrSupport } from "../../middleware/auth";

export const courierRoutes = Router();

courierRoutes.use(verifyAdminManagerOrSupport);

courierRoutes.get("/status_by_cid/:id", trackByCid);
courierRoutes.get("/status_by_invoice/:invoice", trackByInvoice);
courierRoutes.get("/status_by_trackingcode/:trackingCode", trackByTrackingCode);
courierRoutes.post("/dispatch/:id", dispatchOrder);
