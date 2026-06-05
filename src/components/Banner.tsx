import React from "react";
import { ChevronDown, Flame } from "lucide-react";
import { Company } from "../types";

interface BannerProps {
  company: Company;
  onScrollToMenu: () => void;
}

export default function Banner({ company, onScrollToMenu }: BannerProps) {
  return (
    <section className="relative w-full h-[400px] md:h-[450px] flex items-center justify-start bg-[#0F0F0F] border-b border-white/5 overflow-hidden">
      {/* Background Image with Dark Overlays and Gradients */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1600&auto=format&fit=crop&q=80"
          alt="Forno a Lenha"
          className="w-full h-full object-cover opacity-20 scale-105"
        />
        {/* Gradients from the Elegant Dark specifications */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F0F0F] via-[#0F0F0F]/90 to-transparent z-10" />
      </div>

      {/* Main Banner Content */}
      <div className="relative z-20 max-w-2xl px-8 md:px-16 flex flex-col items-start text-left">
        {/* Flame Flame Accent Badge */}
        <div className="inline-flex items-center space-x-2 bg-[#8B0000] px-4 py-1.5 rounded-full border border-[#D4AF37]/30 shadow-lg text-[#D4AF37] font-bold text-xs uppercase tracking-widest mb-6">
          <Flame className="w-4 h-4 text-[#D4AF37]" />
          <span>Sabor Tradicional Real</span>
        </div>

        <h2 className="text-3xl md:text-5xl font-black italic mb-3 tracking-tighter text-white leading-tight">
          Pizzas Artesanais em <span className="gold-text">Forno a Lenha</span>
        </h2>

        <p className="text-sm md:text-base text-gray-450 leading-relaxed mb-6 font-light max-w-md">
          {company.banner_subtitle || "Massa artesanal, fermentação lenta por 48h, ingredientes selecionados e o sabor único do fogo."}
        </p>

        {/* CTA Button matching the design white-bold caps style */}
        <button
          onClick={onScrollToMenu}
          className="bg-white text-black hover:bg-white/95 text-xs font-bold px-6 py-3 rounded uppercase tracking-widest shadow-xl transition-all hover:scale-[1.01] active:scale-[0.98] duration-150 cursor-pointer"
          id="btn-banner-cta"
        >
          Ver Nosso Cardápio
        </button>
      </div>

      {/* Large Decorative Circle Ornament in Backdrop */}
      <div className="absolute right-[-60px] top-[-40px] w-96 h-96 opacity-25 pointer-events-none hidden md:block">
        <div className="w-full h-full rounded-full border-[20px] border-[#8B0000]/10 flex items-center justify-center">
          <div className="w-72 h-72 rounded-full border-[1.5px] border-[#D4AF37]/20 border-dashed" />
        </div>
      </div>
    </section>
  );
}
