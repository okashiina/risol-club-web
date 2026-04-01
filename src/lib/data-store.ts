import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { seedData } from "@/lib/seed-data";
import { Ingredient, Order, OrderStatus, Product, Recipe, StoreData } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

let writeQueue = Promise.resolve<StoreData | null>(null);

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

async function ensureStoreFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(STORE_FILE, "utf8");
  } catch {
    await writeFile(STORE_FILE, JSON.stringify(seedData, null, 2), "utf8");
  }
}

export async function readStore() {
  await ensureStoreFile();
  const content = await readFile(STORE_FILE, "utf8");
  return JSON.parse(content) as StoreData;
}

export async function writeStore(
  updater: (current: StoreData) => StoreData | Promise<StoreData>,
) {
  writeQueue = writeQueue.then(async () => {
    const current = await readStore();
    const next = await updater(deepClone(current));
    await writeFile(STORE_FILE, JSON.stringify(next, null, 2), "utf8");
    return next;
  });

  return writeQueue;
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
