export interface Category {
  id: string;
  name: string;
  active: boolean;
  order: number;
}

export interface BorderOption {
  name: string;
  price: number;
}

export interface AdditionalOption {
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  photo: string;
  description: string;
  ingredients: string; // Comma-separated or narrative text
  price: number;
  category_id: string;
  active: boolean;
  is_pizza: boolean; // Pizzas have borders and custom toppings
  borders_available: string[]; // List of border option names allowed
  additionals_available: string[]; // List of additional option names allowed
  can_half_and_half?: boolean; // If true, product can participate in half-and-half pizzas
  tipo_produto?: "Pizza Salgada" | "Pizza Doce" | "Esfirra Doce" | "Bebida" | "Sobremesa";
}

export interface Company {
  name: string;
  logo: string;
  banner_title: string;
  banner_subtitle: string;
}

export interface Configs {
  whatsapp: string;
  delivery_fee: number;
  working_hours_start: string; // e.g. "18:00"
  working_hours_end: string; // e.g. "23:30"
  closed_message: string;
  is_force_closed: boolean;
}

export interface CartItem {
  id: string; // Unique transient UUID for this cart item combination
  product: Product;
  quantity: number;
  selected_border?: BorderOption;
  selected_additionals: AdditionalOption[];
  observation: string;
  is_half_and_half?: boolean;
  half_flavor_1?: Product;
  half_flavor_2?: Product;
}

export interface CustomerDetails {
  name: string;
  phone: string;
  address: string;
  number: string;
  neighborhood: string;
  complement: string;
  cep?: string;
  city?: string;
  state?: string;
  reference?: string;
}

export type PaymentMethod = "PIX" | "Dinheiro" | "Cartão de Débito" | "Cartão de Crédito";

export interface Order {
  customer: CustomerDetails;
  items: CartItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: PaymentMethod;
  cash_change?: string; // Troco para quanto
}
