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
exports.updateBalance = exports.getUserWallet = exports.getAdminIncome = exports.getMyWallet = void 0;
const model_1 = require("./model");
const model_2 = require("../transaction/model");
const getMyWallet = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        let wallet = yield model_1.Wallet.findOne({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id });
        if (!wallet) {
            wallet = yield model_1.Wallet.create({ userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id, earnedBalance: 0 });
        }
        res.status(200).json(wallet);
    }
    catch (error) {
        next(error);
    }
});
exports.getMyWallet = getMyWallet;
const getAdminIncome = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const wallet = yield model_1.Wallet.findOne({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id });
        res.status(200).json({ totalIncome: wallet ? wallet.earnedBalance : 0 });
    }
    catch (error) {
        next(error);
    }
});
exports.getAdminIncome = getAdminIncome;
const getUserWallet = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        let wallet = yield model_1.Wallet.findOne({ userId });
        if (!wallet) {
            wallet = yield model_1.Wallet.create({ userId, earnedBalance: 0 });
        }
        res.status(200).json(wallet);
    }
    catch (error) {
        next(error);
    }
});
exports.getUserWallet = getUserWallet;
const updateBalance = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { amount, operation, description } = req.body;
        let wallet = yield model_1.Wallet.findOne({ userId });
        const previousAmount = wallet ? wallet.earnedBalance : 0;
        if (!wallet) {
            wallet = yield model_1.Wallet.create({
                userId,
                earnedBalance: operation === "add" ? amount : 0,
            });
        }
        else {
            if (operation === "add") {
                wallet.earnedBalance += amount;
            }
            else if (operation === "subtract") {
                wallet.earnedBalance = Math.max(0, wallet.earnedBalance - amount);
            }
            yield wallet.save();
        }
        yield model_2.Transaction.create({
            userId,
            previousAmount,
            recentAmount: operation === "add" ? amount : -amount,
            currentTotal: wallet.earnedBalance,
            description: description || `Balance ${operation === "add" ? "Added" : "Subtracted"} by Admin`,
            type: operation === "add" ? "credit" : "debit",
        });
        res.status(200).json(wallet);
    }
    catch (error) {
        next(error);
    }
});
exports.updateBalance = updateBalance;
