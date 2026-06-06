import { Product, CartItem, Order, Category } from "../types";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

// Keep track of the last tracked view to prevent double-firings in single-page apps
let lastTrackedPageView = "";

// Keep track of purchase event_id/order keys to enforce 1-time fire of Purchase
const processedPurchases = new Set<string>();

/**
 * Calculates the exact base price of an item including half-and-half rules
 */
export function calculateItemBasePrice(item: CartItem): number {
  if (item.is_half_and_half && item.half_flavor_1 && item.half_flavor_2) {
    return Math.max(item.half_flavor_1.price, item.half_flavor_2.price);
  }
  return item.product.price;
}

/**
 * Calculates the total cost of a single CartItem including borders and additionals
 */
export function calculateItemTotalCost(item: CartItem): number {
  const base = item.appliedPrice !== undefined ? item.appliedPrice : calculateItemBasePrice(item);
  const border = item.selected_border ? item.selected_border.price : 0;
  const additionals = (item.selected_additionals || []).reduce((sum, add) => sum + add.price, 0);
  return (base + border + additionals) * item.quantity;
}

/**
 * 0. Initialize the base Facebook Pixel script programmatically.
 */
export function initMetaPixel() {
  if (typeof window === "undefined") return;

  // Prevent duplicate initialization
  if (window.fbq) {
    console.log("[Meta Pixel] Already initialized.");
    return;
  }

  // --- Meta Pixel Base Code ---
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

  // Load the pixel configured with ID 1015555424167978
  window.fbq("init", "1015555424167978");
  window.fbq("track", "PageView");

  // Inject pixel fallback noscript tag
  try {
    const noscript = document.createElement("noscript");
    const img = document.createElement("img");
    img.height = 1;
    img.width = 1;
    img.style.display = "none";
    img.src = "https://www.facebook.com/tr?id=1015555424167978&ev=PageView&noscript=1";
    noscript.appendChild(img);
    document.body.appendChild(noscript);
  } catch (err) {
    console.warn("Could not insert noscript fallback tag:", err);
  }

  console.log("🎯 [Meta Pixel] Programmatic base integration loaded successfully.");
}

/**
 * 1. PageView - Dispatched when routes or steps change.
 * Prevents double fire and strictly excludes tracking on /admin.
 */
export function trackPageView(pageName?: string) {
  if (typeof window === "undefined" || !window.fbq) return;

  const currentPath = pageName || window.location.pathname + window.location.hash;
  
  // Do not track pixel in the administration view
  if (currentPath.toLowerCase().includes("admin")) {
    return;
  }

  // Exclude duplicate tracks on the exact same view
  if (lastTrackedPageView === currentPath) return;
  lastTrackedPageView = currentPath;

  window.fbq("track", "PageView");
  console.log(`[Meta Pixel] PageView recorded: ${currentPath}`);
}

/**
 * 2. ViewContent - Fired when the product modal is opened.
 */
export function trackViewContent(product: Product, categoryName?: string) {
  if (typeof window === "undefined" || !window.fbq) return;

  const eventData = {
    content_name: product.name,
    content_category: categoryName || (product.is_pizza ? "Pizza" : "Cardápio"),
    content_type: "product",
    value: product.price,
    currency: "BRL",
  };

  window.fbq("track", "ViewContent", eventData);
  console.log(`[Meta Pixel] ViewContent recorded:`, eventData);
}

/**
 * 3. AddToCart - Fired when an item is added to the cart drawer.
 */
export function trackAddToCart(item: CartItem, categoryName?: string) {
  if (typeof window === "undefined" || !window.fbq) return;

  let displayName = item.product.name;
  if (item.is_half_and_half) {
    const flavor1 = item.half_flavor_1?.name || "Sabor 1";
    const flavor2 = item.half_flavor_2?.name || "Sabor 2";
    displayName = `Pizza Meio a Meio - ${flavor1} + ${flavor2}`;
  }

  // Calculate base + border + additionals to get exact checkout value
  const basePrice = item.appliedPrice !== undefined ? item.appliedPrice : calculateItemBasePrice(item);
  const borderPrice = item.selected_border ? item.selected_border.price : 0;
  const additionalsPrice = (item.selected_additionals || []).reduce((sum, add) => sum + add.price, 0);
  const itemUnitValue = basePrice + borderPrice + additionalsPrice;
  const finalValue = itemUnitValue * item.quantity;

  const eventData = {
    content_name: displayName,
    content_category: categoryName || (item.product.is_pizza ? "Pizza" : "Cardápio"),
    content_type: "product",
    value: finalValue,
    currency: "BRL",
    num_items: item.quantity,
  };

  window.fbq("track", "AddToCart", eventData);
  console.log(`[Meta Pixel] AddToCart recorded:`, eventData);
}

