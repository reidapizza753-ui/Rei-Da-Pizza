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
  saveAllCategories,
  SUPABASE_SQL_SETUP
} from "./db/db";
import { Company, Configs, Category, Product, CartItem, FeaturedPromo } from "./types";
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
import {
  initMetaPixel,
  trackPageView,
  trackViewContent,
  trackAddToCart,
  trackRemoveFromCart,
  trackInitiateCheckout
} from "./utils/metaPixel";

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
  const [dbError, setDbError] = useState<string | null>(null);

  // Customer experience states
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [activeProductForModal, setActiveProductForModal] = useState<Product | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [halfPizzaInProgress, setHalfPizzaInProgress] = useState<Product | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [toastText, setToastText] = useState<string | null>(null);

  // Promo and featured states
  const [featuredPromos, setFeaturedPromos] = useState<FeaturedPromo[]>([]);
  const [selectedPromoPrice, setSelectedPromoPrice] = useState<number | undefined>(undefined);

  const handleSaveFeaturedPromos = (newPromos: FeaturedPromo[]) => {
    localStorage.setItem("pizzaria_featured_v1", JSON.stringify(newPromos));
    setFeaturedPromos(newPromos);
    setToastText("Promoções em destaque salvas com sucesso!");
  };

  // References
  const menuSectionRef = useRef<HTMLDivElement>(null);
  const isPopStateRef = useRef(false);

  // Auto-dismiss toast notification
  useEffect(() => {
    if (toastText) {
      const timer = setTimeout(() => {
        setToastText(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastText]);

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

  // 1. Initialize Meta Pixel base on layout mount
  useEffect(() => {
    initMetaPixel();
  }, []);

  // 2. Track Route PageViews on router navigation (Home, Cardápio, Carrinho, Checkout, /redirecionando)
  useEffect(() => {
    if (isAdminView) {
      return; // Do not fire pixel in admin
    }

    if (isRedirectingView) {
      trackPageView("/redirecionando");
      return;
    }

    if (isCartOpen) {
      if (currentStep === 1) {
        trackPageView("Carrinho");
      } else {
        trackPageView("Checkout");
      }
    } else {
      // If category selected and menu is being browsed, track as Cardápio. Else track as Home.
      if (selectedCategoryId !== "") {
        trackPageView("Cardápio");
      } else {
        trackPageView("Home");
      }
    }
  }, [isAdminView, isRedirectingView, isCartOpen, currentStep, selectedCategoryId]);

  // 3. Track product details viewed (ViewContent)
  useEffect(() => {
    if (activeProductForModal) {
      const cat = categories.find((c) => c.id === activeProductForModal.category_id);
      trackViewContent(activeProductForModal, cat?.name);
    }
  }, [activeProductForModal, categories]);

  // 4. Track InitiateCheckout whenever customer views their cart drawer
  useEffect(() => {
    if (isCartOpen && cartItems.length > 0 && currentStep === 1) {
      trackInitiateCheckout(cartItems);
    }
  }, [isCartOpen, cartItems.length, currentStep]);

  // History API popstate & pushState synchronization for catalog, cart and checkout screen transitions
  useEffect(() => {
    if (isAdminView || isRedirectingView) return;

    // Set initial state
    if (!window.history.state || typeof window.history.state !== "object" || !("isCartOpen" in window.history.state)) {
      window.history.replaceState(
        {
          isCartOpen: false,
          currentStep: 1,
          hasProductModal: false,
        },
        ""
      );
    }

    const handleCustomPopState = (event: PopStateEvent) => {
      if (isAdminView || isRedirectingView) return;

      const state = event.state;
      if (state && typeof state === "object" && "isCartOpen" in state) {
        isPopStateRef.current = true;
        setIsCartOpen(state.isCartOpen);
        setCurrentStep(state.currentStep || 1);
        if (!state.hasProductModal) {
          setActiveProductForModal(null);
        }
      } else {
        isPopStateRef.current = true;
        setIsCartOpen(false);
        setCurrentStep(1);
        setActiveProductForModal(null);
      }
    };

    window.addEventListener("popstate", handleCustomPopState);
    return () => {
      window.removeEventListener("popstate", handleCustomPopState);
    };
  }, [isAdminView, isRedirectingView]);

  useEffect(() => {
    if (isAdminView || isRedirectingView) return;

    if (isPopStateRef.current) {
      isPopStateRef.current = false;
      return;
    }

    const hasProductModal = activeProductForModal !== null;
    const currentState = window.history.state;

    const wantsState = {
      isCartOpen,
      currentStep,
      hasProductModal,
    };

    const isDifferent =
      !currentState ||
      currentState.isCartOpen !== wantsState.isCartOpen ||
      currentState.currentStep !== wantsState.currentStep ||
      currentState.hasProductModal !== wantsState.hasProductModal;

    if (isDifferent) {
      window.history.pushState(wantsState, "");
    }
  }, [isCartOpen, currentStep, activeProductForModal, isAdminView, isRedirectingView]);

  // Fetch initial data from storage layers
  const loadDatabase = async () => {
    try {
      setIsLoading(true);
      setDbError(null);

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

      // Background preloading of all product images in parallel for blazing-fast navigation
      if (dbProducts && dbProducts.length > 0) {
        setTimeout(() => {
          dbProducts.forEach((product) => {
            if (product.photo && product.photo.trim() !== "") {
              const img = new Image();
              img.src = product.photo;
            }
          });
        }, 50);
      }

      // Load featured promos from storage
      const savedFeatured = localStorage.getItem("pizzaria_featured_v1");
      if (savedFeatured) {
        try {
          setFeaturedPromos(JSON.parse(savedFeatured));
        } catch (err) {
          console.error("Error parsing saved promos:", err);
        }
      } else {
        const defaultFeatured: FeaturedPromo[] = [
          { productId: "prod-sal-mussarela", label: "Mussarela Especial", promoPrice: 29.90 },
          { productId: "prod-sal-calabresa", label: "Tradicional Defumada", promoPrice: 29.90 },
          { productId: "prod-sal-portuguesa", label: "Campeã de Vendas", promoPrice: 34.90 }
        ];
        localStorage.setItem("pizzaria_featured_v1", JSON.stringify(defaultFeatured));
        setFeaturedPromos(defaultFeatured);
      }

      // Select first active category by default
      const sortedActiveCats = [...dbCategories]
        .filter((c) => c.active)
        .sort((a, b) => a.order - b.order);
      
      if (sortedActiveCats.length > 0) {
        setSelectedCategoryId(sortedActiveCats[0].id);
      }
    } catch (e) {
      console.error("Critical error loading digital menu database:", e);
      setDbError(e instanceof Error ? e.message : String(e));
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

    const trackedItem: CartItem = {
      ...newItem,
      id: `cart-${compId}-${Date.now()}`,
    };

    if (existingIdx > -1) {
      // Coalesce same customizations by sum quantity
      const updated = [...cartItems];
      updated[existingIdx].quantity += newItem.quantity;
      saveCartToStorage(updated);
    } else {
      // Join as discrete cart entry
      saveCartToStorage([...cartItems, trackedItem]);
    }

    if (newItem.is_half_and_half) {
      setHalfPizzaInProgress(null);
    }

    // Trigger Meta Pixel AddToCart track
    const cat = categories.find((c) => c.id === newItem.product.category_id);
    trackAddToCart(trackedItem, cat?.name);

    // Gentle notification bar at bottom of menu screen
    const pName = newItem.product.name;
    setToastText(`Você adicionou ${pName} ao carrinho.`);
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
    const itemToRemove = cartItems.find((i) => i.id === id);
    if (itemToRemove) {
      const cat = categories.find((c) => c.id === itemToRemove.product.category_id);
      trackRemoveFromCart(itemToRemove, cat?.name);
    }
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

  // --- DATABASE SETUP OR MISSING TABLES DIAGNOSTIC VIEW ---
  if (dbError) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] text-white flex flex-col items-center justify-center p-6 md:p-12 font-sans selection:bg-[#D4AF37] selection:text-black">
        <div className="bg-[#16161C] border border-[#8B0000]/30 max-w-2xl w-full rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-650" />
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex-shrink-0">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="font-serif font-black text-2xl text-white">Supabase: Tabelas Não Encontradas</h2>
              <p className="text-sm text-gray-400">
                O site está conectado ao Supabase corretamento, mas uma ou mais tabelas essenciais ainda não foram criadas.
              </p>
            </div>
          </div>

          <div className="bg-[#0F0F0F] border border-gray-800 p-4 rounded-2xl text-xs text-red-400 font-mono overflow-x-auto whitespace-pre-wrap">
            {dbError}
          </div>

          <div className="space-y-3">
            <h3 className="font-serif font-bold text-base text-white">Como resolver em 30 segundos:</h3>
            <ol className="list-decimal list-inside text-xs text-gray-300 space-y-2">
              <li>Acesse o painel do seu <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] hover:underline font-bold">Supabase</a></li>
              <li>Entre no menu <span className="font-bold text-white">SQL Editor</span> (ícone de terminal na barra lateral esquerda)</li>
              <li>Clique em <span className="font-bold text-white">New Query</span> (Nova Consulta) no topo</li>
              <li>Copie o script SQL completo abaixo, cole lá e clique no botão <span className="font-bold text-white">Run</span> (Executar)</li>
              <li>Após a execução bem sucedida, clique no botão <span className="font-bold text-[#D4AF37]">Verificar Conexão</span> abaixo para sincronizar.</li>
            </ol>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#D4AF37]">SCRIPT SQL DE CONFIGURAÇÃO</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
                  alert("Script SQL copiado com sucesso!");
                }}
                className="text-xs bg-amber-500/10 hover:bg-[#D4AF37] hover:text-black hover:border-transparent border border-amber-500/20 text-[#D4AF37] px-3 py-1.5 rounded-xl transition-all font-semibold"
              >
                Copiar SQL completo
              </button>
            </div>
            <textarea
              readOnly
              value={SUPABASE_SQL_SETUP}
              className="w-full h-40 bg-[#0F0F0F] border border-gray-800 rounded-2xl p-3 font-mono text-xs text-gray-400 focus:outline-none resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-800/60">
            <p className="text-[10px] text-gray-500">
              Se desejar reverter temporariamente para dados locais, remova as credenciais de Supabase no arquivo .env.
            </p>
            <button
              onClick={() => {
                setDbError(null);
                loadDatabase();
              }}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#8B0000] hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all text-center"
            >
              Verificar Conexão
            </button>
          </div>
        </div>
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
          featuredPromos={featuredPromos}
          onSaveFeaturedPromos={handleSaveFeaturedPromos}
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

  const calculateCartTotal = () => {
    return cartItems.reduce((acc, item) => {
      let basePrice = item.product.price;
      if (item.is_half_and_half && item.half_flavor_1 && item.half_flavor_2) {
        basePrice = Math.max(item.half_flavor_1.price, item.half_flavor_2.price);
      }
      const borderPrice = item.selected_border ? item.selected_border.price : 0;
      const additionalsPrice = (item.selected_additionals || []).reduce((sum, ad) => sum + ad.price, 0);
      return acc + (basePrice + borderPrice + additionalsPrice) * item.quantity;
    }, 0);
  };

  const formatValue = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

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
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>Ofertas Imperdíveis</span>
              </div>
              <h3 className="font-serif font-black italic text-xl md:text-3xl text-white">Promoções em Destaque</h3>
            </div>
            {/* Badges/Tags Informacionais */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 bg-black/40 border border-gray-850 px-4 py-2.5 rounded-2xl">
              <span className="flex items-center gap-1.5 font-semibold text-white">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span> Forno a Lenha
              </span>
              <span className="text-gray-600">•</span>
              <span className="flex items-center gap-1.5 font-semibold text-white">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Pizza Inteira 8 Pedaços
              </span>
              <span className="text-gray-600">•</span>
              <span className="flex items-center gap-1.5 font-semibold text-white">
                <span className="w-2 h-2 rounded-full bg-gold-400"></span> Meio a Meio Disponível
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredPromos
              .filter((promo) => {
                const item = products.find((p) => p.id === promo.productId);
                return item && item.active;
              })
              .map((promo, idx) => {
                const item = products.find((p) => p.id === promo.productId)!;
                return (
                  <div
                    key={`${promo.productId}-${idx}`}
                    onClick={() => {
                      setSelectedPromoPrice(promo.promoPrice);
                      setActiveProductForModal(item);
                    }}
                    className="relative cursor-pointer group overflow-hidden bg-[#16161C] border border-gray-850 hover:border-[#D4AF37]/50 rounded-3xl p-5 flex items-center justify-between gap-4 hover:shadow-xl hover:shadow-black/30 hover:scale-[1.01] active:scale-95 transition-all duration-300"
                  >
                    <div className="space-y-1.5 min-w-0">
                      {promo.label && (
                        <span className="text-[9px] font-mono font-black text-[#D4AF37] uppercase bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2.5 py-1 rounded-full inline-block tracking-widest leading-none">
                          ★ {promo.label}
                        </span>
                      )}
                      <h4 className="font-serif font-black text-base text-white truncate">{item.name}</h4>
                      <p className="text-xs text-gray-400 font-light truncate font-sans">{item.description || "Deliciosa pizza artesanal."}</p>
                      <div className="flex items-baseline gap-2 pt-1">
                        {promo.promoPrice > 0 && promo.promoPrice !== item.price && (
                          <span className="text-xs text-gray-500 line-through">De R$ {item.price.toFixed(2)}</span>
                        )}
                        <span className="text-lg font-mono font-bold text-[#D4AF37]">
                          R$ {(promo.promoPrice || item.price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black/40 border border-gray-850 shrink-0 select-none">
                      {item.photo ? (
                        <img
                          src={item.photo}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-[10px] text-gray-600 font-bold uppercase font-sans">
                          Pizza
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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

      {/* 5. PROMOÇÃO CARA DO GOL (Buy 2, Get Guaraná + Free Delivery) */}
      <div className="max-w-7xl mx-auto px-4 pt-6 w-full">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#5a0000] via-[#8B0000] to-neutral-900 border-2 border-[#D4AF37] p-5 md:p-6 shadow-2xl shadow-red-950/40">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center space-x-1.5 bg-[#D4AF37]/15 border border-[#D4AF37]/35 px-3 py-1 rounded-full text-[#D4AF37] text-[10px] font-mono font-black uppercase tracking-wider leading-none">
                <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "3s" }} />
                <span>Oferta Especial do Chef</span>
              </span>
              <h4 className="font-serif font-black italic text-xl md:text-3xl text-white tracking-wide leading-tight">
                COMPROU <span className="text-[#D4AF37]">2 PIZZAS</span>? <span className="text-green-400">GANHOU!</span>
              </h4>
              <p className="text-xs md:text-sm text-gray-200 leading-relaxed max-w-xl">
                Na compra de <strong className="text-white">quaisquer de nossas pizzas</strong>, você ganha de brinde um <strong className="text-green-400">Guaraná Antarctica 2L</strong> geladinho e a sua <strong className="text-[#D4AF37]">Taxa de Entrega é GRÁTIS!</strong> 🏍️💨
              </p>
            </div>

            <div className="bg-[#141418]/90 backdrop-blur border border-[#D4AF37]/30 p-4 rounded-2xl flex items-center space-x-4 shrink-0 shadow shadow-black">
              <div className="flex -space-x-3 shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#8B0000] border-2 border-red-500 flex items-center justify-center font-serif font-black text-white text-[10px] leading-none shadow shadow-black">
                  🍕 1
                </div>
                <div className="w-10 h-10 rounded-full bg-[#8B0000] border-2 border-red-500 flex items-center justify-center font-serif font-black text-white text-[10px] leading-none shadow shadow-black">
                  🍕 2
                </div>
              </div>
              <div className="text-gray-500 font-mono text-xs font-bold shrink-0">+</div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] text-green-400 font-bold uppercase tracking-widest leading-none font-mono">Brinde da Casa</span>
                <span className="text-xs font-black text-white mt-1">Guaraná Antarctica 2L</span>
                <span className="text-[10px] text-gray-400 font-light mt-0.5">Taxa de Entrega: R$ 0,00</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
        onClose={() => {
          setActiveProductForModal(null);
          setSelectedPromoPrice(undefined);
        }}
        onAddToCart={handleAddToCart}
        halfPizzaInProgress={halfPizzaInProgress}
        onSelectFirstHalf={(p) => setHalfPizzaInProgress(p)}
        appliedPromoPrice={selectedPromoPrice}
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
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
      />

      {/* 10. Sticky Mobile Cart Bottom Bar */}
      {totalCartItemsCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/90 backdrop-blur-md border-t border-[#D4AF37]/25 z-40 md:hidden flex justify-between items-center gap-3 shadow-2xl">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full flex items-center justify-between bg-gradient-to-r from-[#D4AF37] to-[#8B0000] hover:brightness-110 active:scale-95 text-white font-extrabold text-xs py-3.5 px-5.5 rounded-xl border border-white/10 transition-all cursor-pointer shadow-lg uppercase tracking-wider font-mono animate-in fade-in slide-in-from-bottom"
            title="Meu Pedido"
          >
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4 text-white" />
              <span>Meu Pedido</span>
              <span className="bg-white text-[#8B0000] rounded-full w-5 h-5 flex items-center justify-center font-mono font-bold text-[10px] scale-90">
                {totalCartItemsCount}
              </span>
            </div>
            <span className="font-extrabold font-mono text-xs">{formatValue(calculateCartTotal())}</span>
          </button>
        </div>
      )}

      {/* 11. Custom Elegant dismissal Toast message overlay */}
      {toastText && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-center space-x-3 bg-neutral-900/95 border border-[#D4AF37]/40 px-5 py-3 rounded-full shadow-2xl text-white font-sans text-xs font-semibold whitespace-nowrap tracking-wide leading-none">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />
            <span>{toastText}</span>
          </div>
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
