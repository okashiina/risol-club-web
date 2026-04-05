"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del, put } from "@vercel/blob";
import { loginSeller, logoutSeller, requireSellerSession } from "@/lib/auth";
import {
  cloneImages,
  cloneVariants,
  DEFAULT_PACK_SIZE,
  findCatalogBlueprint,
  getPackSize,
  getPieceCount,
  getVariant,
} from "@/lib/catalog";
import {
  calculateProductCost,
  getProductStock,
  getRecipeForProduct,
  isSalesStatus,
  makeId,
  nowIso,
  writeStore,
} from "@/lib/data-store";
import { getPaymentProofHref, isBlobPaymentProof } from "@/lib/payment-proof";
import { Order, OrderStatus, Product, ProductVariantType, StoreData } from "@/lib/types";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function numberValue(formData: FormData, key: string) {
  return Number(textValue(formData, key) || 0);
}

async function requireSellerActionSession() {
  await requireSellerSession();
}

function revalidateSellerLayout() {
  revalidatePath("/seller", "layout");
}

function revalidateSellerDashboard() {
  revalidateSellerLayout();
  revalidatePath("/seller");
}

function revalidatePublicCatalog(slug?: string) {
  revalidatePath("/");
  revalidatePath("/checkout");
  revalidatePath("/menu/[slug]", "page");

  if (slug) {
    revalidatePath(`/menu/${slug}`);
  }
}

function revalidateSellerSalesViews() {
  revalidateSellerDashboard();
  revalidatePath("/seller/orders");
  revalidatePath("/seller/inventory");
  revalidatePath("/seller/reports");
}

function revalidateSellerMenuViews(slug?: string, previousSlug?: string) {
  revalidateSellerDashboard();
  revalidatePath("/seller/menu");
  revalidatePublicCatalog(slug);

  if (previousSlug && previousSlug !== slug) {
    revalidatePath(`/menu/${previousSlug}`);
  }
}

function revalidateSellerCostingViews() {
  revalidateSellerDashboard();
  revalidatePath("/seller/costing");
  revalidatePath("/seller/menu");
  revalidatePath("/seller/inventory");
}

function revalidateSellerInventoryViews() {
  revalidateSellerDashboard();
  revalidatePath("/seller/inventory");
}

function revalidateSellerProductViews(slug?: string, previousSlug?: string) {
  revalidateSellerMenuViews(slug, previousSlug);
  revalidatePath("/seller/costing");
  revalidatePath("/seller/inventory");
}

function revalidateOrderArtifacts(orderCode: string) {
  revalidatePath(`/order/${orderCode}`);
  revalidatePath(`/api/order/${orderCode}`);
}

function makeOrderCode(orderCount: number) {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `RC-${day}${month}-${String(orderCount + 1).padStart(3, "0")}`;
}

async function uploadPaymentProof(
  file: File,
  orderCode: string,
) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const pathname = `payment-proofs/${orderCode}/${Date.now()}-${crypto.randomUUID().slice(0, 6)}.${extension}`;
  const result = await put(pathname, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type || "application/octet-stream",
  });

  return result.url;
}

async function fileToPaymentProofPayload(
  file: File | FormDataEntryValue | null,
  orderCode: string,
) {
  if (!(file instanceof File) || file.size <= 0) {
    return undefined;
  }

  const mimeType = file.type || "application/octet-stream";
  const uploadedAt = nowIso();

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const url = await uploadPaymentProof(file, orderCode);

    return {
      fileName: file.name,
      mimeType,
      url,
      uploadedAt,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    fileName: file.name,
    mimeType,
    url: `data:${mimeType};base64,${buffer.toString("base64")}`,
    dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
    uploadedAt,
  };
}

function variantsFromFormData(formData: FormData, fallback: Product) {
  const frozenPrice = numberValue(formData, "frozenPrice");
  const friedPrice = numberValue(formData, "friedPrice");

  return [
    {
      type: "frozen" as const,
      label: textValue(formData, "frozenLabel") || "Frozen",
      price: frozenPrice || getVariant(fallback, "frozen")?.price || 28000,
      isActive: textValue(formData, "frozenActive") !== "off",
    },
    {
      type: "fried" as const,
      label: textValue(formData, "friedLabel") || "Fried",
      price: friedPrice || getVariant(fallback, "fried")?.price || 30000,
      isActive: textValue(formData, "friedActive") !== "off",
    },
  ];
}

