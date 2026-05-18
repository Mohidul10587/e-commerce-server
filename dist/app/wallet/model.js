"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wallet = void 0;
const mongoose_1 = require("mongoose");
const WalletSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    earnedBalance: { type: Number, default: 0 },
}, { timestamps: true });
exports.Wallet = (0, mongoose_1.model)("Wallet", WalletSchema);
