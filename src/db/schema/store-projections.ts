import { jsonb, pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import type {
  AppSettings,
  InventoryMovementType,
  InventoryItemType,
  OrderItem,
  OrderStatus,
  PaymentProof,
  PoManualOverride,
  ProductImage,
  ProductVariant,
  RecipeItem,
} from "@/lib/types";

export const settingsProjection = pgTable("settings_projection", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").$type<AppSettings>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const poSettingsProjection = pgTable("po_settings_projection", {
  id: text("id").primaryKey(),
  manualOverride: text("manual_override").$type<PoManualOverride | null>(),
  scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }),
  scheduledEndAt: timestamp("scheduled_end_at", { withTimezone: true }),
  timezone: text("timezone").notNull(),
  cycleId: text("cycle_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const poWaitlistSubscribersProjection = pgTable("po_waitlist_subscribers_projection", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  whatsapp: text("whatsapp").notNull(),
  lastScheduledNotifiedCycleId: text("last_scheduled_notified_cycle_id"),
  lastOpenedNotifiedCycleId: text("last_opened_notified_cycle_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const productsProjection = pgTable("products_projection", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  shortDescription: text("short_description").notNull(),
  shortDescriptionEn: text("short_description_en").notNull(),
  description: text("description").notNull(),
  descriptionEn: text("description_en").notNull(),
  price: integer("price").notNull(),
  featured: boolean("featured").notNull(),
  isActive: boolean("is_active").notNull(),
  accent: text("accent").notNull(),
  prepLabel: text("prep_label").notNull(),
  prepLabelEn: text("prep_label_en").notNull(),
  packSize: integer("pack_size").notNull(),
  variants: jsonb("variants").$type<ProductVariant[]>().notNull(),
  images: jsonb("images").$type<ProductImage[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const productStocksProjection = pgTable("product_stocks_projection", {
  productId: text("product_id").primaryKey(),
  stock: integer("stock").notNull(),
  lowStockThreshold: integer("low_stock_threshold").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const ordersProjection = pgTable("orders_projection", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  source: text("source").notNull(),
  locale: text("locale").notNull(),
  customerName: text("customer_name").notNull(),
  customerWhatsapp: text("customer_whatsapp").notNull(),
  fulfillmentMethod: text("fulfillment_method").notNull(),
  address: text("address"),
  preorderDate: timestamp("preorder_date", { withTimezone: true }).notNull(),
  note: text("note"),
  deliveryFee: integer("delivery_fee").notNull(),
  subtotal: integer("subtotal").notNull(),
  total: integer("total").notNull(),
  status: text("status").$type<OrderStatus>().notNull(),
  items: jsonb("items").$type<OrderItem[]>().notNull(),
  paymentProof: jsonb("payment_proof").$type<PaymentProof | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const notificationsProjection = pgTable("notifications_projection", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  href: text("href").notNull(),
  read: boolean("read").notNull(),
  kind: text("kind"),
  dedupeKey: text("dedupe_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const ingredientsProjection = pgTable("ingredients_projection", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  stock: integer("stock").notNull(),
  lowStockThreshold: integer("low_stock_threshold").notNull(),
  activeSupplierId: text("active_supplier_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const suppliersProjection = pgTable("suppliers_projection", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  contact: text("contact").notNull(),
  notes: text("notes"),
  isActive: boolean("is_active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const ingredientSupplierPricesProjection = pgTable("ingredient_supplier_prices_projection", {
  id: text("id").primaryKey(),
  ingredientId: text("ingredient_id").notNull(),
  supplierId: text("supplier_id").notNull(),
  pricePerUnit: integer("price_per_unit").notNull(),
  effectiveFrom: text("effective_from").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const recipesProjection = pgTable("recipes_projection", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  yieldCount: integer("yield_count").notNull(),
  items: jsonb("items").$type<RecipeItem[]>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const inventoryMovementsProjection = pgTable("inventory_movements_projection", {
  id: text("id").primaryKey(),
  itemType: text("item_type").$type<InventoryItemType>().notNull(),
  itemId: text("item_id").notNull(),
  type: text("type").$type<InventoryMovementType>().notNull(),
  quantity: integer("quantity").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