async function uploadProductImages(files: File[], slug: string, productName: string) {
  const uploaded: Array<{ url: string; alt: string }> = [];

  for (const [index, file] of files.entries()) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const pathname = `products/${slug}/${Date.now()}-${index + 1}.${extension}`;
    const result = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type || "application/octet-stream",
    });

    uploaded.push({
      url: result.url,
      alt: `${productName} photo ${index + 1}`,
    });
  }

  return uploaded;
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
  await requireSellerActionSession();

  await writeStore((store) => {
    store.notifications = store.notifications.map((notification) => ({
      ...notification,
      read: true,
    }));

    return store;
  });

  revalidateSellerDashboard();
}

export async function clearNotificationsAction(formData: FormData) {
  await requireSellerActionSession();

  const confirmation = textValue(formData, "confirmation");

  if (confirmation !== "DELETE") {
    return;
  }

  await writeStore((store) => {
    store.notifications = [];
    return store;
  });

  revalidateSellerDashboard();
}

export async function deleteNotificationAction(formData: FormData) {
  await requireSellerActionSession();

  const notificationId = textValue(formData, "notificationId");

  if (!notificationId) {
    return;
  }

  await writeStore((store) => {
    store.notifications = store.notifications.filter(
      (notification) => notification.id !== notificationId,
    );

    return store;
  });

  revalidateSellerDashboard();
}

export async function updateOrderStatusAction(formData: FormData) {
  await requireSellerActionSession();

  const orderId = textValue(formData, "orderId");
  const nextStatus = textValue(formData, "status") as OrderStatus;
  let updatedCode = "";

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
    updatedCode = order.code;

    return store;
  });

  revalidateSellerSalesViews();
  if (updatedCode) {
    revalidateOrderArtifacts(updatedCode);
  }

  redirect("/seller/orders");
}

export async function createManualOrderAction(formData: FormData) {
  await requireSellerActionSession();

  const customerName = textValue(formData, "customerName");
  const customerWhatsapp = textValue(formData, "customerWhatsapp");
  const preorderDate = textValue(formData, "preorderDate");
  const fulfillmentMethod =
    textValue(formData, "fulfillmentMethod") === "delivery" ? "delivery" : "pickup";
  const address = textValue(formData, "address");
  const note = textValue(formData, "note");
  const status = textValue(formData, "status") as OrderStatus;
  const itemsRaw = textValue(formData, "items");
  const paymentProof = formData.get("paymentProof");

  if (!customerName || !customerWhatsapp || !preorderDate || !itemsRaw) {
    return;
  }

  const parsedItems = JSON.parse(itemsRaw) as Array<{
    productId: string;
    productName: string;
    variantType?: "frozen" | "fried";
    variantLabel: string;
    quantity: number;
  }>;

  let createdCode = "";

  await writeStore(async (store) => {
    const code = makeOrderCode(store.orders.length);
    const paymentPayload = await fileToPaymentProofPayload(paymentProof, code);
    const items = parsedItems
      .map((item) => {
        const product = store.products.find((entry) => entry.id === item.productId);
        if (!product) {
          return null;
        }

        const variant = getVariant(product, item.variantType);

        return {
          ...item,
          variantLabel: item.variantLabel || variant?.label || "Legacy order",
          pieceCount: getPieceCount(product, item.quantity),
          unitPrice: variant?.price || product.price,
          costSnapshot: calculateProductCost(store, item.productId),
        };
      })
      .filter(
        (
          item,
        ): item is {
          productId: string;
          productName: string;
          variantType?: "frozen" | "fried";
          variantLabel: string;
          quantity: number;
          pieceCount: number;
          unitPrice: number;
          costSnapshot: number;
        } => Boolean(item),
      );

    if (!items.length) {
      return store;
    }

    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const deliveryFee = 0;
    const createdAt = nowIso();

    const order: Order = {
      id: makeId("ord"),
      code,
      source: "seller_manual",
      locale: "id",
      customerName,
      customerWhatsapp,
      fulfillmentMethod,
      address: fulfillmentMethod === "delivery" ? address || undefined : undefined,
      preorderDate,
      note: note || undefined,
      deliveryFee,
      subtotal,
      total: subtotal + deliveryFee,
      status,
      items,
      paymentProof: paymentPayload,
      createdAt,
      updatedAt: createdAt,
    };

    store.orders.unshift(order);
    createdCode = code;

    if (isSalesStatus(status)) {
      for (const item of items) {
        const stock = store.productStocks.find((entry) => entry.productId === item.productId);

        if (stock) {
          stock.stock -= item.quantity;
          stock.updatedAt = createdAt;
        }

        store.inventoryMovements.unshift({
          id: makeId("move"),
          itemType: "product",
          itemId: item.productId,
          type: "sale",
          quantity: -item.quantity,
          note: `Manual order ${code} reserved/confirmed`,
          createdAt,
        });
      }
    }

    store.notifications.unshift({
      id: makeId("notif"),
      title: "Order manual ditambahkan",
      body: `${customerName} dimasukkan ke sistem sebagai ${code}.`,
      href: "/seller/orders",
      read: false,
      kind: "order",
      createdAt,
    });

    return store;
  });

  revalidateSellerSalesViews();
  if (createdCode) {
    revalidateOrderArtifacts(createdCode);
  }
}

