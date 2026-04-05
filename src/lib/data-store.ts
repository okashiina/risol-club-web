import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq, sql as drizzleSql } from "drizzle-orm";
import { cache } from "react";
import { getDb, hasDatabaseUrl } from "@/db/db";
import {
  appState,
  ingredientSupplierPricesProjection,
  ingredientsProjection,
  inventoryMovementsProjection,
  notificationsProjection,
  ordersProjection,
  productStocksProjection,
  productsProjection,
  recipesProjection,
  settingsProjection,
  suppliersProjection,
} from "@/db/schema";
import {
  cloneImages,
  cloneVariants,
  DEFAULT_PACK_SIZE,
  findCatalogBlueprint,
  getPackSize,
} from "@/lib/catalog";
import { seedData } from "@/lib/seed-data";
import {
  Ingredient,
  Order,
  OrderStatus,
  Product,
  ProductImage,
  ProductVariant,
  Recipe,
  StoreData,
} from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const STORE_ROW_ID = "primary";
const STORE_LOCK_KEY = 9_513_469;
const LEGACY_BANK_ACCOUNT_NUMBER = "60505842655";
const DEFAULT_BANK_ACCOUNT_NUMBER = "6050584265";
const LEGACY_SELLER_WHATSAPP = "6285159134699";
const LEGACY_SELLER_WHATSAPP_DISPLAY = "085159134699";
const PREVIOUS_SELLER_WHATSAPP = "6285183151407";
const PREVIOUS_SELLER_WHATSAPP_DISPLAY = "085183151407";
const DEFAULT_SELLER_WHATSAPP = "62881081767677";
const DEFAULT_SELLER_WHATSAPP_DISPLAY = "(0881081767677)";
const SMILING_HANDS_EMOJI = "\u{1F60A}\u{1F64C}";
const DEFAULT_STORY =
  `Dari dapur kecil kami, setiap batch diracik buat nemenin momen hangat: buat ngemil santai, kirim hadiah kecil, atau stok comfort snack yang rasanya bikin senyum ${SMILING_HANDS_EMOJI}`;
const DEFAULT_STORY_EN =
  `From our tiny kitchen, every batch is made to bring a warm little pause: easy to gift, easy to crave, and always meant to feel comforting ${SMILING_HANDS_EMOJI}`;

let writeQueue = Promise.resolve<StoreData | null>(null);
let databaseReadyPromise: Promise<void> | null = null;
type ProjectionTx = Parameters<
  Parameters<NonNullable<ReturnType<typeof getDb>>["transaction"]>[0]
