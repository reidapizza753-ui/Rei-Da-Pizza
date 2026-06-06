import React from "react";
import { Flame, CookingPot, Leaf, Bike, Send } from "lucide-react";

export default function Highlights() {
  const items = [
    {
      icon: Flame,
      title: "Forno a Lenha",
      desc: "Assadas em alta temperatura garantindo bordas douradas e crocantes.",
      color: "from-amber-500/10 to-orange-600/10",
      iconColor: "text-orange-500",
      borderColor: "border-orange-500/20",
    },
    {
      icon: CookingPot,
      title: "Massa Artesanal",
      desc: "Fermentação lenta por 48h, leve para digerir e crocante por fora.",
      color: "from-yellow-500/10 to-gold-600/10",
      iconColor: "text-gold-400",
      borderColor: "border-gold-500/20",
    },
    {
      icon: Leaf,
      title: "Ingredientes Selecionados",
      desc: "Tomates italianos pelados, queijos especiais e ervas frescas de horta.",
      color: "from-emerald-500/10 to-green-600/10",
      iconColor: "text-emerald-400",
      borderColor: "border-emerald-500/20",
    },
    {
      icon: Bike,
      title: "Entrega Rápida",
      desc: "Pizzas transportadas em embalagem térmica para chegar bem fumegantes.",
      color: "from-sky-500/10 to-blue-600/10",
      iconColor: "text-sky-400",
      borderColor: "border-sky-500/20",
    },
    {
      icon: Send,
      title: "Pedido pelo WhatsApp",
      desc: "Sem complicação. Monte o combo completo e envie em um clique.",
      color: "from-green-500/10 to-emerald-600/10",
      iconColor: "text-green-400",
      borderColor: "border-green-500/20",
    },
  ];

  return (
    <section className="py-12 bg-[#0F0F0F] border-y border-white/5 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[#D4AF37] font-serif font-semibold text-xs tracking-widest uppercase">Nosso Diferencial</p>
          <h3 className="font-serif font-black italic text-2xl md:text-3.5xl text-white mt-1">
            Nossa Receita de <span className="gold-text">Sucesso</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#1A1A1A] border border-white/5 flex flex-col items-center text-center hover:scale-[1.02] hover:border-[#D4AF37]/30 transition-all duration-300"
              >
                <div className="p-3 rounded-full bg-black/60 border border-[#D4AF37]/15 text-[#D4AF37] mb-3.5">
                  <Icon className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <h4 className="font-serif font-bold text-sm text-gray-100 tracking-wide uppercase">
                  {item.title}
                </h4>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed font-light">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