export async function editOrderAction(formData: FormData) {
  await requireSellerActionSession();

  const orderId = textValue(formData, "orderId");
  const paymentProof = formData.get("paymentProof");
  let updatedCode = "";
  let previousProofHref = "";
  let uploadedProofHref = "";

  await writeStore(async (store) => {
    const order = store.orders.find((item) => item.id === orderId);

    if (!order) {
      return store;
    }

    const paymentPayload = await fileToPaymentProofPayload(paymentProof, order.code);
    previousProofHref = getPaymentProofHref(order.paymentProof);

    const now = nowIso();
    let subtotalDelta = 0;
    const allowQtyIncrease = !["completed", "cancelled"].includes(order.status);
    const registerSalesDelta = (productId: string, quantityDelta: number, note: string) => {
      if (!isSalesStatus(order.status) || quantityDelta === 0) {
        return;
      }

      const stock = store.productStocks.find((entry) => entry.productId === productId);

      if (stock) {
        stock.stock -= quantityDelta;
        stock.updatedAt = now;
      }

      store.inventoryMovements.unshift({
        id: makeId("move"),
        itemType: "product",
        itemId: productId,
        type: quantityDelta > 0 ? "sale" : "correction",
        quantity: -quantityDelta,
        note,
        createdAt: now,
      });
    };

    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("increase:") && !key.startsWith("addItem:")) {
        continue;
      }

      const quantityToAdd = Number(String(value ?? "0"));
      if (!Number.isFinite(quantityToAdd) || quantityToAdd === 0 || !allowQtyIncrease) {
        continue;
      }

      const [mode, productId, rawVariantType] = key.split(":");
      const variantType = rawVariantType === "legacy" ? undefined : rawVariantType;
      const product = store.products.find((entry) => entry.id === productId);
      const existingItem = order.items.find(
        (entry) =>
          entry.productId === productId &&
          (entry.variantType ?? "legacy") === (variantType ?? "legacy"),
      );

      if (mode === "increase") {
        if (!existingItem) {
          continue;
        }

        const nextQuantity = existingItem.quantity + quantityToAdd;
        const removesItem = nextQuantity <= 0;

        if (removesItem && order.items.length <= 1) {
          continue;
        }

        const appliedDelta = removesItem ? -existingItem.quantity : quantityToAdd;

        if (removesItem) {
          order.items = order.items.filter(
            (entry) =>
              !(
                entry.productId === existingItem.productId &&
                (entry.variantType ?? "legacy") === (existingItem.variantType ?? "legacy")
              ),
          );
        } else {
          existingItem.quantity = nextQuantity;
          existingItem.pieceCount = product
            ? getPieceCount(product, existingItem.quantity)
            : existingItem.pieceCount + appliedDelta * DEFAULT_PACK_SIZE;
          existingItem.costSnapshot =
            existingItem.costSnapshot || calculateProductCost(store, existingItem.productId);
        }

        subtotalDelta += existingItem.unitPrice * appliedDelta;
        registerSalesDelta(
          existingItem.productId,
          appliedDelta,
          appliedDelta > 0
            ? `Order ${order.code} qty increased by seller`
            : `Order ${order.code} qty reduced by seller`,
        );
        continue;
      }

      if (!product || !variantType) {
        continue;
      }

      const typedVariantType = variantType as ProductVariantType;
      const variant = getVariant(product, typedVariantType);
      if (!variant || !variant.isActive) {
        continue;
      }

      if (existingItem) {
        existingItem.quantity += quantityToAdd;
        existingItem.pieceCount = getPieceCount(product, existingItem.quantity);
        existingItem.costSnapshot =
          existingItem.costSnapshot || calculateProductCost(store, existingItem.productId);
        subtotalDelta += existingItem.unitPrice * quantityToAdd;
      } else {
        const unitPrice = variant.price || product.price;
        order.items.push({
          productId: product.id,
          productName: order.locale === "en" ? product.nameEn : product.name,
          variantType: typedVariantType,
          variantLabel: variant.label,
          quantity: quantityToAdd,
          pieceCount: getPieceCount(product, quantityToAdd),
          unitPrice,
          costSnapshot: calculateProductCost(store, product.id),
        });
        subtotalDelta += unitPrice * quantityToAdd;
      }

      registerSalesDelta(
        product.id,
        quantityToAdd,
        `Order ${order.code} item added by seller`,
      );
    }

    if (subtotalDelta !== 0) {
      order.subtotal = order.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );
      order.total = order.subtotal + order.deliveryFee;
    }

    if (paymentPayload) {
      order.paymentProof = paymentPayload;
      uploadedProofHref = paymentPayload.url;
    }

    if (subtotalDelta > 0 || paymentPayload) {
      order.updatedAt = now;
      updatedCode = order.code;
    }

    return store;
  });

  revalidateSellerSalesViews();
  if (updatedCode) {
    revalidateOrderArtifacts(updatedCode);
  }

  if (
    uploadedProofHref &&
    previousProofHref &&
    previousProofHref !== uploadedProofHref &&
    isBlobPaymentProof(previousProofHref)
  ) {
    try {
      await del(previousProofHref);
    } catch {
      // Keep UI resilient even when blob cleanup fails.
    }
  }
}

