import { createClient } from "@supabase/supabase-js";
import { Category, Product, Company, Configs } from "../types";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_PRODUCTS,
  DEFAULT_COMPANY,
  DEFAULT_CONFIGS
} from "./initialData";

const supabaseUrlRaw = ((import.meta as any).env?.VITE_SUPABASE_URL as string) || "";
// Clean trailing /rest/v1/ suffix if present to ensure standard JS SDK compatibility
const supabaseUrl = supabaseUrlRaw.trim().replace(/\/rest\/v1\/?$/, "");
const supabaseAnonKey = (((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || "").trim();
const supabaseBucket = (((import.meta as any).env?.VITE_SUPABASE_BUCKET as string) || "cardapio-images").trim();

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Local Storage Keys
const KEYS = {
  COMPANY: "pizzaria_company_v4",
  CONFIGS: "pizzaria_configs_v4",
  CATEGORIES: "pizzaria_categories_v4",
  PRODUCTS: "pizzaria_products_v4",
};

// Helper to initialize local storage if empty
export function initializeLocalStorageIfEmpty() {
  const oldCats = localStorage.getItem(KEYS.CATEGORIES);
  const isOutdated = oldCats && !oldCats.includes("cat-salgada");

  if (!localStorage.getItem(KEYS.COMPANY) || isOutdated) {
    localStorage.setItem(KEYS.COMPANY, JSON.stringify(DEFAULT_COMPANY));
  }
  if (!localStorage.getItem(KEYS.CONFIGS) || isOutdated) {
    localStorage.setItem(KEYS.CONFIGS, JSON.stringify(DEFAULT_CONFIGS));
  } else {
    // Migrate old default placeholder whatsapp numbers to the requested one
    try {
      const storedConfigsStr = localStorage.getItem(KEYS.CONFIGS);
      if (storedConfigsStr) {
        const parsed = JSON.parse(storedConfigsStr);
        if (parsed.whatsapp === "5511999999999" || parsed.whatsapp === "551199999-9999" || parsed.whatsapp === "") {
          parsed.whatsapp = "+55 800 000 3728";
          localStorage.setItem(KEYS.CONFIGS, JSON.stringify(parsed));
        }
      }
    } catch (e) {
      console.error("Failed to migrate old configs:", e);
    }
  }
  if (!localStorage.getItem(KEYS.CATEGORIES) || isOutdated) {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
  }
  if (!localStorage.getItem(KEYS.PRODUCTS) || isOutdated) {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
  }
}

// Ensure preloaded initial state is there
initializeLocalStorageIfEmpty();

// --- COMPANY INFO ---

export async function getCompany(): Promise<Company> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("pizzaria_company")
      .select("*");
    
    if (error) {
      console.error("Supabase load company error:", error);
      throw new Error(`Erro ao carregar 'pizzaria_company' do Supabase: ${error.message} (Código: ${error.code})`);
    }

    if (data && data.length > 0) {
      const row = data[0];
      return {
        name: row.name,
        logo: row.logo,
        banner_title: row.banner_title,
        banner_subtitle: row.banner_subtitle,
      };
    } else {
      // Automatic seeding of Company info in empty database
      const seedObj = {
        id: 1,
        name: DEFAULT_COMPANY.name,
        logo: DEFAULT_COMPANY.logo,
        banner_title: DEFAULT_COMPANY.banner_title,
        banner_subtitle: DEFAULT_COMPANY.banner_subtitle,
      };
      const { error: seedError } = await supabase
        .from("pizzaria_company")
        .insert(seedObj);
      
      if (seedError) {
        console.error("Failed to seed empty pizzaria_company table in Supabase:", seedError);
      }
      return DEFAULT_COMPANY;
    }
  }

  const localVal = localStorage.getItem(KEYS.COMPANY);
  return localVal ? JSON.parse(localVal) : DEFAULT_COMPANY;
}

export async function saveCompany(company: Company): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("pizzaria_company")
      .upsert({
        id: 1,
        name: company.name,
        logo: company.logo,
        banner_title: company.banner_title,
        banner_subtitle: company.banner_subtitle,
      });

    if (error) {
      console.error("Error saving company to Supabase:", error.message);
      throw new Error(`Erro ao salvar dados da empresa no Supabase: ${error.message}`);
    }
  } else {
    localStorage.setItem(KEYS.COMPANY, JSON.stringify(company));
  }
}

