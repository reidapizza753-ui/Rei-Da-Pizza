import React, { useState, useEffect } from "react";
import { X, Trash2, Plus, Minus, Send, ShoppingBag, ShieldAlert, AlertTriangle } from "lucide-react";
import { CartItem, CustomerDetails, PaymentMethod, Configs, Product, Order } from "../types";
import { trackLeadEvent } from "../lib/pixel";
import { trackAddPaymentInfo, trackLead, trackCompleteRegistration } from "../utils/metaPixel";
import OptimizedImage from "./OptimizedImage";

interface CartSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQty: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  configs: Configs;
  halfPizzaInProgress: Product | null;
  onCancelHalfPizza?: () => void;
  currentStep: 1 | 2 | 3 | 4;
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void;
}

export default function CartSlideOver({
  isOpen,
  onClose,
  cartItems,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  configs,
  halfPizzaInProgress,
  onCancelHalfPizza,
  currentStep,
  setCurrentStep,
}: CartSlideOverProps) {
  if (!isOpen) return null;

  // Local state for Customer Info with extended fields
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: "",
    phone: "",
    address: "",
    number: "",
    neighborhood: "",
    complement: "",
    cep: "",
    city: "",
    state: "",
    reference: "",
  });

  // Ref for auto-scroll and focus validation
  const numberInputRef = React.useRef<HTMLInputElement>(null);

  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");
  const [addressFound, setAddressFound] = useState(false);
  const [hasConfirmedEstimate, setHasConfirmedEstimate] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load saved customer info from localStorage if available
  useEffect(() => {
    const saved = localStorage.getItem("pizzaria_customer_details");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustomer({
          name: parsed.name || "",
          phone: parsed.phone || "",
          address: parsed.address || "",
          number: parsed.number || "",
          neighborhood: parsed.neighborhood || "",
          complement: parsed.complement || "",
          cep: parsed.cep || "",
          city: parsed.city || "",
          state: parsed.state || "",
          reference: parsed.reference || "",
        });
        if (parsed.cep && parsed.address && parsed.neighborhood) {
          setAddressFound(true);
          setHasConfirmedEstimate(true);
        }
      } catch (e) {
        console.error("Error loading saved customer", e);
      }
    }
  }, []);

  // Track reaching step 4 (payment/summary) in Checkout
  useEffect(() => {
    if (isOpen && currentStep === 4 && cartItems.length > 0) {
      // Calculate total corresponding to standard delivery rules
      const sub = cartItems.reduce((acc, item) => {
        const base = item.appliedPrice !== undefined ? item.appliedPrice : (item.is_half_and_half && item.half_flavor_1 && item.half_flavor_2 ? Math.max(item.half_flavor_1.price, item.half_flavor_2.price) : item.product.price);
        const border = item.selected_border ? item.selected_border.price : 0;
        const additionals = (item.selected_additionals || []).reduce((sum, add) => sum + add.price, 0);
        return acc + (base + border + additionals) * item.quantity;
      }, 0);
      const pizzaCount = cartItems.reduce((sum, item) => item.product.is_pizza ? sum + item.quantity : sum, 0);
      const fee = pizzaCount >= 2 ? 0 : configs.delivery_fee;
      trackAddPaymentInfo({ total: sub + fee });
    }
  }, [isOpen, currentStep, cartItems.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Automated ViaCEP search
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const cleaned = rawValue.replace(/\D/g, "");
    
    if (cleaned.length > 8) return; // Prevent extra inputs

    setCustomer((prev) => ({ ...prev, cep: rawValue }));
    setCepError("");

    if (cleaned.length === 8) {
      setCepLoading(true);
      setAddressFound(false);
      setHasConfirmedEstimate(false);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
        const data = await response.json();
        
        if (data.erro) {
          setCepError("CEP não encontrado. Confira os números e tente novamente.");
          setAddressFound(false);
        } else {
          setCustomer((prev) => ({
            ...prev,
            address: data.logradouro || "",
            neighborhood: data.bairro || "",
            city: data.localidade || "",
            state: data.uf || "",
          }));
          setAddressFound(true);
          setFormErrors((prev) => ({
            ...prev,
            cep: "",
            address: "",
            neighborhood: "",
          }));
          
          // Rolar automaticamente para o campo número no celular ao buscar o CEP
          setTimeout(() => {
            numberInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            numberInputRef.current?.focus();
          }, 450);
        }
      } catch (err) {
        setCepError("Erro ao buscar o CEP. Digite os dados manualmente ou tente de novo.");
        setAddressFound(false);
      } finally {
        setCepLoading(false);
      }
    } else {
      setAddressFound(false);
      setHasConfirmedEstimate(false);
    }
  };

  // Pricing math
  const calculateItemBasePrice = (item: CartItem) => {
    if (item.is_half_and_half && item.half_flavor_1 && item.half_flavor_2) {
      return Math.max(item.half_flavor_1.price, item.half_flavor_2.price);
    }
    return item.product.price;
  };

  const subtotal = cartItems.reduce((acc, item) => {
    const base = item.appliedPrice !== undefined ? item.appliedPrice : calculateItemBasePrice(item);
    const border = item.selected_border ? item.selected_border.price : 0;
    const additionals = (item.selected_additionals || []).reduce((sum, add) => sum + add.price, 0);
    return acc + (base + border + additionals) * item.quantity;
  }, 0);

  // Buy any 2 pizzas, get free delivery and a 2-liter Arctic Guaraná
  const pizzaQty = cartItems.reduce((sum, item) => item.product.is_pizza ? sum + item.quantity : sum, 0);
  const isEligibleForFreeDelivery = pizzaQty >= 2;
  const deliveryFee = isEligibleForFreeDelivery ? 0 : configs.delivery_fee;
  const total = subtotal + deliveryFee;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const validateAddressStep = () => {
    if (halfPizzaInProgress) {
      alert(`Você tem uma pizza meio a meio incompleta (1ª Metade: ${halfPizzaInProgress.name}). Para finalizar o pedido, conclua a seleção da segunda metade no cardápio ou cancele a metade atual.`);
      return false;
    }

    const errors: Record<string, string> = {};
    if (!customer.cep || customer.cep.replace(/\D/g, "").length !== 8) {
      errors.cep = "Digite um CEP válido completo (8 números)";
    }
    if (!customer.address.trim()) {
      errors.address = "Endereço é obrigatório";
    }
    if (!customer.number.trim()) {
      errors.number = "Digite o número do endereço para continuar.";
    }
    if (!customer.neighborhood.trim()) {
      errors.neighborhood = "Bairro é obrigatório";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      if (errors.number) {
        setTimeout(() => {
          numberInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          numberInputRef.current?.focus();
        }, 150);
      }
      return false;
    }

    setFormErrors({});
    return true;
  };

  const validateCustomerStep = () => {
    const errors: Record<string, string> = {};
    if (!customer.name.trim()) errors.name = "Nome completo é obrigatório";
    if (!customer.phone.trim()) {
      errors.phone = "Telefone celular é obrigatório";
    } else {
      const cleaned = customer.phone.replace(/\D/g, "");
      if (cleaned.length < 10) {
        errors.phone = "Por favor, digite um telefone celular válido (DDD + número)";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return false;
    }

    setFormErrors({});
    localStorage.setItem("pizzaria_customer_details", JSON.stringify(customer));
    return true;
  };

  const handleAdvanceToStep2 = () => {
    if (cartItems.length === 0) return;
    setCurrentStep(2);
  };

  const handleAdvanceToStep3 = () => {
    if (validateAddressStep()) {
      setCurrentStep(3);
    }
  };

  const handleAdvanceToStep4 = () => {
    if (validateCustomerStep()) {
      setCurrentStep(4);
      trackCompleteRegistration();
    }
  };

  // Final Order Submit Actions
  const handleFinalOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Verify critical items are still present
    if (!validateAddressStep()) {
      setCurrentStep(2);
      return;
    }
    if (!validateCustomerStep()) {
      setCurrentStep(3);
      return;
    }

    // Formulate Pizza Items list message
    const itemsLines = cartItems.map((item) => {
      let line = "";
      if (item.is_half_and_half && item.half_flavor_1 && item.half_flavor_2) {
        line = `• ${item.quantity}x Pizza Meio a Meio - 8 Pedaços\n  1/2 ${item.half_flavor_1.name}\n  1/2 ${item.half_flavor_2.name}`;
      } else {
        line = `• ${item.quantity}x ${item.product.name}`;
      }
      
      const extras: string[] = [];
      if (item.selected_border && item.selected_border.price > 0) {
        extras.push(`Borda: ${item.selected_border.name}`);
      }
      if (item.selected_additionals && item.selected_additionals.length > 0) {
        const adNames = item.selected_additionals.map((a) => a.name).join(", ");
        extras.push(`Extras: ${adNames}`);
      }

      if (extras.length > 0) {
        line += ` (${extras.join(" | ")})`;
      }

      const basePrice = item.appliedPrice !== undefined ? item.appliedPrice : calculateItemBasePrice(item);
      const unitCost = basePrice + 
        (item.selected_border ? item.selected_border.price : 0) + 
        (item.selected_additionals || []).reduce((s, a) => s + a.price, 0);

      const itemPrice = unitCost * item.quantity;
      
      line += ` - R$ ${itemPrice.toFixed(2)}`;

      if (item.observation && item.observation.trim()) {
        line += `\n   * Obs: "${item.observation.trim()}"`;
      }
      return line;
    }).join("\n");

    const allObs = cartItems
      .map((item) => item.observation.trim())
      .filter(Boolean)
      .join("; ");

    const pizzaQtyForPromo = cartItems.reduce((sum, item) => item.product.is_pizza ? sum + item.quantity : sum, 0);
    const hasFreeGift = pizzaQtyForPromo >= 2;
    const finalItemsList = hasFreeGift 
      ? `${itemsLines}\n🎁 *BRINDE GRÁTIS: 1x Guaraná Antarctica 2L*`
      : itemsLines;

    // Setup custom styled WhatsApp message layout precisely matching prompt request
    const textMessage = `NOVO PEDIDO
Preciso de entrega de Pizza!

Cliente:
${customer.name.trim()}

Telefone:
${customer.phone.trim()}

Entrega:
CEP: ${customer.cep || ""}
Endereço: ${customer.address.trim()}, ${customer.number.trim()}
Bairro: ${customer.neighborhood.trim()}
Cidade: ${customer.city || ""} - ${customer.state || ""}
Complemento: ${customer.complement ? customer.complement.trim() : "Não informado"}
Referência: ${customer.reference ? customer.reference.trim() : "Sem referência"}

Tempo estimado informado:
Até 30 minutos

Itens:
${finalItemsList}

Subtotal:
R$ ${subtotal.toFixed(2)}

Taxa de entrega:
${hasFreeGift ? "GRÁTIS (Cortesia Compra 2 Pizzas)" : `R$ ${deliveryFee.toFixed(2)}`}

Total:
R$ ${total.toFixed(2)}

Pagamento:
PIX

Observações:
${allObs || "Sem observações gerais."}`;

    // Disparar o evento Lead somente no botão para o WhatsApp
    trackLeadEvent({
      orderId: `PED-${Date.now().toString().slice(-6)}`,
      total: total,
      paymentMethod: "PIX",
      itemsCount: cartItems.reduce((acc, i) => acc + i.quantity, 0)
    });

    const currentOrder: Order = {
      customer: customer,
      items: cartItems,
      subtotal: subtotal,
      delivery_fee: deliveryFee,
      total: total,
      payment_method: "PIX",
    };

    // Save final order structure into localStorage for Purchase tracking on /redirecionando
    localStorage.setItem("last_placed_order", JSON.stringify(currentOrder));

    // Fire the Meta Pixel Lead tracker
    trackLead(currentOrder);

    // Cleaning WhatsApp Target phone digits from configs
    let cleanedPhone = configs.whatsapp.replace(/\D/g, "");
    if (cleanedPhone.length > 0 && !cleanedPhone.startsWith("55")) {
      cleanedPhone = "55" + cleanedPhone;
    }

    // Save fields into local storage so redirect screen can load those
    localStorage.setItem("whatsapp_redirect_phone", cleanedPhone);
    localStorage.setItem("whatsapp_redirect_text", textMessage);

    // Push state and trigger navigation to /redirecionando
    window.history.pushState({}, "", "/redirecionando");
    window.dispatchEvent(new Event("popstate"));
  };

  return (
    <div className="fixed inset-0 z-55 overflow-hidden bg-black/75 backdrop-blur-xs flex justify-end">
      {/* Drawer slide panel */}
      <div className="w-full max-w-md bg-[#111111] h-full shadow-2xl flex flex-col border-l border-white/10 animate-in slide-in-from-right duration-250">
        
        {/* Header bar */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#1A1A1A] glass">
          <div className="flex items-center space-x-2.5">
            <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="font-serif font-black text-lg text-white uppercase tracking-wide">Meu Pedido</h3>
            <span className="bg-[#8B0000]/40 text-[#D4AF37] font-mono text-xs font-bold px-2 py-0.5 rounded-full border border-[#D4AF37]/20">
              {cartItems.reduce((acc, item) => acc + item.quantity, 0)} itens
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer"
            title="Fechar carrinho"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Main Area */}
        <div className="flex-grow overflow-y-auto p-4 space-y-5">
          
          {/* SECURITY WARNING INCOMPLETE METADE BANNER */}
          {halfPizzaInProgress && (
            <div className="p-4 bg-amber-950/40 border-2 border-dashed border-[#D4AF37]/45 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-grow">
                <span className="text-xs font-bold text-[#D4AF37] block font-serif">Pizza Incompleta em Aberto</span>
                <p className="text-[11px] text-gray-300 mt-1 leading-relaxed font-light">
                  Você iniciou uma pizza Meio a Meio sabor <strong>{halfPizzaInProgress.name}</strong>.
                  Para poder finalizar o pedido, acesse o cardápio e adicione a segunda metade.
                </p>
                {onCancelHalfPizza && (
                  <button
                    onClick={onCancelHalfPizza}
                    className="mt-2.5 px-3 py-1 bg-[#8B0000] hover:bg-neutral-900 border border-red-900/60 text-white font-extrabold text-[10px] tracking-wide uppercase rounded-full cursor-pointer transition-colors"
                  >
                    Cancelar Meio a Meio
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Cart Empty State */}
          {cartItems.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center justify-center text-gray-500">
              <ShoppingBag className="w-12 h-12 text-gray-700 stroke-1 mb-3 animate-pulse" />
              <p className="font-serif font-semibold text-gray-400">Seu carrinho está vazio</p>
              <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Navegue pelo cardápio e adicione nossas deliciosas pizzas artesanais.</p>
            </div>
          ) : (
            <>
              {/* Etapa Wizard Indicator */}
              <div className="bg-black/25 p-1 rounded-xl border border-white/5 flex items-center justify-between text-center text-[10px] md:text-[11px] font-mono gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={`flex-1 py-1.5 rounded-lg transition-all text-center leading-none ${
                    currentStep === 1
                      ? "bg-[#8B0505]/30 text-[#D4AF37] font-bold border border-[#D4AF37]/20"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  1. Itens
                </button>
                <span className="text-zinc-700 font-light select-none">→</span>
                <button
                  type="button"
                  onClick={() => currentStep > 2 ? setCurrentStep(2) : undefined}
                  disabled={currentStep < 2}
                  className={`flex-1 py-1.5 rounded-lg transition-all text-center leading-none ${
                    currentStep === 2
                      ? "bg-[#8B0505]/30 text-[#D4AF37] font-bold border border-[#D4AF37]/20"
                      : currentStep > 2
                      ? "text-zinc-350 hover:text-white"
                      : "text-zinc-600 cursor-not-allowed"
                  }`}
                >
                  2. Entrega
                </button>
                <span className="text-zinc-700 font-light select-none">→</span>
                <button
                  type="button"
                  onClick={() => currentStep > 3 ? setCurrentStep(3) : undefined}
                  disabled={currentStep < 3}
                  className={`flex-1 py-1.5 rounded-lg transition-all text-center leading-none ${
                    currentStep === 3
                      ? "bg-[#8B0505]/30 text-[#D4AF37] font-bold border border-[#D4AF37]/20"
                      : currentStep > 3
                      ? "text-zinc-350 hover:text-white"
                      : "text-zinc-550 cursor-not-allowed"
                  }`}
                >
                  3. Dados
                </button>
                <span className="text-zinc-700 font-light select-none">→</span>
                <button
                  type="button"
                  disabled={currentStep < 4}
                  className={`flex-1 py-1.5 rounded-lg transition-all text-center leading-none ${
                    currentStep === 4
                      ? "bg-[#8B0505]/30 text-[#D4AF37] font-bold border border-[#D4AF37]/20"
                      : "text-zinc-650 cursor-not-allowed"
                  }`}
                >
                  4. Enviar
                </button>
              </div>

              {/* STEP 1: INTERACTIVE CART EDITING */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="border-b border-white/5 pb-2">
                    <h4 className="text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-widest block">
                      Etapa 1: Editar Carrinho
                    </h4>
                  </div>

                  {/* Banner de Incentivo ou Glória Promocional */}
                  {cartItems.length > 0 && (
                    <div className="mb-4">
                      {isEligibleForFreeDelivery ? (
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/45 to-zinc-900 border border-emerald-500/35 p-3.5 flex items-start space-x-3.5 shadow-md animate-bounce" style={{ animationDuration: "3.5s" }}>
                          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
                          
                          <div className="p-2 bg-[#105F30] border border-[#1FA055] text-gold-400 rounded-xl shrink-0 text-sm">
                            ★
                          </div>
                          <div className="flex-grow space-y-1 text-left min-w-0">
                            <h5 className="font-sans font-black text-xs text-white leading-tight">Sua Entrega e o Guaraná 2L são GRÁTIS!</h5>
                            <p className="text-[10px] text-gray-300 leading-normal">
                              Parabéns! Você adicionou <strong className="text-white">{pizzaQty} pizzas</strong> ao seu carrinho. Já garantimos de brinde o seu <strong className="text-green-400">Guaraná Antarctica 2L</strong> e a taxa de entrega grátis!
                            </p>
                          </div>
                        </div>
                      ) : (
                        pizzaQty === 1 && (
                          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/15 to-zinc-900 border border-[#D4AF37]/35 p-3.5 flex items-start space-x-3.5 shadow-sm">
                            <div className="p-2 bg-[#8B0000] text-[#D4AF37] rounded-xl shrink-0 font-bold text-xs leading-none flex items-center justify-center w-7.5 h-7.5">
                              💡
                            </div>
                            <div className="flex-grow space-y-1 text-left min-w-0">
                              <h5 className="font-sans font-bold text-xs text-[#D4AF37] leading-tight flex items-center justify-between">
                                <span>Ganhe Brinde + Taxa Grátis!</span>
                                <span className="text-[9px] font-mono select-none px-2 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 font-bold">Falta 1</span>
                              </h5>
                              <p className="text-[10px] text-gray-400 leading-normal">
                                Adicione mais <strong className="text-white">1 pizza</strong> para ganhar inteiramente grátis um <strong className="text-green-400">Guaraná Antarctica 2L</strong> e <strong className="text-[#D4AF37]">Taxa de Entrega ZERO</strong>!
                              </p>
                              {/* Barra de progresso */}
                              <div className="w-full bg-black/45 rounded-full h-1.5 mt-2 overflow-hidden border border-zinc-800">
                                <div className="bg-gradient-to-r from-[#D4AF37] to-amber-500 h-1.5 rounded-full" style={{ width: "50%" }}></div>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div className="space-y-3.5">
                    {cartItems.map((item) => {
                      const baseItemPrice = calculateItemBasePrice(item);
                      const borderPrice = item.selected_border ? item.selected_border.price : 0;
                      const additionalsPrice = (item.selected_additionals || []).reduce((sum, add) => sum + add.price, 0);
                      const itemTotalCombined = (baseItemPrice + borderPrice + additionalsPrice) * item.quantity;

                      return (
                        <div key={item.id} className="p-3.5 bg-zinc-900/40 rounded-2xl border border-white/5 flex items-start gap-3.5">
                          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                            <OptimizedImage
                              src={item.product.photo}
                              alt={item.product.name}
                              categoryId={item.product.category_id}
                              isPizza={item.product.is_pizza}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          <div className="flex-grow min-w-0">
                            {item.is_half_and_half && item.half_flavor_1 && item.half_flavor_2 ? (
                              <>
                                <h5 className="font-bold text-white text-xs leading-tight">Pizza Meio a Meio - 8 Peds</h5>
                                <p className="text-[10px] text-zinc-400 mt-0.5 font-sans">1/2 {item.half_flavor_1.name}</p>
                                <p className="text-[10px] text-zinc-400 font-sans">1/2 {item.half_flavor_2.name}</p>
                              </>
                            ) : (
                              <h5 className="font-bold text-white text-xs leading-tight font-serif">{item.product.name}</h5>
                            )}
                            
                            {/* Selected extras */}
                            {item.selected_border && item.selected_border.price > 0 && (
                              <p className="text-[9px] text-[#D4AF37] mt-1 font-medium">
                                border: {item.selected_border.name} (+ R$ {item.selected_border.price.toFixed(2)})
                              </p>
                            )}

                            {item.selected_additionals && item.selected_additionals.length > 0 && (
                              <p className="text-[9px] text-zinc-400 mt-0.5 font-light">
                                adicionais: {item.selected_additionals.map((a) => a.name).join(", ")}
                              </p>
                            )}

                            {item.observation && item.observation.trim() && (
                              <p className="text-[9px] text-zinc-500 italic mt-1 font-mono break-words leading-tight bg-black/20 p-1.5 rounded-lg border border-white/5">
                                Obs: "{item.observation.trim()}"
                              </p>
                            )}

                            {/* Quantity buttons and remove action */}
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center space-x-2.5 bg-black/35 rounded-lg p-1 border border-white/5">
                                <button
                                  type="button"
                                  onClick={() => onUpdateQty(item.id, -1)}
                                  className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                                  title="Diminuir"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="font-mono font-bold text-xs px-1 text-[#D4AF37]">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateQty(item.id, 1)}
                                  className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                                  title="Aumentar"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center space-x-2.5">
                                <span className="font-mono text-xs font-bold text-[#D4AF37]">
                                  {formatCurrency(itemTotalCombined)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onRemoveItem(item.id)}
                                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-500 hover:bg-red-950/20 active:scale-95 transition-all cursor-pointer"
                                  title="Remover pizza"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: CEP E ENDEREÇO */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="border-b border-white/5 pb-2 flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-widest block">
                      Etapa 2: Endereço de Entrega
                    </h4>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-[10px] text-zinc-400 hover:text-white underline font-mono cursor-pointer"
                    >
                      Voltar ao Carrinho
                    </button>
                  </div>

                  {/* CEP Input first */}
                  <div className="p-4 bg-black/35 rounded-2xl border border-white/5 space-y-4">
                    <div>
                      <label className="text-xs text-[#D4AF37] block ml-1 mb-1.5 font-bold font-mono">Preencha o CEP *</label>
                      <input
                        type="text"
                        name="cep"
                        value={customer.cep}
                        onChange={handleCepChange}
                        placeholder="00000-000"
                        className={`w-full p-3 bg-[#131316] border rounded-xl text-sm text-white focus:outline-none focus:border-[#D4AF37] font-mono ${
                          formErrors.cep || cepError ? "border-rose-950" : "border-white/5"
                        }`}
                      />
                      {cepLoading && (
                        <span className="text-[10px] text-[#D4AF37] mt-1 block ml-1 animate-pulse">
                          Buscando endereço automaticamente...
                        </span>
                      )}
                      {cepError && (
                        <span className="text-[10px] text-red-500 mt-1 block ml-1 font-semibold">
                          {cepError}
                        </span>
                      )}
                      {formErrors.cep && !cepError && (
                        <span className="text-[10px] text-red-500 mt-1 block ml-1">
                          {formErrors.cep}
                        </span>
                      )}
                    </div>

                    {/* Auto-filled details */}
                    {(addressFound || customer.address) && (
                      <div className="space-y-3.5 animate-in fade-in duration-300">
                        {/* Rua */}
                        <div>
                          <label className="text-xs text-gray-400 block ml-1 mb-1 font-medium font-mono">Rua / Logradouro *</label>
                          <input
                            type="text"
                            name="address"
                            value={customer.address}
                            onChange={handleInputChange}
                            placeholder="Nome da rua"
                            className={`w-full p-2.5 bg-[#17171B] border rounded-lg text-xs text-white focus:outline-none focus:border-[#D4AF37] ${
                              formErrors.address ? "border-rose-950" : "border-white/5"
                            }`}
                          />
                          {formErrors.address && <span className="text-[10px] text-red-500 mt-1 block ml-1">{formErrors.address}</span>}
                        </div>

                        {/* Bairro */}
                        <div>
                          <label className="text-xs text-gray-400 block ml-1 mb-1 font-medium font-mono">Bairro *</label>
                          <input
                            type="text"
                            name="neighborhood"
                            value={customer.neighborhood}
                            onChange={handleInputChange}
                            placeholder="Bairro"
                            className={`w-full p-2.5 bg-[#17171B] border rounded-lg text-xs text-white focus:outline-none focus:border-[#D4AF37] ${
                              formErrors.neighborhood ? "border-rose-950" : "border-white/5"
                            }`}
                          />
                          {formErrors.neighborhood && <span className="text-[10px] text-red-500 mt-1 block ml-1">{formErrors.neighborhood}</span>}
                        </div>

                        {/* Cidade / Estado */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="text-xs text-gray-500 block ml-1 mb-1 font-mono">Cidade</label>
                            <input
                              type="text"
                              value={customer.city || ""}
                              readOnly
                              disabled
                              className="w-full p-2 bg-[#101012] border border-white/5 rounded-lg text-xs text-gray-400 cursor-not-allowed font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[#D4AF37]/50 block ml-1 mb-1 text-[10px] font-mono text-center uppercase tracking-wider">Estado</label>
                            <input
                              type="text"
                              value={customer.state || ""}
                              readOnly
                              disabled
                              className="w-full p-2 bg-[#101012] border border-white/5 rounded-lg text-xs text-gray-400 text-center cursor-not-allowed font-mono"
                            />
                          </div>
                        </div>

                        {/* HIGH-CONTRAST BIG PROMINENT NUMBER FIELD AS REQUESTED IN REQ 4 */}
                        <div className="p-4 bg-[#8B0000]/10 border-2 border-[#D4AF37]/50 rounded-2xl relative">
                          <label className="text-xs text-[#D4AF37] block mb-1.5 font-black uppercase tracking-wider font-mono">
                            Número da casa ou estabelecimento *
                          </label>
                          <input
                            ref={numberInputRef}
                            type="text"
                            name="number"
                            value={customer.number}
                            onChange={handleInputChange}
                            placeholder="Digite o número do endereço *"
                            className={`w-full p-3 bg-[#1C1C22] border-2 rounded-xl text-base font-black text-white placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37] ${
                              formErrors.number ? "border-red-600 animate-pulse" : "border-white/10"
                            }`}
                          />
                          {formErrors.number && (
                            <span className="text-xs text-red-400 font-extrabold mt-2 block animate-bounce">
                              ⚠️ {formErrors.number}
                            </span>
                          )}
                        </div>

                        {/* Complemento */}
                        <div>
                          <label className="text-xs text-gray-400 block ml-1 mb-1 font-medium font-mono">Complemento, opcional</label>
                          <input
                            type="text"
                            name="complement"
                            value={customer.complement}
                            onChange={handleInputChange}
                            placeholder="Ex: Apto 102, Bloco C"
                            className="w-full p-2.5 bg-[#17171B] border border-white/5 rounded-lg text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                          />
                        </div>

                        {/* Referencia Opcional */}
                        <div>
                          <label className="text-xs text-gray-400 block ml-1 mb-1 font-medium font-mono">Ponto de referência, opcional</label>
                          <input
                            type="text"
                            name="reference"
                            value={customer.reference || ""}
                            onChange={handleInputChange}
                            placeholder="Ex: Próximo à padaria, portão vermelho"
                            className="w-full p-2.5 bg-[#17171B] border border-white/5 rounded-lg text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                          />
                        </div>

                        {/* Inline Continuation Trigger Button */}
                        <div className="pt-2 md:hidden">
                          <button
                            type="button"
                            onClick={handleAdvanceToStep4} // will advance to the next step
                            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-[#D4AF37] to-[#8B0000] hover:brightness-110 active:scale-95 text-white font-extrabold text-xs py-4.5 rounded-xl border border-white/5 shadow-2xl transition-all cursor-pointer font-mono tracking-widest uppercase"
                          >
                            <span>Continuar</span>
                            <span>→</span>
                          </button>
                        </div>

                        {/* UI Indicators to scroll down on mobile */}
                        <div className="text-center py-1.5 animate-pulse md:hidden">
                          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                            ↓↓ Continue preenchendo abaixo ↓↓
                          </span>
                        </div>

                        {/* ESTIMATIVE PANEL */}
                        <div className="p-4 bg-[#8B0000]/10 border border-[#D4AF37]/35 rounded-2xl space-y-2 text-center">
                          <p className="text-xs text-white font-medium">
                            Tempo estimado de entrega para este endereço:
                          </p>
                          <p className="text-lg font-serif font-black text-[#D4AF37] uppercase tracking-wide">
                            Até 30 minutos.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: DADOS DO CLIENTE */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="border-b border-white/5 pb-2 flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-widest block">
                      Etapa 3: Seus Dados Pessoais
                    </h4>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-[10px] text-zinc-400 hover:text-white underline font-mono cursor-pointer"
                    >
                      Alterar endereço
                    </button>
                  </div>

                  {/* Nome */}
                  <div>
                    <label className="text-xs text-gray-400 block ml-1 mb-1.5 font-medium font-mono">Nome Completo *</label>
                    <input
                      type="text"
                      name="name"
                      value={customer.name}
                      onChange={handleInputChange}
                      placeholder="Ex: Carlos Silva"
                      className={`w-full p-3 bg-[#1A1A1A] border rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37] ${
                        formErrors.name ? "border-rose-950" : "border-white/5"
                      }`}
                    />
                    {formErrors.name && <span className="text-[10px] text-red-500 mt-1 block ml-1">{formErrors.name}</span>}
                  </div>

                  {/* Telefone */}
                  <div>
                    <label className="text-xs text-gray-400 block ml-1 mb-1.5 font-medium font-mono">Telefone Celular (WhatsApp) *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={customer.phone}
                      onChange={handleInputChange}
                      placeholder="Ex: (11) 99999-9999"
                      className={`w-full p-3 bg-[#1A1A1A] border rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37] ${
                        formErrors.phone ? "border-rose-950" : "border-white/5"
                      }`}
                    />
                    {formErrors.phone && <span className="text-[10px] text-red-500 mt-1 block ml-1">{formErrors.phone}</span>}
                  </div>
                </div>
              )}

              {/* STEP 4: RESUMO E PAGAMENTO */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="border-b border-white/5 pb-2 flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-widest block">
                      Etapa 4: Resumo, pagamento e envio
                    </h4>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="text-[10px] text-zinc-400 hover:text-white underline font-mono cursor-pointer"
                    >
                      Alterar meus dados
                    </button>
                  </div>

                  {/* Ficha Review Summary Card */}
                  <div className="p-4 bg-[#161619] rounded-2xl border border-white/5 space-y-2.5 text-xs">
                    <p className="font-bold border-b border-white/5 pb-1.5 uppercase font-mono text-[10px] tracking-widest text-[#D4AF37]">
                      Ficha do Pedido
                    </p>
                    <div className="grid grid-cols-2 gap-y-1.5 text-[11px] text-gray-300">
                      <div>
                        <span className="text-gray-500 font-mono">Nome:</span> <span className="font-medium text-white">{customer.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-mono">Telefone:</span> <span className="font-medium text-white">{customer.phone}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-mono">CEP:</span> <span className="font-medium text-white">{customer.cep}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-mono">Rua:</span> <span className="font-medium text-white">{customer.address}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-mono">Número:</span> <span className="font-medium text-white">{customer.number}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-mono">Bairro:</span> <span className="font-medium text-white">{customer.neighborhood}</span>
                      </div>
                      {customer.complement && (
                        <div className="col-span-2">
                          <span className="text-gray-500 font-mono">Comp:</span> <span className="font-medium text-white">{customer.complement}</span>
                        </div>
                      )}
                      {customer.reference && (
                        <div className="col-span-2">
                          <span className="text-gray-500 font-mono">Ref:</span> <span className="font-medium italic text-gray-300">"{customer.reference}"</span>
                        </div>
                      )}
                      <div className="col-span-2">
                        <span className="text-gray-500 font-mono">Tempo Estimado:</span> <span className="font-bold text-[#D4AF37]">Até 30 minutos</span>
                      </div>
                    </div>
                  </div>

                  {/* Selected items review lists */}
                  <div className="space-y-2.5">
                    <p className="text-xs font-bold text-gray-400 px-1 font-mono uppercase tracking-wider">
                      Itens selecionados ({cartItems.reduce((acc, i) => acc + i.quantity, 0)})
                    </p>

                    <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                      {cartItems.map((item) => {
                        const baseItemPrice = calculateItemBasePrice(item);
                        const itemBasePlusExtras = baseItemPrice +
                          (item.selected_border ? item.selected_border.price : 0) +
                          (item.selected_additionals || []).reduce((sum, add) => sum + add.price, 0);
                        
                        const itemTotalCombined = itemBasePlusExtras * item.quantity;

                        return (
                          <div key={item.id} className="p-3 bg-[#1A1A1D] rounded-xl border border-white/5 relative flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 mt-0.5">
                              <OptimizedImage
                                src={item.product.photo}
                                alt={item.product.name}
                                categoryId={item.product.category_id}
                                isPizza={item.product.is_pizza}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-grow text-xs text-gray-200">
                              {item.is_half_and_half && item.half_flavor_1 && item.half_flavor_2 ? (
                                <>
                                  <h5 className="font-bold text-white text-xs">Pizza Meio a Meio - 8 Pedaços x{item.quantity}</h5>
                                  <p className="text-[10px] text-gray-400">1/2 {item.half_flavor_1.name}</p>
                                  <p className="text-[10px] text-gray-400">1/2 {item.half_flavor_2.name}</p>
                                </>
                              ) : (
                                <h5 className="font-bold text-white text-xs">{item.product.name} x{item.quantity}</h5>
                              )}
                              
                              {/* Selected extras */}
                              {item.selected_border && item.selected_border.price > 0 && (
                                <p className="text-[10px] text-gray-400 mt-1">
                                  <strong className="text-[#D4AF37]">Borda:</strong> {item.selected_border.name} (+ R$ {item.selected_border.price.toFixed(2)})
                                </p>
                              )}

                              {item.selected_additionals && item.selected_additionals.length > 0 && (
                                <p className="text-[10px] text-gray-400 font-light">
                                  <strong className="text-[#D4AF37]">Adicionais:</strong> {item.selected_additionals.map((a) => a.name).join(", ")}
                                </p>
                              )}

                              {item.observation.trim() && (
                                <p className="text-[10px] text-gray-500 italic mt-1 font-mono">
                                  Obs: "{item.observation.trim()}"
                                </p>
                              )}
                            </div>
                            <div className="font-mono font-bold text-right text-gray-300">
                              {formatCurrency(itemTotalCombined)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment instruction card: PIX-ONLY as requested */}
                  <div className="p-4 bg-[#8B0000]/5 border border-[#D4AF37]/20 rounded-2xl space-y-3.5 text-center">
                    <span className="text-xs text-gray-400 uppercase font-mono tracking-widest block">
                      Forma de Pagamento
                    </span>
                    
                    <div className="inline-flex items-center space-x-2.5 bg-[#D4AF37]/10 px-4 py-2 border border-[#D4AF37]/35 rounded-full text-[#D4AF37] font-bold font-serif text-base tracking-wide uppercase">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                      <span>🔑 PIX</span>
                    </div>

                    <div className="space-y-2 max-w-xs mx-auto text-[11px] text-gray-300 leading-relaxed font-light">
                      <p>
                        A forma de pagamento aceita para este pedido é exclusivamente <strong>PIX</strong>.
                      </p>
                      <p className="text-[10px] text-gray-400">
                        O envio do pedido será feito no WhatsApp para nosso atendente, e você receberá as informações da chave PIX logo em seguida para concluir seu pagamento.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-black/45 rounded-2xl border border-white/5 text-[11px] text-gray-500 flex items-start gap-2.5 leading-relaxed font-mono">
                    <ShieldAlert className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                    <div>
                      <span>Ao enviar, nosso sistema integrará seus dados de entrega, itens e enviará tudo formatado para seu WhatsApp para processamento rápido de sua comanda.</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pricing review block & big submit buttons at base of slide-over */}
        {cartItems.length > 0 && (
          <div className="p-4 bg-[#141414] border-t border-white/5 space-y-3.5">
            <div className="space-y-2 font-light">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Taxa de Entrega</span>
                {isEligibleForFreeDelivery ? (
                  <span className="font-mono font-bold text-green-400 uppercase text-[10px] bg-green-950/40 border border-green-500/20 px-2 py-0.5 rounded-full">Grátis</span>
                ) : (
                  <span className="font-mono">{formatCurrency(deliveryFee)}</span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm text-white font-bold pt-1.5 border-t border-white/5">
                <span className="font-serif">Valor Total</span>
                <span className="font-mono text-[#D4AF37] text-base font-black">{formatCurrency(total)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-550 border-t border-white/5 pt-1.5">
                <span className="text-gray-500 font-mono font-medium uppercase tracking-wider">Forma de Pagamento:</span>
                <span className="font-bold text-[#D4AF37] bg-[#8B0000]/10 px-2 py-0.5 rounded border border-red-950">PIX</span>
              </div>
            </div>

            {/* ACTION TRIGGERS DEPENDING ON STEPS */}
            {halfPizzaInProgress ? (
              <div className="p-3 bg-amber-950/20 border border-[#D4AF37]/30 text-[#D4AF37] text-[11px] rounded-xl text-center leading-relaxed font-semibold">
                ⚠️ Finalização bloqueada! Escolha a 2ª metade da sua pizza no cardápio ou cancele para continuar.
              </div>
            ) : (
              <div>
                {currentStep === 1 && (
                  <button
                    onClick={handleAdvanceToStep2}
                    className="w-full flex items-center justify-center space-x-2 bg-[#8B0000] hover:brightness-110 active:scale-98 text-white font-bold py-3.5 rounded-full border border-red-700/40 shadow-lg cursor-pointer transition-all"
                  >
                    <span className="font-bold font-mono tracking-wider uppercase text-xs">Continuar para Entrega</span>
                    <span>→</span>
                  </button>
                )}

                {currentStep === 2 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="px-3.5 bg-transparent border border-white/5 hover:bg-white/5 text-xs text-gray-400 rounded-full font-mono cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleAdvanceToStep3}
                      className="flex-grow flex items-center justify-center space-x-2 bg-gradient-to-r from-[#D4AF37] to-[#8B0000] hover:brightness-110 active:scale-98 text-white font-bold py-3.5 rounded-full border border-red-700/40 shadow-lg cursor-pointer transition-all"
                    >
                      <span className="font-bold font-mono tracking-wider uppercase text-xs">Seguir para Dados</span>
                      <span>→</span>
                    </button>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="px-3.5 bg-transparent border border-white/5 hover:bg-white/5 text-xs text-[#D4AF37] rounded-full font-mono cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleAdvanceToStep4}
                      className="flex-grow flex items-center justify-center space-x-2 bg-gradient-to-r from-[#D4AF37] to-[#8B0000] hover:brightness-110 active:scale-98 text-white font-bold py-3.5 rounded-full border border-red-700/40 shadow-lg cursor-pointer transition-all"
                    >
                      <span className="font-bold font-mono tracking-wider uppercase text-xs">Ir para Pagamento</span>
                      <span>→</span>
                    </button>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-2">
                    <button
                      onClick={handleFinalOrderSubmit}
                      className="w-full flex items-center justify-center space-x-2.5 bg-[#25D366] hover:brightness-110 active:scale-98 text-white font-black text-sm py-3.5 rounded-full shadow-2xl transition-all cursor-pointer border border-[#1ebd59]"
                    >
                      <Send className="w-4 h-4 text-emerald-100" />
                      <span className="font-bold uppercase tracking-wide">Enviar Pedido para o WhatsApp</span>
                    </button>
                    
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="w-full text-center text-xs text-gray-500 hover:text-gray-300 py-1 underline font-mono cursor-pointer"
                    >
                      Revisar Dados do Cliente
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
