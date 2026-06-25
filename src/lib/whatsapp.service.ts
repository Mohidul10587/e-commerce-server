import { prisma } from './prisma';

// ── Config cache (5-minute TTL) ───────────────────────────────────────────────
interface WaConfig {
  apiUrl: string | null;
  apiToken: string | null;
  enabled: boolean;
  cachedAt: number;
}
let _cache: WaConfig | null = null;
const TTL = 5 * 60 * 1000;

async function getConfig(): Promise<WaConfig> {
  if (_cache && Date.now() - _cache.cachedAt < TTL) return _cache;
  try {
    const s = await prisma.generalSettings.findFirst();
    _cache = {
      apiUrl: s?.whatsappApiUrl ?? null,
      apiToken: s?.whatsappApiToken ?? null,
      enabled: s?.whatsappEnabled ?? false,
      cachedAt: Date.now(),
    };
  } catch {
    _cache = { apiUrl: null, apiToken: null, enabled: false, cachedAt: Date.now() };
  }
  return _cache;
}

/** Call this after saving settings so the cache refreshes immediately */
export function invalidateWhatsAppCache() {
  _cache = null;
}

// ── Phone normalisation for Bangladesh numbers ────────────────────────────────
function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.startsWith('880') && d.length === 13) return d;
  if (d.startsWith('88')  && d.length === 12) return d;
  if (d.startsWith('01')  && d.length === 11) return '88' + d;
  if (d.length === 10) return '8801' + d;
  return d;
}

// ── Core send helper ──────────────────────────────────────────────────────────
async function sendMessage(rawPhone: string, body: string): Promise<boolean> {
  const config = await getConfig();
  if (!config.enabled || !config.apiUrl || !config.apiToken) return false;

  const phone = normalizePhone(rawPhone);
  try {
    const res = await fetch(config.apiUrl, {
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
    if (res.ok) {
      console.log(`[WhatsApp] ✅ sent to ${phone}`);
      return true;
    }
    console.error('[WhatsApp] API error:', await res.text());
    return false;
  } catch (err) {
    console.error('[WhatsApp] send failed:', err);
    return false;
  }
}

// ── Public message functions ──────────────────────────────────────────────────

/** Sent when a new order is placed (public storefront) */
export async function sendOrderConfirmationWhatsApp(data: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  items: { title: string; quantity: number; price: number }[];
  total: number;
  address: string;
}): Promise<boolean> {
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
}

/** Sent when order status changes to OrderConfirmed or Delivered */
export async function sendOrderStatusWhatsApp(
  phone: string,
  name: string,
  orderId: number,
  status: 'OrderConfirmed' | 'Delivered'
): Promise<boolean> {
  const messages: Record<string, string> = {
    OrderConfirmed: `✅ *অর্ডার কনফার্ম!*\n\nপ্রিয় ${name},\nআপনার অর্ডার #${orderId} কনফার্ম হয়েছে। আমরা শীঘ্রই প্রস্তুত করব।\nধন্যবাদ! 🙏`,
    Delivered:      `🎉 *ডেলিভারি সম্পন্ন!*\n\nপ্রিয় ${name},\nঅর্ডার #${orderId} সফলভাবে পৌঁছে গেছে।\nআমাদের সেবা নিন বারবার। ধন্যবাদ! 🙏`,
  };
  return sendMessage(phone, messages[status]);
}

/** Sent when a payment is recorded on an order */
export async function sendPaymentWhatsApp(
  phone: string,
  name: string,
  orderId: number,
  amount: number
): Promise<boolean> {
  const msg = `💰 *পেমেন্ট পাওয়া গেছে!*\n\nপ্রিয় ${name},\nআমরা আপনার ৳${amount} পেমেন্ট পেয়েছি।\nঅর্ডার #${orderId}\nধন্যবাদ! 🙏`;
  return sendMessage(phone, msg);
}
