import React, { useState } from "react";
import {
  Lock,
  ArrowLeft,
  Settings,
  ListCollapse,
  Pizza,
  Database,
  Save,
  Plus,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Info,
  Upload,
  Sparkles
} from "lucide-react";
import { Company, Configs, Category, Product, FeaturedPromo } from "../types";
import { SUPABASE_SQL_SETUP, isSupabaseConfigured, uploadImage } from "../db/db";
import OptimizedImage from "./OptimizedImage";

// Helper function to robustly parse Brazilian currency inputs (e.g., "R$ 40,00", "40.00", "40,00", "40")
export function parseBrazilianCurrency(valStr: string): number {
  if (!valStr) return 0;
  let cleaned = valStr.trim();
  // Remove currency symbols, leading text, and keep only relevant numeric/dot/comma chars
  cleaned = cleaned.replace(/[^\d.,-]/g, "");
  
  if (cleaned.includes(".") && cleaned.includes(",")) {
    // If it has thousands separators (e.g., 1.250,50), remove the dot and parse comma
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    // If it has only comma (e.g., 40,00), convert to dot
    cleaned = cleaned.replace(",", ".");
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

interface AdminPanelProps {
  onBackToStore: () => void;
  company: Company;
  configs: Configs;
  categories: Category[];
  products: Product[];
  onSaveCompany: (c: Company) => Promise<void>;
  onSaveConfigs: (s: Configs) => Promise<void>;
  onSaveCategory: (cat: Category) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onSaveProduct: (p: Product) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onReorderCategories: (ordered: Category[]) => Promise<void>;
  featuredPromos: FeaturedPromo[];
  onSaveFeaturedPromos: (promos: FeaturedPromo[]) => void;
}

export default function AdminPanel({
  onBackToStore,
  company,
  configs,
  categories,
  products,
  onSaveCompany,
  onSaveConfigs,
  onSaveCategory,
  onDeleteCategory,
  onSaveProduct,
  onDeleteProduct,
  onReorderCategories,
  featuredPromos,
  onSaveFeaturedPromos,
}: AdminPanelProps) {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  // Tabs
  const [activeTab, setActiveTab] = useState<"empresa" | "categorias" | "produtos" | "destaques" | "supabase">("empresa");

  // General Notification feedback
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // States for Category Management
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCatName, setNewCatName] = useState("");

  // States for Product Editing Form/Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  // Loading flags for file upload
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingProductPhoto, setIsUploadingProductPhoto] = useState(false);

  // General Inputs
  const [inputCompany, setInputCompany] = useState<Company>({ ...company });
  const [inputConfigs, setInputConfigs] = useState<Configs>({ ...configs });

  // States for robust price handling & easy catalog search
  const [productSearch, setProductSearch] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [deliveryFeeInput, setDeliveryFeeInput] = useState(String(configs.delivery_fee));

  // Sync state when configs prop changes
  React.useEffect(() => {
    setInputCompany({ ...company });
    setInputConfigs({ ...configs });
    setDeliveryFeeInput(String(configs.delivery_fee));
  }, [company, configs]);

  // Local state for administering the 3 featured promo slots
  const [localPromos, setLocalPromos] = useState<FeaturedPromo[]>([]);

  // Sync state when featuredPromos prop changes
  React.useEffect(() => {
    if (featuredPromos) {
      setLocalPromos(featuredPromos);
    }
  }, [featuredPromos]);

  // Handle Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "117711" || passwordInput === "admin123" || passwordInput === "pizzaria123") {
      setIsAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Senha incorreta. Colega, use '117711'");
    }
  };

  // Trigger temporary feedback toast
  const triggerToast = (msg: string) => {
    setSaveStatus(msg);
    setTimeout(() => {
      setSaveStatus(null);
    }, 3000);
  };

  // Save Settings / Company Info
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const finalFee = parseBrazilianCurrency(deliveryFeeInput);
      
      const updatedConfigs = { ...inputConfigs, delivery_fee: finalFee };
      
      await onSaveCompany(inputCompany);
      await onSaveConfigs(updatedConfigs);
      setDeliveryFeeInput(finalFee === 0 ? "" : String(finalFee));
      triggerToast("Configurações gerais salvas com sucesso!");
    } catch (err: any) {
      console.error("Erro ao salvar configurações:", err);
      const errMsg = err?.message || String(err);
      alert(`Erro ao salvar no Supabase!\n\nDetalhes: ${errMsg}\n\nPor favor, execute o script SQL de configuração (disponível na aba "Supabase") para criar as tabelas necessárias.`);
      triggerToast("Erro ao tentar salvar configurações.");
    }
  };

  // Category Actions
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const orderNum = categories.length > 0 ? Math.max(...categories.map((c) => c.order)) + 1 : 1;
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        name: newCatName.trim(),
        active: true,
        order: orderNum,
      };
      await onSaveCategory(newCat);
      setNewCatName("");
      triggerToast("Categoria criada!");
    } catch (err: any) {
      console.error("Erro ao criar categoria:", err);
      alert(`Erro Supabase ao criar categoria: ${err.message || String(err)}\n\nCertifique-se de executar o script SQL no painel do Supabase.`);
    }
  };

  const handleToggleCategoryActive = async (cat: Category) => {
    try {
      const updated = { ...cat, active: !cat.active };
      await onSaveCategory(updated);
      triggerToast(`Categoria ${updated.active ? "ativada" : "desativada"}!`);
    } catch (err: any) {
      console.error("Erro ao salvar categoria:", err);
      alert(`Erro Supabase: ${err.message || String(err)}`);
    }
  };

  const handleDeleteCategoryClick = async (id: string) => {
    const hasProducts = products.some((p) => p.category_id === id);
    if (hasProducts) {
      alert("Não é possível fover esta categoria pois ela contém produtos cadastrados.");
      return;
    }
    if (confirm("Deseja realmente remover esta categoria?")) {
      try {
        await onDeleteCategory(id);
        triggerToast("Categoria removida!");
      } catch (err: any) {
        console.error("Erro ao deletar categoria:", err);
        alert(`Erro Supabase ao deletar categoria: ${err.message || String(err)}`);
      }
    }
  };

  const handleMoveCategory = async (idx: number, direction: "up" | "down") => {
    const updatedList = [...categories].sort((a, b) => a.order - b.order);
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= updatedList.length) return;

    // Swap positions
    const temp = updatedList[idx];
    updatedList[idx] = updatedList[targetIdx];
    updatedList[targetIdx] = temp;

    // Recalculate strict order identifiers
    const reordered = updatedList.map((c, i) => ({ ...c, order: i + 1 }));
    try {
      await onReorderCategories(reordered);
      triggerToast("Ordem das categorias atualizada!");
    } catch (err: any) {
      console.error("Erro ao salvar reordenação:", err);
      alert(`Erro Supabase ao ordenar categorias: ${err.message || String(err)}`);
    }
  };

  // Product Actions
  const handleOpenProductForm = (prod?: Product) => {
    if (prod) {
      setEditingProduct({ ...prod });
      setPriceInput(prod.price === 0 ? "" : String(prod.price));
    } else {
      setEditingProduct({
        id: `prod-${Date.now()}`,
        name: "",
        photo: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80",
        description: "",
        ingredients: "",
        price: 35.0,
        category_id: categories[0]?.id || "",
        active: true,
        is_pizza: true,
        borders_available: ["Sem borda", "Catupiry", "Cheddar", "Chocolate"],
        additionals_available: ["Bacon Extra", "Mussarela Extra", "Calabresa Extra", "Catupiry Extra", "Cheddar Extra", "Cebola Extra", "Azeitona Extra"],
      });
      setPriceInput("35");
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProductForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editingProduct.name?.trim()) {
      alert("O nome do produto é obrigatório");
      return;
    }
    if (!editingProduct.category_id) {
      alert("Selecione uma categoria válida.");
      return;
    }

    const finalPrice = parseBrazilianCurrency(priceInput);

    const finalProduct: Product = {
      id: editingProduct.id || `prod-${Date.now()}`,
      name: editingProduct.name.trim(),
      photo: editingProduct.photo?.trim() || "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80",
      description: editingProduct.description?.trim() || "",
      ingredients: editingProduct.ingredients?.trim() || "",
      price: finalPrice,
      category_id: editingProduct.category_id,
      active: editingProduct.active !== undefined ? editingProduct.active : true,
      is_pizza: editingProduct.is_pizza !== undefined ? editingProduct.is_pizza : true,
      borders_available: editingProduct.borders_available || [],
      additionals_available: editingProduct.additionals_available || [],
      can_half_and_half: editingProduct.is_pizza ? (editingProduct.can_half_and_half !== false) : false,
      tipo_produto: editingProduct.tipo_produto || (editingProduct.is_pizza ? (editingProduct.category_id === "cat-doce" ? "Pizza Doce" : "Pizza Salgada") : (editingProduct.category_id === "cat-bebida" ? "Bebida" : editingProduct.category_id === "cat-sobremesa" ? "Sobremesa" : "Esfirra Doce")),
    };

    try {
      await onSaveProduct(finalProduct);
      setIsProductModalOpen(false);
      setEditingProduct(null);
      triggerToast("Produto salvo com sucesso!");
    } catch (err: any) {
      console.error("Erro ao salvar produto:", err);
      alert(`Erro ao salvar produto no Supabase: ${err.message || String(err)}\n\nPor favor, certifique-se de que a tabela 'pizzaria_products' foi criada.`);
    }
  };

  const handleToggleProductActive = async (prod: Product) => {
    try {
      const updated = { ...prod, active: !prod.active };
      await onSaveProduct(updated);
      triggerToast(`Produto ${updated.name} ${updated.active ? "ativado" : "desativado"}!`);
    } catch (err: any) {
      console.error("Erro ao alterar status do produto:", err);
      alert(`Erro Supabase: ${err.message || String(err)}`);
    }
  };

  const handleDeleteProductClick = async (id: string) => {
    if (confirm("Deseja realmente remover este produto de forma definitiva?")) {
      try {
        await onDeleteProduct(id);
        triggerToast("Produto excluído!");
      } catch (err: any) {
        console.error("Erro ao deletar produto:", err);
        alert(`Erro Supabase ao deletar produto: ${err.message || String(err)}`);
      }
    }
  };

  const handleBorderFormToggle = (bName: string) => {
    if (!editingProduct) return;
    const current = editingProduct.borders_available || [];
    const updated = current.includes(bName)
      ? current.filter((x) => x !== bName)
      : [...current, bName];
    setEditingProduct({ ...editingProduct, borders_available: updated });
  };

  const handleAdditionalFormToggle = (aName: string) => {
    if (!editingProduct) return;
    const current = editingProduct.additionals_available || [];
    const updated = current.includes(aName)
      ? current.filter((x) => x !== aName)
      : [...current, aName];
    setEditingProduct({ ...editingProduct, additionals_available: updated });
  };

  // Output formatting
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };


  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#111115] rounded-3xl border border-gray-800 p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="p-4 rounded-full bg-brand-red/20 border border-red-800 text-red-500 mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="font-serif font-bold text-xl md:text-2xl text-white">Painel do Administrador</h2>
            <p className="text-xs text-gray-400 mt-1.5 max-w-[280px]">
              Insira a senha do restaurante para editar produtos, preços e taxas.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs text-gray-450 block ml-1 mb-1.5">Senha de Acesso</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
                placeholder="Ex: pizzaria123"
                className="w-full p-3.5 bg-[#141418] border border-gray-800 rounded-xl text-center font-mono focus:outline-none focus:border-gold-500 text-white tracking-widest placeholder-gray-700"
              />
              {loginError && (
                <span className="text-xs text-rose-500 mt-2 block text-center font-medium">
                  {loginError}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={onBackToStore}
                className="flex-[1] flex items-center justify-center space-x-1 py-3 text-gray-400 hover:text-white border border-gray-800 hover:bg-gray-800/40 rounded-xl text-xs transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao Cardápio</span>
              </button>

              <button
                type="submit"
                className="flex-[1.5] py-3 text-black font-bold bg-gradient-to-r from-gold-500 to-gold-400 hover:brightness-110 active:scale-98 rounded-xl text-xs shadow-md shadow-amber-950/20 cursor-pointer transition-transform"
                id="btn-admin-login-submit"
              >
                Entrar no Painel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Toast Notification */}
      {saveStatus && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#121217] border border-gold-500 text-gold-400 font-medium text-sm px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Admin Title Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-[#111115] p-5.5 rounded-3xl border border-gray-850">
        <div>
          <div className="flex items-center space-x-2 text-gold-500 text-xs font-mono uppercase tracking-widest">
            <Settings className="w-3.5 h-3.5 animate-spin" />
            <span>Painel Exclusivo de Controle</span>
          </div>
          <h2 className="font-serif font-extrabold text-2xl md:text-3xl text-white mt-1">
            Gestão do Cardápio Digital
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Database Sync State:{" "}
            {isSupabaseConfigured ? (
              <span className="text-emerald-400 font-bold">● Conectado ao Supabase</span>
            ) : (
              <span className="text-amber-400 font-bold">● LocalStorage Seguro (Offline-first)</span>
            )}
          </p>
        </div>

        <button
          onClick={onBackToStore}
          className="flex items-center space-x-2 text-xs font-semibold px-4 py-2.5 rounded-xl border border-gray-800 text-gray-300 hover:text-white hover:bg-gray-800/40 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Loja</span>
        </button>
      </div>

      {/* Tabs list switchers */}
      <div className="flex border-b border-gray-850 overflow-x-auto no-scrollbar space-x-3 mb-6">
        <button
          onClick={() => setActiveTab("empresa")}
          className={`pb-3 px-4 text-xs md:text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
            activeTab === "empresa"
              ? "border-gold-500 text-gold-400 font-bold"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Dados da Empresa & Configs</span>
        </button>
        <button
          onClick={() => setActiveTab("categorias")}
          className={`pb-3 px-4 text-xs md:text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
            activeTab === "categorias"
              ? "border-gold-500 text-gold-400 font-bold"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <ListCollapse className="w-4 h-4" />
          <span>Categorias ({categories.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("produtos")}
          className={`pb-3 px-4 text-xs md:text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
            activeTab === "produtos"
              ? "border-gold-500 text-gold-400 font-bold"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Pizza className="w-4 h-4" />
          <span>Produtos ({products.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("destaques")}
          className={`pb-3 px-4 text-xs md:text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
            activeTab === "destaques"
              ? "border-gold-500 text-gold-400 font-bold"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Promoções em Destaque</span>
        </button>
        <button
          onClick={() => setActiveTab("supabase")}
          className={`pb-3 px-4 text-xs md:text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
            activeTab === "supabase"
              ? "border-gold-500 text-gold-400 font-bold"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Conectar Banco Supabase</span>
        </button>
      </div>

      {/* --- COMPANY & CONFING TAB --- */}
      {activeTab === "empresa" && (
        <form onSubmit={handleSaveSettings} className="bg-[#111115] border border-gray-850 rounded-3xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Col: Empresa */}
            <div className="space-y-4">
              <h3 className="font-serif font-black text-lg text-gray-100 border-b border-gray-850 pb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-red" />
                Dados Básicos da Pizzaria
              </h3>

              <div>
                <label className="text-xs text-gray-450 block ml-1 mb-1.5">Nome da Pizzaria</label>
                <input
                  type="text"
                  value={inputCompany.name}
                  onChange={(e) => setInputCompany({ ...inputCompany, name: e.target.value })}
                  placeholder="Nome comercial"
                  className="w-full p-3 bg-[#141418] border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-450 block ml-1 mb-1.5">WhatsApp de Destino (DDI + DDD + Número)</label>
                <input
                  type="text"
                  value={inputConfigs.whatsapp}
                  onChange={(e) => setInputConfigs({ ...inputConfigs, whatsapp: e.target.value })}
                  placeholder="Ex: 5511999999999"
                  className="w-full p-3 bg-[#141418] border border-gray-800 rounded-xl text-sm font-mono focus:outline-none focus:border-gold-500"
                />
                <span className="text-[10px] text-gray-500 mt-1.5 block leading-relaxed ml-1">
                  Insira apenas números ordinários contendo código de país. Ex: 55 (Brasil) + 11 (SP) + 999999999.
                </span>
              </div>

              <div>
                <label className="text-xs text-gray-450 block ml-1 mb-1">Logomarca (Logo) da Empresa</label>
                <div className="flex flex-col sm:flex-row items-stretch gap-3 mt-1.5">
                  <div className="flex-grow space-y-2">
                    <input
                      type="text"
                      value={inputCompany.logo}
                      onChange={(e) => setInputCompany({ ...inputCompany, logo: e.target.value })}
                      placeholder="Link da imagem ou faça upload de arquivo"
                      className="w-full p-3 bg-[#141418] border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-white"
                    />
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
                            if (!["jpg", "jpeg", "png", "webp"].includes(fileExt)) {
                              alert("Formato inválido! Escolha uma imagem de formato JPG, JPEG, PNG ou WEBP.");
                              return;
                            }
                            if (file.size > 5 * 1024 * 1024) {
                              alert("A imagem é muito grande! Escolha uma imagem de até 5MB.");
                              return;
                            }
                            setIsUploadingLogo(true);
                            try {
                              const url = await uploadImage(file, "logo");
                              setInputCompany(prev => ({ ...prev, logo: url }));
                            } catch (err: any) {
                              alert(err.message || "Erro ao realizar upload da imagem.");
                            } finally {
                              setIsUploadingLogo(false);
                            }
                          }
                        }}
                        className="hidden"
                        id="company-logo-upload"
                      />
                      <label
                        htmlFor="company-logo-upload"
                        className="flex items-center justify-center space-x-2 bg-[#1b1b22] hover:bg-gray-800 border border-gray-850 px-4 py-2.5 rounded-xl text-xs text-[#D4AF37] hover:text-white cursor-pointer transition-all w-full"
                      >
                        <Upload className="w-3.5 h-3.5 animate-pulse" />
                        <span>{isUploadingLogo ? "Enviando para o Storage..." : "Fazer Upload da Logo (Máx 5MB)"}</span>
                      </label>
                    </div>
                  </div>
                  {inputCompany.logo ? (
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-black/40 border border-gray-800 rounded-xl overflow-hidden self-center sm:self-auto shrink-0 flex-none flex items-center justify-center group/logo-prev">
                      <OptimizedImage
                        src={inputCompany.logo}
                        alt="Preview"
                        className="w-full h-full object-cover transition-opacity duration-350 group-hover/logo-prev:opacity-30"
                      />
                      <button
                        type="button"
                        onClick={() => setInputCompany(prev => ({ ...prev, logo: "" }))}
                        className="absolute inset-0 bg-red-950/85 opacity-0 group-hover/logo-prev:opacity-100 flex items-center justify-center text-white text-[10px] uppercase font-bold transition-opacity cursor-pointer text-center px-1"
                        title="Remover Imagem"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-[#141418] border border-dashed border-gray-800 rounded-xl overflow-hidden self-center sm:self-auto shrink-0 flex-none flex items-center justify-center text-[10px] text-gray-500 italic text-center px-1">
                      Sem Logo (Texto)
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-450 block ml-1 mb-1.5">Título do Banner Principal</label>
                <input
                  type="text"
                  value={inputCompany.banner_title}
                  onChange={(e) => setInputCompany({ ...inputCompany, banner_title: e.target.value })}
                  placeholder="Frase de destaque do banner"
                  className="w-full p-3 bg-[#141418] border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-450 block ml-1 mb-1.5">Subtítulo do Banner Principal</label>
                <textarea
                  value={inputCompany.banner_subtitle}
                  onChange={(e) => setInputCompany({ ...inputCompany, banner_subtitle: e.target.value })}
                  placeholder="Texto explicativo menor"
                  rows={2}
                  className="w-full p-3 bg-[#141418] border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>

            {/* Right Col: Configs */}
            <div className="space-y-4">
              <h3 className="font-serif font-black text-lg text-gray-100 border-b border-gray-850 pb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-red" />
                Configurações Operacionais
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-450 block ml-1 mb-1.5">Início do Turno</label>
                  <input
                    type="text"
                    value={inputConfigs.working_hours_start}
                    onChange={(e) => setInputConfigs({ ...inputConfigs, working_hours_start: e.target.value })}
                    placeholder="Ex: 18:00"
                    className="w-full p-3 bg-[#141418] border border-gray-800 rounded-xl text-sm text-center font-mono focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-450 block ml-1 mb-1.5">Final do Turno</label>
                  <input
                    type="text"
                    value={inputConfigs.working_hours_end}
                    onChange={(e) => setInputConfigs({ ...inputConfigs, working_hours_end: e.target.value })}
                    placeholder="Ex: 23:30"
                    className="w-full p-3 bg-[#141418] border border-gray-800 rounded-xl text-sm text-center font-mono focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-450 block ml-1 mb-1.5 font-medium">Taxa de Entrega Padrão (R$)</label>
                <input
                  type="text"
                  value={deliveryFeeInput}
                  onChange={(e) => setDeliveryFeeInput(e.target.value)}
                  placeholder="Ex: 7,00"
                  className="w-full p-3 bg-[#141418] border border-gray-800 rounded-xl text-sm font-mono focus:outline-none focus:border-gold-500 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-gray-450 block ml-1 mb-1.5">Mensagem de Loja Fechada</label>
                <textarea
                  value={inputConfigs.closed_message}
                  onChange={(e) => setInputConfigs({ ...inputConfigs, closed_message: e.target.value })}
                  placeholder="Ex: Estamos fechados no momento. Você ainda pode visualizar o cardápio."
                  rows={2}
                  className="w-full p-3 bg-[#141418] border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-gold-500"
                />
              </div>

              {/* Force Closed Switch */}
              <div className="p-4 rounded-xl bg-[#141418] border border-gray-850 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-200 block">Forçar Fechamento Manual</span>
                  <span className="text-[10px] text-gray-500">Mantém a pizzaria fechada independente do horário configurado.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setInputConfigs({ ...inputConfigs, is_force_closed: !inputConfigs.is_force_closed })}
                  className={`w-12 h-6.5 rounded-full p-1 transition-colors relative cursor-pointer ${
                    inputConfigs.is_force_closed ? "bg-red-800" : "bg-gray-800"
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                      inputConfigs.is_force_closed ? "translate-x-5.5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-850 flex items-center justify-end">
            <button
              type="submit"
              className="flex items-center space-x-2 bg-gradient-to-r from-gold-500 to-gold-400 hover:brightness-110 active:scale-98 text-black font-bold px-6 py-3 rounded-xl border border-gold-600 shadow-md cursor-pointer transition-transform"
              id="btn-save-meta-configurations"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      )}

      {/* --- CATEGORIES TAB --- */}
      {activeTab === "categorias" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Creating box */}
          <div className="bg-[#111115] border border-gray-850 rounded-3xl p-5 h-fit space-y-4">
            <h3 className="font-serif font-black text-base text-gray-100 border-b border-gray-850 pb-2">
              Nova Categoria
            </h3>
            
            <div>
              <label className="text-xs text-gray-450 block ml-1 mb-1.5 font-medium">Nome da Categoria</label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Ex: Pizzas Premium"
                className="w-full p-3 bg-[#141418] border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-gold-500"
              />
            </div>

            <button
              onClick={handleCreateCategory}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-brand-red to-red-800 hover:brightness-110 active:scale-95 text-white font-bold rounded-xl text-xs shadow shadow-red-950/40 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Categoria</span>
            </button>
          </div>

          {/* Categories list ordering */}
          <div className="md:col-span-2 bg-[#111115] border border-gray-850 rounded-3xl p-5 space-y-4">
            <h3 className="font-serif font-black text-base text-gray-100 border-b border-gray-850 pb-2">
              Categorias Existentes & Reordenação
            </h3>

            {categories.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Nenhuma categoria cadastrada.</p>
            ) : (
              <div className="space-y-2.5">
                {[...categories]
                  .sort((a, b) => a.order - b.order)
                  .map((cat, idx, arr) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3.5 bg-[#141418] hover:bg-gray-900 border border-gray-850 rounded-2xl transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        {/* Order numbers badge */}
                        <span className="w-6 h-6 rounded-lg bg-black text-[11px] font-mono font-bold text-gold-400 flex items-center justify-center border border-gray-800">
                          {cat.order}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-100">{cat.name}</p>
                          <span
                            className={`inline-flex items-center text-[10px] ${
                              cat.active ? "text-emerald-500" : "text-gray-500"
                            }`}
                          >
                            ● {cat.active ? "Ativa" : "Inativa"}
                          </span>
                        </div>
                      </div>

                      {/* Controls up/down/active/delete */}
                      <div className="flex items-center space-x-1">
                        {/* Order sorting buttons */}
                        <button
                          onClick={() => handleMoveCategory(idx, "up")}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                          title="Mover para cima"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveCategory(idx, "down")}
                          disabled={idx === arr.length - 1}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                          title="Mover para baixo"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>

                        {/* Visibility switcher toggle */}
                        <button
                          onClick={() => handleToggleCategoryActive(cat)}
                          className={`p-2 rounded-lg transition-colors cursor-pointer ${
                            cat.active
                              ? "text-emerald-400 hover:bg-emerald-950/40"
                              : "text-gray-500 hover:bg-gray-800"
                          }`}
                          title={cat.active ? "Desativar categoria" : "Ativar categoria"}
                        >
                          {cat.active ? <Eye className="w-4.5 h-4.5" /> : <EyeOff className="w-4.5 h-4.5" />}
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteCategoryClick(cat.id)}
                          className="p-2 rounded-lg text-gray-500 hover:text-rose-500 hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Remover categoria"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- PRODUCTS TAB --- */}
      {activeTab === "produtos" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-850">
            <div>
              <h3 className="font-serif font-black text-lg text-gray-100">Pratos & Pizzas cadastrados</h3>
              <p className="text-xs text-gray-500">Adicione, edite e configure opções de bordas e adicionais de cada prato.</p>
            </div>
            <button
              onClick={() => handleOpenProductForm()}
              className="flex items-center space-x-1.5 text-xs bg-gradient-to-r from-gold-500 to-gold-400 hover:brightness-110 active:scale-95 text-black font-bold py-2.5 px-4 rounded-xl border border-gold-600 shadow shadow-amber-950/25 cursor-pointer"
              id="btn-admin-add-item"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Produto</span>
            </button>
          </div>

          {/* Barra de Pesquisa Rápida */}
          <div className="bg-[#111115] border border-gray-850 p-4.5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex-grow relative">
              <input
                id="product-search-bar"
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="🔍 Digite para pesquisar sabor, descrição, bebida ou ingrediente..."
                className="w-full p-3.5 pl-11 bg-[#141418] border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-white placeholder-gray-500 select-all"
              />
              {productSearch && (
                <button
                  onClick={() => setProductSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 bg-gray-800 text-xs text-gray-300 hover:text-white rounded-lg font-bold font-mono transition-all"
                  title="Limpar pesquisa"
                  type="button"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Group products by Category */}
          {categories.map((category) => {
            const catProds = products.filter((p) => {
              const isMatchCategory = p.category_id === category.id;
              if (!isMatchCategory) return false;
              if (!productSearch.trim()) return true;
              
              const searchLower = productSearch.toLowerCase();
              return (
                p.name.toLowerCase().includes(searchLower) ||
                (p.description && p.description.toLowerCase().includes(searchLower)) ||
                (p.ingredients && p.ingredients.toLowerCase().includes(searchLower))
              );
            });

            // Hide this category if searching and has no results
            if (productSearch.trim() && catProds.length === 0) return null;

            return (
              <div key={category.id} className="bg-[#111115] border border-gray-850 p-5 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-base text-gold-400">{category.name}</h4>
                  <span className="px-2 py-0.5 rounded-full bg-black text-[10px] font-mono text-gray-400 border border-gray-905">
                    {catProds.length} {catProds.length === 1 ? "exibido" : "exibidos"}
                  </span>
                </div>

                {catProds.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">Nenhum produto cadastrado nesta categoria.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {catProds.map((prod) => (
                      <div
                        key={prod.id}
                        className="p-3 bg-[#141418] border border-gray-850 rounded-2xl flex items-center justify-between gap-3 hover:border-gray-700 transition-colors"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0">
                            <OptimizedImage
                              src={prod.photo}
                              alt={prod.name}
                              categoryId={prod.category_id}
                              isPizza={prod.is_pizza}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-100 truncate">{prod.name}</p>
                            <p className="text-xs text-gold-500 font-mono font-medium mt-0.5">
                              {formatCurrency(prod.price)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          {/* Toggle active */}
                          <button
                            onClick={() => handleToggleProductActive(prod)}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              prod.active
                                ? "text-emerald-400 hover:bg-emerald-950/40"
                                : "text-gray-500 hover:bg-gray-800"
                            }`}
                            title={prod.active ? "Desativar produto" : "Ativar produto"}
                          >
                            {prod.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>

                          {/* Trigger details edit */}
                          <button
                            onClick={() => handleOpenProductForm(prod)}
                            className="p-2 rounded-lg text-gray-300 hover:text-gold-400 hover:bg-gray-800 transition-colors text-xs font-semibold cursor-pointer border border-gray-850"
                          >
                            Editar
                          </button>

                          {/* Delete product */}
                          <button
                            onClick={() => handleDeleteProductClick(prod.id)}
                            className="p-2 rounded-lg text-gray-500 hover:text-rose-500 hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Remover produto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* --- SUPABASE EXPLANATORY DDL TAB --- */}
      {activeTab === "supabase" && (
        <div className="bg-[#111115] border border-gray-850 rounded-3xl p-6 space-y-5">
          <div className="flex items-start space-x-3.5 pb-4 border-b border-gray-850">
            <div className="p-3 bg-indigo-950 border border-indigo-800 text-indigo-400 rounded-2xl flex-shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-black text-lg text-white">Integração Pública com Supabase</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-xl leading-relaxed">
                Este sistema suporta sincronização automática pública com o banco de dados Supabase! Se você configurar as credenciais, o sistema funcionará imediatamente carregando de lá.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-900/65 flex items-start space-x-3.5 space-y-0.5 max-w-3xl">
            <Info className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <span className="text-xs font-bold text-amber-400 block font-serif">Como ativar no seu projeto:</span>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                Crie um arquivo <code className="font-mono text-gold-400 bg-black/45 px-1 py-0.5 rounded text-[11px]">.env</code> na sua raiz com as seguintes chaves ou adicione nas variáveis de ambiente na hospedagem:
              </p>
              <pre className="font-mono text-[11px] text-gray-400 bg-black/50 p-2.5 rounded-lg border border-gray-900 mt-2.5">
                VITE_SUPABASE_URL="https://seu-projeto.supabase.co"{"\n"}
                VITE_SUPABASE_ANON_KEY="sua-chave-anon-publica-do-supabase"
              </pre>
            </div>
          </div>

          {/* DOCUMENTAÇÃO DE TABELAS E COLUNAS EXIGIDAS NO SUPABASE */}
          <div className="space-y-4 pt-2">
            <h4 className="font-serif font-black text-white text-base">Schema do Banco de Dados (Tabelas & Colunas)</h4>
            <p className="text-xs text-gray-400">
              Abaixo estão listadas as 4 tabelas obrigatórias do sistema com todas as respectivas colunas e tipos de dados esperados:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tabela 1: pizzaria_company */}
              <div className="bg-[#141419] border border-gray-850 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <span className="text-xs font-mono font-bold text-[#D4AF37]">pizzaria_company</span>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-mono">1 linha fixa</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">id</span> <span className="text-gray-500">integer (PK / 1)</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">name</span> <span className="text-gray-500">text</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">logo</span> <span className="text-gray-500">text (URL da logo)</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">banner_title</span> <span className="text-gray-500">text</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">banner_subtitle</span> <span className="text-gray-500">text</span></div>
                </div>
              </div>

              {/* Tabela 2: pizzaria_configs */}
              <div className="bg-[#141419] border border-gray-850 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <span className="text-xs font-mono font-bold text-[#D4AF37]">pizzaria_configs</span>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-mono">1 linha fixa</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">id</span> <span className="text-gray-500">integer (PK / 1)</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">whatsapp</span> <span className="text-gray-500">text (+55 800 000 3728)</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">delivery_fee</span> <span className="text-gray-500">numeric</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">working_hours_start</span> <span className="text-gray-500">text</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">working_hours_end</span> <span className="text-gray-500">text</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">closed_message</span> <span className="text-gray-500">text</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">is_force_closed</span> <span className="text-gray-500">boolean</span></div>
                </div>
              </div>

              {/* Tabela 3: pizzaria_categories */}
              <div className="bg-[#141419] border border-gray-850 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <span className="text-xs font-mono font-bold text-[#D4AF37]">pizzaria_categories</span>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-mono">Multiplas linhas</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">id</span> <span className="text-gray-500">text (PK)</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">name</span> <span className="text-gray-500">text</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">active</span> <span className="text-gray-500">boolean</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">order</span> <span className="text-gray-500">integer</span></div>
                </div>
              </div>

              {/* Tabela 4: pizzaria_products */}
              <div className="bg-[#141419] border border-gray-850 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <span className="text-xs font-mono font-bold text-[#D4AF37]">pizzaria_products</span>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-mono">Multiplas linhas</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">id</span> <span className="text-gray-500">text (PK)</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">name</span> <span className="text-gray-500">text</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">photo</span> <span className="text-gray-500">text (URL da imagem)</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">description</span> <span className="text-gray-500">text</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">ingredients</span> <span className="text-gray-500">text</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">price</span> <span className="text-gray-500">numeric</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">category_id</span> <span className="text-gray-500">text</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">active</span> <span className="text-gray-500">boolean</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">is_pizza</span> <span className="text-gray-500">boolean</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">borders_available</span> <span className="text-gray-500">text[]</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">additionals_available</span> <span className="text-gray-500">text[]</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">can_half_and_half</span> <span className="text-gray-500">boolean</span></div>
                  <div className="flex justify-between text-gray-300"><span className="font-mono text-white">tipo_produto</span> <span className="text-gray-500">text</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-widest font-mono">Estrutura SQL de Tabelas de Inicialização</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
                  triggerToast("SQL Copiado com sucesso!");
                }}
                className="text-xs text-gold-400 hover:text-white cursor-pointer hover:underline border border-gray-800 px-3 py-1.5 rounded-lg"
              >
                Copiar Instruções SQL
              </button>
            </div>
            <textarea
              readOnly
              value={SUPABASE_SQL_SETUP}
              rows={12}
              className="w-full bg-black/80 border border-gray-900 rounded-2xl p-4 font-mono text-[11px] text-[#9ccdff] leading-relaxed focus:outline-none focus:ring-0"
            />
          </div>
        </div>
      )}

      {/* --- FEATURED OFFERS & PROMOTIONS TAB --- */}
      {activeTab === "destaques" && (
        <div className="space-y-6">
          <div className="flex items-start space-x-3 pb-4 border-b border-gray-850">
            <div className="p-3 bg-amber-950 border border-amber-900 text-amber-500 rounded-2xl shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-black text-lg text-white uppercase tracking-wider">Promoções em Destaque (Topo do Cardápio)</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
                Configure aqui até 3 pizzas da sua pizzaria para ficarem no topo do seu cardápio digital, com preços promocionais exclusivos para impulsionar suas vendas!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((slotIndex) => {
              const promo = localPromos[slotIndex] || { productId: "", label: "", promoPrice: 0 };
              const selectedProduct = products.find((p) => p.id === promo.productId);
              const availablePizzas = products.filter((p) => p.is_pizza && p.active);

              return (
                <div key={slotIndex} className="bg-[#111115] border border-gray-850 rounded-3xl p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between border-b border-gray-850 pb-2.5">
                      <h4 className="text-xs md:text-sm font-serif font-black text-amber-500 tracking-wide uppercase">
                        Slot Destaque #{slotIndex + 1}
                      </h4>
                      {promo.productId && (
                        <button
                          type="button"
                          onClick={() => {
                            const copy = [...localPromos];
                            copy[slotIndex] = { productId: "", label: "", promoPrice: 0 };
                            setLocalPromos(copy);
                          }}
                          className="text-[10px] text-rose-500 hover:text-white bg-rose-950/25 border border-rose-950 hover:bg-rose-900/40 px-2 py-0.5 rounded-lg font-mono transition-colors cursor-pointer"
                        >
                          Limpar Slot
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 block mb-1 font-medium">Escolher Pizza *</label>
                      <select
                        value={promo.productId}
                        onChange={(e) => {
                          const prodId = e.target.value;
                          const originalProd = products.find(p => p.id === prodId);
                          const copy = [...localPromos];
                          
                          copy[slotIndex] = {
                            productId: prodId,
                            label: originalProd ? originalProd.name : "",
                            promoPrice: originalProd ? originalProd.price : 0
                          };
                          setLocalPromos(copy);
                        }}
                        className="w-full p-2.5 bg-[#141418] border border-gray-800 rounded-xl text-xs focus:outline-none focus:border-gold-500 text-gray-105"
                      >
                        <option value="">-- Nenhum Selecionado --</option>
                        {availablePizzas.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (R$ {p.price.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {promo.productId && (
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="text-xs text-gray-400 block mb-1 font-medium">Rótulo Curto / Selo</label>
                          <input
                            type="text"
                            value={promo.label}
                            onChange={(e) => {
                              const copy = [...localPromos];
                              copy[slotIndex] = { ...copy[slotIndex], label: e.target.value };
                              setLocalPromos(copy);
                            }}
                            placeholder="Ex: Campeã"
                            className="w-full p-2.5 bg-[#141418] border border-gray-800 rounded-xl text-xs focus:outline-none focus:border-gold-500 text-white"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 block mb-1 font-medium">Preço na Promoção (R$)</label>
                          <input
                            type="text"
                            value={promo.promoPrice === 0 ? "" : String(promo.promoPrice)}
                            onChange={(e) => {
                              const valueStr = e.target.value;
                              const parsed = parseBrazilianCurrency(valueStr);
                              const copy = [...localPromos];
                              copy[slotIndex] = { ...copy[slotIndex], promoPrice: parsed };
                              setLocalPromos(copy);
                            }}
                            placeholder="Ex: 29,90"
                            className="w-full p-2.5 bg-[#141418] border border-gray-800 rounded-xl text-xs font-mono focus:outline-none focus:border-gold-500 text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-850">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono block mb-2">Visualização da Oferta</span>
                    {selectedProduct ? (
                      <div className="relative rounded-2xl bg-[#141418] border border-[#D4AF37]/20 overflow-hidden group shadow-md transition-all">
                        <div className="aspect-video w-full relative overflow-hidden bg-zinc-900 border-b border-gray-850">
                          {selectedProduct.photo ? (
                            <OptimizedImage
                              src={selectedProduct.photo}
                              alt={selectedProduct.name}
                              className="w-full h-full object-cover grayscale-25"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600 bg-neutral-900 text-xs">
                              Sem foto
                            </div>
                          )}
                          {promo.label && (
                            <span className="absolute top-2.5 left-2.5 bg-[#8B0000] text-[#D4AF37] font-mono text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-[#D4AF37]/30 shadow shadow-black">
                              ★ {promo.label}
                            </span>
                          )}
                        </div>

                        <div className="p-3.5 space-y-1">
                          <h5 className="font-serif font-bold text-xs text-white tracking-wide truncate">{selectedProduct.name}</h5>
                          <p className="text-[10px] text-zinc-400 font-light line-clamp-1 h-3.5 leading-none">{selectedProduct.description || "Deliciosa pizza artesanal."}</p>
                          <div className="flex items-baseline space-x-2 pt-1">
                            <span className="text-xs text-[#D4AF37] font-black font-mono">
                              R$ {(promo.promoPrice || selectedProduct.price).toFixed(2)}
                            </span>
                            {promo.promoPrice > 0 && promo.promoPrice !== selectedProduct.price && (
                              <span className="text-[10px] line-through text-gray-500 font-mono font-light">
                                R$ {selectedProduct.price.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 rounded-2xl border border-dashed border-[#D4AF37]/15 bg-black/10 flex flex-col items-center justify-center text-gray-600 p-4 text-center">
                        <Sparkles className="w-5 h-5 text-gray-700 stroke-1 mb-1 animate-pulse" />
                        <span className="text-[10px] font-mono font-medium lowercase">Slot Vazio</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-gray-850">
            <button
              onClick={() => {
                const filtered = localPromos.map((p) => ({
                  productId: p.productId || "",
                  label: p.label || "",
                  promoPrice: p.promoPrice || 0
                }));
                onSaveFeaturedPromos(filtered);
                triggerToast("Promoções em Destaque salvas com sucesso!");
              }}
              className="flex items-center space-x-2 bg-[#8B0000] hover:brightness-110 active:scale-95 text-white font-bold py-3 px-6 rounded-2xl shadow-xl shadow-red-950/20 cursor-pointer border border-red-700/40 transition-all font-mono uppercase text-xs tracking-wider"
            >
              <Save className="w-4 h-4 text-[#D4AF37]" />
              <span>Fixar Promoções em Destaque</span>
            </button>
          </div>
        </div>
      )}

      {/* --- INNER MODAL FORM FOR ADDING / EDITING PRODUCTS --- */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <form
            onSubmit={handleSaveProductForm}
            className="w-full max-w-lg bg-[#0c0c0e] border border-gray-800 rounded-3xl shadow-2xl relative my-auto max-h-[90vh] flex flex-col animate-in fade-in duration-200"
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-800 bg-[#111115] flex items-center justify-between">
              <h4 className="font-serif font-black text-base text-white">
                {editingProduct.id && products.some((p) => p.id === editingProduct.id)
                  ? "Editar Detalhes do Produto"
                  : "Criar Novo Produto"}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setIsProductModalOpen(false);
                  setEditingProduct(null);
                }}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form inputs scroll panel */}
            <div className="p-6 overflow-y-auto space-y-4 flex-grow">
              
              <div>
                <label className="text-xs text-gray-450 block ml-1 mb-1.5">Nome do Prato/Pizza *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="Ex: Portuguesa Especial"
                  className="w-full p-3 bg-[#141418] border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-gold-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-450 block ml-1 mb-1.5">Categoria Vinculada *</label>
                  <select
                    value={editingProduct.category_id || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value })}
                    className="w-full p-3 bg-[#141418] border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-gray-100"
                  >
                    <option value="" disabled>Selecione...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-450 block ml-1 mb-1.5 font-medium">Preço Unitário (R$) *</label>
                  <input
                    type="text"
                    required
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    placeholder="Ex: 45,90"
                    className="w-full p-3 bg-[#141418] border border-gray-800 rounded-xl text-sm font-mono focus:outline-none focus:border-gold-500 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-450 block ml-1 mb-1">Foto do Produto</label>
                <div className="flex flex-col sm:flex-row items-stretch gap-3 mt-1.5">
                  <div className="flex-grow space-y-2">
                    <input
                      type="text"
                      value={editingProduct.photo || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, photo: e.target.value })}
                      placeholder="Link da foto ou faça upload de arquivo"
                      className="w-full p-3 bg-[#141418] border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-white"
                    />
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
                            if (!["jpg", "jpeg", "png", "webp"].includes(fileExt)) {
                              alert("Formato inválido! Escolha uma imagem de formato JPG, JPEG, PNG ou WEBP.");
                              return;
                            }
                            if (file.size > 5 * 1024 * 1024) {
                              alert("A imagem é muito grande! Escolha uma imagem de até 5MB.");
                              return;
                            }
                            setIsUploadingProductPhoto(true);
                            try {
                              const url = await uploadImage(file, "products");
                              setEditingProduct(prev => prev ? ({ ...prev, photo: url }) : null);
                            } catch (err: any) {
                              alert(err.message || "Erro ao realizar upload da imagem.");
                            } finally {
                              setIsUploadingProductPhoto(false);
                            }
                          }
                        }}
                        className="hidden"
                        id="product-photo-upload"
                      />
                      <label
                        htmlFor="product-photo-upload"
                        className="flex items-center justify-center space-x-2 bg-[#1b1b22] hover:bg-gray-800 border border-gray-850 px-4 py-2.5 rounded-xl text-xs text-[#D4AF37] hover:text-white cursor-pointer transition-all w-full"
                      >
                        <Upload className="w-3.5 h-3.5 animate-pulse" />
                        <span>{isUploadingProductPhoto ? "Enviando para o Storage..." : "Fazer Upload de Foto (Máx 5MB)"}</span>
                      </label>
                    </div>
                  </div>
                  {editingProduct.photo ? (
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-black/40 border border-gray-800 rounded-xl overflow-hidden self-center sm:self-auto shrink-0 flex-none flex items-center justify-center group/prod-prev">
                      <OptimizedImage
                        src={editingProduct.photo}
                        alt="Preview"
                        categoryId={editingProduct.category_id}
                        isPizza={editingProduct.is_pizza}
                        className="w-full h-full object-cover transition-opacity duration-350 group-hover/prod-prev:opacity-30"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingProduct(prev => prev ? ({ ...prev, photo: "" }) : null)}
                        className="absolute inset-0 bg-red-950/85 opacity-0 group-hover/prod-prev:opacity-100 flex items-center justify-center text-white text-[10px] uppercase font-bold transition-opacity cursor-pointer text-center px-1"
                        title="Remover Imagem"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-[#141418] border border-dashed border-gray-800 rounded-xl overflow-hidden self-center sm:self-auto shrink-0 flex-none flex items-center justify-center text-[10px] text-gray-500 italic text-center px-1">
                      Sem Imagem (Padrão)
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-450 block ml-1 mb-1.5">Breve Descrição para o Cardápio</label>
                <textarea
                  value={editingProduct.description || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="Descreva o tamanho, pedaços ou apresentação desse prato..."
                  rows={2}
                  className="w-full p-3 bg-[#141418] border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-gray-450 block ml-1 mb-1.5">Fórmula de Ingredientes</label>
                <textarea
                  value={editingProduct.ingredients || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, ingredients: e.target.value })}
                  placeholder="Ex: Molho de tomate, queijo muçarela, ovo caipira, calabresa defumada..."
                  rows={2}
                  className="w-full p-3 bg-[#141418] border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-white"
                />
              </div>

              {/* Tipo do Produto selection */}
              <div>
                <label className="text-xs text-gray-450 block ml-1 mb-1.5">Tipo do Produto *</label>
                <select
                  value={editingProduct.tipo_produto || (editingProduct.is_pizza ? (editingProduct.category_id === "cat-doce" ? "Pizza Doce" : "Pizza Salgada") : (editingProduct.category_id === "cat-bebida" ? "Bebida" : editingProduct.category_id === "cat-sobremesa" ? "Sobremesa" : "Esfirra Doce"))}
                  onChange={(e) => {
                    const selectedTipo = e.target.value as any;
                    const isPizza = selectedTipo === "Pizza Salgada" || selectedTipo === "Pizza Doce";
                    setEditingProduct({
                      ...editingProduct,
                      tipo_produto: selectedTipo,
                      is_pizza: isPizza,
                      can_half_and_half: isPizza ? (editingProduct.can_half_and_half !== false) : false
                    });
                  }}
                  className="w-full p-3 bg-[#141418] border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-gray-100"
                >
                  <option value="Pizza Salgada">Pizza Salgada</option>
                  <option value="Pizza Doce">Pizza Doce</option>
                  <option value="Esfirra Doce">Esfirra Doce</option>
                  <option value="Bebida">Bebida</option>
                  <option value="Sobremesa">Sobremesa</option>
                </select>
              </div>

              {/* Can participate in Half-and-Half switch */}
              <div className="p-3.5 rounded-xl bg-[#141418] border border-gray-850 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-200 block">Pode participar de Pizza Meio a Meio?</span>
                  <span className="text-[10px] text-gray-500">
                    {editingProduct.is_pizza
                      ? "Se selecionado, o cliente poderá combinar este sabor com outra metade."
                      : "Apenas 'Pizza Salgada' e 'Pizza Doce' podem participar de meio a meio."}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={!editingProduct.is_pizza}
                  onClick={() => {
                    if (editingProduct.is_pizza) {
                      setEditingProduct({ ...editingProduct, can_half_and_half: editingProduct.can_half_and_half === false ? true : false });
                    }
                  }}
                  className={`w-12 h-6.5 rounded-full p-1 transition-colors relative cursor-pointer ${
                    !editingProduct.is_pizza ? "opacity-30 cursor-not-allowed bg-gray-900" :
                    editingProduct.can_half_and_half !== false ? "bg-red-800" : "bg-gray-800"
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                      editingProduct.is_pizza && editingProduct.can_half_and_half !== false ? "translate-x-5.5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Borders availability if product is pizza */}
              {editingProduct.is_pizza && (
                <div className="space-y-2 border-t border-gray-900 pt-3">
                  <span className="text-xs text-gray-400 block font-bold font-mono uppercase tracking-wider">Habilitar Opções de Borda</span>
                  <div className="grid grid-cols-2 gap-2">
                    {["Sem borda", "Catupiry", "Cheddar", "Chocolate"].map((bName) => {
                      const isAvail = (editingProduct.borders_available || []).includes(bName);
                      return (
                        <button
                          type="button"
                          key={bName}
                          onClick={() => handleBorderFilterToggle(bName)}
                          className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs text-left cursor-pointer transition-colors ${
                            isAvail
                              ? "bg-red-950/40 border-red-800 text-gray-100 font-semibold"
                              : "bg-[#141418] border-gray-900 text-gray-500"
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${isAvail ? "bg-red-500 border-red-500" : "border-gray-700"}`}>
                            {isAvail && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                          <span>{bName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Additionals filter toggles if is pizza */}
              {editingProduct.is_pizza && (
                <div className="space-y-2 border-t border-gray-900 pt-3">
                  <span className="text-xs text-gray-400 block font-bold font-mono uppercase tracking-wider">Habilitar Opções de Adicionais</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {["Bacon Extra", "Mussarela Extra", "Calabresa Extra", "Catupiry Extra", "Cheddar Extra", "Cebola Extra", "Azeitona Extra"].map((aName) => {
                      const isAvail = (editingProduct.additionals_available || []).includes(aName);
                      return (
                        <button
                          type="button"
                          key={aName}
                          onClick={() => handleAdditionalFilterToggle(aName)}
                          className={`flex items-center space-x-2 p-2 rounded-lg border text-[11px] text-left cursor-pointer transition-colors ${
                            isAvail
                              ? "bg-amber-950/30 border-amber-800 text-gray-100 font-semibold"
                              : "bg-[#141418] border-gray-900 text-gray-500"
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded border flex items-center justify-center ${isAvail ? "bg-amber-500 border-amber-500" : "border-gray-700"}`}>
                            {isAvail && <span className="w-1 h-1 rounded bg-white" />}
                          </span>
                          <span className="truncate">{aName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal actions footer */}
            <div className="p-4 bg-[#111115] border-t border-gray-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsProductModalOpen(false);
                  setEditingProduct(null);
                }}
                className="px-5 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                Voltar
              </button>
              
              <button
                type="submit"
                className="bg-gradient-to-r from-gold-500 to-gold-400 text-black font-bold px-6 py-2.5 rounded-xl text-xs border border-gold-600 shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                Salvar Produto
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  function handleBorderFilterToggle(bName: string) {
    const list = editingProduct?.borders_available || [];
    const updated = list.includes(bName) ? list.filter((b) => b !== bName) : [...list, bName];
    setEditingProduct({ ...editingProduct, borders_available: updated });
  }

  function handleAdditionalFilterToggle(aName: string) {
    const list = editingProduct?.additionals_available || [];
    const updated = list.includes(aName) ? list.filter((a) => a !== aName) : [...list, aName];
    setEditingProduct({ ...editingProduct, additionals_available: updated });
  }
}
