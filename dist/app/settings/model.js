"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Settings = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const settingsSchema = new mongoose_1.Schema({
    siteName: { type: String, default: "My App" },
    logo: { type: String, default: "" },
    metaTitle: { type: String, default: "My App" },
    metaDescription: { type: String, default: "" },
    metaKeywords: { type: String, default: "" },
    admissionFee: { type: Number, default: 0 },
    withdrawalFee: { type: Number, default: 0 },
    teamLeaderMinBalance: { type: Number, default: 0 },
    activationCommission: {
        referrer: { type: Number, default: 0 },
        trainer: { type: Number, default: 0 },
        teamLeader: { type: Number, default: 0 },
        seniorTeamLeader: { type: Number, default: 0 },
        councilor: { type: Number, default: 0 },
    },
    defaultTeamLeaderId: { type: String, default: "" },
    supportMeetingLink: { type: String, default: "" },
    supportWhatsAppLink: { type: String, default: "" },
    helpLink: { type: String, default: "" },
    courses: {
        type: [
            {
                title: { type: String, required: true },
                image: { type: String, default: null },
                link: { type: String },
                teacherId: { type: String, default: null },
                awardValue: { type: Number, default: 0 },
                isAwardEnabled: { type: Boolean, default: false },
            },
        ],
        default: [],
    },
    paymentMethods: {
        type: [
            {
                name: { type: String, required: true },
                phoneNumber: { type: String, required: true },
            },
        ],
        default: [],
    },
    depositRules: {
        minAmount: { type: Number, default: 10 },
        maxAmount: { type: Number, default: 10000 },
        allowedMethods: {
            type: [String],
            default: ["Bank Transfer", "Mobile Banking", "PayPal"],
        },
        processingTime: { type: String, default: "24-48 hours" },
        instructions: {
            type: String,
            default: "Please provide valid transaction ID",
        },
        customInstructions: { type: [String], default: [] },
    },
    withdrawRules: {
        minAmount: { type: Number, default: 20 },
        maxAmount: { type: Number, default: 5000 },
        processingTime: { type: String, default: "1-3 business days" },
        instructions: {
            type: String,
            default: "Withdrawals are processed to your registered account only",
        },
        dailyLimit: { type: Number, default: 1000 },
        customInstructions: { type: [String], default: [] },
    },
    deliveryChargeInsideDhaka: { type: Number, default: 0 },
    deliveryChargeOutsideDhaka: { type: Number, default: 0 },
    classStartTime: { type: String, default: "" },
    classEndTime: { type: String, default: "" },
    banners: {
        type: [
            {
                desktopImage: { type: String, required: true },
                mobileImage: { type: String, required: true },
                link: { type: String, default: "" },
            },
        ],
        default: [],
    },
    roleSalaries: {
        admin: { type: Number, default: 0 },
        auditor: { type: Number, default: 0 },
        checker: { type: Number, default: 0 },
        controller: { type: Number, default: 0 },
        councilor: { type: Number, default: 0 },
        "super-admin": { type: Number, default: 0 },
        "lead-checker": { type: Number, default: 0 },
        teacher: { type: Number, default: 0 },
        accountant: { type: Number, default: 0 },
    },
}, { timestamps: true });
exports.Settings = mongoose_1.default.model("Settings", settingsSchema);
