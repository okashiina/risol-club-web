"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loginSeller, logoutSeller } from "@/lib/auth";
import {
  calculateProductCost,
  getProductStock,
  getRecipeForProduct,
  isSalesStatus,
  makeId,
  nowIso,
  writeStore,
} from "@/lib/data-store";
import { OrderStatus, Product, StoreData } from "@/lib/types";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function numberValue(formData: FormData, key: string) {
  return Number(textValue(formData, key) || 0);
}

function revalidateSeller() {
  revalidatePath("/");
  revalidatePath("/checkout");
  revalidatePath("/track");
  revalidatePath("/seller");
  revalidatePath("/seller/orders");
  revalidatePath("/seller/menu");
  revalidatePath("/seller/costing");
  revalidatePath("/seller/inventory");
  revalidatePath("/seller/reports");
}

function latestPriceForIngredient(store: StoreData, ingredientId: string) {
  return store.ingredientSupplierPrices
    .filter((price) => price.ingredientId === ingredientId)
    .sort((a, b) => {
      const effective = b.effectiveFrom.localeCompare(a.effectiveFrom);
      return effective === 0 ? b.createdAt.localeCompare(a.createdAt) : effective;
    })[0];
}

function syncIngredientActiveSupplier(store: StoreData, ingredientId: string) {
  const ingredient = store.ingredients.find((item) => item.id === ingredientId);

  if (!ingredient) {
    return;
  }

  ingredient.activeSupplierId = latestPriceForIngredient(store, ingredientId)?.supplierId;
}

export async function sellerLoginAction(formData: FormData) {
  const email = textValue(formData, "email");
  const password = textValue(formData, "password");
  const ok = await loginSeller(email, password);

  if (!ok) {
    redirect("/seller/login?error=invalid");
  }

  redirect("/seller");
}

export async function sellerLogoutAction() {
  await logoutSeller();
  redirect("/seller/login");
}

export async function markNotificationsReadAction() {
  await writeStore((store) => {
    store.notifications = store.notifications.map((notification) => ({
      ...notification,
      read: true,
    }));

    return store;
  });

  revalidateSeller();
}

export async function updateOrderStatusAction(formData: FormData) {
  const orderId = textValue(formData, "orderId");
  const nextStatus = textValue(formData, "status") as OrderStatus;

  await writeStore((store) => {
    const order = store.orders.find((item) => item.id === orderId);

    if (!order) {
      return store;
    }

    const previousStatus = order.status;
    const enteringSales = !isSalesStatus(previousStatus) && isSalesStatus(nextStatus);
    const leavingSales = isSalesStatus(previousStatus) && !isSalesStatus(nextStatus);

    if (nextStatus === "confirmed") {
      order.items = order.items.map((item) => ({
        ...item,
        costSnapshot: item.costSnapshot || calculateProductCost(store, item.productId),
      }));
    }

    if (enteringSales) {
      for (const item of order.items) {
        const stock = store.productStocks.find(
          (entry) => entry.productId === item.productId,
        );

        if (stock) {
          stock.stock -= item.quantity;
          stock.updatedAt = nowIso();
        }

        store.inventoryMovements.unshift({
          id: makeId("move"),
          itemType: "product",
          itemId: item.productId,
          type: "sale",
          quantity: -item.quantity,
          note: `Order ${order.code} reserved/confirmed`,
          createdAt: nowIso(),
        });
      }
    }

    if (leavingSales && nextStatus === "cancelled") {
      for (const item of order.items) {
        const stock = store.productStocks.find(
          (entry) => entry.productId === item.productId,
        );

        if (stock) {
          stock.stock += item.quantity;
          stock.updatedAt = nowIso();
        }

        store.inventoryMovements.unshift({
          id: makeId("move"),
          itemType: "product",
          itemId: item.productId,
          type: "correction",
          quantity: item.quantity,
          note: `Order ${order.code} cancelled and stock returned`,
          createdAt: nowIso(),
        });
      }
    }

    order.status = nextStatus;
    order.updatedAt = nowIso();

    return store;
  });

  revalidateSeller();
}

export async function upsertProductAction(formData: FormData) {
  const id = textValue(formData, "id");
  const now = nowIso();

  await writeStore((store) => {
    const payload: Product = {
      id: id || makeId("prod"),
      slug: textValue(formData, "slug"),
      name: textValue(formData, "name"),
      nameEn: textValue(formData, "nameEn") || textValue(formData, "name"),
      shortDescription: textValue(formData, "shortDescription"),
      shortDescriptionEn:
        textValue(formData, "shortDescriptionEn") ||
        textValue(formData, "shortDescription"),
      description: textValue(formData, "description"),
      descriptionEn:
        textValue(formData, "descriptionEn") || textValue(formData, "description"),
      price: numberValue(formData, "price"),
      featured: textValue(formData, "featured") === "on",
      isActive: textValue(formData, "isActive") === "on",
      accent: textValue(formData, "accent") || "from-rose-100 via-white to-orange-100",
      prepLabel: textValue(formData, "prepLabel") || "Ready in 1 day pre-order",
      prepLabelEn:
        textValue(formData, "prepLabelEn") || "1 day pre-order lead time",
      createdAt: now,
      updatedAt: now,
    };

    const existing = store.products.find((product) => product.id === id);

    if (existing) {
      Object.assign(existing, { ...payload, createdAt: existing.createdAt });
    } else {
      store.products.unshift(payload);
      store.productStocks.unshift({
        productId: payload.id,
        stock: numberValue(formData, "stock"),
        lowStockThreshold: numberValue(formData, "lowStockThreshold") || 8,
        updatedAt: now,
      });
      store.recipes.push({
        id: makeId("rec"),
        productId: payload.id,
        yieldCount: 1,
        items: [],
        updatedAt: now,
      });
    }

    return store;
  });

  revalidateSeller();
}

