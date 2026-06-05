import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Product, CartItem } from "../types";
import OptimizedImage from "./OptimizedImage";

interface ProductCardProps {
  key?: string;
  product: Product;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (cartItem: Omit<CartItem, "id">) => void;
}

export default function ProductCard({ product, onSelectProduct, onAddToCart }: ProductCardProps) {
  const isEsfirra = product.category_id.includes("esfirra");
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");

  const formattedPrice = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(product.price * (isEsfirra ? quantity : 1));

  return (
    <div className="group pizza-card bg-[#1A1A1A] border border-white/5 hover:border-[#D4AF37]/30 rounded-2xl overflow-hidden shadow-md shadow-black/40 hover:shadow-xl hover:shadow-black/80 transition-all duration-300 flex flex-col h-full">
      {/* Product Image Panel */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0F0F0F] border-b border-white/5">
        <OptimizedImage
          src={product.photo}
          alt={product.name}
          categoryId={product.category_id}
          isPizza={product.is_pizza}
          className="group-hover:scale-[1.04] transition-transform duration-500"
        />
        {/* Spot Tag */}
        {product.is_pizza && (
          <span className="absolute top-2.5 right-2.5 px-2 bg-black/80 border border-[#D4AF37]/20 font-mono text-[9px] font-bold text-[#D4AF37] tracking-widest uppercase rounded">
            FORNO A LENHA
          </span>
        )}
      </div>

      {/* Product Content info */}
      <div className="p-4 flex flex-col flex-grow">
        {/* Name */}
        <h4 className="font-serif font-bold text-base md:text-lg text-white group-hover:text-[#D4AF37] transition-colors leading-snug">
          {product.name}
        </h4>

        {/* Small Size Spec if Pizza */}
        {product.is_pizza && (
          <span className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider font-semibold font-mono">
            Inteira - 8 Pedaços
          </span>
        )}

        {/* Description */}
        <p className="text-xs text-gray-400 mt-2 leading-relaxed line-clamp-2 md:line-clamp-3 font-light">
          {product.description}
        </p>

        {/* Esfirra Custom Fields */}
        {isEsfirra && (
          <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
            {/* Quantity Selector */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400 font-medium">Quantidade</span>
              <div className="flex items-center space-x-3 bg-black/60 px-3 py-1 rounded-full border border-white/5">
                <button
                  type="button"
                  onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                  className="p-1 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title="Diminuir"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-mono text-xs font-bold text-white w-4 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-1 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title="Aumentar"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Observation field */}
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block font-mono">
                Observação
              </label>
              <input
                type="text"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex. sem cebola, sem tomate..."
                maxLength={100}
                className="w-full bg-black/50 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-all font-light"
              />
            </div>
          </div>
        )}

        {/* Price & Add button wrapper */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
          <div>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold font-mono">
              {isEsfirra ? "Subtotal" : "A partir de"}
            </span>
            <p className="font-serif font-black text-[#D4AF37] text-base md:text-lg mt-0.5">
              {formattedPrice}
            </p>
          </div>

          <button
            onClick={() => {
              if (isEsfirra) {
                onAddToCart({
                  product,
                  quantity,
                  observation: observation.trim(),
                  selected_additionals: [],
                });
                setObservation("");
                setQuantity(1);
              } else {
                onSelectProduct(product);
              }
            }}
            className="flex items-center space-x-1 bg-[#8B0000] hover:brightness-110 text-white font-bold text-xs py-2 px-4 rounded-full border border-[#D4AF37]/20 hover:border-[#D4AF37]/60 shadow-md active:scale-95 transition-all cursor-pointer"
            id={`btn-add-product-${product.id}`}
          >
            <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Adicionar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