>[0];

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeStoreData(store: StoreData) {
  if (store.settings.bankAccountNumber === LEGACY_BANK_ACCOUNT_NUMBER) {
    store.settings.bankAccountNumber = DEFAULT_BANK_ACCOUNT_NUMBER;
  }

  if (
    store.settings.sellerWhatsapp === LEGACY_SELLER_WHATSAPP ||
    store.settings.sellerWhatsapp === PREVIOUS_SELLER_WHATSAPP
  ) {
    store.settings.sellerWhatsapp = DEFAULT_SELLER_WHATSAPP;
  }

  if (
    store.settings.sellerWhatsappDisplay === LEGACY_SELLER_WHATSAPP_DISPLAY ||
    store.settings.sellerWhatsappDisplay === PREVIOUS_SELLER_WHATSAPP_DISPLAY
  ) {
    store.settings.sellerWhatsappDisplay = DEFAULT_SELLER_WHATSAPP_DISPLAY;
  }

  if (!store.settings.story?.trim()) {
    store.settings.story = DEFAULT_STORY;
  }

  if (!store.settings.storyEn?.trim()) {
    store.settings.storyEn = DEFAULT_STORY_EN;
  }

  const productById = new Map<string, Product>();

  store.products = store.products.map((product) => {
    const blueprint = findCatalogBlueprint(product);
    const canonicalSlug = blueprint?.canonicalSlug ?? product.slug;
    const canonicalName = blueprint?.name ?? product.name;
    const variants = normalizeProductVariants(product.variants, blueprint?.variants);
    const images = normalizeProductImages(product.images, blueprint?.images, canonicalName);
    const description = product.description?.trim()
      ? product.description
      : blueprint?.description ?? product.description;
    const descriptionEn = product.descriptionEn?.trim()
      ? product.descriptionEn
      : blueprint?.descriptionEn ?? product.descriptionEn ?? description;
    const normalizedProduct: Product = {
      ...product,
      slug: canonicalSlug,
      name: blueprint?.name ?? product.name,
      nameEn: blueprint?.nameEn ?? product.nameEn ?? product.name,
      shortDescription:
        product.shortDescription?.trim()
          ? product.shortDescription
          : blueprint?.shortDescription ?? product.shortDescription,
      shortDescriptionEn:
        product.shortDescriptionEn?.trim()
          ? product.shortDescriptionEn
          : blueprint?.shortDescriptionEn ??
            product.shortDescriptionEn ??
            product.shortDescription,
      description,
      descriptionEn,
      accent: blueprint?.accent ?? product.accent,
      prepLabel: blueprint?.prepLabel ?? product.prepLabel,
      prepLabelEn: blueprint?.prepLabelEn ?? product.prepLabelEn ?? product.prepLabel,
      packSize: Math.max(product.packSize || DEFAULT_PACK_SIZE, 1),
      variants,
      images,
      price: Math.min(...variants.map((variant) => variant.price)),
      updatedAt: product.updatedAt,
      createdAt: product.createdAt,
    };

    productById.set(normalizedProduct.id, normalizedProduct);
    return normalizedProduct;
  });

  store.orders = store.orders.map((order) => ({
    ...order,
    source: order.source ?? "web",
    paymentProof: order.paymentProof
      ? {
          ...order.paymentProof,
          url: order.paymentProof.url || order.paymentProof.dataUrl || "",
        }
      : undefined,
    items: order.items.map((item) => {
      const product = productById.get(item.productId);
      const productPackSize = product ? getPackSize(product) : DEFAULT_PACK_SIZE;
      const variant = product?.variants.find(
        (candidate) => candidate.type === item.variantType,
      );

      return {
        ...item,
        variantLabel:
          item.variantLabel ||
          variant?.label ||
          "Legacy order",
        pieceCount:
          item.pieceCount && item.pieceCount > 0
            ? item.pieceCount
            : item.quantity * productPackSize,
      };
    }),
  }));

  return store;
}

function normalizeProductVariants(
  variants: ProductVariant[] | undefined,
  blueprintVariants:
    | Array<{ type: ProductVariant["type"]; label: string; price: number }>
    | undefined,
): ProductVariant[] {
  if (variants?.length) {
    const byType = new Map(
      variants.map((variant) => [variant.type, variant]),
    );

    return (blueprintVariants ?? variants).map((variant): ProductVariant => {
      const existing = byType.get(variant.type);
      return {
        type: variant.type,
        label: existing?.label || variant.label,
        price: existing?.price || variant.price,
        isActive: existing?.isActive ?? true,
      };
    });
  }

  if (blueprintVariants?.length) {
    return cloneVariants(blueprintVariants);
  }

  return [
    { type: "frozen", label: "Frozen", price: 28000, isActive: true },
    { type: "fried", label: "Fried", price: 30000, isActive: true },
  ];
}

function normalizeProductImages(
  images: ProductImage[] | undefined,
  blueprintImages: string[] | undefined,
  name: string,
) {
  if (images?.length) {
    return [...images]
      .sort((left, right) => left.position - right.position)
      .map((image, index) => ({
        id: image.id || `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-image-${index + 1}`,
        url: image.url,
        alt: image.alt || `${name} photo ${index + 1}`,
        position: index,
      }));
  }

  if (blueprintImages?.length) {
    return cloneImages(blueprintImages, name);
  }

  return [];
}

