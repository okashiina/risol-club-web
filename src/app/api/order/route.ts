import { NextResponse } from "next/server";
import { getPieceCount, getVariant } from "@/lib/catalog";
import {
  calculateProductCost,
  makeId,
  nowIso,
  readStore,
  writeStore,
} from "@/lib/data-store";
import { Locale } from "@/lib/types";

function makeOrderCode(orderCount: number) {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `RC-${day}${month}-${String(orderCount + 1).padStart(3, "0")}`;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const store = await readStore();
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

  let paymentPayload:
    | {
        fileName: string;
        mimeType: string;
        dataUrl: string;
        uploadedAt: string;
      }
    | undefined;

  if (paymentProof instanceof File && paymentProof.size > 0) {
    const buffer = Buffer.from(await paymentProof.arrayBuffer());
    paymentPayload = {
      fileName: paymentProof.name,
      mimeType: paymentProof.type || "application/octet-stream",
      dataUrl: `data:${paymentProof.type || "application/octet-stream"};base64,${buffer.toString("base64")}`,
      uploadedAt: nowIso(),
    };
  }

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
  const normalizedFulfillmentMethod =
    fulfillmentMethod === "delivery" ? "delivery" : "pickup";
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;
  const code = makeOrderCode(store.orders.length);

  await writeStore((current) => {
    current.orders.unshift({
      id: makeId("ord"),
      code,
      source: "web",
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
      status: "payment_review",
      items: parsedItems.map((item) => {
        const product = current.products.find((entry) => entry.id === item.productId);
        const variant = product ? getVariant(product, item.variantType) : undefined;

        return {
          ...item,
          variantLabel: item.variantLabel || variant?.label || "Legacy order",
          pieceCount: product ? getPieceCount(product, item.quantity) : item.quantity * 3,
          unitPrice: variant?.price || item.unitPrice,
          costSnapshot: calculateProductCost(current, item.productId),
        };
      }),
      paymentProof: paymentPayload,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    current.notifications.unshift({
      id: makeId("notif"),
      title: "Order baru masuk",
      body: `${customerName} mengirim order ${code}.`,
      href: "/seller/orders",
      read: false,
      createdAt: nowIso(),
    });

    return current;
  });

  return NextResponse.json({ code });
}
