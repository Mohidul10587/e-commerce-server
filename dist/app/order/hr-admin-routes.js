"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.get("/all", auth_1.verifyHrAdmin, controller_1.getAllOrders);
router.patch("/:orderId/status", auth_1.verifyHrAdmin, controller_1.updateOrderStatus);
exports.default = router;
