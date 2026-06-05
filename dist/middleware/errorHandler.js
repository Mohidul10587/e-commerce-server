"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const errorHandler = (err, req, res, next) => {
    if (err instanceof zod_1.ZodError) {
        const firstError = err.issues[0].message;
        return res.status(400).json({ message: JSON.parse(firstError) });
    }
    if ((err === null || err === void 0 ? void 0 : err.code) === "P1001" || (err === null || err === void 0 ? void 0 : err.code) === "P1002") {
        return res
            .status(503)
            .json({ message: "Database unavailable, please retry" });
    }
    return res.status(500).json({
        message: err.message || {
            en: "Internal server error",
            bn: "Internal server error",
        },
    });
};
exports.errorHandler = errorHandler;
