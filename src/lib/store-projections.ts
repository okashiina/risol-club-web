import "server-only";

import { asc, desc, eq, sql as drizzleSql } from "drizzle-orm";
import { cache } from "react";
import { getDb, hasDatabaseUrl } from "@/db/db";
import {
  ingredientsProjection,
  ingredientSupplierPricesProjection,
  inventoryMovementsProjection,
  notificationsProjection,
  ordersProjection,
  poSettingsProjection,
  poWaitlistSubscribersProjection,
  productsProjection,
  productStocksProjection,
  recipesProjection,
  settingsProjection,
  suppliersProjection,
} from "@/db/schema";
import {
  getOrderByCode,
  readStore,
  syncDatabaseProjections,
} from "@/lib/data-store";
import { createDefaultPoSettings, resolvePoState } from "@/lib/po";
import { ReportQueryOptions, getDashboardMetrics, getReportDailySeries, getReportHighlights, getSalesBreakdown, getStatusBreakdown } from "@/lib/reports";
import { AppSettings, Ingredient, IngredientSupplierPrice, InventoryItemType, InventoryMovementType, Notification, Order, OrderItem, OrderStatus, PaymentProof, PoSettings, PoWaitlistSubscriber, Product, ProductStock, Recipe, StoreData, Supplier } from "@/lib/types";

function toIso(value: Date | string) {
  return typeof value === "string" ? value : value.toISOString();
}

function mapProduct(row: typeof productsProjection.$inferSelect): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameEn: row.nameEn,
    shortDescription: row.shortDescription,
    shortDescriptionEn: row.shortDescriptionEn,
    description: row.description,
    descriptionEn: row.descriptionEn,
    price: row.price,
    featured: row.featured,
    isActive: row.isActive,
    accent: row.accent,
    prepLabel: row.prepLabel,
    prepLabelEn: row.prepLabelEn,
    packSize: row.packSize,
    variants: row.variants,
    images: row.images,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapOrder(row: typeof ordersProjection.$inferSelect): Order {
  return {
    id: row.id,
    code: row.code,
    source: row.source as Order["source"],
    locale: row.locale as Order["locale"],
    customerName: row.customerName,
    customerWhatsapp: row.customerWhatsapp,
    fulfillmentMethod: row.fulfillmentMethod as Order["fulfillmentMethod"],
    address: row.address ?? undefined,
    preorderDate: toIso(row.preorderDate),
    note: row.note ?? undefined,
    deliveryFee: row.deliveryFee,
    subtotal: row.subtotal,
    total: row.total,
    status: row.status as OrderStatus,
    items: row.items as OrderItem[],
    paymentProof: (row.paymentProof as PaymentProof | null) ?? undefined,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapNotification(row: typeof notificationsProjection.$inferSelect): Notification {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    href: row.href,
    read: row.read,
    kind: row.kind ?? undefined,
    dedupeKey: row.dedupeKey ?? undefined,
    createdAt: toIso(row.createdAt),
  };
}

function mapPoSettings(
  row: typeof poSettingsProjection.$inferSelect | undefined,
): PoSettings {
  if (!row) {
    return createDefaultPoSettings(new Date().toISOString());
  }

  return {
    manualOverride: row.manualOverride ?? null,
    scheduledStartAt: row.scheduledStartAt ? toIso(row.scheduledStartAt) : undefined,
    scheduledEndAt: row.scheduledEndAt ? toIso(row.scheduledEndAt) : undefined,
    timezone: "Asia/Jakarta",
    cycleId: row.cycleId ?? undefined,
    updatedAt: toIso(row.updatedAt),
  };
}

function mapPoWaitlistSubscriber(
  row: typeof poWaitlistSubscribersProjection.$inferSelect,
): PoWaitlistSubscriber {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    whatsapp: row.whatsapp,
    lastScheduledNotifiedCycleId: row.lastScheduledNotifiedCycleId ?? undefined,
    lastOpenedNotifiedCycleId: row.lastOpenedNotifiedCycleId ?? undefined,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapIngredient(row: typeof ingredientsProjection.$inferSelect): Ingredient {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    stock: row.stock,
    lowStockThreshold: row.lowStockThreshold,
    activeSupplierId: row.activeSupplierId ?? undefined,
    createdAt: toIso(row.createdAt),
  };
}

function mapProductStock(row: typeof productStocksProjection.$inferSelect): ProductStock {
  return {
    productId: row.productId,
    stock: row.stock,
    lowStockThreshold: row.lowStockThreshold,
    updatedAt: toIso(row.updatedAt),
  };
}

function mapSupplier(row: typeof suppliersProjection.$inferSelect): Supplier {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    notes: row.notes ?? undefined,
    isActive: row.isActive,
    createdAt: toIso(row.createdAt),
  };
}

