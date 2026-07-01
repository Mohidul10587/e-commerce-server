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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncProductStock = syncProductStock;
exports.adjustStock = adjustStock;
exports.syncVariants = syncVariants;
const prisma_1 = __importDefault(require("../../lib/prisma"));
/**
 * Recalculates totalStock from all active variants and updates the product.
 * Call this inside a transaction by passing the tx client.
 */
function syncProductStock(productId_1) {
    return __awaiter(this, arguments, void 0, function* (productId, tx = prisma_1.default) {
        var _a;
        const result = yield tx.productVariant.aggregate({
            where: { productId, isActive: true },
            _sum: { stock: true },
        });
        yield tx.product.update({
            where: { id: productId },
            data: { totalStock: (_a = result._sum.stock) !== null && _a !== void 0 ? _a : 0 },
        });
    });
}
/**
 * Adjusts a variant's stock and writes a StockHistory record.
 * quantity is always a positive number; action determines direction.
 * Throws if SALE/REMOVE would take stock below zero.
 */
function adjustStock(variantId_1, action_1, quantity_1, note_1) {
    return __awaiter(this, arguments, void 0, function* (variantId, action, quantity, note, tx = prisma_1.default) {
        const variant = yield tx.productVariant.findUniqueOrThrow({ where: { id: variantId } });
        const delta = action === "ADD" || action === "RETURN" ? quantity
            : action === "SALE" || action === "REMOVE" ? -quantity
                : quantity; // ADJUSTMENT: caller passes signed quantity directly
        const newStock = variant.stock + delta;
        // Never allow stock to go negative for any action
        if (newStock < 0) {
            throw new Error(`Insufficient stock for variant ${variantId}: current=${variant.stock}, requested=${quantity}, action=${action}`);
        }
        yield tx.productVariant.update({
            where: { id: variantId },
            data: { stock: newStock },
        });
        yield tx.stockHistory.create({
            data: { variantId, action, quantity, note },
        });
        return newStock;
    });
}
/**
 * Syncs variants during a product update:
 * - Creates new variants (no id)
 * - Updates existing variants (has id)
 * - Soft-deletes variants missing from the incoming list
 */
function syncVariants(productId_1, incomingVariants_1) {
    return __awaiter(this, arguments, void 0, function* (productId, incomingVariants, tx = prisma_1.default) {
        const existingVariants = yield tx.productVariant.findMany({
            where: { productId },
            select: { id: true, stock: true },
        });
        const incomingIds = incomingVariants
            .filter((v) => v.id !== undefined)
            .map((v) => v.id);
        // Soft-delete variants not present in the incoming list
        const toDeactivate = existingVariants
            .filter((v) => !incomingIds.includes(v.id))
            .map((v) => v.id);
        if (toDeactivate.length > 0) {
            yield tx.productVariant.updateMany({
                where: { id: { in: toDeactivate } },
                data: { isActive: false, stock: 0 },
            });
        }
        for (const variant of incomingVariants) {
            const { id } = variant, data = __rest(variant, ["id"]);
            if (id) {
                // Update existing variant
                const existing = existingVariants.find((v) => v.id === id);
                if (existing && existing.stock !== data.stock) {
                    const diff = data.stock - existing.stock;
                    const action = diff > 0 ? "ADJUSTMENT" : "ADJUSTMENT";
                    yield tx.stockHistory.create({
                        data: { variantId: id, action, quantity: Math.abs(diff), note: "Manual adjustment on update" },
                    });
                }
                yield tx.productVariant.update({ where: { id }, data });
            }
            else {
                // Create new variant
                const created = yield tx.productVariant.create({
                    data: Object.assign(Object.assign({}, data), { productId }),
                });
                if (created.stock > 0) {
                    yield tx.stockHistory.create({
                        data: { variantId: created.id, action: "ADD", quantity: created.stock, note: "Initial stock on create" },
                    });
                }
            }
        }
    });
}
