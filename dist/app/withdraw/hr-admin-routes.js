"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const withdraw_controller_1 = require("./withdraw.controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.get("/getWithdrawRequestsForAdmin", auth_1.verifyHrAdmin, withdraw_controller_1.getWithdrawRequestsForAdmin);
router.put("/updateStatus/:withdrawId", auth_1.verifyHrAdmin, withdraw_controller_1.updateStatus);
exports.default = router;
