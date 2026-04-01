import "server-only";

import { Resend } from "resend";
import { Order } from "@/lib/types";

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function getOrderAlertRecipient() {
  return readEnv("ORDER_ALERT_EMAIL_TO") || readEnv("SELLER_EMAIL");
}

function getOrderAlertSender() {
  const raw = readEnv("ORDER_ALERT_EMAIL_FROM");

  if (!raw) {
    return "Risol Club <onboarding@resend.dev>";
  }

  if (raw.includes("<") && raw.includes(">")) {
    return raw;
  }

  if (raw.includes("@")) {
    return `Risol Club <${raw}>`;
  }

  return "Risol Club <onboarding@resend.dev>";
}

function getResendClient() {
  const apiKey = readEnv("RESEND_API_KEY");

  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
}

function extractEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);

  if (match?.[1]) {
    return match[1].trim();
  }

  return value.trim();
}

function maskEmail(email: string) {
  const normalized = extractEmailAddress(email);
  const [localPart, domain] = normalized.split("@");

  if (!localPart || !domain) {
    return "belum diisi";
  }

  const visibleLocal = localPart.length <= 2 ? localPart : `${localPart.slice(0, 2)}***`;
  const domainParts = domain.split(".");
  const mainDomain = domainParts[0] ?? "";
  const tld = domainParts.slice(1).join(".");
  const visibleDomain =
    mainDomain.length <= 2 ? mainDomain : `${mainDomain.slice(0, 2)}***`;

  return `${visibleLocal}@${visibleDomain}${tld ? `.${tld}` : ""}`;
}

export function getOrderAlertConfigSnapshot() {
  const sender = getOrderAlertSender();
  const recipient = getOrderAlertRecipient();
  const resendConfigured = Boolean(readEnv("RESEND_API_KEY"));
  const senderAddress = extractEmailAddress(sender);
  const recipientAddress = extractEmailAddress(recipient);

  return {
    resendConfigured,
    hasRecipient: Boolean(recipientAddress),
    sender,
    senderMasked: maskEmail(senderAddress),
    recipientMasked: maskEmail(recipientAddress),
    senderAddress,
    usesSandboxSender: senderAddress.endsWith("@resend.dev"),
    isReady: resendConfigured && Boolean(recipientAddress) && !senderAddress.endsWith("@resend.dev"),
  };
}

function buildItemsMarkup(order: Order) {
  return order.items
    .map(
      (item) =>
        `<li style="margin:0 0 10px;padding:0;">
          <strong>${item.productName}</strong> (${item.variantLabel}) — ${item.quantity} qty / ${item.pieceCount} pcs
        </li>`,
    )
    .join("");
}

function buildPlainText(order: Order) {
  const lines = [
    `Order baru masuk: ${order.code}`,
    `Source: ${order.source}`,
    `Customer: ${order.customerName}`,
    `WhatsApp: ${order.customerWhatsapp}`,
    `Fulfillment: ${order.fulfillmentMethod}`,
    `Waktu pre-order: ${order.preorderDate}`,
    `Total: Rp ${order.total.toLocaleString("id-ID")}`,
    "",
    "Items:",
    ...order.items.map(
      (item) =>
        `- ${item.productName} (${item.variantLabel}) — ${item.quantity} qty / ${item.pieceCount} pcs`,
    ),
  ];

  if (order.address) {
    lines.splice(5, 0, `Alamat: ${order.address}`);
  }

  if (order.note) {
    lines.push("", `Catatan: ${order.note}`);
  }

  return lines.join("\n");
}

function buildHtml(order: Order) {
  return `
    <div style="background:#fff8f6;padding:24px;font-family:Arial,sans-serif;color:#3f2622;">
      <div style="max-width:640px;margin:0 auto;background:white;border-radius:24px;padding:28px;border:1px solid #f3d6ca;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#b91e1e;">
          Order baru masuk
        </p>
        <h1 style="margin:0 0 8px;font-size:34px;line-height:1.1;color:#4a1f1a;">
          ${order.code}
        </h1>
        <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">
          ${order.customerName} baru saja mengirim order ${order.source === "web" ? "via website" : "via seller manual"}.
        </p>

        <div style="background:#fff4f2;border-radius:18px;padding:18px;margin:0 0 20px;">
          <p style="margin:0 0 8px;"><strong>WhatsApp:</strong> ${order.customerWhatsapp}</p>
          <p style="margin:0 0 8px;"><strong>Fulfillment:</strong> ${order.fulfillmentMethod}</p>
          <p style="margin:0 0 8px;"><strong>Waktu pre-order:</strong> ${order.preorderDate}</p>
          ${order.address ? `<p style="margin:0 0 8px;"><strong>Alamat:</strong> ${order.address}</p>` : ""}
          <p style="margin:0;"><strong>Total:</strong> Rp ${order.total.toLocaleString("id-ID")}</p>
        </div>

        <div style="margin:0 0 20px;">
          <p style="margin:0 0 10px;font-weight:700;color:#b91e1e;">Items</p>
          <ul style="margin:0;padding-left:18px;line-height:1.7;">
            ${buildItemsMarkup(order)}
          </ul>
        </div>

        ${
          order.note
            ? `<div style="background:#fff8ef;border-radius:18px;padding:18px;">
                 <p style="margin:0 0 6px;font-weight:700;color:#b91e1e;">Catatan customer</p>
                 <p style="margin:0;line-height:1.7;">${order.note}</p>
               </div>`
            : ""
        }
      </div>
    </div>
  `;
}

export async function sendNewOrderSellerEmail(order: Order) {
  const resend = getResendClient();
  const to = getOrderAlertRecipient();
  const from = getOrderAlertSender();

  if (!resend || !to) {
    return { sent: false, reason: "missing_email_config" as const };
  }

  const subject = `Order baru masuk • ${order.code}`;

  const { error } = await resend.emails.send(
    {
      from,
      to,
      subject,
      html: buildHtml(order),
      text: buildPlainText(order),
    },
    {
      headers: {
        "Idempotency-Key": `seller-order-alert-${order.code}`,
      },
    },
  );

  if (error) {
    throw new Error(error.message || "Failed to send seller email notification.");
  }

  console.info("Seller order email sent", {
    orderCode: order.code,
    to: extractEmailAddress(to),
    from: extractEmailAddress(from),
  });

  return { sent: true as const };
}
