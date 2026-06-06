import React, { useState, useEffect } from "react";
import { X, Plus, Minus, Info, ClipboardList, Check } from "lucide-react";
import { Product, BorderOption, AdditionalOption, CartItem } from "../types";
import { DEFAULT_BORDERS, DEFAULT_ADDITIONALS } from "../db/initialData";
import OptimizedImage from "./OptimizedImage";

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (cartItem: Omit<CartItem, "id">) => void;
  halfPizzaInProgress: Product | null;
  onSelectFirstHalf: (product: Product) => void;
  appliedPromoPrice?: number;
}

export default function ProductModal({
  product,
  onClose,
  onAddToCart,
  halfPizzaInProgress,
  onSelectFirstHalf,
  appliedPromoPrice,
}: ProductModalProps) {
  if (!product) return null;

  const isPizzaEligibleForHalf =
    product.is_pizza && product.can_half_and_half !== false;

  // We have different modes:
  // - "choose_proportion" (if it's a pizza and firstHalf is not active, ask: Inteira or Meio a Meio)
  // - "inteira" (full custom for whole pizza)
  // - "meio_first_confirm" (when chosen first half they confirm they want it as the 1st half)
  // - "meio_second_confirm" (when halfPizzaInProgress is not null and clicking this pizza as the 2nd half)
  const [modalMode, setModalMode] = useState<
    "choose_proportion" | "inteira" | "meio_first_confirm" | "meio_second_confirm"
  >("inteira");

  // Local choices
  const [selectedBorder, setSelectedBorder] = useState<BorderOption>(DEFAULT_BORDERS[0]);
  const [selectedAdditionals, setSelectedAdditionals] = useState<AdditionalOption[]>([]);
  const [observation, setObservation] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Initialize and reset states when product changes
  useEffect(() => {
    setSelectedBorder(DEFAULT_BORDERS[0]);
    setSelectedAdditionals([]);
    setObservation("");
    setQuantity(1);

    if (halfPizzaInProgress) {
      setModalMode("meio_second_confirm");
    } else if (isPizzaEligibleForHalf) {
      setModalMode("choose_proportion");
    } else {
      setModalMode("inteira");
    }
  }, [product, halfPizzaInProgress, isPizzaEligibleForHalf]);

  // Handle Border Choice
  const handleBorderChange = (border: BorderOption) => {
    setSelectedBorder(border);
  };

  // Handle Additionals Checkbox toggling (only applicable to whole pizza)
  const handleAdditionalToggle = (option: AdditionalOption) => {
    const exists = selectedAdditionals.find((item) => item.name === option.name);
    if (exists) {
      setSelectedAdditionals(selectedAdditionals.filter((item) => item.name !== option.name));
    } else {
      setSelectedAdditionals([...selectedAdditionals, option]);
    }
  };

  // Pricing math
  const getBasePrice = () => {
    if (modalMode === "meio_second_confirm" && halfPizzaInProgress) {
      return Math.max(halfPizzaInProgress.price, product.price);
    }
    if (appliedPromoPrice !== undefined && appliedPromoPrice > 0) {
      return appliedPromoPrice;
    }
    return product.price;
  };

  const basePrice = getBasePrice();
  const borderExtraPrice = product.is_pizza ? selectedBorder.price : 0;
  const additionalsExtraPrice =
    modalMode === "inteira" && product.is_pizza
      ? selectedAdditionals.reduce((sum, item) => sum + item.price, 0)
      : 0;

  const itemUnitPrice = basePrice + borderExtraPrice + additionalsExtraPrice;
  const itemTotalPrice = itemUnitPrice * quantity;

  // Format currencies
  const formatValue = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  // Add item logic
  const handleActionClick = () => {
    if (modalMode === "choose_proportion") {
      // Must choose an option first
      return;
    }

    if (modalMode === "meio_first_confirm") {
      // First half selected!
      onSelectFirstHalf(product);
      onClose();
      return;
    }

    if (modalMode === "meio_second_confirm" && halfPizzaInProgress) {
      // Second half selected! Let's combine into a single CartItem
      onAddToCart({
        product: {
          ...product,
          name: "Pizza Meio a Meio - 8 Pedaços",
          price: Math.max(halfPizzaInProgress.price, product.price),
          description: `1/2 ${halfPizzaInProgress.name} | 1/2 ${product.name}`,
        },
        quantity: 1, // Pizza meio a meio sempre deve ser adicionada como 1 unidade
        selected_border: selectedBorder,
        selected_additionals: [], // No additionals for half-and-half as per spec
        observation: observation.trim(),
        is_half_and_half: true,
        half_flavor_1: halfPizzaInProgress,
        half_flavor_2: product,
      });
      onClose();
      return;
    }

    // Normal Whole item (or beverage/dessert/esfirra)
    onAddToCart({
      product: {
        ...product,
        // Ensure description matches whole state if pizza
        description: product.is_pizza ? "Pizza Inteira - 8 pedaços" : product.description,
      },
      quantity,
      selected_border: product.is_pizza ? selectedBorder : undefined,
      selected_additionals: product.is_pizza ? selectedAdditionals : [],
      observation: observation.trim(),
      appliedPrice: appliedPromoPrice !== undefined && appliedPromoPrice > 0 ? appliedPromoPrice : undefined,
    });
    onClose();
  };

  // Filter allowed borders and additionals
  const allowedBorders = DEFAULT_BORDERS.filter(
    (b) => product.borders_available.length === 0 || product.borders_available.includes(b.name)
  );

  const allowedAdditionals = DEFAULT_ADDITIONALS.filter(
    (add) => product.additionals_available.length === 0 || product.additionals_available.includes(add.name)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-[#1A1A1A] rounded-3xl border border-white/5 shadow-2xl shadow-black overflow-hidden max-h-[90vh] flex flex-col my-auto animate-in fade-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/80 hover:bg-zinc-900 border border-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          id="btn-close-modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Contents */}
        <div className="overflow-y-auto flex-grow">
          {/* Pizza Graphic Banner */}
          <div className="relative w-full h-[180px] md:h-[240px] bg-black border-b border-white/5">
            <OptimizedImage
              src={product.photo}
              alt={product.name}
              categoryId={product.category_id}
              isPizza={product.is_pizza}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] to-transparent" />

            {modalMode === "meio_second_confirm" && halfPizzaInProgress && (
              <span className="absolute bottom-4 left-6 px-3 py-1 bg-[#8B0000] border border-[#D4AF37]/45 font-mono text-[10px] font-bold text-[#D4AF37] tracking-widest uppercase rounded-full shadow-md">
                Combinando Metades
              </span>
            )}
          </div>

          <div className="p-6">
            {/* FIRST STATE: Choose Between Whole or Half-and-Half */}
            {modalMode === "choose_proportion" && (
              <div className="space-y-6">
                <div className="text-center sm:text-left">
                  <h3 className="font-serif font-black text-2xl text-white tracking-wide">
                    Como deseja sua pizza?
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Escolha se prefere uma pizza inteira de {product.name} ou prefere combinar sabores.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  {/* Option 1: Whole */}
                  <button
                    onClick={() => setModalMode("inteira")}
                    className="flex flex-col items-center sm:items-start text-center sm:text-left p-6 rounded-2xl bg-[#0F0F0F] hover:bg-[#141414] border border-white/5 hover:border-[#D4AF37]/35 transition-all group scale-100 hover:scale-[1.01] cursor-pointer"
                  >
                    <span className="w-10 h-10 rounded-full bg-[#8B0000]/10 border border-[#8B0000]/30 text-[#D4AF37] flex items-center justify-center font-bold text-sm mb-4">
                      1
                    </span>
                    <h4 className="font-serif font-bold text-base text-white group-hover:text-[#D4AF37] transition-colors">
                      Inteira
                    </h4>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed font-light">
                      Pizza Inteira - 8 pedaços, do sabor {product.name} ({formatValue(product.price)}).
                    </p>
                  </button>

                  {/* Option 2: Half-and-Half */}
                  <button
                    onClick={() => setModalMode("meio_first_confirm")}
                    className="flex flex-col items-center sm:items-start text-center sm:text-left p-6 rounded-2xl bg-[#0F0F0F] hover:bg-[#141414] border border-white/5 hover:border-[#D4AF37]/35 transition-all group scale-100 hover:scale-[1.01] cursor-pointer"
                  >
                    <span className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center font-bold text-sm mb-4">
                      ½
                    </span>
                    <h4 className="font-serif font-bold text-base text-white group-hover:text-[#D4AF37] transition-colors">
                      Meio a meio
                    </h4>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed font-light">
                      Combine a primeira metade sabor {product.name} com qualquer outro sabor no cardápio!
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* SECOND STATE: Confirm 1st Half Selection */}
            {modalMode === "meio_first_confirm" && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-serif font-black text-2xl text-white tracking-wide">
                    Sabor 1: {product.name}
                  </h3>
                  <div className="mt-1.5 flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-[#D4AF37]/10 text-[#D4AF37] font-mono text-[9px] font-bold tracking-widest uppercase">
                      Meio a meio
                    </span>
                    <span className="text-xs text-gray-400 font-semibold font-mono">
                      Primeira Metade Escolhida
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-2xl bg-[#0F0F0F] border border-white/5 leading-relaxed">
                  <p className="text-xs text-gray-300 leading-relaxed font-light">
                    Você está selecionando <strong>{product.name}</strong> como o primeiro sabor.
                    Depois de confirmar, o site mostrará uma mensagem clara orientando você a escolher o segundo sabor.
                  </p>
                  <p className="text-xs text-amber-500 font-medium mt-2">
                    * O preço da pizza meio a meio será determinado pelo maior preço entre as metades escolhidas.
                  </p>
                </div>
              </div>
            )}

            {/* THIRD STATE: Confirm 2nd Half Selection */}
            {modalMode === "meio_second_confirm" && halfPizzaInProgress && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-serif font-black text-2xl text-white tracking-wide">
                    Pizza Meio a Meio - 8 pedaços
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Excelente escolha! Vamos fechar a sua combinação de sabores.
                  </p>
                </div>

                {/* Flavor breakdown split cards */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-center">
                    <span className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-widest">
                      1ª Metade (50%)
                    </span>
                    <p className="font-serif font-bold text-sm text-[#D4AF37] mt-1">
                      {halfPizzaInProgress.name}
                    </p>
                    <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                      {formatValue(halfPizzaInProgress.price)}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-[#D4AF37]/20 text-center relative overflow-hidden">
                    <span className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-widest">
                      2ª Metade (50%)
                    </span>
                    <p className="font-serif font-bold text-sm text-[#D4AF37] mt-1 text-glow">
                      {product.name}
                    </p>
                    <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                      {formatValue(product.price)}
                    </span>
                  </div>
                </div>

                <div className="p-3 text-center rounded-xl bg-[#8B0000]/10 border border-[#8B0000]/30 text-xs text-gray-300 font-light font-mono">
                  Maior valor aplicado: <span className="font-black text-[#D4AF37]">{formatValue(Math.max(halfPizzaInProgress.price, product.price))}</span>
                </div>
              </div>
            )}

            {/* FOURTH STATE: Standard / Whole Pizza display */}
            {modalMode === "inteira" && (
              <div className="space-y-3">
                <div className="flex flex-col">
                  <h3 className="font-serif font-black text-2xl md:text-3xl text-white tracking-wide">
                    {product.name}
                  </h3>

                  {product.is_pizza && (
                    <div className="mt-1 flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-[#8B0000]/20 text-gold-300 font-mono text-[9px] font-bold tracking-widest uppercase border border-[#8B0000]/40">
                        Sabor Único
                      </span>
                      <span className="text-xs text-gray-400 font-semibold font-mono">
                        Pizza Inteira - 8 pedaços
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs md:text-sm text-gray-400 mt-2.5 leading-relaxed font-light">
                  {product.description}
                </p>

                {product.ingredients && (
                  <div className="mt-4.5 p-4.5 rounded-2xl bg-[#0F0F0F] border border-white/5 leading-relaxed flex items-start space-x-3">
                    <Info className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block font-mono">
                        Ingredientes do Recheio
                      </span>
                      <p className="text-xs text-gray-300 mt-1 leading-relaxed font-light">
                        {product.ingredients}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SHARED PIZZA EXTRAS (For 'inteira' and 'meio_second_confirm' modes) */}
            {product.is_pizza &&
              (modalMode === "inteira" || modalMode === "meio_second_confirm") && (
                <>
                  {/* Borda option re-calculation */}
                  {allowedBorders.length > 0 && (
                    <div className="mt-6 border-t border-white/5 pt-6">
                      <h4 className="font-serif font-bold text-sm md:text-base text-gray-150 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                        Escolha a Borda Recheada
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider font-mono">
                        Opção obrigatória para a pizza inteira
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3.5">
                        {allowedBorders.map((val) => {
                          const isBSelected = selectedBorder.name === val.name;
                          return (
                            <button
                              key={val.name}
                              onClick={() => handleBorderChange(val)}
                              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                                isBSelected
                                  ? "bg-[#8B0000]/25 border-[#D4AF37]/50 text-[#D4AF37]"
                                  : "bg-[#0F0F0F] border-white/5 text-gray-300 hover:border-white/10"
                              }`}
                            >
                              <span className="text-xs font-semibold">{val.name}</span>
                              <span className="text-xs font-mono font-bold text-[#D4AF37]">
                                {val.price > 0 ? `+ R$ ${val.price.toFixed(2)}` : "Grátis"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Additionals ONLY for single entire pizza */}
                  {modalMode === "inteira" && allowedAdditionals.length > 0 && (
                    <div className="mt-6 border-t border-white/5 pt-6">
                      <h4 className="font-serif font-bold text-sm md:text-base text-gray-150 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                        Adicionais Extras
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider font-mono">
                        Turbine sua pizza (opcional)
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3.5">
                        {allowedAdditionals.map((val) => {
                          const isChosen = !!selectedAdditionals.find((i) => i.name === val.name);
                          return (
                            <button
                              key={val.name}
                              onClick={() => handleAdditionalToggle(val)}
                              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                                isChosen
                                  ? "bg-[#D4AF37]/10 border-[#D4AF37]/45 text-[#D4AF37]"
                                  : "bg-[#0F0F0F] border-white/5 text-gray-300 hover:border-white/10"
                              }`}
                            >
                              <span className="text-xs font-semibold">{val.name}</span>
                              <span className="text-xs font-mono font-bold text-[#D4AF37]">
                                + R$ {val.price.toFixed(2)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

            {/* OBSERVATION NOTES (Shown for all actionable modes, whole & second half) */}
            {modalMode !== "choose_proportion" && (
              <div className="mt-6 border-t border-white/5 pt-6">
                <h4 className="font-serif font-bold text-sm md:text-base text-gray-100 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-[#D4AF37]" />
                  Alguma observação?
                </h4>
                <p className="text-xs text-gray-500 mt-0.5 font-light">
                  Exemplos: Sem cebola, Sem azeitona, Caprichar no queijo, Assar mais
                </p>
                <textarea
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  placeholder="Ex: sem cebola, bem assada, sem azeitona..."
                  rows={2}
                  maxLength={200}
                  className="w-full mt-3 p-3.5 bg-[#0F0F0F] border border-white/5 rounded-xl text-xs md:text-sm text-gray-100 focus:outline-none focus:border-[#D4AF37] placeholder-gray-600 transition-colors font-light"
                />
              </div>
            )}
          </div>
        </div>

        {/* Sticky Grand total checkout bar */}
        <div className="p-4 bg-[#141414] border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Back button or Cancel choice button */}
          {modalMode !== "choose_proportion" &&
            isPizzaEligibleForHalf &&
            !halfPizzaInProgress && (
              <button
                onClick={() => setModalMode("choose_proportion")}
                className="text-xs text-gray-450 hover:text-white underline cursor-pointer"
              >
                Voltar às opções de pizza
              </button>
            )}

          {/* Quantity picker control (for whole pizza or completed half-and-half) */}
          {modalMode !== "choose_proportion" && modalMode !== "meio_first_confirm" && modalMode !== "meio_second_confirm" && (
            <div className="flex items-center space-x-4 bg-black/60 px-4 py-2 rounded-full border border-white/5">
              <button
                onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                className="p-1 rounded-lg text-gray-400 hover:text-white cursor-pointer"
                title="Diminuir"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-mono text-base font-bold w-6 text-center text-white">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-1 rounded-lg text-gray-400 hover:text-white cursor-pointer"
                title="Aumentar"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Action Call to Action Button */}
          {modalMode === "choose_proportion" ? (
            <div className="text-xs text-gray-500 font-mono italic text-center w-full">
              Selecione "Inteira" ou "Meio a meio" para continuar.
            </div>
          ) : (
            <button
              onClick={handleActionClick}
              className="w-full sm:w-auto flex-grow sm:flex-grow-0 flex items-center justify-center space-x-3 bg-[#D4AF37] hover:brightness-105 hover:bg-gold-400 active:scale-95 text-black font-extrabold px-6 py-3.5 rounded-full border border-gold-600 shadow-lg cursor-pointer transition-transform"
              id="btn-add-item-to-bill"
            >
              <span>
                {modalMode === "meio_first_confirm"
                  ? "Definir como 1ª Metade"
                  : "Adicionar ao Pedido"}
              </span>
              {modalMode !== "meio_first_confirm" && (
                <span className="border-l border-black/20 pl-2.5 font-mono text-sm tracking-wide font-black">
                  {formatValue(itemTotalPrice)}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
