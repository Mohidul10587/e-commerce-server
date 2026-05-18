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
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const counter_1 = require("./counter");
const UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    country: { type: String },
    language: { type: String },
    email: { type: String },
    isActive: { type: Boolean, default: false },
    activationDate: { type: Date },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    userId: { type: String, unique: true },
    referrer: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    trainer: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: null },
    teamLeader: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: null },
    seniorTeamLeader: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    councilor: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: null },
    role: {
        type: String,
        enum: [
            "accountant",
            "admin",
            "auditor",
            "checker",
            "controller",
            "councilor",
            "super-admin",
            "lead-checker",
            "senior-team-leader",
            "student",
            "teacher",
            "team-leader",
            "trainer",
        ],
        default: "student",
    },
    image: { type: String },
    coverImage: { type: String },
    withdrawNumber: {
        number: { type: String },
        method: { type: String },
    },
    withdrawalFeePaid: { type: Boolean, default: false },
}, { timestamps: true });
UserSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.userId) {
            const counter = yield counter_1.Counter.findByIdAndUpdate("userId", { $inc: { seq: 1 } }, { new: true, upsert: true });
            const year = new Date().getFullYear().toString().slice(-2);
            this.userId = `HS${year}${counter.seq}`;
        }
        next();
    });
});
exports.User = (0, mongoose_1.model)("User", UserSchema);
