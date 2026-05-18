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
exports.updateOrderStatus = exports.getAllOrders = exports.getMyOrders = exports.createDirectOrder = exports.createOrder = void 0;
const model_1 = require("./model");
const model_2 = require("../wallet/model");
const model_3 = require("../transaction/model");
const model_4 = require("../product/model");
const model_5 = require("../user/model");
const model_6 = require("../settings/model");
const deductWalletBalance_1 = require("../../utils/deductWalletBalance");
const mongoose_1 = __importDefault(require("mongoose"));
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { deliveryAddress, deliveryZone, items: cartItems, payment } = req.body;
        if (!deliveryZone || !["inside_dhaka", "outside_dhaka"].includes(deliveryZone)) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Delivery zone is required" });
        }
        if (!(deliveryAddress === null || deliveryAddress === void 0 ? void 0 : deliveryAddress.fullName) || !(deliveryAddress === null || deliveryAddress === void 0 ? void 0 : deliveryAddress.phone) || !(deliveryAddress === null || deliveryAddress === void 0 ? void 0 : deliveryAddress.address) ||
            !(deliveryAddress === null || deliveryAddress === void 0 ? void 0 : deliveryAddress.city) || !(deliveryAddress === null || deliveryAddress === void 0 ? void 0 : deliveryAddress.postalCode) || !(deliveryAddress === null || deliveryAddress === void 0 ? void 0 : deliveryAddress.country)) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Delivery address is required" });
        }
        if (!(payment === null || payment === void 0 ? void 0 : payment.method) || (payment.method !== "cash_on_delivery" && payment.method !== "wallet_balance" && (!(payment === null || payment === void 0 ? void 0 : payment.senderNumber) || !(payment === null || payment === void 0 ? void 0 : payment.transactionId)))) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Payment details are required" });
        }
        if (!(cartItems === null || cartItems === void 0 ? void 0 : cartItems.length)) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Cart is empty" });
        }
        let subtotal = 0;
        const orderItems = [];
        for (const item of cartItems) {
            const product = yield model_4.Product.findById(item.productId).session(session);
            if (!product) {
                yield session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: "Product not found" });
            }
            const price = product.salePrice;
            subtotal += price * item.quantity;
            orderItems.push({
                productId: product._id,
                title: product.title.en,
                quantity: item.quantity,
                price,
                referrerId: item.referrerId || undefined,
            });
        }
        const settings = yield model_6.Settings.findOne();
        const deliveryCharge = deliveryZone === "inside_dhaka"
            ? (_a = settings === null || settings === void 0 ? void 0 : settings.deliveryChargeInsideDhaka) !== null && _a !== void 0 ? _a : 0
            : (_b = settings === null || settings === void 0 ? void 0 : settings.deliveryChargeOutsideDhaka) !== null && _b !== void 0 ? _b : 0;
        const totalAmount = subtotal + deliveryCharge;
        const orderId = `ORD${Date.now()}`;
        const userId = req.body.userId ? new mongoose_1.default.Types.ObjectId(req.body.userId) : (_c = req.user) === null || _c === void 0 ? void 0 : _c._id;
        const order = new model_1.Order({
            userId,
            orderId,
            items: orderItems,
            subtotal,
            deliveryCharge,
            deliveryZone,
            totalAmount,
            status: "processing",
            deliveryAddress,
            payment,
        });
        yield order.save({ session });
        // Deduct wallet only when payment method is wallet_balance
        if (userId && payment.method === "wallet_balance") {
            const wallet = yield model_2.Wallet.findOne({ userId }).session(session);
            if (!wallet) {
                yield session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: "Wallet not found" });
            }
            const { previousTotal, currentTotal } = yield (0, deductWalletBalance_1.deductWalletBalance)(wallet, totalAmount, session);
            yield model_3.Transaction.create([{
                    userId,
                    previousAmount: previousTotal,
                    recentAmount: -totalAmount,
                    currentTotal,
                    description: `Order purchase - ${orderId}`,
                    type: "debit",
                }], { session });
        }
        yield session.commitTransaction();
        session.endSession();
        res.json({ message: "Order placed successfully", order });
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        console.error("Error creating order:", error);
        const isKnown = (error === null || error === void 0 ? void 0 : error.message) === "Insufficient balance";
        res.status(isKnown ? 400 : 500).json({ message: (error === null || error === void 0 ? void 0 : error.message) || "Error creating order" });
    }
});
exports.createOrder = createOrder;
const createDirectOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { productId, quantity, deliveryAddress, deliveryZone, referrerId, payment } = req.body;
        if (!deliveryZone || !["inside_dhaka", "outside_dhaka"].includes(deliveryZone)) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Delivery zone is required" });
        }
        if (!(deliveryAddress === null || deliveryAddress === void 0 ? void 0 : deliveryAddress.fullName) || !(deliveryAddress === null || deliveryAddress === void 0 ? void 0 : deliveryAddress.phone) || !(deliveryAddress === null || deliveryAddress === void 0 ? void 0 : deliveryAddress.address) ||
            !(deliveryAddress === null || deliveryAddress === void 0 ? void 0 : deliveryAddress.city) || !(deliveryAddress === null || deliveryAddress === void 0 ? void 0 : deliveryAddress.postalCode) || !(deliveryAddress === null || deliveryAddress === void 0 ? void 0 : deliveryAddress.country)) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Delivery address is required" });
        }
        if (!(payment === null || payment === void 0 ? void 0 : payment.method) || (payment.method !== "cash_on_delivery" && payment.method !== "wallet_balance" && (!(payment === null || payment === void 0 ? void 0 : payment.senderNumber) || !(payment === null || payment === void 0 ? void 0 : payment.transactionId)))) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Payment details are required" });
        }
        if (!productId || !quantity || quantity < 1) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Invalid product or quantity" });
        }
        const product = yield model_4.Product.findById(productId).session(session);
        if (!product) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Product not found" });
        }
        const price = product.salePrice;
        const subtotal = price * quantity;
        const settings = yield model_6.Settings.findOne();
        const deliveryCharge = deliveryZone === "inside_dhaka"
            ? (_a = settings === null || settings === void 0 ? void 0 : settings.deliveryChargeInsideDhaka) !== null && _a !== void 0 ? _a : 0
            : (_b = settings === null || settings === void 0 ? void 0 : settings.deliveryChargeOutsideDhaka) !== null && _b !== void 0 ? _b : 0;
        const totalAmount = subtotal + deliveryCharge;
        const orderId = `ORD${Date.now()}`;
        const userId = req.body.userId ? new mongoose_1.default.Types.ObjectId(req.body.userId) : (_c = req.user) === null || _c === void 0 ? void 0 : _c._id;
        const order = new model_1.Order({
            userId,
            orderId,
            items: [{ productId: product._id, title: product.title.en, quantity, price, referrerId: referrerId || undefined }],
            subtotal,
            deliveryCharge,
            deliveryZone,
            totalAmount,
            status: "processing",
            deliveryAddress,
            payment,
        });
        yield order.save({ session });
        // Deduct wallet only when payment method is wallet_balance
        if (userId && payment.method === "wallet_balance") {
            const wallet = yield model_2.Wallet.findOne({ userId }).session(session);
            if (!wallet) {
                yield session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: "Wallet not found" });
            }
            const { previousTotal, currentTotal } = yield (0, deductWalletBalance_1.deductWalletBalance)(wallet, totalAmount, session);
            yield model_3.Transaction.create([{
                    userId,
                    previousAmount: previousTotal,
                    recentAmount: -totalAmount,
                    currentTotal,
                    description: `Order purchase - ${orderId}`,
                    type: "debit",
                }], { session });
        }
        yield session.commitTransaction();
        session.endSession();
        res.json({ message: "Order placed successfully", order });
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        console.error("Error creating direct order:", error);
        const isKnown = (error === null || error === void 0 ? void 0 : error.message) === "Insufficient balance";
        res.status(isKnown ? 400 : 500).json({ message: (error === null || error === void 0 ? void 0 : error.message) || "Error creating order" });
    }
});
exports.createDirectOrder = createDirectOrder;
const getMyOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const orders = yield model_1.Order.find({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id }).sort({
            createdAt: -1,
        });
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching orders" });
    }
});
exports.getMyOrders = getMyOrders;
const getAllOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield model_1.Order.find()
            .populate("userId", "name username userId")
            .sort({ createdAt: -1 });
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching orders" });
    }
});
exports.getAllOrders = getAllOrders;
const updateOrderStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        const order = yield model_1.Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        const previousStatus = order.status;
        order.status = status;
        yield order.save();
        // Refund only if paid via wallet_balance
        if (status === "cancelled" && previousStatus !== "cancelled" && ((_a = order.payment) === null || _a === void 0 ? void 0 : _a.method) === "wallet_balance") {
            const wallet = yield model_2.Wallet.findOne({ userId: order.userId });
            if (wallet) {
                const previousBalance = wallet.earnedBalance;
                wallet.earnedBalance += order.totalAmount;
                yield wallet.save();
                yield model_3.Transaction.create({
                    userId: order.userId,
                    previousAmount: previousBalance,
                    recentAmount: order.totalAmount,
                    currentTotal: wallet.earnedBalance,
                    description: `Order Refund - ${order.orderId}`,
                    type: "credit",
                });
            }
        }
        // Pay affiliate commission if delivered
        if (status === "delivered" && previousStatus !== "delivered") {
            // Group commission per referrer
            const commissionMap = new Map();
            for (const item of order.items) {
                if (!item.referrerId)
                    continue;
                const product = yield model_4.Product.findById(item.productId);
                if ((product === null || product === void 0 ? void 0 : product.isAffiliate) && product.affCommPercent > 0) {
                    const commission = (item.price * item.quantity * product.affCommPercent) / 100;
                    commissionMap.set(item.referrerId, (commissionMap.get(item.referrerId) || 0) + commission);
                }
            }
            for (const [referrerUserId, totalCommission] of commissionMap) {
                const referrer = yield model_5.User.findOne({ userId: referrerUserId });
                if (!(referrer === null || referrer === void 0 ? void 0 : referrer.isActive))
                    continue;
                const referrerWallet = yield model_2.Wallet.findOne({ userId: referrer._id });
                if (!referrerWallet)
                    continue;
                const previousBalance = referrerWallet.earnedBalance;
                referrerWallet.earnedBalance += totalCommission;
                yield referrerWallet.save();
                yield model_3.Transaction.create({
                    userId: referrer._id,
                    previousAmount: previousBalance,
                    recentAmount: totalCommission,
                    currentTotal: referrerWallet.earnedBalance,
                    description: `Affiliate commission - Order ${order.orderId}`,
                    type: "credit",
                });
            }
        }
        res.json({ message: "Order status updated", order });
    }
    catch (error) {
        res.status(500).json({ message: "Error updating order status" });
    }
});
exports.updateOrderStatus = updateOrderStatus;
