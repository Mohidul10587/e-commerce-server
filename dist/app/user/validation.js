"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, { message: JSON.stringify({ en: "Name is required", bn: "নাম প্রয়োজন" }) }),
    phone: zod_1.z.string().min(10, { message: JSON.stringify({ en: "Phone must be at least 10 digits", bn: "ফোন কমপক্ষে ১০ সংখ্যা হতে হবে" }) }),
    password: zod_1.z.string().min(6, { message: JSON.stringify({ en: "Password must be at least 6 characters", bn: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে" }) }),
    role: zod_1.z.enum(["user", "admin"]).optional(),
    referralCode: zod_1.z.string().optional(),
});
exports.loginSchema = zod_1.z.object({
    phone: zod_1.z.string().min(1, { message: JSON.stringify({ en: "Phone is required", bn: "ফোন প্রয়োজন" }) }),
    password: zod_1.z.string().min(1, { message: JSON.stringify({ en: "Password is required", bn: "পাসওয়ার্ড প্রয়োজন" }) }),
});
