import {
  calculateProductCost,
  getLatestIngredientPrice,
  getProductStock,
  isSalesStatus,
  summarizeOrderCost,
} from "@/lib/data-store";
import { StoreData } from "@/lib/types";

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
  const completedOrActiveOrders = store.orders.filter(
    (order) => order.status !== "cancelled",
  );
  const revenue = completedOrActiveOrders.reduce((sum, order) => sum + order.total, 0);
  const cogs = completedOrActiveOrders.reduce(
    (sum, order) => sum + summarizeOrderCost(store, order),
    0,
  );
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayRevenue = completedOrActiveOrders
    .filter((order) => order.createdAt.startsWith(todayKey))
    .reduce((sum, order) => sum + order.total, 0);

  const orderVolume = new Map<string, number>();

  for (const order of completedOrActiveOrders) {
    if (!isSalesStatus(order.status) && order.status !== "payment_review") {
      continue;
    }

    for (const item of order.items) {
      orderVolume.set(
        item.productName,
        (orderVolume.get(item.productName) ?? 0) + item.quantity,
      );
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
  return store.products.map((product) => {
    const soldItems = store.orders.flatMap((order) =>
      order.status === "cancelled"
        ? []
        : order.items.filter((item) => item.productId === product.id),
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
      product,
      quantity,
      revenue,
      cogs,
      grossProfit: revenue - cogs,
    };
  });
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
