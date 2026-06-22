interface OrderData {
  orderId: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    title: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  address: string;
}

async function getWhatsAppConfig() {
  try {
    const { prisma } = await import('../lib/prisma');
    const settings = await prisma.generalSettings.findFirst();
    return {
      apiUrl: settings?.whatsappApiUrl,
      apiToken: settings?.whatsappApiToken,
      enabled: settings?.whatsappEnabled || false
    };
  } catch (error) {
    console.error('Failed to load WhatsApp config:', error);
    return { apiUrl: null, apiToken: null, enabled: false };
  }
}

export async function sendOrderConfirmationWhatsApp(orderData: OrderData): Promise<boolean> {
  const config = await getWhatsAppConfig();
  
  if (!config.enabled || !config.apiUrl || !config.apiToken) {
    console.warn('WhatsApp notifications disabled or not configured');
    return false;
  }

  // Format phone number (remove +88 if exists, ensure starts with 88)
  let phone = orderData.customerPhone.replace(/[^\d]/g, '');
  if (phone.startsWith('88')) phone = phone;
  else if (phone.startsWith('01')) phone = '88' + phone;
  else phone = '8801' + phone.slice(-9);

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
    const response = await fetch(config.apiUrl, {
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
    } else {
      const error = await response.text();
      console.error('WhatsApp API error:', error);
      return false;
    }
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    return false;
  }
}
