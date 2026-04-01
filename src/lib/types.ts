export type Locale = "id" | "en";

export type FulfillmentMethod = "pickup" | "delivery";
export type ProductVariantType = "frozen" | "fried";

export type OrderStatus =
  | "pending_payment"
  | "payment_review"
  | "confirmed"
  | "in_production"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export type InventoryItemType = "ingredient" | "product";

export type InventoryMovementType =
  | "restock"
  | "adjustment"
  | "production"
  | "sale"
  | "correction";

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
};

export type Ingredient = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  lowStockThreshold: number;
  activeSupplierId?: string;
  createdAt: string;
};

export type IngredientSupplierPrice = {
  id: string;
  ingredientId: string;
  supplierId: string;
  pricePerUnit: number;
  effectiveFrom: string;
  notes?: string;
  createdAt: string;
};

export type RecipeItem = {
  ingredientId: string;
  quantity: number;
};

export type Recipe = {
  id: string;
  productId: string;
  yieldCount: number;
  items: RecipeItem[];
  updatedAt: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  shortDescription: string;
  shortDescriptionEn: string;
  description: string;
  descriptionEn: string;
  price: number;
  featured: boolean;
  isActive: boolean;
  accent: string;
  prepLabel: string;
  prepLabelEn: string;
  packSize: number;
  variants: ProductVariant[];
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
};

export type ProductVariant = {
  type: ProductVariantType;
  label: string;
  price: number;
  isActive: boolean;
};

export type ProductImage = {
  id: string;
  url: string;
  alt: string;
  position: number;
};

export type ProductStock = {
  productId: string;
  stock: number;
  lowStockThreshold: number;
  updatedAt: string;
};

export type OrderItem = {
  productId: string;
  productName: string;
  variantType?: ProductVariantType;
  variantLabel: string;
  quantity: number;
  pieceCount: number;
  unitPrice: number;
  costSnapshot: number;
};

export type PaymentProof = {
  fileName: string;
  mimeType: string;
  dataUrl: string;
  uploadedAt: string;
};

export type Order = {
  id: string;
  code: string;
  source: "web" | "seller_manual";
  locale: Locale;
  customerName: string;
  customerWhatsapp: string;
  fulfillmentMethod: FulfillmentMethod;
  address?: string;
  preorderDate: string;
  note?: string;
  deliveryFee: number;
  subtotal: number;
  total: number;
  status: OrderStatus;
  items: OrderItem[];
  paymentProof?: PaymentProof;
  createdAt: string;
  updatedAt: string;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
};

export type AppSettings = {
  brandName: string;
  story: string;
  storyEn: string;
  pickupAddress: string;
  pickupAddressEn: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  sellerWhatsapp: string;
  sellerWhatsappDisplay: string;
  defaultDeliveryFee: number;
};

export type StoreData = {
  settings: AppSettings;
  suppliers: Supplier[];
  ingredients: Ingredient[];
  ingredientSupplierPrices: IngredientSupplierPrice[];
  products: Product[];
  recipes: Recipe[];
  productStocks: ProductStock[];
  orders: Order[];
  notifications: Notification[];
  inventoryMovements: {
    id: string;
    itemType: InventoryItemType;
    itemId: string;
    type: InventoryMovementType;
    quantity: number;
    note: string;
    createdAt: string;
  }[];
};