// --- CONFIGURATIONS ---

export async function getConfigs(): Promise<Configs> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("pizzaria_configs")
      .select("*");

    if (error) {
      console.error("Supabase load configs error:", error);
      throw new Error(`Erro ao carregar 'pizzaria_configs' do Supabase: ${error.message} (Código: ${error.code})`);
    }

    if (data && data.length > 0) {
      const row = data[0];
      return {
        whatsapp: row.whatsapp,
        delivery_fee: Number(row.delivery_fee),
        working_hours_start: row.working_hours_start,
        working_hours_end: row.working_hours_end,
        closed_message: row.closed_message,
        is_force_closed: !!row.is_force_closed,
      };
    } else {
      // Automatic seeding of Configs
      const seedObj = {
        id: 1,
        whatsapp: DEFAULT_CONFIGS.whatsapp,
        delivery_fee: DEFAULT_CONFIGS.delivery_fee,
        working_hours_start: DEFAULT_CONFIGS.working_hours_start,
        working_hours_end: DEFAULT_CONFIGS.working_hours_end,
        closed_message: DEFAULT_CONFIGS.closed_message,
        is_force_closed: DEFAULT_CONFIGS.is_force_closed,
      };
      const { error: seedError } = await supabase
        .from("pizzaria_configs")
        .insert(seedObj);
      
      if (seedError) {
        console.error("Failed to seed empty pizzaria_configs table in Supabase:", seedError);
      }
      return DEFAULT_CONFIGS;
    }
  }

  const localVal = localStorage.getItem(KEYS.CONFIGS);
  return localVal ? JSON.parse(localVal) : DEFAULT_CONFIGS;
}

export async function saveConfigs(configs: Configs): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("pizzaria_configs")
      .upsert({
        id: 1,
        whatsapp: configs.whatsapp,
        delivery_fee: configs.delivery_fee,
        working_hours_start: configs.working_hours_start,
        working_hours_end: configs.working_hours_end,
        closed_message: configs.closed_message,
        is_force_closed: configs.is_force_closed,
      });

    if (error) {
      console.error("Error saving configs to Supabase:", error.message);
      throw new Error(`Erro ao salvar configurações no Supabase: ${error.message}`);
    }
  } else {
    localStorage.setItem(KEYS.CONFIGS, JSON.stringify(configs));
  }
}

// --- CATEGORIES ---

export async function getCategories(): Promise<Category[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("pizzaria_categories")
      .select("*")
      .order("order", { ascending: true });

    if (error) {
      console.error("Supabase load categories error:", error);
      throw new Error(`Erro ao carregar 'pizzaria_categories' do Supabase: ${error.message} (Código: ${error.code})`);
    }

    if (data && data.length > 0) {
      return data as Category[];
    } else {
      // Automatic seeding of Categories
      const { error: seedError } = await supabase
        .from("pizzaria_categories")
        .insert(DEFAULT_CATEGORIES);
      
      if (seedError) {
        console.error("Failed to seed empty pizzaria_categories table in Supabase:", seedError);
      }
      return DEFAULT_CATEGORIES;
    }
  }

  const localVal = localStorage.getItem(KEYS.CATEGORIES);
  if (localVal) {
    const list: Category[] = JSON.parse(localVal);
    return list.sort((a, b) => a.order - b.order);
  }
  return DEFAULT_CATEGORIES;
}

export async function saveCategory(category: Category): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("pizzaria_categories")
      .upsert({
        id: category.id,
        name: category.name,
        active: category.active,
        order: category.order,
      });

    if (error) {
      console.error("Error saving category to Supabase:", error.message);
      throw new Error(`Erro ao salvar categoria no Supabase: ${error.message}`);
    }
  } else {
    const localVal = localStorage.getItem(KEYS.CATEGORIES);
    let list: Category[] = localVal ? JSON.parse(localVal) : [];
    list = list.filter((item) => item.id !== category.id);
    list.push(category);
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(list));
  }
}