export async function addIngredientAction(formData: FormData) {
  await writeStore((store) => {
    store.ingredients.unshift({
      id: makeId("ing"),
      name: textValue(formData, "name"),
      unit: textValue(formData, "unit"),
      stock: numberValue(formData, "stock"),
      lowStockThreshold: numberValue(formData, "lowStockThreshold") || 1,
      activeSupplierId: textValue(formData, "activeSupplierId") || undefined,
      createdAt: nowIso(),
    });

    return store;
  });

  revalidateSeller();
}

export async function updateIngredientAction(formData: FormData) {
  const ingredientId = textValue(formData, "ingredientId");

  await writeStore((store) => {
    const ingredient = store.ingredients.find((item) => item.id === ingredientId);

    if (!ingredient) {
      return store;
    }

    ingredient.name = textValue(formData, "name");
    ingredient.unit = textValue(formData, "unit");
    ingredient.stock = numberValue(formData, "stock");
    ingredient.lowStockThreshold = numberValue(formData, "lowStockThreshold") || 1;
    ingredient.activeSupplierId = textValue(formData, "activeSupplierId") || undefined;

    return store;
  });

  revalidateSeller();
}

export async function deleteIngredientAction(formData: FormData) {
  const ingredientId = textValue(formData, "ingredientId");

  await writeStore((store) => {
    store.ingredients = store.ingredients.filter((item) => item.id !== ingredientId);
    store.ingredientSupplierPrices = store.ingredientSupplierPrices.filter(
      (item) => item.ingredientId !== ingredientId,
    );
    store.inventoryMovements = store.inventoryMovements.filter(
      (movement) =>
        !(movement.itemType === "ingredient" && movement.itemId === ingredientId),
    );
    store.recipes = store.recipes.map((recipe) => ({
      ...recipe,
      items: recipe.items.filter((item) => item.ingredientId !== ingredientId),
      updatedAt: nowIso(),
    }));

    return store;
  });

  revalidateSeller();
}

export async function addSupplierAction(formData: FormData) {
  await writeStore((store) => {
    store.suppliers.unshift({
      id: makeId("sup"),
      name: textValue(formData, "name"),
      contact: textValue(formData, "contact"),
      notes: textValue(formData, "notes"),
      isActive: true,
      createdAt: nowIso(),
    });

    return store;
  });

  revalidateSeller();
}

export async function updateSupplierAction(formData: FormData) {
  const supplierId = textValue(formData, "supplierId");

  await writeStore((store) => {
    const supplier = store.suppliers.find((item) => item.id === supplierId);

    if (!supplier) {
      return store;
    }

    supplier.name = textValue(formData, "name");
    supplier.contact = textValue(formData, "contact");
    supplier.notes = textValue(formData, "notes") || undefined;
    supplier.isActive = textValue(formData, "isActive") === "on";

    return store;
  });

  revalidateSeller();
}

export async function deleteSupplierAction(formData: FormData) {
  const supplierId = textValue(formData, "supplierId");

  await writeStore((store) => {
    store.suppliers = store.suppliers.filter((item) => item.id !== supplierId);
    store.ingredientSupplierPrices = store.ingredientSupplierPrices.filter(
      (item) => item.supplierId !== supplierId,
    );
    store.ingredients = store.ingredients.map((ingredient) => ({
      ...ingredient,
      activeSupplierId:
        ingredient.activeSupplierId === supplierId
          ? undefined
          : ingredient.activeSupplierId,
    }));

    for (const ingredient of store.ingredients) {
      if (!ingredient.activeSupplierId) {
        syncIngredientActiveSupplier(store, ingredient.id);
      }
    }

    return store;
  });

  revalidateSeller();
}

export async function addSupplierPriceAction(formData: FormData) {
  const ingredientId = textValue(formData, "ingredientId");
  const supplierId = textValue(formData, "supplierId");

  await writeStore((store) => {
    store.ingredientSupplierPrices.unshift({
      id: makeId("price"),
      ingredientId,
      supplierId,
      pricePerUnit: numberValue(formData, "pricePerUnit"),
      effectiveFrom: textValue(formData, "effectiveFrom"),
      notes: textValue(formData, "notes"),
      createdAt: nowIso(),
    });

    const ingredient = store.ingredients.find((item) => item.id === ingredientId);
    if (ingredient) {
      ingredient.activeSupplierId = supplierId;
    }

    return store;
  });

  revalidateSeller();
}

