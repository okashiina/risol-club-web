import {
  calculateProductCost,
  getLatestIngredientPrice,
  getProductStock,
  isSalesStatus,
  summarizeOrderCost,
} from "@/lib/data-store";
import { StoreData } from "@/lib/types";

const BUSINESS_TIME_ZONE = "Asia/Jakarta";
const MIX_PACK_PRODUCT_ID = "custom-mix-pack";

export type ReportRangeDays = 7 | 30 | 90;

export type ReportSeriesPoint = {
  key: string;
  label: string;
  revenue: number;
  cogs: number;
  profit: number;
};

export type SalesBreakdownItem = {
  product: {
    id: string;
    name: string;
  };
  quantity: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
};

export type ReportQueryOptions = {
  range?: ReportRangeDays;
  hideZero?: boolean;
};

export type ReportDigestData = {
  revenue: number;
  cogs: number;
  grossProfit: number;
  profitMargin: number;
  averageOrderValue: number;
  orderCount: number;
  topPerformers: SalesBreakdownItem[];
  lowStockIngredientCount: number;
  lowStockProductCount: number;
  inventoryAttention: string[];
  inactivityWarnings: string[];
};

function getBusinessDateParts(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);

  return {
    year: parts.find((part) => part.type === "year")?.value ?? "0000",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    day: parts.find((part) => part.type === "day")?.value ?? "01",
  };
}

export function getBusinessDateKey(value: Date | string) {
  const { year, month, day } = getBusinessDateParts(value);
  return `${year}-${month}-${day}`;
}

function getRangeOption(days?: number): ReportRangeDays {
  if (days === 30 || days === 90) {
    return days;
  }

  return 7;
}

function getReportWindowKeys(range: ReportRangeDays) {
  const today = new Date();

  return Array.from({ length: range }, (_, index) => {
    const date = new Date(today.getTime() - (range - index - 1) * 24 * 60 * 60 * 1000);
    const key = getBusinessDateKey(date);

    return {
      key,
      label: new Intl.DateTimeFormat("id-ID", {
        timeZone: BUSINESS_TIME_ZONE,
        day: "2-digit",
        month: "short",
      }).format(date),
    };
  });
}

function getMixPackProductLabel() {
  return {
    id: MIX_PACK_PRODUCT_ID,
    name: "Mix Pack",
  };
}

function isPastOrPresent(value: string) {
  return new Date(value).getTime() <= Date.now();
}

function getSalesOrders(store: StoreData) {
  return store.orders.filter(
    (order) => order.status !== "cancelled" && isPastOrPresent(order.createdAt),
  );
}

function getSellableProducts(store: StoreData) {
  return store.products.filter(
    (product) => product.isActive && product.variants.some((variant) => variant.isActive),
  );
}

function getTopSalesBreakdownItems(
  sales: SalesBreakdownItem[],
  limit = 3,
) {
  return [...sales]
    .filter((item) => item.revenue > 0 || item.quantity > 0)
    .sort((left, right) => {
      if (right.revenue !== left.revenue) {
        return right.revenue - left.revenue;
      }

      return right.quantity - left.quantity;
    })
    .slice(0, limit);
}

function getLastOrderDate(store: StoreData) {
  return getSalesOrders(store)
    .map((order) => order.createdAt)
    .sort((left, right) => right.localeCompare(left))[0];
}