function getBootstrapMode() {
  const configured = process.env.STORE_DATABASE_BOOTSTRAP?.trim().toLowerCase();

  if (configured === "file" || configured === "seed") {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? "seed" : "file";
}

async function readExistingLocalStoreOrNull() {
  try {
    const content = await readFile(STORE_FILE, "utf8");
    return normalizeStoreData(JSON.parse(content) as StoreData);
  } catch {
    return null;
  }
}

function asDate(value: string) {
  return new Date(value);
}

async function syncProjectedTables(
  tx: ProjectionTx,
  store: StoreData,
) {
  await tx.delete(settingsProjection);
  await tx.insert(settingsProjection).values({
    id: STORE_ROW_ID,
    payload: store.settings,
    updatedAt: new Date(),
  });

  await tx.delete(productsProjection);
  if (store.products.length) {
    await tx.insert(productsProjection).values(
      store.products.map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        nameEn: product.nameEn,
        shortDescription: product.shortDescription,
        shortDescriptionEn: product.shortDescriptionEn,
        description: product.description,
        descriptionEn: product.descriptionEn,
        price: product.price,
        featured: product.featured,
        isActive: product.isActive,
        accent: product.accent,
        prepLabel: product.prepLabel,
        prepLabelEn: product.prepLabelEn,
        packSize: product.packSize,
        variants: product.variants,
        images: product.images,
        createdAt: asDate(product.createdAt),
        updatedAt: asDate(product.updatedAt),
      })),
    );
  }

  await tx.delete(productStocksProjection);
  if (store.productStocks.length) {
    await tx.insert(productStocksProjection).values(
      store.productStocks.map((stock) => ({
        productId: stock.productId,
        stock: stock.stock,
        lowStockThreshold: stock.lowStockThreshold,
        updatedAt: asDate(stock.updatedAt),
      })),
    );
  }

  await tx.delete(ordersProjection);
  if (store.orders.length) {
    await tx.insert(ordersProjection).values(
      store.orders.map((order) => ({
        id: order.id,
        code: order.code,
        source: order.source,
        locale: order.locale,
        customerName: order.customerName,
        customerWhatsapp: order.customerWhatsapp,
        fulfillmentMethod: order.fulfillmentMethod,
        address: order.address ?? null,
        preorderDate: asDate(order.preorderDate),
        note: order.note ?? null,
        deliveryFee: order.deliveryFee,
        subtotal: order.subtotal,
        total: order.total,
        status: order.status,
        items: order.items,
        paymentProof: order.paymentProof ?? null,
        createdAt: asDate(order.createdAt),
        updatedAt: asDate(order.updatedAt),
      })),
    );
  }

  await tx.delete(notificationsProjection);
  if (store.notifications.length) {
    await tx.insert(notificationsProjection).values(
      store.notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        href: notification.href,
        read: notification.read,
        kind: notification.kind ?? null,
        dedupeKey: notification.dedupeKey ?? null,
        createdAt: asDate(notification.createdAt),
      })),
    );
  }

  await tx.delete(ingredientsProjection);
  if (store.ingredients.length) {
    await tx.insert(ingredientsProjection).values(
      store.ingredients.map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit,
        stock: ingredient.stock,
        lowStockThreshold: ingredient.lowStockThreshold,
        activeSupplierId: ingredient.activeSupplierId ?? null,
        createdAt: asDate(ingredient.createdAt),
      })),
    );
  }

  await tx.delete(suppliersProjection);
  if (store.suppliers.length) {
    await tx.insert(suppliersProjection).values(
      store.suppliers.map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
        contact: supplier.contact,
        notes: supplier.notes ?? null,
        isActive: supplier.isActive,
        createdAt: asDate(supplier.createdAt),
      })),
    );
  }

  await tx.delete(ingredientSupplierPricesProjection);
  if (store.ingredientSupplierPrices.length) {
    await tx.insert(ingredientSupplierPricesProjection).values(
      store.ingredientSupplierPrices.map((price) => ({
        id: price.id,
        ingredientId: price.ingredientId,
        supplierId: price.supplierId,
        pricePerUnit: Math.round(price.pricePerUnit),
        effectiveFrom: price.effectiveFrom,
        notes: price.notes ?? null,
        createdAt: asDate(price.createdAt),
      })),
    );
  }

  await tx.delete(recipesProjection);
  if (store.recipes.length) {
    await tx.insert(recipesProjection).values(
      store.recipes.map((recipe) => ({
        id: recipe.id,
        productId: recipe.productId,
        yieldCount: recipe.yieldCount,
        items: recipe.items,
        updatedAt: asDate(recipe.updatedAt),
      })),
    );
  }

  await tx.delete(inventoryMovementsProjection);
  if (store.inventoryMovements.length) {
    await tx.insert(inventoryMovementsProjection).values(
      store.inventoryMovements.map((movement) => ({
        id: movement.id,
        itemType: movement.itemType,
        itemId: movement.itemId,
        type: movement.type,
        quantity: movement.quantity,
        note: movement.note,
        createdAt: asDate(movement.createdAt),
      })),
    );
  }
}

