"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageTask = void 0;
const mongoose_1 = require("mongoose");
const PackageTaskSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    packagePurchaseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "PackagePurchase", required: true },
    taskNumber: { type: Number, required: true },
    reward: { type: Number, required: true },
    assignedDate: { type: Date, required: true },
    completedAt: { type: Date },
    isCompleted: { type: Boolean, default: false },
}, { timestamps: true });
PackageTaskSchema.index({ userId: 1, packagePurchaseId: 1, assignedDate: 1, taskNumber: 1 }, { unique: true });
exports.PackageTask = (0, mongoose_1.model)("PackageTask", PackageTaskSchema);
