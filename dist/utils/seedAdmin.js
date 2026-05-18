"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAdmin = void 0;
const model_1 = require("../app/user/model");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
const seedAdmin = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Seed Super Admin (only one allowed)
        let superAdmin = yield model_1.User.findOne({ role: "super-admin" });
        if (!superAdmin) {
            const hashedPassword = yield bcryptjs_1.default.hash("Nadim123@#", 10);
            superAdmin = yield model_1.User.create({
                name: "Super Admin",
                phone: "+8801714651617",
                password: hashedPassword,
                role: "super-admin",
                referrer: new mongoose_1.default.Types.ObjectId(),
                isActive: true,
            });
            // Self-referential: referrer points to itself
            yield model_1.User.findByIdAndUpdate(superAdmin._id, { referrer: superAdmin._id });
            console.log("✅ Super Admin user created successfully");
        }
        else {
            console.log("✅ Super Admin user already exists");
        }
        // Seed Admin (only one allowed)
        const adminExists = yield model_1.User.findOne({ role: "admin" });
        if (!adminExists) {
            const hashedPassword = yield bcryptjs_1.default.hash("Nadim@123", 10);
            const admin = yield model_1.User.create({
                name: "Admin",
                phone: "+8801722790326",
                password: hashedPassword,
                role: "admin",
                referrer: superAdmin._id,
                isActive: true,
            });
            yield model_1.User.findByIdAndUpdate(admin._id, { referrer: superAdmin._id });
            console.log("✅ Admin user created successfully");
        }
        else {
            console.log("✅ Admin user already exists");
        }
    }
    catch (error) {
        console.error("❌ Error seeding admin:", error);
    }
});
exports.seedAdmin = seedAdmin;