async function resolveInitialDatabaseStore() {
  if (getBootstrapMode() === "file") {
    const localStore = await readExistingLocalStoreOrNull();

    if (localStore) {
      return localStore;
    }
  }

  return deepClone(seedData);
}

async function ensureProjectionSchemaCompatibility(db: NonNullable<ReturnType<typeof getDb>>) {
  await db.execute(drizzleSql`
    create table if not exists notifications_projection (
      id text primary key,
      title text not null,
      body text not null,
      href text not null,
      read boolean not null,
      kind text,
      dedupe_key text,
      created_at timestamptz not null
    )
  `);
  await db.execute(drizzleSql`
    alter table notifications_projection
    add column if not exists kind text
  `);
  await db.execute(drizzleSql`
    alter table notifications_projection
    add column if not exists dedupe_key text
  `);
}

async function ensureLocalStoreFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(STORE_FILE, "utf8");
  } catch {
    await writeFile(STORE_FILE, JSON.stringify(seedData, null, 2), "utf8");
  }
}

async function readLocalStore() {
  await ensureLocalStoreFile();
  const content = await readFile(STORE_FILE, "utf8");
  return normalizeStoreData(JSON.parse(content) as StoreData);
}

async function ensureDatabaseStore() {
  if (!hasDatabaseUrl()) {
    return;
  }

  const db = getDb();

  if (!db) {
    return;
  }

  await ensureProjectionSchemaCompatibility(db);

  if (!databaseReadyPromise) {
    databaseReadyPromise = (async () => {
      await db.execute(drizzleSql`
        create table if not exists app_state (
          id text primary key,
          payload jsonb not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `);
      await db.execute(drizzleSql`
        create table if not exists settings_projection (
          id text primary key,
          payload jsonb not null,
          updated_at timestamptz not null default now()
        )
      `);
      await db.execute(drizzleSql`
        create table if not exists products_projection (
          id text primary key,
          slug text not null unique,
          name text not null,
          name_en text not null,
          short_description text not null,
          short_description_en text not null,
          description text not null,
          description_en text not null,
          price integer not null,
          featured boolean not null,
          is_active boolean not null,
          accent text not null,
          prep_label text not null,
          prep_label_en text not null,
          pack_size integer not null,
          variants jsonb not null,
          images jsonb not null,
          created_at timestamptz not null,
          updated_at timestamptz not null
        )
      `);
      await db.execute(drizzleSql`
        create table if not exists product_stocks_projection (
          product_id text primary key,
          stock integer not null,
          low_stock_threshold integer not null,
          updated_at timestamptz not null
        )
      `);
      await db.execute(drizzleSql`
        create table if not exists orders_projection (
          id text primary key,
          code text not null,
          source text not null,
          locale text not null,
          customer_name text not null,
          customer_whatsapp text not null,
          fulfillment_method text not null,
          address text,
          preorder_date timestamptz not null,
          note text,
          delivery_fee integer not null,
          subtotal integer not null,
          total integer not null,
          status text not null,
          items jsonb not null,
          payment_proof jsonb,
          created_at timestamptz not null,
          updated_at timestamptz not null
        )
      `);
      await db.execute(drizzleSql`
        alter table orders_projection
        drop constraint if exists orders_projection_code_key
      `);
      await ensureProjectionSchemaCompatibility(db);
      await db.execute(drizzleSql`
        create table if not exists ingredients_projection (
          id text primary key,
          name text not null,
          unit text not null,
          stock integer not null,
          low_stock_threshold integer not null,
          active_supplier_id text,
          created_at timestamptz not null
        )
      `);
      await db.execute(drizzleSql`
        create table if not exists suppliers_projection (
          id text primary key,
          name text not null,
          contact text not null,
          notes text,
          is_active boolean not null,
          created_at timestamptz not null
        )
      `);
      await db.execute(drizzleSql`
        create table if not exists ingredient_supplier_prices_projection (
          id text primary key,
          ingredient_id text not null,
          supplier_id text not null,
          price_per_unit integer not null,
          effective_from text not null,
          notes text,
          created_at timestamptz not null
        )
      `);
      await db.execute(drizzleSql`
        create table if not exists recipes_projection (
          id text primary key,
          product_id text not null,
          yield_count integer not null,
          items jsonb not null,
          updated_at timestamptz not null
        )
      `);
      await db.execute(drizzleSql`
        create table if not exists inventory_movements_projection (
          id text primary key,
          item_type text not null,
          item_id text not null,
          type text not null,
          quantity integer not null,
          note text not null,
          created_at timestamptz not null
        )
      `);
      await db.execute(drizzleSql`
        create index if not exists products_projection_active_featured_idx
        on products_projection (is_active, featured desc, created_at asc)
      `);
      await db.execute(drizzleSql`
        create index if not exists orders_projection_created_at_idx
        on orders_projection (created_at desc)
      `);
      await db.execute(drizzleSql`
        create index if not exists orders_projection_code_idx
        on orders_projection (code)
      `);
      await db.execute(drizzleSql`
        create index if not exists orders_projection_status_idx
        on orders_projection (status)
      `);
      await db.execute(drizzleSql`
        create index if not exists notifications_projection_read_created_at_idx
        on notifications_projection (read, created_at desc)
      `);
      await db.execute(drizzleSql`
        create index if not exists inventory_movements_projection_created_at_idx
        on inventory_movements_projection (created_at desc)
      `);

      const existingRow = await db
        .select({ id: appState.id })
        .from(appState)
        .where(eq(appState.id, STORE_ROW_ID))
        .limit(1);

      if (existingRow.length === 0) {
        const initialStore = await resolveInitialDatabaseStore();

        await db
          .insert(appState)
          .values({
            id: STORE_ROW_ID,
            payload: initialStore,
          })
          .onConflictDoNothing();
      }

      const projectionRow = await db
        .select({ id: settingsProjection.id })
        .from(settingsProjection)
        .limit(1);

      if (projectionRow.length === 0) {
        const stateRow = await db
          .select({ payload: appState.payload })
          .from(appState)
          .where(eq(appState.id, STORE_ROW_ID))
          .limit(1);

        const normalized = normalizeStoreData(
          (stateRow[0]?.payload as StoreData | undefined) ?? (await resolveInitialDatabaseStore()),
        );

        await db.transaction(async (tx) => {
          await syncProjectedTables(tx, normalized);
        });
      }
    })();
  }

  await databaseReadyPromise;
}