export async function deleteOrderAction(formData: FormData) {
  await requireSellerActionSession();

  const orderId = textValue(formData, "orderId");
  const confirmation = textValue(formData, "confirmation");
  let deletedCode = "";

  if (confirmation !== "DELETE") {
    return;
  }

  await writeStore((store) => {
    const order = store.orders.find((item) => item.id === orderId);
    if (!order) {
      return store;
    }

    if (isSalesStatus(order.status)) {
      for (const item of order.items) {
        const stock = store.productStocks.find((entry) => entry.productId === item.productId);

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
          note: `Order ${order.code} deleted and stock returned`,
          createdAt: nowIso(),
        });
      }
    }

    deletedCode = order.code;
    store.orders = store.orders.filter((item) => item.id !== orderId);
    return store;
  });

  revalidateSellerSalesViews();
  if (deletedCode) {
    revalidateOrderArtifacts(deletedCode);
  }
}

export async function deleteProductImageAction(formData: FormData) {
  await requireSellerActionSession();

  const productId = textValue(formData, "productId");
  const imageId = textValue(formData, "imageId");

  let imageUrl = "";

  await writeStore((store) => {
    const product = store.products.find((item) => item.id === productId);
    if (!product) {
      return store;
    }

    if (product.images.length <= 1 || product.images[0]?.id === imageId) {
      return store;
    }

    const image = product.images.find((item) => item.id === imageId);
    imageUrl = image?.url || "";
    product.images = product.images
      .filter((item) => item.id !== imageId)
      .map((imageItem, index) => ({
        ...imageItem,
        position: index,
      }));

    return store;
  });

  if (imageUrl.startsWith("https://")) {
    try {
      await del(imageUrl);
    } catch {
      // Ignore blob deletion failures so UI remains resilient.
    }
  }

  revalidateSellerMenuViews();
}

