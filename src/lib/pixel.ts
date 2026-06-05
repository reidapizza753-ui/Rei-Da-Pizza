/**
 * Integration helper for Pixel Triggers:
 * - Google Tag Manager
 * - Google Ads
 * - Meta Pixel
 * - TikTok Pixel
 */

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    ttq?: { track: (event: string, data?: any) => void };
  }
}

export function initPixelTrackers() {
  console.log("🎯 [Pixel System] Initializing pixel track hooks. Ensure scripts are added in the index.html or Google Tag Manager container.");
}

export function trackLeadEvent(orderData: {
  orderId: string;
  total: number;
  paymentMethod: string;
  itemsCount: number;
}) {
  console.log("🎯 [Pixel System] Triggering 'Lead' conversion event!", orderData);

  // 1. Google Tag Manager / dataLayer push
  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "Lead",
      ecommerce: {
        transaction_id: orderData.orderId,
        value: orderData.total,
        currency: "BRL",
        payment_type: orderData.paymentMethod,
        items_count: orderData.itemsCount
      }
    });

    // 2. Google Ads conversion
    if (typeof window.gtag === "function") {
      window.gtag("event", "conversion", {
        send_to: "AW-CONVERSION_ID/LABEL", // Placeholder to be replaced by the client
        value: orderData.total,
        currency: "BRL",
        transaction_id: orderData.orderId
      });
    }

    // 3. Meta Pixel (Facebook) Lead conversion
    if (typeof window.fbq === "function") {
      window.fbq("track", "Lead", {
        content_name: "Pizzaria Order checkout",
        value: orderData.total,
        currency: "BRL"
      });
    }

    // 4. TikTok Pixel
    if (window.ttq && typeof window.ttq.track === "function") {
      window.ttq.track("CompletePayment", {
        value: orderData.total,
        currency: "BRL"
      });
    }
  }
}
