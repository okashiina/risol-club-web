import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getPieceCount, getVariant } from "@/lib/catalog";
import { sendNewOrderSellerEmail } from "@/lib/email";
import {
  calculateProductCost,
  makeId,
  nowIso,
  writeStore,
} from "@/lib/data-store";
import { Locale, Order } from "@/lib/types";

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
  const locale = (String(formData.get("locale") ?? "id") === "en" ? "en" : "id") as Locale;
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerWhatsapp = String(formData.get("customerWhatsapp") ?? "").trim();
  const fulfillmentMethod = String(formData.get("fulfillmentMethod") ?? "pickup");
  const preorderDate = String(formData.get("preorderDate") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const itemsRaw = String(formData.get("items") ?? "[]");
  const paymentProof = formData.get("paymentProof");

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

  const normalizedFulfillmentMethod: Order["fulfillmentMethod"] =
    fulfillmentMethod === "delivery" ? "delivery" : "pickup";
  let createdOrder: Order | null = null;
  const writeErrorResponse = await writeStore(async (current) => {
    const code = makeOrderCode(current.orders.length);
    const paymentPayload = await fileToPaymentProofPayload(paymentProof, code);

    if (!paymentPayload) {
      throw new Error(locale === "en" ? "PAYMENT_PROOF_REQUIRED" : "BUKTI_TRANSFER_REQUIRED");
    }

    const normalizedItems = parsedItems.map((item) => {
      const product = current.products.find((entry) => entry.id === item.productId);
      const variant = product ? getVariant(product, item.variantType) : undefined;

      return {
        ...item,
        variantLabel: item.variantLabel || variant?.label || "Legacy order",
        pieceCount: product ? getPieceCount(product, item.quantity) : item.quantity * 3,
        unitPrice: variant?.price || item.unitPrice,
        costSnapshot: calculateProductCost(current, item.productId),
      };
    });

    const subtotal = normalizedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const deliveryFee = 0;
    const total = subtotal + deliveryFee;
    const createdAt = nowIso();

    createdOrder = {
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

    current.orders.unshift(createdOrder);
    current.notifications.unshift({
      id: makeId("notif"),
      title: "Order baru masuk",
      body: `${customerName} mengirim order ${code}.`,
      href: "/seller/orders",
      read: false,
      createdAt,
    });

    return current;
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "";

    if (message === "PAYMENT_PROOF_REQUIRED" || message === "BUKTI_TRANSFER_REQUIRED") {
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

    throw error;
  });

  if (writeErrorResponse instanceof NextResponse) {
    return writeErrorResponse;
  }

  if (!createdOrder) {
    return NextResponse.json(
      { error: locale === "en" ? "Failed to create order." : "Order belum berhasil dibuat." },
      { status: 500 },
    );
  }

  const finalOrder = createdOrder as Order;

  try {
    await sendNewOrderSellerEmail(finalOrder);
  } catch (error) {
    console.error("Failed to send seller order email", error);
  }

  return NextResponse.json({ code: finalOrder.code });
}