/**
 * 4. RemoveFromCart - Custom event fired on cart item deletion.
 */
export function trackRemoveFromCart(item: CartItem, categoryName?: string) {
  if (typeof window === "undefined" || !window.fbq) return;

  let displayName = item.product.name;
  if (item.is_half_and_half) {
    const flavor1 = item.half_flavor_1?.name || "Sabor 1";
    const flavor2 = item.half_flavor_2?.name || "Sabor 2";
    displayName = `Pizza Meio a Meio - ${flavor1} + ${flavor2}`;
  }

  const basePrice = item.appliedPrice !== undefined ? item.appliedPrice : calculateItemBasePrice(item);
  const borderPrice = item.selected_border ? item.selected_border.price : 0;
  const additionalsPrice = (item.selected_additionals || []).reduce((sum, add) => sum + add.price, 0);
  const itemUnitValue = basePrice + borderPrice + additionalsPrice;
  const finalValue = itemUnitValue * item.quantity;

  const eventData = {
    content_name: displayName,
    content_category: categoryName || (item.product.is_pizza ? "Pizza" : "Cardápio"),
    value: finalValue,
    currency: "BRL",
  };

  window.fbq("trackCustom", "RemoveFromCart", eventData);
  console.log(`[Meta Pixel] RemoveFromCart recorded:`, eventData);
}

/**
 * 5. InitiateCheckout - When the customer opens checkout/view my order.
 */
export function trackInitiateCheckout(cartItems: CartItem[]) {
  if (typeof window === "undefined" || !window.fbq) return;

  const numItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const checkoutValue = cartItems.reduce((acc, item) => acc + calculateItemTotalCost(item), 0);

  const eventData = {
    value: checkoutValue,
    currency: "BRL",
    num_items: numItems,
  };

  window.fbq("track", "InitiateCheckout", eventData);
  console.log(`[Meta Pixel] InitiateCheckout recorded:`, eventData);
}

/**
 * 6. AddPaymentInfo - Since PIX is payment, triggered on the summary step.
 */
export function trackAddPaymentInfo(order: Order | { total: number }) {
  if (typeof window === "undefined" || !window.fbq) return;

  const totalValue = "total" in order ? order.total : 0;

  const eventData = {
    payment_method: "PIX",
    value: totalValue,
    currency: "BRL",
  };

  window.fbq("track", "AddPaymentInfo", eventData);
  console.log(`[Meta Pixel] AddPaymentInfo (PIX) recorded:`, eventData);
}

/**
 * 7. Lead - Triggered on "Enviar Pedido para WhatsApp" click.
 */
export function trackLead(order: Order) {
  if (typeof window === "undefined" || !window.fbq) return;

  const numItems = order.items.reduce((acc, item) => acc + item.quantity, 0);

  const eventData = {
    value: order.total,
    currency: "BRL",
    content_name: "Pedido WhatsApp",
    content_category: "Delivery Pizzaria",
    num_items: numItems,
  };

  window.fbq("track", "Lead", eventData);
  console.log(`[Meta Pixel] Lead recorded:`, eventData);
}

/**
 * 8. Purchase - Fired on the redirection screen (/redirecionando).
 * Strictly enforced to prevent duplicates using a unique key.
 */
export function trackPurchase(order: Order & { order_id?: string }) {
  if (typeof window === "undefined" || !window.fbq) return;

  // Guarantee order items count and sum
  if (!order.items || order.items.length === 0) {
    console.warn("[Meta Pixel] Ignored empty purchase tracking.");
    return;
  }

  // Generate unique order/event id based on timestamp, base phone, and total cost
  const cleanPhone = order.customer.phone.replace(/\D/g, "");
  const uniqueKey = order.order_id || `${cleanPhone}-${order.total.toFixed(2)}`;

  if (processedPurchases.has(uniqueKey)) {
    console.log(`[Meta Pixel] Purchase with key ${uniqueKey} already processed. Skipping duplicate track.`);
    return;
  }
  processedPurchases.add(uniqueKey);

  const numItems = order.items.reduce((acc, item) => acc + item.quantity, 0);

  const eventData = {
    value: order.total,
    currency: "BRL",
    content_name: "Pedido enviado para WhatsApp",
    content_category: "Delivery Pizzaria",
    num_items: numItems,
  };

  window.fbq("track", "Purchase", eventData);
  console.log(`[Meta Pixel] Purchase recorded successfully for key ${uniqueKey}:`, eventData);
}

/**
 * 9. CompleteRegistration (Opcional) - when address form is completely filled.
 */
export function trackCompleteRegistration() {
  if (typeof window === "undefined" || !window.fbq) return;

  const eventData = {
    content_name: "Cadastro de entrega preenchido",
  };

  window.fbq("track", "CompleteRegistration", eventData);
  console.log(`[Meta Pixel] CompleteRegistration recorded.`);
}
