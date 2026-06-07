"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.financeRoutes = void 0;
const express_1 = require("express");
const finance_controller_1 = require("./finance.controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
exports.financeRoutes = router;
router.get("/log", auth_1.verifyAdmin, finance_controller_1.getFinancialLog);
