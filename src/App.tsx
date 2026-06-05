import React, { useState, useEffect, useRef } from "react";
import {
  getCompany,
  getConfigs,
  getCategories,
  getProducts,
  saveCompany as dbSaveCompany,
  saveConfigs as dbSaveConfigs,
  saveCategory as dbSaveCategory,
  deleteCategory as dbDeleteCategory,
  saveProduct as dbSaveProduct,
  deleteProduct as dbDeleteProduct,
  saveAllCategories
} from "./db/db";
import { Company, Configs, Category, Product, CartItem } from "./types";
import { DEFAULT_COMPANY, DEFAULT_CONFIGS } from "./db/initialData";
import Header from "./components/Header";
import Banner from "./components/Banner";
import Highlights from "./components/Highlights";
import CategoryTabs from "./components/CategoryTabs";
import ProductCard from "./components/ProductCard";
import ProductModal from "./components/ProductModal";
import CartSlideOver from "./components/CartSlideOver";
import AdminPanel from "./components/AdminPanel";
import RedirectScreen from "./components/RedirectScreen";
import { Pizza, ShieldAlert, Sparkles, Flame, Utensils, BadgePercent, ShoppingBag } from "lucide-react";

export default function App() {
  // Navigation states (/admin router check)
  const [isAdminView, setIsAdminView] = useState(false);
  const [isRedirectingView, setIsRedirectingView] = useState(false);

  // Core content states
  const [company, setCompany] = useState<Company>(DEFAULT_COMPANY);
  const [configs, setConfigs] = useState<Configs>(DEFAULT_CONFIGS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Customer experience states
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [activeProductForModal, setActiveProductForModal] = useState<Product | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [halfPizzaInProgress, setHalfPizzaInProgress] = useState<Product | null>(null);

  // References
  const menuSectionRef = useRef<HTMLDivElement>(null);

  // Handle SPA navigation paths & hashes
  useEffect(() => {
    const handleUrlCheck = () => {
      const isPathAdmin = window.location.pathname === "/admin";
      const isHashAdmin = window.location.hash === "#admin" || window.location.hash === "#/admin";
      
      const isPathRedirect = window.location.pathname === "/redirecionando";
      const isHashRedirect = window.location.hash === "#redirecionando" || window.location.hash === "#/redirecionando";

      setIsAdminView(isPathAdmin || isHashAdmin);
      setIsRedirectingView(isPathRedirect || isHashRedirect);
    };

    // Run initially
    handleUrlCheck();

    // Listeners
    window.addEventListener("popstate", handleUrlCheck);
    window.addEventListener("hashchange", handleUrlCheck);

    return () => {
      window.removeEventListener("popstate", handleUrlCheck);
      window.removeEventListener("hashchange", handleUrlCheck);
    };
  }, []);

  // Fetch initial data from storage layers
  const loadDatabase = async () => {
    try {
      setIsLoading(true);

      const [dbCompany, dbConfigs, dbCategories, dbProducts] = await Promise.all([
        getCompany(),
        getConfigs(),
        getCategories(),
        getProducts(),
      ]);

      setCompany(dbCompany);
      setConfigs(dbConfigs);
      setCategories(dbCategories);
      setProducts(dbProducts);

      // Select first active category by default
      const sortedActiveCats = [...dbCategories]
        .filter((c) => c.active)
        .sort((a, b) => a.order - b.order);
      
      if (sortedActiveCats.length > 0) {
        setSelectedCategoryId(sortedActiveCats[0].id);
      }
    } catch (e) {
      console.error("Critical error loading digital menu database:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatabase();
  }, []);

  // Sync Cart Items with LocalStorage so guest orders survive accidental page reloads
  useEffect(() => {
    const savedCart = localStorage.getItem("pizzaria_cart_items_v1");
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error("Error parsing cart items storage:", e);
      }
    }
  }, []);

  const saveCartToStorage = (updatedItems: CartItem[]) => {
    setCartItems(updatedItems);
    localStorage.setItem("pizzaria_cart_items_v1", JSON.stringify(updatedItems));
  };

  // Navigating controls
  const navigateToAdmin = () => {
    window.location.hash = "admin";
    setIsAdminView(true);
  };

  const navigateToStore = () => {
    window.location.hash = "";
    // If the server was serving /admin, push the clean slash
    if (window.location.pathname === "/admin") {
      window.history.pushState({}, "", "/");
    }
    setIsAdminView(false);
  };

  // Check custom business open/closed schedules
  const isShopCurrentlyOpen = (): boolean => {
    if (configs.is_force_closed) return false;

    // Get current local time
    const now = new Date();
    const currentM = now.getHours() * 60 + now.getMinutes();

    const parseToMinutes = (timeStr: string): number => {
      const parts = (timeStr || "").split(":");
      if (parts.length !== 2) return 0;
      return Number(parts[0]) * 60 + Number(parts[1]);
    };

    const startM = parseToMinutes(configs.working_hours_start);
    const endM = parseToMinutes(configs.working_hours_end);

    if (startM <= endM) {
      return currentM >= startM && currentM <= endM;
    } else {
      // Over midnight schedules e.g., 18:00 to 02:00
      return currentM >= startM || currentM <= endM;
    }
  };

  const isClosed = !isShopCurrentlyOpen();

  // Scroll downwards to catalog block
  const handleScrollToMenu = () => {
    if (menuSectionRef.current) {
      menuSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // --- ADMIN WRITE PROXY METHODS ---

  const handleSaveCompany = async (newCompany: Company) => {
    await dbSaveCompany(newCompany);
    setCompany(newCompany);
  };

  const handleSaveConfigs = async (newConfigs: Configs) => {
    await dbSaveConfigs(newConfigs);
    setConfigs(newConfigs);
  };

  const handleSaveCategory = async (cat: Category) => {
    await dbSaveCategory(cat);
    const updated = await getCategories();
    setCategories(updated);
    
    // Auto select first if none selected or if selected was deleted
    if (!selectedCategoryId || !updated.some((c) => c.id === selectedCategoryId && c.active)) {
      const activeSorted = updated.filter((c) => c.active).sort((a, b) => a.order - b.order);
      if (activeSorted.length > 0) setSelectedCategoryId(activeSorted[0].id);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    await dbDeleteCategory(id);
    const updated = await getCategories();
    setCategories(updated);

    if (selectedCategoryId === id) {
      const activeSorted = updated.filter((c) => c.active).sort((a, b) => a.order - b.order);
      if (activeSorted.length > 0) setSelectedCategoryId(activeSorted[0].id);
    }
  };

  const handleSaveProduct = async (prod: Product) => {
    await dbSaveProduct(prod);
    const updated = await getProducts();
    setProducts(updated);
  };

  const handleDeleteProduct = async (id: string) => {
    await dbDeleteProduct(id);
    const updated = await getProducts();
    setProducts(updated);
  };

  const handleReorderCategories = async (unordered: Category[]) => {
    await saveAllCategories(unordered);
    setCategories(unordered);
  };

  const handleSelectProductCard = (product: Product) => {
    if (halfPizzaInProgress) {
      const isEligible = product.is_pizza && product.can_half_and_half !== false;
      if (!isEligible) {
        alert(`Você começou uma pizza meio a meio com o sabor "${halfPizzaInProgress.name}". Antes de adicionar outros itens, escolha a segunda metade da sua pizza no cardápio ou cancele a seleção atual.`);
        return;
      }
    }
    setActiveProductForModal(product);
  };

  // --- CART MANAGEMENT METHODS ---

  // Compose transient UUID to group exact matching custom combinations correctly
  const generateCartCombinationKey = (item: Omit<CartItem, "id">): string => {
    const borderKey = item.selected_border ? item.selected_border.name : "none";
    const addKey = (item.selected_additionals || [])
      .map((a) => a.name)
      .sort()
      .join(",");
    const obsKey = (item.observation || "").trim().toLowerCase();
    return `${item.product.id}-${borderKey}-${addKey}-${obsKey}`;
  };

  const handleAddToCart = (newItem: Omit<CartItem, "id">) => {
    const compId = generateCartCombinationKey(newItem);
    const existingIdx = cartItems.findIndex((x) => generateCartCombinationKey(x) === compId);

    if (existingIdx > -1) {
      // Coalesce same customizations by sum quantity
      const updated = [...cartItems];
      updated[existingIdx].quantity += newItem.quantity;
      saveCartToStorage(updated);
    } else {
      // Join as discrete cart entry
      const itemWithId: CartItem = {
        ...newItem,
        id: `cart-${compId}-${Date.now()}`,
      };
      saveCartToStorage([...cartItems, itemWithId]);
    }

    if (newItem.is_half_and_half) {
      setHalfPizzaInProgress(null);
    }

    // Slide-open the cart immediately for high conversion feeling!
    setIsCartOpen(true);
  };

  const handleUpdateProductQuantity = (id: string, delta: number) => {
    const updated = cartItems
      .map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return { ...item, quantity: newQty };
        }
        return item;
      })
      .filter((item) => item.quantity > 0); // Exclude if qty drops to 0
    saveCartToStorage(updated);
  };

  const handleRemoveCartItem = (id: string) => {
    const updated = cartItems.filter((i) => i.id !== id);
    saveCartToStorage(updated);
  };

  const handleClearCart = () => {
    saveCartToStorage([]);
    setIsCartOpen(false);
  };

  // Render Loader
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 rounded-full bg-[#8B0000]/10 border border-[#8B0000] mb-4 text-[#D4AF37] animate-spin">
          <Pizza className="w-9 h-9" />
        </div>
        <h4 className="font-serif font-bold text-lg text-white">Carregando Forno...</h4>
        <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Aguarde enquanto preparamos os melhores pratos artesanais da região.</p>
      </div>
    );
  }

  // --- IF REDIRECT SCREEN ---
  if (isRedirectingView) {
    return <RedirectScreen />;
  }

  // --- IF ADMIN SCREEN ---
  if (isAdminView) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] text-white">
        <AdminPanel
          onBackToStore={navigateToStore}
          company={company}
          configs={configs}
          categories={categories}
          products={products}
          onSaveCompany={handleSaveCompany}
          onSaveConfigs={handleSaveConfigs}
          onSaveCategory={handleSaveCategory}
          onDeleteCategory={handleDeleteCategory}
          onSaveProduct={handleSaveProduct}
          onDeleteProduct={handleDeleteProduct}
          onReorderCategories={handleReorderCategories}
        />
      </div>
    );
  }

  // Filter storefront items
  const activeCategories = [...categories]
    .filter((c) => c.active)
    .sort((a, b) => a.order - b.order);

  const activeProductsFiltered = products.filter(
    (p) => p.active && p.category_id === selectedCategoryId
  );

  const totalCartItemsCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white flex flex-col font-sans selection:bg-[#D4AF37] selection:text-black">
      {/* 1. Header fixed wrapper */}
      <Header
        company={company}
        configs={configs}
        isOpen={!isClosed}
        cartItemsCount={totalCartItemsCount}
        onOpenCart={() => setIsCartOpen(true)}
        onNavigateToAdmin={navigateToAdmin}
      />

      {/* 2. Main Hero Banner promotions */}
      <Banner company={company} onScrollToMenu={handleScrollToMenu} />

      {/* --- PROMOÇÕES EM DESTAQUE --- */}
      <section className="bg-[#121216] border-b border-white/5 py-10 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-[#D4AF37] text-xs font-mono font-bold tracking-widest uppercase mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ofertas Imperdíveis</span>
              </div>
              <h3 className="font-serif font-black italic text-xl md:text-3xl text-white">Promoções em Destaque</h3>
            </div>
            {/* Badges/Tags Informacionais */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 bg-black/40 border border-gray-850 px-4 py-2.5 rounded-2xl">
              <span className="flex items-center gap-1.5 font-semibold text-white">
                <Flame className="w-4 h-4 text-orange-500" /> Forno a Lenha
              </span>
              <span className="text-gray-600">•</span>
              <span className="flex items-center gap-1.5 font-semibold text-white">
                <Pizza className="w-4 h-4 text-amber-500" /> Pizza Inteira 8 Pedaços
              </span>
              <span className="text-gray-600">•</span>
              <span className="flex items-center gap-1.5 font-semibold text-white">
                <Utensils className="w-4 h-4 text-gold-400" /> Meio a Meio Disponível
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Promo 1 */}
            <div className="relative group overflow-hidden bg-[#16161C] border border-gray-800 rounded-3xl p-5 flex items-center justify-between gap-4 hover:border-[#D4AF37]/50 transition-all duration-300">
              <div className="space-y-1.5 min-w-0">
                <span className="text-[10px] font-mono font-bold text-[#D4AF37] uppercase bg-[#D4AF37]/10 px-2 py-0.5 rounded-full inline-block">Mussarela Especial</span>
                <h4 className="font-serif font-black text-base text-white truncate">Pizza Mussarela</h4>
                <p className="text-xs text-gray-400 font-light truncate font-sans">Clássica e irresistível muçarela</p>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-xs text-gray-500 line-through">De R$39,90</span>
                  <span className="text-lg font-mono font-bold text-[#D4AF37]">R$ 34,90</span>
                </div>
              </div>
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black/40 border border-gray-850 shrink-0 select-none">
                <img src="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=150&auto=format&fit=crop&q=80" alt="Pizza Mussarela" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
            </div>

            {/* Promo 2 */}
            <div className="relative group overflow-hidden bg-[#16161C] border border-gray-800 rounded-3xl p-5 flex items-center justify-between gap-4 hover:border-[#D4AF37]/50 transition-all duration-300">
              <div className="space-y-1.5 min-w-0">
                <span className="text-[10px] font-mono font-bold text-[#D4AF37] uppercase bg-[#D4AF37]/10 px-2 py-0.5 rounded-full inline-block">Tradicional Defumada</span>
                <h4 className="font-serif font-black text-base text-white truncate">Pizza Calabresa</h4>
                <p className="text-xs text-gray-400 font-light truncate font-sans">Rodelas de calabresa defumada</p>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-xs text-gray-500 line-through">De R$39,90</span>
                  <span className="text-lg font-mono font-bold text-[#D4AF37]">R$ 34,90</span>
                </div>
              </div>
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black/40 border border-gray-850 shrink-0 select-none">
                <img src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=150&auto=format&fit=crop&q=80" alt="Pizza Calabresa" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
            </div>

            {/* Promo 3 */}
            <div className="relative group overflow-hidden bg-[#16161C] border border-gray-800 rounded-3xl p-5 flex items-center justify-between gap-4 hover:border-[#D4AF37]/50 transition-all duration-300 sm:col-span-2 lg:col-span-1">
              <div className="space-y-1.5 min-w-0">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block">Novidade Doce</span>
                <h4 className="font-serif font-black text-base text-white truncate">Esfirras Doces</h4>
                <p className="text-xs text-gray-400 font-light truncate font-sans">Chocolate, Prestígio e churros</p>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-xs text-gray-500 font-sans">Massa fofinha individual</span>
                  <span className="text-lg font-mono font-bold text-emerald-400">A partir de R$ 4,99</span>
                </div>
              </div>
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black/40 border border-gray-850 shrink-0 select-none">
                <img src="https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=150&auto=format&fit=crop&q=80" alt="Esfirras Doces" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CLOSED WARNING ANNOUNCEMENT (Loja Fechada Alert box) */}
      {isClosed && (
        <div className="bg-gradient-to-r from-amber-950/80 to-brand-red/40 border-y border-red-900/60 p-4.5 text-center">
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-gold-400 animate-pulse flex-shrink-0" />
            <p className="text-xs md:text-sm text-gray-100 font-semibold leading-relaxed">
              {configs.closed_message || "Estamos fechados no momento. Você ainda pode visualizar o cardápio."}
            </p>
          </div>
        </div>
      )}

      {/* 6. Filter tabs for categories */}
      <div ref={menuSectionRef} />
      {activeCategories.length > 0 && (
        <CategoryTabs
          categories={activeCategories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={(id) => setSelectedCategoryId(id)}
        />
      )}

      {/* 7. Primary Products Catalog grid */}
      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
        {activeCategories.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="font-serif font-bold text-lg text-gray-400">Nenhum item disponível</p>
            <p className="text-xs text-gray-500 max-w-[280px] mx-auto mt-1">A pizzaria ainda não ativou nenhuma categoria para exibição.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Catalog Group Header */}
            <div>
              <p className="text-[#D4AF37] font-mono text-[10px] tracking-widest font-bold uppercase">Categoria Selecionada</p>
              <h3 className="font-serif font-black text-xl md:text-2xl text-white mt-0.5">
                {categories.find((c) => c.id === selectedCategoryId)?.name || "Nossa Seleção"}
              </h3>
            </div>

            {activeProductsFiltered.length === 0 ? (
              <div className="bg-[#1A1A1A] border border-white/5 rounded-3xl p-12 text-center text-gray-500">
                <p className="font-medium text-sm text-gray-400">Nenhum produto listado nesta categoria.</p>
                <p className="text-xs text-gray-650 mt-1">Navegue pelas outras categorias acima ou volte mais tarde.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {activeProductsFiltered.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelectProduct={handleSelectProductCard}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- FLOATING NOTIFICATION BANNER FOR HALF-AND-HALF PROGRESSION --- */}
      {halfPizzaInProgress && (
        <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[420px] bg-[#16161A] border-2 border-[#D4AF37]/50 rounded-3xl shadow-2xl p-4.5 z-45 flex items-center gap-4 text-left">
          <div className="flex-grow">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#D4AF37]/10 text-[#D4AF37] font-mono text-[8px] font-bold tracking-widest uppercase mb-1">
              Pizza em Progresso
            </span>
            <p className="text-xs text-gray-100 font-bold leading-relaxed">
              1ª Metade: <span className="text-[#D4AF37] font-serif font-black">{halfPizzaInProgress.name}</span>
            </p>
            <p className="text-[10px] text-gray-400 font-light mt-0.5">
              Agora, clique em qualquer outra pizza para escolher a 2ª metade!
            </p>
          </div>
          <button
            onClick={() => setHalfPizzaInProgress(null)}
            className="px-4 py-2 rounded-full bg-[#8B0000] hover:bg-neutral-900 border border-red-900 text-white font-extrabold text-[10px] uppercase tracking-wider shadow-md transition-colors cursor-pointer shrink-0"
            id="btn-cancel-half-pizza"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* 8. Interactive Detail Selection Modal popup */}
      <ProductModal
        product={activeProductForModal}
        onClose={() => setActiveProductForModal(null)}
        onAddToCart={handleAddToCart}
        halfPizzaInProgress={halfPizzaInProgress}
        onSelectFirstHalf={(p) => setHalfPizzaInProgress(p)}
      />

      {/* 9. Sliding Cart over Drawer bar */}
      <CartSlideOver
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQty={handleUpdateProductQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        configs={configs}
        halfPizzaInProgress={halfPizzaInProgress}
        onCancelHalfPizza={() => setHalfPizzaInProgress(null)}
      />

      {/* 10. Sticky Mobile Cart Button */}
      {totalCartItemsCount > 0 && (
        <div className="fixed bottom-6 right-6 md:hidden z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-[#D4AF37] to-[#8B0000] hover:brightness-110 active:scale-95 text-white font-extrabold text-sm py-3.5 px-5 rounded-full shadow-2xl shadow-red-950/85 border border-[#fcdeb7]/30 transition-all cursor-pointer animate-bounce"
            style={{ animationDuration: '3s' }}
            title="Ver Carrinho"
          >
            <ShoppingBag className="w-4 h-4 text-white" />
            <span className="whitespace-nowrap font-medium text-xs">Ver Sacola</span>
            <span className="bg-white text-[#8B0000] rounded-full w-5 h-5 flex items-center justify-center font-mono font-bold text-xs">
              {totalCartItemsCount}
            </span>
          </button>
        </div>
      )}

      {/* 5. Qualitative Highlights of the Pizzeria */}
      <Highlights />

      {/* Footer credits bar */}
      <footer className="py-8 bg-black border-t border-white/5 px-4 text-center">
        <p className="text-xs text-gray-500">
          © 2026 {company.name}. Todos os direitos reservados.
        </p>
        <p className="text-[10px] text-gray-400 font-mono mt-1">
          Forno a Lenha Delivery • WhatsApp Integrado
        </p>
      </footer>
    </div>
  );
}