export async function deleteCategory(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("pizzaria_categories")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting category from Supabase:", error.message);
      throw new Error(`Erro ao deletar categoria no Supabase: ${error.message}`);
    }
  } else {
    const localVal = localStorage.getItem(KEYS.CATEGORIES);
    if (localVal) {
      let list: Category[] = JSON.parse(localVal);
      list = list.filter((item) => item.id !== id);
      localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(list));
    }
  }
}

export async function saveAllCategories(categories: Category[]): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    // Slower, but simple bulk rewrite for order sorting
    for (const cat of categories) {
      const { error } = await supabase.from("pizzaria_categories").upsert({
        id: cat.id,
        name: cat.name,
        active: cat.active,
        order: cat.order,
      });
      if (error) {
        console.error("Supabase saveAllCategories error:", error);
        throw new Error(`Erro ao salvar ordem de categoria no Supabase: ${error.message}`);
      }
    }
  } else {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  }
}

// --- PRODUCTS ---

export async function getProducts(): Promise<Product[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("pizzaria_products")
      .select("*");

    if (error) {
      console.error("Supabase load products error:", error);
      throw new Error(`Erro ao carregar 'pizzaria_products' do Supabase: ${error.message} (Código: ${error.code})`);
    }

    if (data && data.length > 0) {
      return data.map((item) => ({
        id: item.id,
        name: item.name,
        photo: item.photo,
        description: item.description,
        ingredients: item.ingredients,
        price: Number(item.price),
        category_id: item.category_id,
        active: !!item.active,
        is_pizza: !!item.is_pizza,
        borders_available: item.borders_available || [],
        additionals_available: item.additionals_available || [],
        can_half_and_half: item.can_half_and_half !== undefined ? !!item.can_half_and_half : !!item.is_pizza,
        tipo_produto: item.tipo_produto || (!!item.is_pizza ? (item.category_id === "cat-doce" ? "Pizza Doce" : "Pizza Salgada") : (item.category_id === "cat-bebida" ? "Bebida" : item.category_id === "cat-sobremesa" ? "Sobremesa" : "Esfirra Doce")),
      })) as Product[];
    } else {
      // Automatic seeding of Products
      const seedArray = DEFAULT_PRODUCTS.map((p) => ({
        id: p.id,
        name: p.name,
        photo: p.photo,
        description: p.description,
        ingredients: p.ingredients,
        price: p.price,
        category_id: p.category_id,
        active: p.active,
        is_pizza: p.is_pizza,
        borders_available: p.borders_available,
        additionals_available: p.additionals_available,
        can_half_and_half: p.can_half_and_half ?? p.is_pizza,
        tipo_produto: p.tipo_produto ?? (p.is_pizza ? (p.category_id === "cat-doce" ? "Pizza Doce" : "Pizza Salgada") : "Outro"),
      }));

      const { error: seedError } = await supabase
        .from("pizzaria_products")
        .insert(seedArray);
      
      if (seedError) {
        console.error("Failed to seed empty pizzaria_products table in Supabase:", seedError);
      }
      return DEFAULT_PRODUCTS;
    }
  }

  const localVal = localStorage.getItem(KEYS.PRODUCTS);
  return localVal ? JSON.parse(localVal) : DEFAULT_PRODUCTS;
}

export async function saveProduct(product: Product): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("pizzaria_products")
      .upsert({
        id: product.id,
        name: product.name,
        photo: product.photo,
        description: product.description,
        ingredients: product.ingredients,
        price: product.price,
        category_id: product.category_id,
        active: product.active,
        is_pizza: product.is_pizza,
        borders_available: product.borders_available,
        additionals_available: product.additionals_available,
        can_half_and_half: product.can_half_and_half,
        tipo_produto: product.tipo_produto,
      });

    if (error) {
      console.error("Error saving product to Supabase:", error.message);
      throw new Error(`Erro ao salvar produto no Supabase: ${error.message}`);
    }
  } else {
    const localVal = localStorage.getItem(KEYS.PRODUCTS);
    let list: Product[] = localVal ? JSON.parse(localVal) : [];
    list = list.filter((item) => item.id !== product.id);
    list.push(product);
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(list));
  }
}

export async function deleteProduct(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("pizzaria_products")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting product from Supabase:", error.message);
      throw new Error(`Erro ao deletar produto no Supabase: ${error.message}`);
    }
  } else {
    const localVal = localStorage.getItem(KEYS.PRODUCTS);
    if (localVal) {
      let list: Product[] = JSON.parse(localVal);
      list = list.filter((item) => item.id !== id);
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(list));
    }
  }
}