function getPoClosedSince(store: StoreData) {
  const sellableProducts = getSellableProducts(store);

  if (sellableProducts.length > 0 || store.products.length === 0) {
    return null;
  }

  return [...store.products]
    .map((product) => product.updatedAt)
    .sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function getDaysSince(value: string | null) {
  if (!value) {
    return null;
  }

  const now = new Date();
  const diff = now.getTime() - new Date(value).getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

export function getInactivitySignals(store: StoreData) {
  const lastOrderDate = getLastOrderDate(store) ?? null;
  const noOrderDays = getDaysSince(lastOrderDate);
  const poClosedSince = getPoClosedSince(store);
  const poClosedDays = getDaysSince(poClosedSince);
  const warnings: string[] = [];

  if (noOrderDays !== null && noOrderDays >= 7) {
    warnings.push(`Sudah ${noOrderDays} hari tidak ada order baru masuk.`);
  }

  if (poClosedDays !== null && poClosedDays >= 14) {
    warnings.push(`Semua menu tidak aktif selama ${poClosedDays} hari, PO perlu dicek lagi.`);
  }

  return {
    noOrderDays,
    poClosedDays,
    warnings,
    lastOrderDate,
    poClosedSince,
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function getDashboardMetrics(store: StoreData) {
  const completedOrActiveOrders = getSalesOrders(store);
  const revenue = completedOrActiveOrders.reduce((sum, order) => sum + order.total, 0);
  const cogs = completedOrActiveOrders.reduce(
    (sum, order) => sum + summarizeOrderCost(store, order),
    0,
  );
  const todayKey = getBusinessDateKey(new Date());
  const todayRevenue = completedOrActiveOrders
    .filter((order) => getBusinessDateKey(order.createdAt) === todayKey)
    .reduce((sum, order) => sum + order.total, 0);

  const orderVolume = new Map<string, number>();

  for (const order of completedOrActiveOrders) {
    if (!isSalesStatus(order.status) && order.status !== "payment_review") {
      continue;
    }

    for (const item of order.items) {
      const label = item.productId === MIX_PACK_PRODUCT_ID ? "Mix Pack" : item.productName;
      orderVolume.set(label, (orderVolume.get(label) ?? 0) + item.quantity);
    }
  }

  const topProducts = [...orderVolume.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, quantity]) => ({ name, quantity }));

  const lowStockIngredients = store.ingredients
    .filter((ingredient) => ingredient.stock <= ingredient.lowStockThreshold)
    .sort((a, b) => a.stock - b.stock);

  const lowStockProducts = store.productStocks
    .filter((stock) => stock.stock <= stock.lowStockThreshold)
    .map((stock) => ({
      ...stock,
      product: store.products.find((product) => product.id === stock.productId),
    }))
    .sort((a, b) => a.stock - b.stock);

  return {
    revenue,
    cogs,
    grossProfit: revenue - cogs,
    todayRevenue,
    pendingOrders: store.orders.filter((order) =>
      ["payment_review", "pending_payment", "confirmed", "in_production"].includes(
        order.status,
      ),
    ).length,
    unreadNotifications: store.notifications.filter((notification) => !notification.read)
      .length,
    topProducts,
    lowStockIngredients,
    lowStockProducts,
  };
}

export function getCostingOverview(store: StoreData) {
  return store.products.map((product) => ({
    product,
    cost: calculateProductCost(store, product.id),
    stock: getProductStock(store, product.id)?.stock ?? 0,
  }));
}

export function getIngredientHistory(store: StoreData) {
  return store.ingredients.map((ingredient) => {
    const history = store.ingredientSupplierPrices
      .filter((price) => price.ingredientId === ingredient.id)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

    return {
      ingredient,
      activePrice: getLatestIngredientPrice(store, ingredient.id),
      history,
    };
  });
}

export function getSalesBreakdown(store: StoreData) {
  const baseSales = store.products.map((product) => {
    const soldItems = getSalesOrders(store).flatMap((order) =>
      order.items.filter((item) => item.productId === product.id),
    );

    const quantity = soldItems.reduce((sum, item) => sum + item.quantity, 0);
    const revenue = soldItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const cogs = soldItems.reduce(
      (sum, item) => sum + item.quantity * item.costSnapshot,
      0,
    );

    return {
      product: {
        id: product.id,
        name: product.name,
      },
      quantity,
      revenue,
      cogs,
      grossProfit: revenue - cogs,
    } satisfies SalesBreakdownItem;
  });

  const mixItems = getSalesOrders(store).flatMap((order) =>
    order.items.filter(
      (item) => item.productId === MIX_PACK_PRODUCT_ID || item.customMixComponents?.length,
    ),
  );

  if (!mixItems.length) {
    return baseSales;
  }

  const mixQuantity = mixItems.reduce((sum, item) => sum + item.quantity, 0);
  const mixRevenue = mixItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const mixCogs = mixItems.reduce(
    (sum, item) => sum + item.quantity * item.costSnapshot,
    0,
  );

  return [
    ...baseSales,
    {
      product: getMixPackProductLabel(),
      quantity: mixQuantity,
      revenue: mixRevenue,
      cogs: mixCogs,
      grossProfit: mixRevenue - mixCogs,
    } satisfies SalesBreakdownItem,
  ];
}

export function getReportDailySeries(
  store: StoreData,
  options: ReportQueryOptions = {},
) {
  const range = getRangeOption(options.range);
  const hideZero = options.hideZero ?? true;
  const salesOrders = getSalesOrders(store);

  const series = getReportWindowKeys(range).map((day) => {
    const orders = salesOrders.filter((order) => getBusinessDateKey(order.createdAt) === day.key);
    const revenue = orders.reduce((sum, order) => sum + order.total, 0);
    const cogs = orders.reduce((sum, order) => sum + summarizeOrderCost(store, order), 0);

    return {
      key: day.key,
      label: day.label,
      revenue,
      cogs,
      profit: revenue - cogs,
    } satisfies ReportSeriesPoint;
  });

  return hideZero
    ? series.filter((item) => item.revenue !== 0 || item.profit !== 0)
    : series;
}

export function getStatusBreakdown(store: StoreData) {
  const labels = {
    pending_payment: "Pending payment",
    payment_review: "Payment review",
    confirmed: "Confirmed",
    in_production: "In production",
    ready_for_pickup: "Ready for pickup",
    out_for_delivery: "Out for delivery",
    completed: "Completed",
    cancelled: "Cancelled",
  } as const;

  return Object.entries(labels).map(([status, label]) => ({
    status,
    label,
    count: store.orders.filter((order) => order.status === status).length,
  }));
}

export function getReportHighlights(store: StoreData) {
  const metrics = getDashboardMetrics(store);
  const nonCancelledOrders = getSalesOrders(store);
  const averageOrderValue = nonCancelledOrders.length
    ? metrics.revenue / nonCancelledOrders.length
    : 0;
  const profitMargin = metrics.revenue ? metrics.grossProfit / metrics.revenue : 0;

  return {
    ...metrics,
    averageOrderValue,
    profitMargin,
  };
}

export function getReportDigestData(
  store: StoreData,
  options: { days?: number; currentMonth?: boolean } = {},
) {
  const salesOrders = getSalesOrders(store);
  const now = new Date();
  const rangeDays = options.days ?? 7;
  const windowStart = new Date(now.getTime() - (rangeDays - 1) * 24 * 60 * 60 * 1000);
  const monthKey = `${getBusinessDateParts(now).year}-${getBusinessDateParts(now).month}`;

  const orders = salesOrders.filter((order) => {
    if (options.currentMonth) {
      return getBusinessDateKey(order.createdAt).startsWith(monthKey);
    }

    return new Date(order.createdAt).getTime() >= windowStart.getTime();
  });

  const scopedStore: StoreData = {
    ...store,
    orders,
  };
  const metrics = getReportHighlights(scopedStore);
  const sales = getSalesBreakdown(scopedStore);
  const topPerformers = getTopSalesBreakdownItems(sales);
  const lowStockIngredients = store.ingredients.filter(
    (ingredient) => ingredient.stock <= ingredient.lowStockThreshold,
  );
  const lowStockProducts = store.productStocks.filter(
    (stock) => stock.stock <= stock.lowStockThreshold,
  );
  const inventoryAttention = [
    `${lowStockIngredients.length} bahan menyentuh low stock.`,
    `${lowStockProducts.length} stok produk jadi perlu dicek.`,
  ];

  return {
    revenue: metrics.revenue,
    cogs: metrics.cogs,
    grossProfit: metrics.grossProfit,
    profitMargin: metrics.profitMargin,
    averageOrderValue: metrics.averageOrderValue,
    orderCount: orders.length,
    topPerformers,
    lowStockIngredientCount: lowStockIngredients.length,
    lowStockProductCount: lowStockProducts.length,
    inventoryAttention,
    inactivityWarnings: getInactivitySignals(store).warnings,
  } satisfies ReportDigestData;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: BUSINESS_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
