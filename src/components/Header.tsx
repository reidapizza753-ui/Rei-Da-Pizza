import React from "react";
import { ShoppingBag, Clock, Shield } from "lucide-react";
import { Company, Configs } from "../types";

interface HeaderProps {
  company: Company;
  configs: Configs;
  isOpen: boolean;
  cartItemsCount: number;
  onOpenCart: () => void;
  onNavigateToAdmin: () => void;
}

export default function Header({
  company,
  configs,
  isOpen,
  cartItemsCount,
  onOpenCart,
  onNavigateToAdmin,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 glass border-b border-white/10 shadow-lg px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-3">
          {company.logo && company.logo.trim() !== "" ? (
            <div className="w-10 h-10 bg-[#8B0000] rounded-full flex items-center justify-center border border-[#D4AF37] overflow-hidden shrink-0">
              <img
                src={company.logo}
                alt={company.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback logo text style in case of error
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallbackSpan = document.createElement('span');
                    fallbackSpan.className = 'text-[#D4AF37] font-bold text-sm';
                    fallbackSpan.innerText = company.name ? company.name.substring(0, 2).toUpperCase() : 'PZ';
                    parent.appendChild(fallbackSpan);
                  }
                }}
              />
            </div>
          ) : null}
          <div>
            <h1 className="font-serif font-bold text-sm md:text-lg tracking-wide text-white uppercase flex items-center gap-1.5">
              {company.name}
            </h1>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="flex items-center text-[10px] md:text-xs text-gray-400">
                <Clock className="w-3 h-3 text-gold-500 mr-1" />
                Aberto até {configs.working_hours_end}
              </span>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-semibold ${
                  isOpen
                    ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                    : "bg-rose-950/60 text-rose-400 border border-rose-800/40"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isOpen ? "bg-green-500 animate-pulse" : "bg-rose-500"}`} />
                {isOpen ? "Aberto" : "Fechado"}
              </span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center space-x-2.5">
          {/* Admin shortcut */}
          <button
            onClick={onNavigateToAdmin}
            title="Painel Administrativo"
            className="p-2 text-gray-400 hover:text-gold-400 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
            id="btn-nav-admin"
          >
            <Shield className="w-5 h-5" />
          </button>

          {/* Cart Trigger */}
          <button
            onClick={onOpenCart}
            className="relative flex items-center space-x-2 bg-[#8B0000] hover:brightness-110 active:scale-95 text-white font-medium px-3.5 py-1.5 md:px-5 md:py-2 rounded-full border border-[#D4AF37]/30 hover:border-[#D4AF37] shadow-lg transition-all cursor-pointer"
            id="btn-header-cart"
          >
            <ShoppingBag className="w-4 h-4 text-gold-500" />
            <span className="text-xs md:text-sm font-bold">Meu Pedido</span>
            {cartItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold-500 text-black text-[10px] font-black animate-bounce shadow-md">
                {cartItemsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