// --- DDL SQL GENERATOR (for Admin Setup Tab) ---
export const SUPABASE_SQL_SETUP = `-- EXECUTAR ESTES COMANDOS NO CONSOLE DO SUPABASE (SQL EDITOR)

-- 1. Tabela de Empresa
CREATE TABLE IF NOT EXISTS public.pizzaria_company (
  id integer PRIMARY KEY DEFAULT 1,
  name text NOT NULL,
  logo text NOT NULL,
  banner_title text NOT NULL,
  banner_subtitle text NOT NULL,
  CONSTRAINT single_row CHECK (id = 1)
);

-- 2. Tabela de Configurações
CREATE TABLE IF NOT EXISTS public.pizzaria_configs (
  id integer PRIMARY KEY DEFAULT 1,
  whatsapp text NOT NULL,
  delivery_fee numeric NOT NULL DEFAULT 0.0,
  working_hours_start text NOT NULL,
  working_hours_end text NOT NULL,
  closed_message text NOT NULL,
  is_force_closed boolean NOT NULL DEFAULT false,
  CONSTRAINT single_row CHECK (id = 1)
);

-- 3. Tabela de Categorias
CREATE TABLE IF NOT EXISTS public.pizzaria_categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  "order" integer NOT NULL DEFAULT 0
);

-- 4. Tabela de Produtos
CREATE TABLE IF NOT EXISTS public.pizzaria_products (
  id text PRIMARY KEY,
  name text NOT NULL,
  photo text NOT NULL,
  description text NOT NULL,
  ingredients text NOT NULL,
  price numeric NOT NULL,
  category_id text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  is_pizza boolean NOT NULL DEFAULT true,
  borders_available text[] NOT NULL DEFAULT '{}',
  additionals_available text[] NOT NULL DEFAULT '{}',
  can_half_and_half boolean NOT NULL DEFAULT true,
  tipo_produto text
);

-- Habilitar leitura pública para todos
ALTER TABLE public.pizzaria_company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pizzaria_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pizzaria_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pizzaria_products ENABLE ROW LEVEL SECURITY;

-- Excluir políticas existentes se for o caso para evitar duplicações
DROP POLICY IF EXISTS "Leitura pública pizzaria_company" ON public.pizzaria_company;
DROP POLICY IF EXISTS "Leitura pública pizzaria_configs" ON public.pizzaria_configs;
DROP POLICY IF EXISTS "Leitura pública pizzaria_categories" ON public.pizzaria_categories;
DROP POLICY IF EXISTS "Leitura pública pizzaria_products" ON public.pizzaria_products;
DROP POLICY IF EXISTS "Modificação para todos/chave anon" ON public.pizzaria_company;
DROP POLICY IF EXISTS "Modificação para todos/chave anon" ON public.pizzaria_configs;
DROP POLICY IF EXISTS "Modificação para todos/chave anon" ON public.pizzaria_categories;
DROP POLICY IF EXISTS "Modificação para todos/chave anon" ON public.pizzaria_products;

CREATE POLICY "Leitura pública pizzaria_company" ON public.pizzaria_company FOR SELECT USING (true);
CREATE POLICY "Leitura pública pizzaria_configs" ON public.pizzaria_configs FOR SELECT USING (true);
CREATE POLICY "Leitura pública pizzaria_categories" ON public.pizzaria_categories FOR SELECT USING (true);
CREATE POLICY "Leitura pública pizzaria_products" ON public.pizzaria_products FOR SELECT USING (true);

-- Habilitar modificações para todos/chave anon para simplificar integração direta do cardápio administrativo
CREATE POLICY "Modificação para todos/chave anon" ON public.pizzaria_company FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Modificação para todos/chave anon" ON public.pizzaria_configs FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Modificação para todos/chave anon" ON public.pizzaria_categories FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Modificação para todos/chave anon" ON public.pizzaria_products FOR ALL TO public USING (true) WITH CHECK (true);

-- 5. Configurar Storage Bucket para imagens (cardapio-images)
-- Crie um Bucket público chamado 'cardapio-images' na aba de Storage do seu Supabase ou execute:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cardapio-images', 'cardapio-images', true)
ON CONFLICT (id) DO NOTHING;

-- Definir políticas para o bucket 'cardapio-images' se RLS estiver ativo no Storage
DROP POLICY IF EXISTS "Leitura pública para imagens" ON storage.objects;
DROP POLICY IF EXISTS "Modificação pública para imagens" ON storage.objects;
DROP POLICY IF EXISTS "Acesso público de leitura" ON storage.objects;
DROP POLICY IF EXISTS "Acesso público de inserção" ON storage.objects;
DROP POLICY IF EXISTS "Acesso público de modificação" ON storage.objects;
DROP POLICY IF EXISTS "Acesso público de exclusão" ON storage.objects;

CREATE POLICY "Acesso público de leitura" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'cardapio-images');

CREATE POLICY "Acesso público de inserção" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'cardapio-images');

CREATE POLICY "Acesso público de modificação" ON storage.objects
  FOR UPDATE TO public USING (bucket_id = 'cardapio-images') WITH CHECK (bucket_id = 'cardapio-images');

CREATE POLICY "Acesso público de exclusão" ON storage.objects
  FOR DELETE TO public USING (bucket_id = 'cardapio-images');
`;