function mapSupplierPrice(
  row: typeof ingredientSupplierPricesProjection.$inferSelect,
): IngredientSupplierPrice {
  return {
    id: row.id,
    ingredientId: row.ingredientId,
    supplierId: row.supplierId,
    pricePerUnit: row.pricePerUnit,
    effectiveFrom: row.effectiveFrom,
    notes: row.notes ?? undefined,
    createdAt: toIso(row.createdAt),
  };
}

function mapRecipe(row: typeof recipesProjection.$inferSelect): Recipe {
  return {
    id: row.id,
    productId: row.productId,
    yieldCount: row.yieldCount,
    items: row.items,
    updatedAt: toIso(row.updatedAt),
  };
}

function mapMovement(row: typeof inventoryMovementsProjection.$inferSelect) {
  return {
    id: row.id,
    itemType: row.itemType as InventoryItemType,
    itemId: row.itemId,
    type: row.type as InventoryMovementType,
    quantity: row.quantity,
    note: row.note,
    createdAt: toIso(row.createdAt),
  };
}

function extractDbErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "";
  }

  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }

  if ("cause" in error) {
    return extractDbErrorCode(error.cause);
  }

  return "";
}

function extractDbErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "";
  }

  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }

  if ("cause" in error) {
    return extractDbErrorMessage(error.cause);
  }

  return "";
}

function isRecoverableProjectionError(error: unknown) {
  const code = extractDbErrorCode(error);
  const message = extractDbErrorMessage(error).toLowerCase();

  return (
    code === "42P01" ||
    code === "42703" ||
    message.includes("column \"kind\" does not exist") ||
    message.includes("column \"dedupe_key\" does not exist") ||
    message.includes("notifications_projection") ||
    message.includes("po_settings_projection") ||
    message.includes("po_waitlist_subscribers_projection")
  );
}

async function withDbFallback<T>(dbReader: () => Promise<T>, fallbackReader: () => Promise<T>) {
  if (!hasDatabaseUrl()) {
    return fallbackReader();
  }

  const db = getDb();

  if (!db) {
    return fallbackReader();
  }

  try {
    return await dbReader();
  } catch (error) {
    if (isRecoverableProjectionError(error)) {
      await syncDatabaseProjections();
      return dbReader();
    }

    throw error;
  }
}

const hasProjectionSnapshot = cache(async () => {
  if (!hasDatabaseUrl()) {
    return false;
  }

  const db = getDb();

  if (!db) {
    return false;
  }

  try {
    const rows = await db
      .select({ id: settingsProjection.id })
      .from(settingsProjection)
      .limit(1);
    return rows.length > 0;
  } catch (error) {
    if (isRecoverableProjectionError(error)) {
      return false;
    }

    throw error;
  }
});

async function withProjectionRecovery<T>(
  reader: () => Promise<T>,
  isEmpty: (value: T) => boolean,
) {
  const initial = await reader();

  if (!isEmpty(initial)) {
    return initial;
  }

  if (await hasProjectionSnapshot()) {
    return initial;
  }

  await syncDatabaseProjections();
  return reader();
}

function buildStoreReportsData(store: StoreData, options: ReportQueryOptions = {}) {
  return {
    metrics: getReportHighlights(store),
    sales: getSalesBreakdown(store),
    dailySeries: getReportDailySeries(store, options),
    statusBreakdown: getStatusBreakdown(store),
    activeOrderCount: store.orders.filter((order) => order.status !== "cancelled").length,
  };
}