export async function updateSupplierPriceAction(formData: FormData) {
  const priceId = textValue(formData, "priceId");

  await writeStore((store) => {
    const price = store.ingredientSupplierPrices.find((item) => item.id === priceId);

    if (!price) {
      return store;
    }

    const previousIngredientId = price.ingredientId;
    price.ingredientId = textValue(formData, "ingredientId");
    price.supplierId = textValue(formData, "supplierId");
    price.pricePerUnit = numberValue(formData, "pricePerUnit");
    price.effectiveFrom = textValue(formData, "effectiveFrom");
    price.notes = textValue(formData, "notes") || undefined;

    syncIngredientActiveSupplier(store, previousIngredientId);
    syncIngredientActiveSupplier(store, price.ingredientId);

    return store;
  });

  revalidateSeller();
}

export async function deleteSupplierPriceAction(formData: FormData) {
  const priceId = textValue(formData, "priceId");

  await writeStore((store) => {
    const price = store.ingredientSupplierPrices.find((item) => item.id === priceId);

    if (!price) {
      return store;
    }

    const ingredientId = price.ingredientId;
    store.ingredientSupplierPrices = store.ingredientSupplierPrices.filter(
      (item) => item.id !== priceId,
    );
    syncIngredientActiveSupplier(store, ingredientId);

    return store;
  });

  revalidateSeller();
}

export async function upsertRecipeItemAction(formData: FormData) {
  const productId = textValue(formData, "productId");
  const ingredientId = textValue(formData, "ingredientId");
  const quantity = numberValue(formData, "quantity");

  await writeStore((store) => {
    const recipe = getRecipeForProduct(store, productId);
    if (!recipe) {
      return store;
    }

    const existing = recipe.items.find((item) => item.ingredientId === ingredientId);

    if (existing) {
      existing.quantity = quantity;
    } else {
      recipe.items.push({ ingredientId, quantity });
    }

    recipe.updatedAt = nowIso();
    return store;
  });

  revalidateSeller();
}

export async function adjustIngredientStockAction(formData: FormData) {
  const ingredientId = textValue(formData, "ingredientId");
  const quantity = numberValue(formData, "quantity");
  const note = textValue(formData, "note");

  await writeStore((store) => {
    const ingredient = store.ingredients.find((item) => item.id === ingredientId);
    if (!ingredient) {
      return store;
    }

    ingredient.stock += quantity;
    store.inventoryMovements.unshift({
      id: makeId("move"),
      itemType: "ingredient",
      itemId: ingredientId,
      type: quantity >= 0 ? "restock" : "adjustment",
      quantity,
      note: note || "Manual stock adjustment",
      createdAt: nowIso(),
    });

    return store;
  });

  revalidateSeller();
}

export async function adjustProductStockAction(formData: FormData) {
  const productId = textValue(formData, "productId");
  const quantity = numberValue(formData, "quantity");
  const note = textValue(formData, "note");

  await writeStore((store) => {
    const stock = getProductStock(store, productId);
    if (!stock) {
      return store;
    }

    stock.stock += quantity;
    stock.updatedAt = nowIso();
    store.inventoryMovements.unshift({
      id: makeId("move"),
      itemType: "product",
      itemId: productId,
      type: quantity >= 0 ? "restock" : "adjustment",
      quantity,
      note: note || "Manual product adjustment",
      createdAt: nowIso(),
    });

    return store;
  });

  revalidateSeller();
}

export async function recordProductionAction(formData: FormData) {
  const productId = textValue(formData, "productId");
  const quantity = numberValue(formData, "quantity");

  await writeStore((store) => {
    const recipe = getRecipeForProduct(store, productId);
    const stock = getProductStock(store, productId);

    if (!recipe || !stock || quantity <= 0) {
      return store;
    }

    for (const item of recipe.items) {
      const ingredient = store.ingredients.find(
        (entry) => entry.id === item.ingredientId,
      );

      if (ingredient) {
        const used = (item.quantity / Math.max(recipe.yieldCount, 1)) * quantity;
        ingredient.stock -= used;
        store.inventoryMovements.unshift({
          id: makeId("move"),
          itemType: "ingredient",
          itemId: ingredient.id,
          type: "production",
          quantity: -used,
          note: `Used for production of ${quantity} batch`,
          createdAt: nowIso(),
        });
      }
    }

    stock.stock += quantity;
    stock.updatedAt = nowIso();
    store.inventoryMovements.unshift({
      id: makeId("move"),
      itemType: "product",
      itemId: productId,
      type: "production",
      quantity,
      note: "Production batch added",
      createdAt: nowIso(),
    });

    return store;
  });

  revalidateSeller();
}