// --- CLIENT-SIDE IMAGE OPTIMIZATION HELPER (Canvas-based) ---
async function optimizeAndResizeImage(file: File, folder: "logo" | "products"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Ideal sizing from prompt:
        // * Products: Modal (900x600 max), Card (600x400 max) -> 900x600 is absolute maximum to satisfy both
        // * Logo: Max 500x500
        const maxW = folder === "logo" ? 500 : 900;
        const maxH = folder === "logo" ? 500 : 600;

        let newWidth = width;
        let newHeight = height;

        // Perform proportional scaling
        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          newWidth = Math.round(width * ratio);
          newHeight = Math.round(height * ratio);
        }

        canvas.width = newWidth;
        canvas.height = newHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file); // fallback
          return;
        }

        // Fill background white in case of transparent PNGs to avoid black artifacts when converting
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, newWidth, newHeight);

        // Draw image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert to high performance WebP with solid compression quality (0.8)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file); // fallback
            }
          },
          "image/webp",
          0.8
        );
      };
      img.onerror = () => reject(new Error("Erro ao carregar imagem para renderização."));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Erro ao ler dados da imagem no navegador."));
    reader.readAsDataURL(file);
  });
}

// --- UPLOAD IMAGE TO SUPABASE STORAGE ---
export async function uploadImage(file: File, folder: "logo" | "products"): Promise<string> {
  const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
  
  if (!allowedExtensions.includes(fileExt)) {
    throw new Error("Formato inválido! Escolha uma imagem de formato JPG, JPEG, PNG ou WEBP.");
  }
  
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error("A imagem é muito grande! Escolha um arquivo de no máximo 5MB.");
  }

  // Optimize and compress the image first
  let optimizedBlob: Blob;
  let uploadExt = "webp";
  try {
    optimizedBlob = await optimizeAndResizeImage(file, folder);
  } catch (err) {
    console.warn("Falha ao otimizar imagem no client-side, enviando arquivo original.", err);
    optimizedBlob = file;
    uploadExt = fileExt;
  }

  if (isSupabaseConfigured && supabase) {
    try {
      // Clean path/filename and add timestamp to avoid naming conflicts
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${uploadExt}`;
      const filePath = `${folder}/${fileName}`;

      // Upload file directly to Supabase Storage in configured bucket
      const { data, error } = await supabase.storage
        .from(supabaseBucket)
        .upload(filePath, optimizedBlob, {
          cacheControl: "31536000", // Cache heavily (1 year) since it's optimized
          upsert: true,
          contentType: `image/${uploadExt}`,
        });

      if (error) {
        console.error("Supabase Storage upload error:", error);
        throw error;
      }

      // Get public URL of the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from(supabaseBucket)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.warn("Storage upload failed, falling back to local storage representation:", error?.message || error);
    }
  }

  // Local/Offline preview fallback using FileReader
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error("Erro ao ler o arquivo localmente."));
      }
    };
    reader.onerror = () => reject(new Error("Erro ao processar imagem."));
    reader.readAsDataURL(optimizedBlob);
  });
}