export async function ensureDatabaseStoreReady() {
  await ensureDatabaseStore();
}

export async function syncDatabaseProjections() {
  await ensureDatabaseStore();

  const db = getDb();

  if (!db) {
    return;
  }

  const rows = await db
    .select({ payload: appState.payload })
    .from(appState)
    .where(eq(appState.id, STORE_ROW_ID))
    .limit(1);

  if (!rows[0]?.payload) {
    return;
  }

  const store = normalizeStoreData(rows[0].payload as StoreData);

  await db.transaction(async (tx) => {
    await syncProjectedTables(tx, store);
  });
}

async function readDatabaseStore() {
  await ensureDatabaseStore();

  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is configured, but the database client is unavailable.");
  }

  const rows = await db
    .select({ payload: appState.payload })
    .from(appState)
    .where(eq(appState.id, STORE_ROW_ID))
    .limit(1);

  if (rows[0]?.payload) {
    return normalizeStoreData(rows[0].payload as StoreData);
  }

  const fallbackStore = await resolveInitialDatabaseStore();

  await db
    .insert(appState)
    .values({
      id: STORE_ROW_ID,
      payload: fallbackStore,
    })
    .onConflictDoNothing();

  return normalizeStoreData(fallbackStore);
}

async function writeLocalStore(
  updater: (current: StoreData) => StoreData | Promise<StoreData>,
) {
  const pendingWrite = writeQueue.then(async () => {
    const current = await readLocalStore();
    const next = normalizeStoreData(await updater(deepClone(current)));
    await writeFile(STORE_FILE, JSON.stringify(next, null, 2), "utf8");
    return next;
  });

  writeQueue = pendingWrite;
  return pendingWrite;
}

