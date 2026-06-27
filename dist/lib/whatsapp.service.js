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
exports.invalidateWhatsAppCache = invalidateWhatsAppCache;
exports.sendOrderConfirmationWhatsApp = sendOrderConfirmationWhatsApp;
exports.sendOrderStatusWhatsApp = sendOrderStatusWhatsApp;
exports.sendPaymentWhatsApp = sendPaymentWhatsApp;
const prisma_1 = require("./prisma");
let _cache = null;
const TTL = 5 * 60 * 1000;
function getConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        if (_cache && Date.now() - _cache.cachedAt < TTL)
            return _cache;
        try {
            const s = yield prisma_1.prisma.generalSettings.findFirst();
            _cache = {
                apiUrl: (_a = s === null || s === void 0 ? void 0 : s.whatsappApiUrl) !== null && _a !== void 0 ? _a : null,
                apiToken: (_b = s === null || s === void 0 ? void 0 : s.whatsappApiToken) !== null && _b !== void 0 ? _b : null,
                enabled: (_c = s === null || s === void 0 ? void 0 : s.whatsappEnabled) !== null && _c !== void 0 ? _c : false,
                cachedAt: Date.now(),
            };
        }
        catch (_d) {
            _cache = { apiUrl: null, apiToken: null, enabled: false, cachedAt: Date.now() };
        }
        return _cache;
    });
}
/** Call this after saving settings so the cache refreshes immediately */
function invalidateWhatsAppCache() {
    _cache = null;
}
// ── Phone normalisation for Bangladesh numbers ────────────────────────────────
function normalizePhone(raw) {
    const d = raw.replace(/\D/g, '');
    if (d.startsWith('880') && d.length === 13)
        return d;
    if (d.startsWith('88') && d.length === 12)
        return d;
    if (d.startsWith('01') && d.length === 11)
        return '88' + d;
    if (d.length === 10)
        return '8801' + d;
    return d;
}
// ── Core send helper ──────────────────────────────────────────────────────────
function sendMessage(rawPhone, body) {
    return __awaiter(this, void 0, void 0, function* () {
        const config = yield getConfig();
        // DEBUG: log the full config state so you can see exactly what's loaded
        console.log('[WhatsApp] DEBUG config:', {
            enabled: config.enabled,
            apiUrl: config.apiUrl,
            hasToken: !!config.apiToken,
            cachedAt: new Date(config.cachedAt).toISOString(),
        });
        if (!config.enabled) {
            console.warn('[WhatsApp] ⚠️ disabled in settings');
            return false;
        }
        if (!config.apiUrl) {
            console.warn('[WhatsApp] ⚠️ apiUrl is missing in settings');
            return false;
        }
        if (!config.apiToken) {
            console.warn('[WhatsApp] ⚠️ apiToken is missing in settings');
            return false;
        }
        const phone = normalizePhone(rawPhone);
        console.log(`[WhatsApp] sending to ${phone} via ${config.apiUrl}`);
        try {
            const res = yield fetch(config.apiUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.apiToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: phone,
                    type: 'text',
                    text: { body },
                }),
            });
            const responseText = yield res.text();
            if (res.ok) {
                console.log(`[WhatsApp] ✅ sent to ${phone}`, responseText);
                return true;
            }
            console.error(`[WhatsApp] ❌ API error ${res.status}:`, responseText);
            return false;
        }
        catch (err) {
            console.error('[WhatsApp] ❌ send failed:', err);
            return false;
        }
    });
}
// ── Public message functions ──────────────────────────────────────────────────
/** Sent when a new order is placed (public storefront) */
function sendOrderConfirmationWhatsApp(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const itemsList = data.items
            .map(i => `• ${i.title} — ${i.quantity}টি — ৳${i.price}`)
            .join('\n');
        const msg = `🎉 *অর্ডার কনফার্ম!*

প্রিয় ${data.customerName},
আপনার অর্ডার সফলভাবে গৃহীত হয়েছে।

📋 *অর্ডার নম্বর:* ${data.orderId}

🛍️ *অর্ডার করা পণ্য:*
${itemsList}

💰 *মোট:* ৳${data.total}
📍 *ডেলিভারি ঠিকানা:* ${data.address}

আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।
ধন্যবাদ! 🙏`;
        return sendMessage(data.customerPhone, msg);
    });
}
/** Sent when order status changes to OrderConfirmed or Delivered */
function sendOrderStatusWhatsApp(phone, name, orderId, status) {
    return __awaiter(this, void 0, void 0, function* () {
        const messages = {
            OrderConfirmed: `✅ *অর্ডার কনফার্ম!*\n\nপ্রিয় ${name},\nআপনার অর্ডার #${orderId} কনফার্ম হয়েছে। আমরা শীঘ্রই প্রস্তুত করব।\nধন্যবাদ! 🙏`,
            Delivered: `🎉 *ডেলিভারি সম্পন্ন!*\n\nপ্রিয় ${name},\nঅর্ডার #${orderId} সফলভাবে পৌঁছে গেছে।\nআমাদের সেবা নিন বারবার। ধন্যবাদ! 🙏`,
        };
        return sendMessage(phone, messages[status]);
    });
}
/** Sent when a payment is recorded on an order */
function sendPaymentWhatsApp(phone, name, orderId, amount) {
    return __awaiter(this, void 0, void 0, function* () {
        const msg = `💰 *পেমেন্ট পাওয়া গেছে!*\n\nপ্রিয় ${name},\nআমরা আপনার ৳${amount} পেমেন্ট পেয়েছি।\nঅর্ডার #${orderId}\nধন্যবাদ! 🙏`;
        return sendMessage(phone, msg);
    });
}
