import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq, sql as drizzleSql } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "@/db/db";
import { appState } from "@/db/schema";
import { seedData } from "@/lib/seed-data";
import { Ingredient, Order, OrderStatus, Product, Recipe, StoreData } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const STORE_ROW_ID = "primary";
const STORE_LOCK_KEY = 9_513_469;
const LEGACY_BANK_ACCOUNT_NUMBER = "60505842655";
const DEFAULT_BANK_ACCOUNT_NUMBER = "6050584265";
const LEGACY_SELLER_WHATSAPP = "6285159134699";
const LEGACY_SELLER_WHATSAPP_DISPLAY = "085159134699";
const DEFAULT_SELLER_WHATSAPP = "6285183151407";
const DEFAULT_SELLER_WHATSAPP_DISPLAY = "085183151407";

let writeQueue = Promise.resolve<StoreData | null>(null);
let databaseReadyPromise: Promise<void> | null = null;

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeStoreData(store: StoreData) {
  if (store.settings.bankAccountNumber === LEGACY_BANK_ACCOUNT_NUMBER) {
    store.settings.bankAccountNumber = DEFAULT_BANK_ACCOUNT_NUMBER;
  }

  if (store.settings.sellerWhatsapp === LEGACY_SELLER_WHATSAPP) {
    store.settings.sellerWhatsapp = DEFAULT_SELLER_WHATSAPP;
  }

  if (store.settings.sellerWhatsappDisplay === LEGACY_SELLER_WHATSAPP_DISPLAY) {
    store.settings.sellerWhatsappDisplay = DEFAULT_SELLER_WHATSAPP_DISPLAY;
  }

  return store;
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

async function resolveInitialDatabaseStore() {
  if (getBootstrapMode() === "file") {
    const localStore = await readExistingLocalStoreOrNull();

    if (localStore) {
      return localStore;
    }
  }

  return deepClone(seedData);
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

  if (!databaseReadyPromise) {
    databaseReadyPromise = (async () => {
      const db = getDb();

      if (!db) {
        return;
      }

      await db.execute(drizzleSql`
        create table if not exists app_state (
          id text primary key,
          payload jsonb not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
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
    })();
  }

  await databaseReadyPromise;
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

    return next;
  });
}

export function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export async function readStore() {
  return hasDatabaseUrl() ? readDatabaseStore() : readLocalStore();
}

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
  return calculateRecipeUnitCost(store, getRecipeForProduct(store, productId));
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
