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
  productsProjection,
  productStocksProjection,
  recipesProjection,
  settingsProjection,
  suppliersProjection,
} from "@/db/schema";
import {
  ensureDatabaseStoreReady,
  getOrderByCode,
  readStore,
  syncDatabaseProjections,
} from "@/lib/data-store";
import {
  getDashboardMetrics,
  getReportDailySeries,
  getReportHighlights,
  getSalesBreakdown,
  getStatusBreakdown,
} from "@/lib/reports";
import { AppSettings, Ingredient, IngredientSupplierPrice, InventoryItemType, InventoryMovementType, Notification, Order, OrderItem, OrderStatus, PaymentProof, Product, ProductStock, Recipe, StoreData, Supplier } from "@/lib/types";

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
    createdAt: toIso(row.createdAt),
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

async function withDbFallback<T>(dbReader: () => Promise<T>, fallbackReader: () => Promise<T>) {
  if (!hasDatabaseUrl()) {
    return fallbackReader();
  }

  await ensureDatabaseStoreReady();
  const db = getDb();

  if (!db) {
    return fallbackReader();
  }

  return dbReader();
}

const hasProjectionSnapshot = cache(async () => {
  if (!hasDatabaseUrl()) {
    return false;
  }

  const db = getDb();

  if (!db) {
    return false;
  }

  const rows = await db.select({ id: settingsProjection.id }).from(settingsProjection).limit(1);
  return rows.length > 0;
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
      const [settingsRow, productRows] = await Promise.all([
        db
          .select({ payload: settingsProjection.payload })
          .from(settingsProjection)
          .limit(1),
        db
          .select()
          .from(productsProjection)
          .where(eq(productsProjection.isActive, true))
          .orderBy(desc(productsProjection.featured), asc(productsProjection.createdAt)),
      ]);

      return {
        settings: (settingsRow[0]?.payload as AppSettings | undefined) ?? (await readSettingsData()),
        products: productRows.map(mapProduct),
      };
    }, (result) => result.products.length === 0),
    async () => {
      const store = await readStore();
      return {
        settings: store.settings,
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
      const [productRows, orderRows, notificationRows, ingredientRows, stockRows] = await Promise.all([
        db.select().from(productsProjection),
        db.select().from(ordersProjection).orderBy(desc(ordersProjection.createdAt)),
        db.select().from(notificationsProjection).orderBy(desc(notificationsProjection.createdAt)).limit(5),
        db.select().from(ingredientsProjection),
        db.select().from(productStocksProjection),
      ]);

      const storeSubset: StoreData = {
        settings: await readSettingsData(),
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
        metrics: getDashboardMetrics(storeSubset),
        notifications: notificationRows.map(mapNotification),
        recentOrders: orderRows.slice(0, 5).map(mapOrder),
      };
    }, (result) => result.recentOrders.length === 0 && result.notifications.length === 0),
    async () => {
      const store = await readStore();
      return {
        metrics: getDashboardMetrics(store),
        notifications: store.notifications.slice(0, 5),
        recentOrders: store.orders.slice(0, 5),
      };
    },
  ));

export const readSellerOrdersData = cache(async () =>
  withDbFallback(
    async () =>
      withProjectionRecovery(async () => {
      const db = getDb()!;
      const [orderRows, productRows] = await Promise.all([
        db.select().from(ordersProjection).orderBy(desc(ordersProjection.createdAt)),
        db
          .select()
          .from(productsProjection)
          .where(eq(productsProjection.isActive, true))
          .orderBy(desc(productsProjection.featured), asc(productsProjection.createdAt)),
      ]);

      return {
        orders: orderRows.map(mapOrder),
        products: productRows.map(mapProduct),
      };
    }, (result) => result.orders.length === 0 && result.products.length === 0),
    async () => {
      const store = await readStore();
      return {
        orders: store.orders,
        products: store.products.filter((product) => product.isActive),
      };
    },
  ));

export const readSellerReportsData = cache(async () =>
  withDbFallback(
    async () =>
      withProjectionRecovery(async () => {
      const db = getDb()!;
      const [productRows, orderRows, stockRows] = await Promise.all([
        db.select().from(productsProjection),
        db.select().from(ordersProjection).orderBy(desc(ordersProjection.createdAt)),
        db.select().from(productStocksProjection),
      ]);

      const storeSubset: StoreData = {
        settings: await readSettingsData(),
        suppliers: [],
        ingredients: [],
        ingredientSupplierPrices: [],
        products: productRows.map(mapProduct),
        recipes: [],
        productStocks: stockRows.map(mapProductStock),
        orders: orderRows.map(mapOrder),
        notifications: [],
        inventoryMovements: [],
      };

      return {
        metrics: getReportHighlights(storeSubset),
        sales: getSalesBreakdown(storeSubset),
        dailySeries: getReportDailySeries(storeSubset),
        statusBreakdown: getStatusBreakdown(storeSubset),
        activeOrderCount: storeSubset.orders.filter((order) => order.status !== "cancelled").length,
      };
    }, (result) => result.sales.length === 0 && result.dailySeries.every((item) => item.revenue === 0 && item.profit === 0)),
    async () => {
      const store = await readStore();
      return {
        metrics: getReportHighlights(store),
        sales: getSalesBreakdown(store),
        dailySeries: getReportDailySeries(store),
        statusBreakdown: getStatusBreakdown(store),
        activeOrderCount: store.orders.filter((order) => order.status !== "cancelled").length,
      };
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