export async function setPrimaryProductImageAction(formData: FormData) {
  await requireSellerActionSession();

  const productId = textValue(formData, "productId");
  const imageId = textValue(formData, "imageId");

  await writeStore((store) => {
    const product = store.products.find((item) => item.id === productId);
    if (!product) {
      return store;
    }

    const target = product.images.find((item) => item.id === imageId);
    if (!target) {
      return store;
    }

    product.images = [target, ...product.images.filter((item) => item.id !== imageId)].map(
      (image, index) => ({
        ...image,
        position: index,
      }),
    );

    return store;
  });

  revalidateSellerMenuViews();
}

export async function reorderProductImageAction(formData: FormData) {
  await requireSellerActionSession();

  const productId = textValue(formData, "productId");
  const imageId = textValue(formData, "imageId");
  const direction = textValue(formData, "direction");

  await writeStore((store) => {
    const product = store.products.find((item) => item.id === productId);
    if (!product) {
      return store;
    }

    const currentIndex = product.images.findIndex((item) => item.id === imageId);
    if (currentIndex === -1) {
      return store;
    }

    if (currentIndex === 0) {
      return store;
    }

    const targetIndex =
      direction === "left"
        ? Math.max(currentIndex - 1, 0)
        : Math.min(currentIndex + 1, product.images.length - 1);

    if (targetIndex === currentIndex) {
      return store;
    }

    const nextImages = [...product.images];
    const [movedImage] = nextImages.splice(currentIndex, 1);
    nextImages.splice(targetIndex, 0, movedImage);

    product.images = nextImages.map((image, index) => ({
      ...image,
      position: index,
    }));

    return store;
  });

  revalidateSellerMenuViews();
}

