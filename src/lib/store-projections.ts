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

const BUSINESS_TIME_ZONE = "Asia/Jakarta";
const REPORT_STATUS_LABELS = [
  { status: "pending_payment", label: "Pending payment" },
  { status: "payment_review", label: "Payment review" },
  { status: "confirmed", label: "Confirmed" },
  { status: "in_production", label: "In production" },
  { status: "ready_for_pickup", label: "Ready for pickup" },
  { status: "out_for_delivery", label: "Out for delivery" },
  { status: "completed", label: "Completed" },
  { status: "cancelled", label: "Cancelled" },
] as const satisfies Array<{ status: OrderStatus; label: string }>;

function toIso(value: Date | string) {
  return typeof value === "string" ? value : value.toISOString();
}

function formatDailyLabelFromKey(key: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: BUSINESS_TIME_ZONE,
    day: "2-digit",
    month: "short",
  }).format(new Date(`${key}T00:00:00+07:00`));
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

  const db = getDb();

  if (!db) {
    return fallbackReader();
  }

  try {
    return await dbReader();
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";

    if (code === "42P01" || code === "42703") {
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
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";

    if (code === "42P01" || code === "42703") {
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

export const readSellerReportsData = cache(async () =>
  withDbFallback(
    async () =>
      withProjectionRecovery(async () => {
      const db = getDb()!;
      const [productRows, stockRows, metricsRows, statusRows, dailyRows, salesRows] = await Promise.all([
        db.select().from(productsProjection),
        db.select().from(productStocksProjection),
        db.execute(drizzleSql`
          select
            coalesce(sum(o.total), 0)::int as revenue,
            coalesce(sum(coalesce(item_costs.cogs, 0)), 0)::int as cogs,
            coalesce(
              sum(
                case
                  when ((o.created_at at time zone ${BUSINESS_TIME_ZONE})::date = (now() at time zone ${BUSINESS_TIME_ZONE})::date)
                  then o.total
                  else 0
                end
              ),
              0
            )::int as today_revenue,
            count(*)::int as order_count
          from orders_projection o
          left join lateral (
            select coalesce(sum(((item->>'costSnapshot')::int) * ((item->>'quantity')::int)), 0)::int as cogs
            from jsonb_array_elements(o.items) item
          ) item_costs on true
          where o.status <> 'cancelled'
        `),
        db.execute(drizzleSql`
          select status, count(*)::int as count
          from orders_projection
          group by status
        `),
        db.execute(drizzleSql`
          with days as (
            select generate_series(
              ((now() at time zone ${BUSINESS_TIME_ZONE})::date - interval '6 day')::date,
              (now() at time zone ${BUSINESS_TIME_ZONE})::date,
              interval '1 day'
            )::date as day
          ),
          order_costs as (
            select
              ((o.created_at at time zone ${BUSINESS_TIME_ZONE})::date) as business_day,
              o.total,
              coalesce((
                select sum(((item->>'costSnapshot')::int) * ((item->>'quantity')::int))
                from jsonb_array_elements(o.items) item
              ), 0)::int as cogs
            from orders_projection o
            where o.status <> 'cancelled'
          )
          select
            to_char(days.day, 'YYYY-MM-DD') as key,
            coalesce(sum(order_costs.total), 0)::int as revenue,
            coalesce(sum(order_costs.cogs), 0)::int as cogs
          from days
          left join order_costs on order_costs.business_day = days.day
          group by days.day
          order by days.day
        `),
        db.execute(drizzleSql`
          with exploded as (
            select
              (item->>'productId') as product_id,
              coalesce((item->>'quantity')::int, 0) as quantity,
              coalesce((item->>'unitPrice')::int, 0) as unit_price,
              coalesce((item->>'costSnapshot')::int, 0) as cost_snapshot
            from orders_projection o
            cross join lateral jsonb_array_elements(o.items) item
            where o.status <> 'cancelled'
          )
          select
            product_id,
            coalesce(sum(quantity), 0)::int as quantity,
            coalesce(sum(quantity * unit_price), 0)::int as revenue,
            coalesce(sum(quantity * cost_snapshot), 0)::int as cogs
          from exploded
          group by product_id
        `),
      ]);
      const metricsRow = ((metricsRows as unknown) as Array<{
        revenue: number;
        cogs: number;
        today_revenue: number;
        order_count: number;
      }>)[0] ?? {
        revenue: 0,
        cogs: 0,
        today_revenue: 0,
        order_count: 0,
      };
      const products = productRows.map(mapProduct);
      const productStocks = stockRows.map(mapProductStock);
      const salesByProduct = new Map(
        ((salesRows as unknown) as Array<{ product_id: string; quantity: number; revenue: number; cogs: number }>).map((row) => [
          row.product_id,
          row,
        ]),
      );
      const revenue = Number(metricsRow.revenue ?? 0);
      const cogs = Number(metricsRow.cogs ?? 0);
      const grossProfit = revenue - cogs;
      const averageOrderValue = Number(metricsRow.order_count ?? 0)
        ? revenue / Number(metricsRow.order_count)
        : 0;
      const profitMargin = revenue ? grossProfit / revenue : 0;
      const statusCounts = new Map(
        ((statusRows as unknown) as Array<{ status: OrderStatus; count: number }>).map((row) => [
          row.status,
          Number(row.count ?? 0),
        ]),
      );
      const dailySeries = ((dailyRows as unknown) as Array<{ key: string; revenue: number; cogs: number }>).map((row) => {
        const revenueValue = Number(row.revenue ?? 0);
        const cogsValue = Number(row.cogs ?? 0);
        return {
          key: row.key,
          label: formatDailyLabelFromKey(row.key),
          revenue: revenueValue,
          cogs: cogsValue,
          profit: revenueValue - cogsValue,
        };
      });

      return {
        metrics: {
          revenue,
          cogs,
          grossProfit,
          todayRevenue: Number(metricsRow.today_revenue ?? 0),
          pendingOrders:
            (statusCounts.get("pending_payment") ?? 0) +
            (statusCounts.get("payment_review") ?? 0) +
            (statusCounts.get("confirmed") ?? 0) +
            (statusCounts.get("in_production") ?? 0),
          unreadNotifications: 0,
          topProducts: [],
          lowStockIngredients: [],
          lowStockProducts: productStocks
            .filter((stock) => stock.stock <= stock.lowStockThreshold)
            .map((stock) => ({
              ...stock,
              product: products.find((product) => product.id === stock.productId),
            }))
            .sort((a, b) => a.stock - b.stock),
          averageOrderValue,
          profitMargin,
        },
        sales: products.map((product) => {
          const sale = salesByProduct.get(product.id);
          const revenueValue = Number(sale?.revenue ?? 0);
          const cogsValue = Number(sale?.cogs ?? 0);
          return {
            product,
            quantity: Number(sale?.quantity ?? 0),
            revenue: revenueValue,
            cogs: cogsValue,
            grossProfit: revenueValue - cogsValue,
          };
        }),
        dailySeries,
        statusBreakdown: REPORT_STATUS_LABELS.map((item) => ({
          status: item.status,
          label: item.label,
          count: statusCounts.get(item.status) ?? 0,
        })),
        activeOrderCount: Number(metricsRow.order_count ?? 0),
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