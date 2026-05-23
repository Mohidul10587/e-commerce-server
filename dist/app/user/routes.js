"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const controller_1 = require("./controller");
const router = (0, express_1.Router)();
exports.userRoutes = router;
router.post("/login", controller_1.login);
router.post("/signup", controller_1.signup);
router.get("/me", controller_1.me);
router.post("/refresh", controller_1.refresh);
router.post("/logout", controller_1.logout);
// Admin user management
router.get("/", controller_1.getUsers);
router.post("/", controller_1.createUser);
router.put("/:id", controller_1.updateUser);
router.delete("/:id", controller_1.moveUserToTrash);
router.patch("/:id/restore", controller_1.restoreUser);
router.delete("/:id/permanent", controller_1.permanentDeleteUser);