export const readSettingsData = cache(async () =>
  withDbFallback(
    async () =>
      (await withProjectionRecovery(
        async () => {
          const db = getDb()!;
          const rows = await db
            .select({ payload: settingsProjection.payload })
            .from(settingsProjection)
            .limit(1);

          return (rows[0]?.payload as AppSettings | undefined) ?? null;
        },
        (result) => result === null,
      )) ?? (await readStore()).settings,
    async () => (await readStore()).settings,
  ));

export const readOrderByCodeData = cache(async (code: string) =>
  withDbFallback(
    async () =>
      withProjectionRecovery(
        async () => {
          const db = getDb()!;
          const rows = await db
            .select()
            .from(ordersProjection)
            .where(drizzleSql`lower(${ordersProjection.code}) = ${code.toLowerCase()}`)
            .limit(1);

          return rows[0] ? mapOrder(rows[0]) : null;
        },
        (result) => result === null,
      ),
    async () => {
      const store = await readStore();
      return getOrderByCode(store, code) ?? null;
    },
  ));

export const readPublicCatalogData = cache(async () =>
  withDbFallback(
    async () =>
      withProjectionRecovery(async () => {
      const db = getDb()!;
      const [settingsRow, poSettingsRows, productRows] = await Promise.all([
        db
          .select({ payload: settingsProjection.payload })
          .from(settingsProjection)
          .limit(1),
        db.select().from(poSettingsProjection).limit(1),
        db
          .select()
          .from(productsProjection)
          .where(eq(productsProjection.isActive, true))
          .orderBy(desc(productsProjection.featured), asc(productsProjection.createdAt)),
      ]);

      const poSettings = mapPoSettings(poSettingsRows[0]);
      const poState = resolvePoState(poSettings);

      return {
        settings: (settingsRow[0]?.payload as AppSettings | undefined) ?? (await readSettingsData()),
        poSettings,
        poState,
        products: productRows.map(mapProduct),
      };
    }, (result) => result.products.length === 0),
    async () => {
      const store = await readStore();
      return {
        settings: store.settings,
        poSettings: store.poSettings,
        poState: resolvePoState(store.poSettings),
        products: store.products.filter((product) => product.isActive),
      };
    },
  ));

export const readProductBySlugData = cache(async (slug: string) =>
  withDbFallback(
    async () =>
      withProjectionRecovery(async () => {
      const db = getDb()!;
      const rows = await db
        .select()
        .from(productsProjection)
        .where(eq(productsProjection.slug, slug))
        .limit(1);

      return rows[0] ? mapProduct(rows[0]) : null;
    }, (result) => result === null),
    async () => {
      const store = await readStore();
      return store.products.find((product) => product.slug === slug) ?? null;
    },
  ));

export const readSellerUnreadNotificationCount = cache(async () =>
  withDbFallback(
    async () =>
      withProjectionRecovery(async () => {
      const db = getDb()!;
      const rows = await db
        .select({ count: drizzleSql<number>`count(*)` })
        .from(notificationsProjection)
        .where(eq(notificationsProjection.read, false));
      return Number(rows[0]?.count ?? 0);
    }, (result) => result === 0),
    async () => (await readStore()).notifications.filter((notification) => !notification.read).length,
  ));

