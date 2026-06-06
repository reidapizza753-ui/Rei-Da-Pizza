import React, { useEffect, useState } from "react";
import { Send, AlertCircle, RefreshCw, ShoppingBag } from "lucide-react";

export default function RedirectScreen() {
  const [phone, setPhone] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [timeElapsed, setTimeElapsed] = useState<number>(0);

  useEffect(() => {
    // Read the values stored during checkout
    const savedPhone = localStorage.getItem("whatsapp_redirect_phone");
    const savedText = localStorage.getItem("whatsapp_redirect_text");

    if (!savedPhone || !savedText) {
      setErrorMsg("Nenhum pedido recente encontrado para redirecionar. Volte ao cardápio e envie o seu pedido.");
      setLoading(false);
      return;
    }

    setPhone(savedPhone);
    setText(savedText);
    setLoading(true);

    const encodedText = encodeURIComponent(savedText);
    const appUrl = `whatsapp://send?phone=${savedPhone}&text=${encodedText}`;
    const webUrl = `https://wa.me/${savedPhone}?text=${encodedText}`;

    // Attempt direct deep link open immediately
    try {
      window.location.href = appUrl;
    } catch (e) {
      console.warn("Could not deep link directly:", e);
    }

    // Monitor time elapsed
    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    // Fallback redirect after 2 seconds
    const timeout = setTimeout(() => {
      window.location.href = webUrl;
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Intercept phone custom/browser back button gesture during WhatsApp redirection loading
  useEffect(() => {
    window.history.pushState({ isRedirectState: true }, "", window.location.pathname + window.location.hash);

    const handlePreventBack = () => {
      window.history.pushState({ isRedirectState: true }, "", window.location.pathname + window.location.hash);
    };

    window.addEventListener("popstate", handlePreventBack);
    return () => {
      window.removeEventListener("popstate", handlePreventBack);
    };
  }, []);

  const handleManualOpen = () => {
    if (!phone || !text) return;
    const encodedText = encodeURIComponent(text);
    const appUrl = `whatsapp://send?phone=${phone}&text=${encodedText}`;
    window.location.href = appUrl;
  };

  const handleFallbackOpen = () => {
    if (!phone || !text) return;
    const encodedText = encodeURIComponent(text);
    const webUrl = `https://wa.me/${phone}?text=${encodedText}`;
    window.open(webUrl, "_blank");
  };

  const handleBackToHome = () => {
    window.location.href = "/";
  };

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#0F0F11] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-[#16161A] border border-white/5 p-8 rounded-3xl shadow-2xl space-y-6">
          <div className="w-16 h-16 bg-red-950/40 border border-[#8B0000] rounded-full flex items-center justify-center mx-auto text-[#FF4444] animate-pulse">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="font-serif font-black text-xl text-white uppercase tracking-wide">Ops! Algo deu errado</h2>
          <p className="text-sm text-gray-400 leading-relaxed font-light">{errorMsg}</p>
          <button
            onClick={handleBackToHome}
            className="w-full bg-[#8B0000] hover:brightness-110 active:scale-95 text-white font-bold py-3 px-6 rounded-full border border-[#D4AF37]/20 transition-all cursor-pointer text-sm font-sans"
          >
            Voltar para o Cardápio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F11] text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#16161A] border border-white/5 p-8 rounded-3xl shadow-2xl text-center space-y-8 relative overflow-hidden">
        
        {/* Glow ambient accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#8B0000] rounded-full blur-3xl opacity-20" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#D4AF37] rounded-full blur-3xl opacity-20" />

        {/* Floating elements & loading spinner */}
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-tr from-[#8B0000] to-[#D4AF37] rounded-full flex items-center justify-center mx-auto shadow-2xl relative">
            <ShoppingBag className="w-10 h-10 text-white animate-bounce" />
            <div className="absolute inset-0 rounded-full border-4 border-dashed border-white/30 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
        </div>

        {/* Text Area */}
        <div className="space-y-3">
          <h2 className="font-serif font-black text-2xl text-white uppercase tracking-wide leading-tight">
            Estamos enviando seu pedido para o atendimento
          </h2>
          <p className="text-sm text-gray-300 font-light leading-relaxed">
            Aguarde alguns instantes. Você será redirecionado automaticamente para o WhatsApp para confirmar seu pedido.
          </p>
          
          <div className="inline-flex items-center space-x-2 bg-black/40 px-4 py-2 border border-white/5 rounded-full mt-4">
            <RefreshCw className="w-3.5 h-3.5 text-[#D4AF37] animate-spin" />
            <span className="text-xs text-red-400 font-bold tracking-wider font-mono uppercase bg-gradient-to-r from-[#D4AF37] to-red-400 bg-clip-text text-transparent">
              Não feche esta página
            </span>
          </div>
        </div>

        {/* Helper Action Buttons */}
        <div className="space-y-3.5 pt-4 border-t border-white/5">
          <button
            onClick={handleManualOpen}
            className="w-full flex items-center justify-center space-x-2.5 bg-green-600 hover:brightness-110 active:scale-98 text-white font-extrabold py-3.5 rounded-full border border-green-700/50 shadow-lg cursor-pointer transition-all text-sm uppercase font-mono tracking-wider"
          >
            <Send className="w-4 h-4 text-emerald-100" />
            <span>Abrir WhatsApp Agora</span>
          </button>

          <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
            Se o seu aplicativo não abrir em 2 segundos, o sistema usará o redirecionador alternativo de navegação.
          </p>

          <button
            onClick={handleFallbackOpen}
            className="text-xs text-gray-400 hover:text-[#D4AF37] underline transition-colors cursor-pointer block mx-auto py-1"
          >
            Problemas ao abrir o aplicativo? Clique aqui para abrir a versão web
          </button>
        </div>

        {/* Footer info decoration */}
        <div className="pt-2 text-[10px] text-gray-600 uppercase tracking-widest font-mono">
          Pizzaria & Esfirraria
        </div>

      </div>
    </div>
  );
}