export async function upsertProductAction(formData: FormData) {
  await requireSellerActionSession();

  const id = textValue(formData, "id");
  const now = nowIso();
  const imageFiles = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (imageFiles.length > 0 && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN belum diatur. Set env ini dulu untuk upload foto menu.");
  }

  const uploadedImages =
    imageFiles.length > 0
      ? await uploadProductImages(
          imageFiles,
          textValue(formData, "slug"),
          textValue(formData, "name"),
        )
      : [];
  let previousSlug = "";
  let nextSlug = "";

  await writeStore((store) => {
    const existing = store.products.find((product) => product.id === id);
    previousSlug = existing?.slug || "";
    const blueprint =
      findCatalogBlueprint({
        slug: textValue(formData, "slug"),
        name: textValue(formData, "name"),
      }) ??
      (existing ? findCatalogBlueprint(existing) : undefined);
    const fallbackProduct: Product =
      existing ?? {
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
        price: numberValue(formData, "price") || 28000,
        featured: textValue(formData, "featured") === "on",
        isActive: textValue(formData, "isActive") === "on",
        accent:
          textValue(formData, "accent") ||
          blueprint?.accent ||
          "from-[#ffe4dd] via-white to-[#ffd9c6]",
        prepLabel:
          textValue(formData, "prepLabel") ||
          blueprint?.prepLabel ||
          "Pre-order batch • 1 qty = 3 pcs",
        prepLabelEn:
          textValue(formData, "prepLabelEn") ||
          blueprint?.prepLabelEn ||
          "Pre-order batch • 1 qty = 3 pcs",
        packSize: DEFAULT_PACK_SIZE,
        variants: blueprint
          ? cloneVariants(blueprint.variants)
          : cloneVariants([
              { type: "frozen", label: "Frozen", price: 28000 },
              { type: "fried", label: "Fried", price: 30000 },
            ]),
        images: blueprint
          ? cloneImages(blueprint.images, blueprint.name)
          : [],
        createdAt: now,
        updatedAt: now,
      };

    const variants = variantsFromFormData(formData, fallbackProduct);
    const price = Math.min(...variants.map((variant) => variant.price));
    const payload: Product = {
      ...fallbackProduct,
      slug: textValue(formData, "slug") || fallbackProduct.slug,
      name: textValue(formData, "name") || fallbackProduct.name,
      nameEn:
        textValue(formData, "nameEn") ||
        fallbackProduct.nameEn ||
        textValue(formData, "name") ||
        fallbackProduct.name,
      shortDescription:
        textValue(formData, "shortDescription") || fallbackProduct.shortDescription,
      shortDescriptionEn:
        textValue(formData, "shortDescriptionEn") ||
        fallbackProduct.shortDescriptionEn ||
        textValue(formData, "shortDescription") ||
        fallbackProduct.shortDescription,
      description: textValue(formData, "description") || fallbackProduct.description,
      descriptionEn:
        textValue(formData, "descriptionEn") ||
        fallbackProduct.descriptionEn ||
        textValue(formData, "description") ||
        fallbackProduct.description,
      price,
      featured: textValue(formData, "featured") === "on",
      isActive: textValue(formData, "isActive") === "on",
      accent: textValue(formData, "accent") || fallbackProduct.accent,
      prepLabel: textValue(formData, "prepLabel") || fallbackProduct.prepLabel,
      prepLabelEn:
        textValue(formData, "prepLabelEn") || fallbackProduct.prepLabelEn,
      packSize: numberValue(formData, "packSize") || getPackSize(fallbackProduct),
      variants,
      images: [
        ...fallbackProduct.images,
        ...uploadedImages.map((image, index) => ({
          id: makeId("img"),
          url: image.url,
          alt: image.alt,
          position: fallbackProduct.images.length + index,
        })),
      ],
      updatedAt: now,
    };
    nextSlug = payload.slug;

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

  revalidateSellerProductViews(nextSlug, previousSlug);
}

export async function addIngredientAction(formData: FormData) {
  await requireSellerActionSession();

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

  revalidateSellerCostingViews();
}

export async function updateIngredientAction(formData: FormData) {
  await requireSellerActionSession();

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

  revalidateSellerCostingViews();
}

export async function deleteIngredientAction(formData: FormData) {
  await requireSellerActionSession();

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

  revalidateSellerCostingViews();
}

export async function addSupplierAction(formData: FormData) {
  await requireSellerActionSession();

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

  revalidateSellerCostingViews();
}

export async function updateSupplierAction(formData: FormData) {
  await requireSellerActionSession();

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

  revalidateSellerCostingViews();
}

export async function deleteSupplierAction(formData: FormData) {
  await requireSellerActionSession();

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

  revalidateSellerCostingViews();
}

export async function addSupplierPriceAction(formData: FormData) {
  await requireSellerActionSession();

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

  revalidateSellerCostingViews();
}

export async function updateSupplierPriceAction(formData: FormData) {
  await requireSellerActionSession();

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

  revalidateSellerCostingViews();
}

export async function deleteSupplierPriceAction(formData: FormData) {
  await requireSellerActionSession();

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

  revalidateSellerInventoryViews();
}

export async function upsertRecipeItemAction(formData: FormData) {
  await requireSellerActionSession();

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

  revalidateSellerInventoryViews();
}

export async function adjustIngredientStockAction(formData: FormData) {
  await requireSellerActionSession();

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

  revalidateSellerInventoryViews();
}

export async function adjustProductStockAction(formData: FormData) {
  await requireSellerActionSession();

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

  revalidateSellerInventoryViews();
}

export async function recordProductionAction(formData: FormData) {
  await requireSellerActionSession();

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
        const used =
          (item.quantity / Math.max(recipe.yieldCount, 1)) *
          getPieceCount(
            store.products.find((entry) => entry.id === productId) ?? {
              id: productId,
              slug: "",
              name: "",
              nameEn: "",
              shortDescription: "",
              shortDescriptionEn: "",
              description: "",
              descriptionEn: "",
              price: 0,
              featured: false,
              isActive: true,
              accent: "",
              prepLabel: "",
              prepLabelEn: "",
              packSize: DEFAULT_PACK_SIZE,
              variants: [],
              images: [],
              createdAt: nowIso(),
              updatedAt: nowIso(),
            },
            quantity,
          );
        ingredient.stock -= used;
        store.inventoryMovements.unshift({
          id: makeId("move"),
          itemType: "ingredient",
          itemId: ingredient.id,
          type: "production",
          quantity: -used,
          note: `Used for production of ${quantity} pack`,
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
      note: "Production pack added",
      createdAt: nowIso(),
    });

    return store;
  });

  revalidateSellerInventoryViews();
}
