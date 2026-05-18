"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const controller_1 = require("./controller");
const router = (0, express_1.Router)();
// Admin routes
router.post("/create", auth_1.verifyAdmin, controller_1.createPackage);
router.get("/all", auth_1.verifyAdmin, controller_1.getAllPackages);
router.put("/:id", auth_1.verifyAdmin, controller_1.updatePackage);
router.delete("/:id", auth_1.verifyAdmin, controller_1.deletePackage);
// User routes
router.get("/active", auth_1.verifyUser, controller_1.getActivePackages);
exports.default = router;