async function writeDatabaseStore(
  updater: (current: StoreData) => StoreData | Promise<StoreData>,
) {
  await ensureDatabaseStore();

  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is configured, but the database client is unavailable.");
  }

  return db.transaction(async (tx) => {
    await tx.execute(
      drizzleSql`select pg_advisory_xact_lock(${STORE_LOCK_KEY})`,
    );

    const rows = await tx
      .select({ payload: appState.payload })
      .from(appState)
      .where(eq(appState.id, STORE_ROW_ID))
      .limit(1);

    const current =
      normalizeStoreData(rows[0]?.payload as StoreData | undefined ?? (await resolveInitialDatabaseStore()));
    const next = normalizeStoreData(await updater(deepClone(current)));

    if (rows.length === 0) {
      await tx.insert(appState).values({
        id: STORE_ROW_ID,
        payload: next,
      });
    } else {
      await tx
        .update(appState)
        .set({
          payload: next,
          updatedAt: new Date(),
        })
        .where(eq(appState.id, STORE_ROW_ID));
    }

    await syncProjectedTables(tx, next);

    return next;
  });
}

export function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

const readStoreUncached = async () =>
  (hasDatabaseUrl() ? readDatabaseStore() : readLocalStore());

export const readStore = cache(readStoreUncached);

export async function writeStore(
  updater: (current: StoreData) => StoreData | Promise<StoreData>,
) {
  return hasDatabaseUrl()
    ? writeDatabaseStore(updater)
    : writeLocalStore(updater);
}

export function getProductBySlug(store: StoreData, slug: string) {
  return store.products.find((product) => product.slug === slug);
}

export function getOrderByCode(store: StoreData, code: string) {
  return store.orders.find(
    (order) => order.code.toLowerCase() === code.toLowerCase(),
  );
}

function normalizeComparableText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function orderMatchesCustomerName(order: Order, customerName: string) {
  return (
    normalizeComparableText(order.customerName) ===
    normalizeComparableText(customerName)
  );
}

export function getRecipeForProduct(store: StoreData, productId: string) {
  return store.recipes.find((recipe) => recipe.productId === productId);
}

export function getLatestIngredientPrice(store: StoreData, ingredientId: string) {
  return store.ingredientSupplierPrices
    .filter((price) => price.ingredientId === ingredientId)
    .sort((a, b) => {
      const effective = b.effectiveFrom.localeCompare(a.effectiveFrom);
      return effective === 0 ? b.createdAt.localeCompare(a.createdAt) : effective;
    })[0];
}

export function calculateRecipeUnitCost(
  store: StoreData,
  recipe: Recipe | undefined,
) {
  if (!recipe) {
    return 0;
  }

  const totalCost = recipe.items.reduce((sum, item) => {
    const price = getLatestIngredientPrice(store, item.ingredientId);
    return sum + item.quantity * (price?.pricePerUnit ?? 0);
  }, 0);

  return recipe.yieldCount > 0 ? totalCost / recipe.yieldCount : totalCost;
}

export function calculateProductCost(store: StoreData, productId: string) {
  const recipeUnitCost = calculateRecipeUnitCost(
    store,
    getRecipeForProduct(store, productId),
  );
  const product = store.products.find((item) => item.id === productId);

  return Math.round(
    recipeUnitCost * (product ? getPackSize(product) : DEFAULT_PACK_SIZE),
  );
}

export function getProductStock(store: StoreData, productId: string) {
  return store.productStocks.find((item) => item.productId === productId);
}

export function getIngredient(store: StoreData, ingredientId: string) {
  return store.ingredients.find((ingredient) => ingredient.id === ingredientId);
}

export function summarizeOrderCost(store: StoreData, order: StoreData["orders"][number]) {
  return order.items.reduce(
    (sum, item) => sum + item.costSnapshot * item.quantity,
    0,
  );
}

export function isSalesStatus(status: OrderStatus) {
  return ["confirmed", "in_production", "ready_for_pickup", "out_for_delivery", "completed"].includes(
    status,
  );
}

export function statusLabel(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    pending_payment: "Pending payment",
    payment_review: "Payment review",
    confirmed: "Confirmed",
    in_production: "In production",
    ready_for_pickup: "Ready for pickup",
    out_for_delivery: "Out for delivery",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return map[status];
}

export function getProductName(
  product: Product,
  locale: "id" | "en" = "id",
) {
  return locale === "en" ? product.nameEn : product.name;
}

export function getProductDescription(
  product: Product,
  locale: "id" | "en" = "id",
) {
  return locale === "en" ? product.descriptionEn : product.description;
}

export function getIngredientName(ingredient: Ingredient) {
  return ingredient.name;
}
