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
exports.sendOrderConfirmationWhatsApp = sendOrderConfirmationWhatsApp;
function getWhatsAppConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { prisma } = yield Promise.resolve().then(() => __importStar(require('../lib/prisma')));
            const settings = yield prisma.generalSettings.findFirst();
            return {
                apiUrl: settings === null || settings === void 0 ? void 0 : settings.whatsappApiUrl,
                apiToken: settings === null || settings === void 0 ? void 0 : settings.whatsappApiToken,
                enabled: (settings === null || settings === void 0 ? void 0 : settings.whatsappEnabled) || false
            };
        }
        catch (error) {
            console.error('Failed to load WhatsApp config:', error);
            return { apiUrl: null, apiToken: null, enabled: false };
        }
    });
}
function sendOrderConfirmationWhatsApp(orderData) {
    return __awaiter(this, void 0, void 0, function* () {
        const config = yield getWhatsAppConfig();
        if (!config.enabled || !config.apiUrl || !config.apiToken) {
            console.warn('WhatsApp notifications disabled or not configured');
            return false;
        }
        // Format phone number (remove +88 if exists, ensure starts with 88)
        let phone = orderData.customerPhone.replace(/[^\d]/g, '');
        if (phone.startsWith('88'))
            phone = phone;
        else if (phone.startsWith('01'))
            phone = '88' + phone;
        else
            phone = '8801' + phone.slice(-9);
        // Create message
        const itemsList = orderData.items
            .map(item => `• ${item.title} - ${item.quantity}টি - ৳${item.price}`)
            .join('\n');
        const message = `🎉 *অর্ডার কনফার্ম!*

প্রিয় ${orderData.customerName},
আপনার অর্ডার সফলভাবে গৃহীত হয়েছে।

📋 *অর্ডার নম্বর:* ${orderData.orderId}

🛍️ *অর্ডার করা পণ্য:*
${itemsList}

💰 *মোট:* ৳${orderData.total}
📍 *ডেলিভারি ঠিকানা:* ${orderData.address}

আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।
ধন্যবাদ! 🙏`;
        try {
            // Using WhatsApp Business Cloud API format
            const response = yield fetch(config.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: phone,
                    type: 'text',
                    text: {
                        body: message
                    }
                })
            });
            if (response.ok) {
                console.log(`WhatsApp message sent to ${phone} for order ${orderData.orderId}`);
                return true;
            }
            else {
                const error = yield response.text();
                console.error('WhatsApp API error:', error);
                return false;
            }
        }
        catch (error) {
            console.error('Failed to send WhatsApp message:', error);
            return false;
        }
    });
}
