"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.get("/my", auth_1.verifyUser, controller_1.myTransactions);
router.get("/user/:userId", auth_1.verifyAdminOrSuperAdmin, controller_1.getTransactionsByUserId);
exports.default = router;
