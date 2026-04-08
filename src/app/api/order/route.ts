import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getPieceCount, getVariant } from "@/lib/catalog";
import { sendNewOrderSellerEmail } from "@/lib/email";
import {
  calculateProductCost,
  makeId,
  nowIso,
  readStore,
  writeStore,
} from "@/lib/data-store";
import { resolvePoState } from "@/lib/po";
import { CustomMixComponent, Locale, Order, OrderItem } from "@/lib/types";

function makeOrderCode(orderCount: number) {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `RC-${day}${month}-${String(orderCount + 1).padStart(3, "0")}`;
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
    const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
    const pathname = `payment-proofs/${orderCode}/${Date.now()}-${crypto.randomUUID().slice(0, 6)}.${extension}`;
    const result = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: mimeType,
    });

    return {
      fileName: file.name,
      mimeType,
      url: result.url,
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

export async function POST(request: Request) {
  const formData = await request.formData();
  const store = await readStore();
  const locale = (String(formData.get("locale") ?? "id") === "en" ? "en" : "id") as Locale;
  const poState = resolvePoState(store.poSettings);
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerWhatsapp = String(formData.get("customerWhatsapp") ?? "").trim();
  const fulfillmentMethod = String(formData.get("fulfillmentMethod") ?? "pickup");
  const preorderDate = String(formData.get("preorderDate") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const itemsRaw = String(formData.get("items") ?? "[]");
  const paymentProof = formData.get("paymentProof");

  if (!poState.isOpen) {
    return NextResponse.json(
      {
        error:
          locale === "en"
            ? "Pre-order is closed right now. Please join the notice list first."
            : "PO lagi tutup sekarang. Join waitlist notice dulu ya.",
      },
      { status: 409 },
    );
  }

  if (!customerName || !customerWhatsapp || !preorderDate) {
    return NextResponse.json(
      { error: locale === "en" ? "Missing required fields." : "Data wajib belum lengkap." },
      { status: 400 },
    );
  }

  const parsedItems = JSON.parse(itemsRaw) as {
    productId: string;
    quantity: number;
    unitPrice: number;
    productName: string;
    variantType?: "frozen" | "fried";
    variantLabel?: string;
    pieceCount?: number;
    costSnapshot?: number;
    customMixLabel?: string;
    customMixComponents?: CustomMixComponent[];
  }[];

  if (!parsedItems.length) {
    return NextResponse.json(
      {
        error:
          locale === "en"
            ? "Please choose at least one menu item."
            : "Pilih minimal satu menu.",
      },
      { status: 400 },
    );
  }

  const code = makeOrderCode(store.orders.length);
  const paymentPayload = await fileToPaymentProofPayload(paymentProof, code);

  if (!paymentPayload) {
    return NextResponse.json(
      {
        error:
          locale === "en"
            ? "Please upload a payment proof."
            : "Upload bukti transfer dulu ya.",
      },
      { status: 400 },
    );
  }

  const subtotal = parsedItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const normalizedFulfillmentMethod: Order["fulfillmentMethod"] =
    fulfillmentMethod === "delivery" ? "delivery" : "pickup";
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;
  const createdAt = nowIso();
  const normalizedItems = parsedItems.map((item) => {
    const product = store.products.find((entry) => entry.id === item.productId);
    const variant = product ? getVariant(product, item.variantType) : undefined;
    const customMixComponents = item.customMixComponents?.filter(
      (component): component is CustomMixComponent => Boolean(component?.productId),
    );

    if (item.productId === "custom-mix-pack" || customMixComponents?.length) {
      return {
        ...item,
        productName:
          item.productName ||
          (locale === "en" ? "Custom mix pack" : "Pack campur custom"),
        variantType: item.variantType,
        variantLabel:
          item.variantLabel ||
          (locale === "en" ? "Custom mix" : "Custom mix"),
        pieceCount: item.pieceCount || item.quantity * 3,
        unitPrice: item.unitPrice,
        costSnapshot: 0,
        customMixLabel: item.customMixLabel,
        customMixComponents:
          customMixComponents?.map((component) => ({
            productId: component.productId,
            productName: component.productName,
            quantity: component.quantity,
            variantType: component.variantType,
            variantLabel: component.variantLabel,
          })) ?? [],
      } satisfies OrderItem;
    }

    return {
      ...item,
      variantLabel: item.variantLabel || variant?.label || "Legacy order",
      pieceCount: product ? getPieceCount(product, item.quantity) : item.quantity * 3,
      unitPrice: variant?.price || item.unitPrice,
      costSnapshot: calculateProductCost(store, item.productId),
    };
  });

  const createdOrder: Order = {
    id: makeId("ord"),
    code,
    source: "web" as const,
    locale,
    customerName,
    customerWhatsapp,
    fulfillmentMethod: normalizedFulfillmentMethod,
    address: normalizedFulfillmentMethod === "delivery" ? address || undefined : undefined,
    preorderDate,
    note: note || undefined,
    deliveryFee,
    subtotal,
    total,
    status: "payment_review" as const,
    items: normalizedItems,
    paymentProof: paymentPayload,
    createdAt,
    updatedAt: createdAt,
  };

  await writeStore((current) => {
    current.orders.unshift(createdOrder);

    current.notifications.unshift({
      id: makeId("notif"),
      title: "Order baru masuk",
      body: `${customerName} mengirim order ${code}.`,
      href: "/seller/orders",
      read: false,
      kind: "order",
      createdAt,
    });

    return current;
  });

  try {
    await sendNewOrderSellerEmail(createdOrder);
  } catch (error) {
    console.error("Failed to send seller order email", error);
  }

  return NextResponse.json({ code });
}