export const readSellerOverviewData = cache(async () =>
  withDbFallback(
    async () =>
      withProjectionRecovery(async () => {
        const db = getDb()!;
        const [productRows, orderRows, notificationRows, unreadRows, ingredientRows, stockRows, poSettingsRows, waitlistRows] = await Promise.all([
          db.select().from(productsProjection),
          db.select().from(ordersProjection).orderBy(desc(ordersProjection.createdAt)),
          db.select().from(notificationsProjection).orderBy(desc(notificationsProjection.createdAt)).limit(5),
          db
            .select({ count: drizzleSql<number>`count(*)` })
            .from(notificationsProjection)
            .where(eq(notificationsProjection.read, false)),
          db.select().from(ingredientsProjection),
          db.select().from(productStocksProjection),
          db.select().from(poSettingsProjection).limit(1),
          db
            .select()
            .from(poWaitlistSubscribersProjection)
            .orderBy(desc(poWaitlistSubscribersProjection.createdAt))
            .limit(5),
        ]);

      const poSettings = mapPoSettings(poSettingsRows[0]);

      const storeSubset: StoreData = {
        settings: await readSettingsData(),
        poSettings,
        poWaitlistSubscribers: waitlistRows.map(mapPoWaitlistSubscriber),
        suppliers: [],
        ingredients: ingredientRows.map(mapIngredient),
        ingredientSupplierPrices: [],
        products: productRows.map(mapProduct),
        recipes: [],
        productStocks: stockRows.map(mapProductStock),
        orders: orderRows.map(mapOrder),
        notifications: notificationRows.map(mapNotification),
        inventoryMovements: [],
      };

        return {
          metrics: {
            ...getDashboardMetrics(storeSubset),
            unreadNotifications: Number(unreadRows[0]?.count ?? 0),
          },
          poState: resolvePoState(poSettings),
          poSettings,
          recentSubscribers: waitlistRows.map(mapPoWaitlistSubscriber),
          notifications: notificationRows.map(mapNotification),
          recentOrders: orderRows.slice(0, 5).map(mapOrder),
        };
    }, (result) => result.recentOrders.length === 0 && result.notifications.length === 0),
    async () => {
      const store = await readStore();
      return {
        metrics: getDashboardMetrics(store),
        poState: resolvePoState(store.poSettings),
        poSettings: store.poSettings,
        recentSubscribers: store.poWaitlistSubscribers.slice(0, 5),
        notifications: store.notifications.slice(0, 5),
        recentOrders: store.orders.slice(0, 5),
      };
    },
  ));

export const readSellerOrdersData = cache(async (page = 1, pageSize = 12) =>
  withDbFallback(
    async () =>
      withProjectionRecovery(async () => {
      const db = getDb()!;
      const safePage = Math.max(page, 1);
      const safePageSize = Math.max(pageSize, 1);
      const [countRows, productRows] = await Promise.all([
        db
          .select({ count: drizzleSql<number>`count(*)` })
          .from(ordersProjection),
        db
          .select()
          .from(productsProjection)
          .where(eq(productsProjection.isActive, true))
          .orderBy(desc(productsProjection.featured), asc(productsProjection.createdAt)),
      ]);
      const totalCount = Number(countRows[0]?.count ?? 0);
      const totalPages = Math.max(Math.ceil(totalCount / safePageSize), 1);
      const effectivePage = Math.min(safePage, totalPages);
      const offset = (effectivePage - 1) * safePageSize;
      const orderRows = await db
        .select()
        .from(ordersProjection)
        .orderBy(desc(ordersProjection.createdAt))
        .limit(safePageSize)
        .offset(offset);

      return {
        orders: orderRows.map(mapOrder),
        products: productRows.map(mapProduct),
        pagination: {
          page: effectivePage,
          pageSize: safePageSize,
          totalCount,
          totalPages,
        },
      };
    }, (result) => result.orders.length === 0 && result.products.length === 0),
    async () => {
      const store = await readStore();
      const safePage = Math.max(page, 1);
      const safePageSize = Math.max(pageSize, 1);
      const totalCount = store.orders.length;
      const totalPages = Math.max(Math.ceil(totalCount / safePageSize), 1);
      const effectivePage = Math.min(safePage, totalPages);
      const start = (effectivePage - 1) * safePageSize;
      return {
        orders: store.orders.slice(start, start + safePageSize),
        products: store.products.filter((product) => product.isActive),
        pagination: {
          page: effectivePage,
          pageSize: safePageSize,
          totalCount,
          totalPages,
        },
      };
    },
  ));

export const readSellerReportsData = cache(async (options: ReportQueryOptions = {}) =>
  withDbFallback(
    async () =>
      withProjectionRecovery(async () => {
        const db = getDb()!;
        const [productRows, ingredientRows, stockRows, orderRows] = await Promise.all([
          db.select().from(productsProjection),
          db.select().from(ingredientsProjection),
          db.select().from(productStocksProjection),
          db.select().from(ordersProjection).orderBy(desc(ordersProjection.createdAt)),
        ]);

        const storeSubset: StoreData = {
          settings: await readSettingsData(),
          poSettings: createDefaultPoSettings(new Date().toISOString()),
          poWaitlistSubscribers: [],
          suppliers: [],
          ingredients: ingredientRows.map(mapIngredient),
          ingredientSupplierPrices: [],
          products: productRows.map(mapProduct),
          recipes: [],
          productStocks: stockRows.map(mapProductStock),
          orders: orderRows.map(mapOrder),
          notifications: [],
          inventoryMovements: [],
        };

        return buildStoreReportsData(storeSubset, options);
        }, (result) => result.sales.length === 0 && result.dailySeries.every((item) => item.revenue === 0 && item.profit === 0)),
    async () => {
      const store = await readStore();
      return buildStoreReportsData(store, options);
    },
  ));

