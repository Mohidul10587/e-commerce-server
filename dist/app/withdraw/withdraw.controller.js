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
exports.updateStatus = exports.getMyWithdrawals = exports.getWithdrawRequestsForAdmin = exports.createWithdrawRequest = void 0;
const withdraw_model_1 = __importDefault(require("./withdraw.model"));
const model_1 = require("../transaction/model");
const model_2 = require("../wallet/model");
const model_3 = require("../user/model");
const model_4 = require("../settings/model");
const mongoose_1 = __importDefault(require("mongoose"));
// Create a new withdraw request
const calculateWithdraw = ({ balance, amount, isFirstWithdraw, fee, isTeamLeader, minBalance, }) => {
    const appliedFee = isFirstWithdraw ? fee : 0;
    const totalDeduction = amount + appliedFee;
    const remainingAfter = balance - totalDeduction;
    const requiredMinBalance = isTeamLeader ? minBalance : 0;
    const maxWithdrawable = Math.max(0, balance - requiredMinBalance - appliedFee);
    return {
        appliedFee,
        totalDeduction,
        remainingAfter,
        requiredMinBalance,
        maxWithdrawable,
        allowed: remainingAfter >= requiredMinBalance,
    };
};
const createWithdrawRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const amount = Number(req.body.amount);
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const user = yield model_3.User.findById(userId);
        if (!((_b = user === null || user === void 0 ? void 0 : user.withdrawNumber) === null || _b === void 0 ? void 0 : _b.number)) {
            return res.status(400).json({
                message: "Please add withdrawal number first",
            });
        }
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentRequest = yield withdraw_model_1.default.findOne({
            userId,
            status: { $in: ["Pending", "Approved"] },
            createdAt: { $gte: oneWeekAgo },
        });
        if (recentRequest) {
            const nextAllowed = new Date(recentRequest.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
            return res.status(400).json({
                message: {
                    en: `You can make a new withdrawal request after ${nextAllowed.toLocaleDateString("en-GB")}`,
                    bn: `আপনি ${nextAllowed.toLocaleDateString("bn-BD")} তারিখের পরে নতুন উত্তোলন অনুরোধ করতে পারবেন`,
                },
            });
        }
        const wallet = yield model_2.Wallet.findOne({ userId });
        if (!wallet) {
            return res.status(400).json({ message: "Wallet not found" });
        }
        const settings = yield model_4.Settings.findOne();
        const fee = (_c = settings === null || settings === void 0 ? void 0 : settings.withdrawalFee) !== null && _c !== void 0 ? _c : 0;
        const minBalance = (_d = settings === null || settings === void 0 ? void 0 : settings.teamLeaderMinBalance) !== null && _d !== void 0 ? _d : 0;
        const calc = calculateWithdraw({
            balance: wallet.earnedBalance,
            amount,
            isFirstWithdraw: !user.withdrawalFeePaid,
            fee,
            isTeamLeader: user.role === "team-leader",
            minBalance,
        });
        // ❌ Not allowed
        if (!calc.allowed) {
            return res.status(400).json({
                message: {
                    en: `You can withdraw at most ৳${calc.maxWithdrawable}`,
                    bn: `আপনি সর্বোচ্চ ৳${calc.maxWithdrawable} উত্তোলন করতে পারবেন`,
                },
            });
        }
        // ❌ Insufficient balance check
        if (wallet.earnedBalance < amount + calc.appliedFee) {
            return res.status(400).json({
                message: "Insufficient balance",
            });
        }
        const previousTotal = wallet.earnedBalance;
        // 💰 Deduct
        wallet.earnedBalance -= calc.totalDeduction;
        yield wallet.save();
        // 💸 Fee transaction
        if (calc.appliedFee > 0) {
            user.withdrawalFeePaid = true;
            yield user.save();
            yield model_1.Transaction.create({
                userId,
                previousAmount: previousTotal,
                recentAmount: -calc.appliedFee,
                currentTotal: wallet.earnedBalance + amount,
                description: "One-time Withdrawal Fee",
                type: "debit",
            });
        }
        // 📤 Withdraw request
        const newWithdrawRequest = yield withdraw_model_1.default.create({
            amount,
            accountNumber: user.withdrawNumber.number,
            withdrawalMethod: user.withdrawNumber.method,
            userId,
        });
        // 🧾 Transaction log
        yield model_1.Transaction.create({
            userId,
            withdrawId: newWithdrawRequest._id,
            previousAmount: previousTotal - calc.appliedFee,
            recentAmount: -amount,
            currentTotal: wallet.earnedBalance,
            description: "Withdrawal Request",
            type: "debit",
        });
        return res.status(201).json({
            message: "Withdraw request created successfully",
            withdrawRequest: newWithdrawRequest,
            meta: {
                appliedFee: calc.appliedFee,
                maxWithdrawable: calc.maxWithdrawable,
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Error creating withdraw request",
            error,
        });
    }
});
exports.createWithdrawRequest = createWithdrawRequest;
// Get all withdraw requests for a seller
const getWithdrawRequestsForAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const [withdrawRequests, total] = yield Promise.all([
            withdraw_model_1.default.find()
                .populate({
                path: "userId",
                model: "User",
                select: "name userId email phone username image",
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            withdraw_model_1.default.countDocuments(),
        ]);
        res.status(200).json({
            message: "Withdraw requests fetched successfully",
            withdrawRequests,
            total,
            page,
            pages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Error fetching withdraw requests", error });
    }
});
exports.getWithdrawRequestsForAdmin = getWithdrawRequestsForAdmin;
// Get my withdrawals
const getMyWithdrawals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const withdrawals = yield withdraw_model_1.default.find({ userId }).sort({
            createdAt: -1,
        });
        res.status(200).json(withdrawals);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching withdrawals", error });
    }
});
exports.getMyWithdrawals = getMyWithdrawals;
const updateStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { withdrawId } = req.params;
    const { status, rejectionReason } = req.body;
    if (!["Rejected", "Approved"].includes(status)) {
        return res.status(400).json({
            message: {
                en: "Invalid status provided",
                bn: "অবৈধ স্ট্যাটাস প্রদান করা হয়েছে",
            },
        });
    }
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const withdrawRequest = yield withdraw_model_1.default.findById(withdrawId).session(session);
        if (!withdrawRequest) {
            yield session.abortTransaction();
            return res.status(404).json({
                message: {
                    en: "Withdraw request not found",
                    bn: "উত্তোলন অনুরোধ পাওয়া যায়নি",
                },
            });
        }
        // ✅ Prevent double processing
        if (withdrawRequest.status !== "Pending") {
            yield session.abortTransaction();
            return res.status(400).json({
                message: {
                    en: "Withdraw already processed",
                    bn: "এই উত্তোলন ইতিমধ্যে প্রসেস করা হয়েছে",
                },
            });
        }
        // ✅ Update status
        withdrawRequest.status = status;
        if (status === "Rejected" && rejectionReason) {
            withdrawRequest.rejectionReason = rejectionReason;
        }
        yield withdrawRequest.save({ session });
        const wallet = yield model_2.Wallet.findOne({
            userId: withdrawRequest.userId,
        }).session(session);
        if (!wallet) {
            yield session.abortTransaction();
            return res.status(404).json({
                message: {
                    en: "Wallet not found",
                    bn: "ওয়ালেট পাওয়া যায়নি",
                },
            });
        }
        // =========================
        // ✅ REJECTED (REFUND)
        // =========================
        if (status === "Rejected") {
            const previousTotal = wallet.earnedBalance;
            wallet.earnedBalance += withdrawRequest.amount;
            yield wallet.save({ session });
            yield model_1.Transaction.create([
                {
                    userId: withdrawRequest.userId,
                    withdrawId: withdrawRequest._id,
                    previousAmount: previousTotal,
                    recentAmount: withdrawRequest.amount,
                    currentTotal: wallet.earnedBalance,
                    description: "Withdrawal Rejected - Refund",
                    type: "credit",
                },
            ], { session });
        }
        yield session.commitTransaction();
        session.endSession();
        return res.status(200).json({
            message: {
                en: `Withdrawal ${status.toLowerCase()} successfully`,
                bn: status === "Approved"
                    ? "উত্তোলন অনুমোদিত হয়েছে"
                    : status === "Rejected"
                        ? "উত্তোলন প্রত্যাখ্যাত হয়েছে"
                        : "স্ট্যাটাস আপডেট হয়েছে",
            },
            withdrawRequest,
        });
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        console.error("Error updating withdraw status:", error);
        return res.status(500).json({
            message: {
                en: "Server error",
                bn: "সার্ভার ত্রুটি",
            },
        });
    }
});
exports.updateStatus = updateStatus;