export const readSellerInventoryData = cache(async () =>
  withDbFallback(
    async () =>
      withProjectionRecovery(async () => {
      const db = getDb()!;
      const [productRows, ingredientRows, movementRows] = await Promise.all([
        db.select().from(productsProjection).orderBy(asc(productsProjection.createdAt)),
        db.select().from(ingredientsProjection).orderBy(asc(ingredientsProjection.createdAt)),
        db.select().from(inventoryMovementsProjection).orderBy(desc(inventoryMovementsProjection.createdAt)).limit(10),
      ]);

      return {
        products: productRows.map(mapProduct),
        ingredients: ingredientRows.map(mapIngredient),
        movements: movementRows.map(mapMovement),
      };
    }, (result) => result.products.length === 0 && result.ingredients.length === 0),
    async () => {
      const store = await readStore();
      return {
        products: store.products,
        ingredients: store.ingredients,
        movements: store.inventoryMovements.slice(0, 10),
      };
    },
  ));

export const readSellerOperationsStore = cache(async () =>
  withDbFallback(
    async () =>
      withProjectionRecovery(async () => {
        const db = getDb()!;
        const [productRows, ingredientRows, priceRows, supplierRows, recipeRows, stockRows] =
          await Promise.all([
            db.select().from(productsProjection).orderBy(asc(productsProjection.createdAt)),
            db.select().from(ingredientsProjection).orderBy(asc(ingredientsProjection.createdAt)),
            db
              .select()
              .from(ingredientSupplierPricesProjection)
              .orderBy(desc(ingredientSupplierPricesProjection.effectiveFrom), desc(ingredientSupplierPricesProjection.createdAt)),
            db.select().from(suppliersProjection).orderBy(asc(suppliersProjection.createdAt)),
            db.select().from(recipesProjection),
            db.select().from(productStocksProjection),
          ]);

        return {
          settings: await readSettingsData(),
          poSettings: createDefaultPoSettings(new Date().toISOString()),
          poWaitlistSubscribers: [],
          suppliers: supplierRows.map(mapSupplier),
          ingredients: ingredientRows.map(mapIngredient),
          ingredientSupplierPrices: priceRows.map(mapSupplierPrice),
          products: productRows.map(mapProduct),
          recipes: recipeRows.map(mapRecipe),
          productStocks: stockRows.map(mapProductStock),
          orders: [],
          notifications: [],
          inventoryMovements: [],
        } satisfies StoreData;
      }, (result) => result.products.length === 0 && result.ingredients.length === 0),
    async () => {
      const store = await readStore();
      return {
        ...store,
        orders: [],
        notifications: [],
        inventoryMovements: [],
      };
    },
  ));

export const readSellerPoData = cache(async () =>
  withDbFallback(
    async () =>
      withProjectionRecovery(async () => {
        const db = getDb()!;
        const [poSettingsRows, subscriberRows] = await Promise.all([
          db.select().from(poSettingsProjection).limit(1),
          db
            .select()
            .from(poWaitlistSubscribersProjection)
            .orderBy(desc(poWaitlistSubscribersProjection.createdAt)),
        ]);

        const poSettings = mapPoSettings(poSettingsRows[0]);
        const subscribers = subscriberRows.map(mapPoWaitlistSubscriber);

        return {
          poSettings,
          poState: resolvePoState(poSettings),
          subscribers,
        };
      }, () => false),
    async () => {
      const store = await readStore();
      return {
        poSettings: store.poSettings,
        poState: resolvePoState(store.poSettings),
        subscribers: store.poWaitlistSubscribers,
      };
    },
  ));
