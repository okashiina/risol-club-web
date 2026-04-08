import "server-only";

import { Resend } from "resend";
import { formatPoDateTime } from "@/lib/po";
import { Order, PoSettings, PoWaitlistSubscriber } from "@/lib/types";

export type SellerDigestEmailSection = {
  title: string;
  lines: string[];
};

export type SellerDigestEmailPayload = {
  subject: string;
  title: string;
  intro: string;
  dedupeKey: string;
  preview?: string;
  sections: SellerDigestEmailSection[];
  ctaHref?: string;
  ctaLabel?: string;
};

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

function getPublicBaseUrl() {
  const direct = readEnv("NEXT_PUBLIC_BASE_URL");

  if (direct) {
    return direct.replace(/\/$/, "");
  }

  const production = readEnv("VERCEL_PROJECT_PRODUCTION_URL");

  if (production) {
    return `https://${production.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  const deployment = readEnv("VERCEL_URL");

  if (deployment) {
    return `https://${deployment.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function buildDigestPlainText(payload: SellerDigestEmailPayload) {
  const lines = [
    payload.title,
    payload.intro,
    "",
    ...payload.sections.flatMap((section) => [
      section.title,
      ...section.lines.map((line) => `- ${line}`),
      "",
    ]),
  ];

  if (payload.ctaHref) {
    lines.push(payload.ctaLabel || "Buka dashboard", payload.ctaHref);
  }

  return lines.join("\n").trim();
}

function buildDigestHtml(payload: SellerDigestEmailPayload) {
  const preview = payload.preview || payload.intro;
  const sectionMarkup = payload.sections
    .map(
      (section) => `
        <div style="margin:0 0 18px;">
          <p style="margin:0 0 10px;font-weight:700;color:#b91e1e;">${escapeHtml(section.title)}</p>
          <ul style="margin:0;padding-left:18px;line-height:1.7;">
            ${section.lines
              .map((line) => `<li style="margin:0 0 8px;">${escapeHtml(line)}</li>`)
              .join("")}
          </ul>
        </div>
      `,
    )
    .join("");

  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(preview)}
    </div>
    <div style="background:#fff8f6;padding:24px;font-family:Arial,sans-serif;color:#3f2622;">
      <div style="max-width:640px;margin:0 auto;background:white;border-radius:24px;padding:28px;border:1px solid #f3d6ca;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#b91e1e;">
          Seller digest
        </p>
        <h1 style="margin:0 0 8px;font-size:34px;line-height:1.1;color:#4a1f1a;">
          ${escapeHtml(payload.title)}
        </h1>
        <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">
          ${escapeHtml(payload.intro)}
        </p>

        ${sectionMarkup}

        ${
          payload.ctaHref
            ? `<div style="margin-top:24px;">
                 <a href="${escapeHtml(payload.ctaHref)}" style="display:inline-block;border-radius:999px;background:#4a1f1a;color:white;padding:12px 18px;font-weight:700;text-decoration:none;">
                   ${escapeHtml(payload.ctaLabel || "Buka dashboard")}
                 </a>
               </div>`
            : ""
        }
      </div>
    </div>
  `;
}

type PoSubscriberEmailPayload = {
  eyebrow: string;
  subject: string;
  title: string;
  intro: string;
  bodyLines: string[];
  ctaLabel: string;
  ctaHref: string;
  preview: string;
  idempotencyKey: string;
};

function buildSubscriberEmailPlainText(payload: PoSubscriberEmailPayload) {
  return [
    payload.title,
    payload.intro,
    "",
    ...payload.bodyLines,
    "",
    payload.ctaLabel,
    payload.ctaHref,
  ].join("\n");
}

function buildSubscriberEmailHtml(payload: PoSubscriberEmailPayload) {
  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(payload.preview)}
    </div>
    <div style="background:#fff8f6;padding:24px;font-family:Arial,sans-serif;color:#3f2622;">
      <div style="max-width:640px;margin:0 auto;background:white;border-radius:24px;padding:28px;border:1px solid #f3d6ca;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#b91e1e;">
          ${escapeHtml(payload.eyebrow)}
        </p>
        <h1 style="margin:0 0 8px;font-size:34px;line-height:1.1;color:#4a1f1a;">
          ${escapeHtml(payload.title)}
        </h1>
        <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">
          ${escapeHtml(payload.intro)}
        </p>
        <div style="margin:0 0 20px;">
          ${payload.bodyLines
            .map(
              (line) =>
                `<p style="margin:0 0 12px;font-size:15px;line-height:1.75;">${escapeHtml(line)}</p>`,
            )
            .join("")}
        </div>
        <div style="margin-top:24px;">
          <a href="${escapeHtml(payload.ctaHref)}" style="display:inline-block;border-radius:999px;background:#4a1f1a;color:white;padding:12px 18px;font-weight:700;text-decoration:none;">
            ${escapeHtml(payload.ctaLabel)}
          </a>
        </div>
      </div>
    </div>
  `;
}

export async function sendPoScheduledSubscriberEmail(
  subscriber: PoWaitlistSubscriber,
  settings: PoSettings,
  cycleId: string,
) {
  const resend = getResendClient();

  if (!resend) {
    return { sent: false, reason: "missing_email_config" as const };
  }

  const baseUrl = getPublicBaseUrl();
  const scheduleLabel = formatPoDateTime(settings.scheduledStartAt, "id");
  const payload: PoSubscriberEmailPayload = {
    eyebrow: "PO berikutnya",
    subject: `Catet ya, PO Risol Club buka ${scheduleLabel}`,
    title: `Halo ${subscriber.name}! Kita udah siapin jadwal PO berikutnya.`,
    intro: "Makasih ya udah sabar nungguin batch berikutnya dari Risol Club.",
    bodyLines: [
      `PO berikutnya dijadwalkan buka pada ${scheduleLabel}.`,
      settings.scheduledEndAt
        ? `Window ini akan berjalan sampai ${formatPoDateTime(settings.scheduledEndAt, "id")}.`
        : "Begitu window-nya mulai jalan, kamu bisa langsung checkout seperti biasa.",
      "Sambil nunggu, kamu masih bisa lihat-lihat menu dulu buat nandain mana yang pengin kamu ambil nanti.",
    ],
    ctaLabel: "Lihat menu dulu yuk",
    ctaHref: `${baseUrl}/po-notice`,
    preview: `PO berikutnya dijadwalkan buka ${scheduleLabel}.`,
    idempotencyKey: `po-scheduled-${cycleId}-${subscriber.id}`,
  };

  const { error } = await resend.emails.send(
    {
      from: getOrderAlertSender(),
      to: subscriber.email,
      subject: payload.subject,
      html: buildSubscriberEmailHtml(payload),
      text: buildSubscriberEmailPlainText(payload),
    },
    {
      headers: {
        "Idempotency-Key": payload.idempotencyKey,
      },
    },
  );

  if (error) {
    throw new Error(error.message || "Failed to send scheduled PO email.");
  }

  return { sent: true as const };
}

export async function sendPoOpenedSubscriberEmail(
  subscriber: PoWaitlistSubscriber,
  settings: PoSettings,
  cycleId: string,
) {
  const resend = getResendClient();

  if (!resend) {
    return { sent: false, reason: "missing_email_config" as const };
  }

  const baseUrl = getPublicBaseUrl();
  const payload: PoSubscriberEmailPayload = {
    eyebrow: "PO dibuka lagi",
    subject: "Yeay, PO Risol Club udah dibuka lagi!",
    title: `Halo ${subscriber.name}! Makasih udah nunggu Risol Club buka PO ya.`,
    intro: "Kabar baiknya, sekarang PO lagi open dan kamu udah bisa langsung masuk buat checkout.",
    bodyLines: [
      "Kalau dari tadi udah ngincer menu tertentu, sekarang waktunya masuk duluan sebelum window batch ini selesai.",
      settings.scheduledEndAt
        ? `Batch ini berjalan sampai ${formatPoDateTime(settings.scheduledEndAt, "id")}.`
        : "Kalau sudah siap, tinggal klik tombol di bawah dan lanjut checkout seperti biasa.",
      "See you di batch kali ini yaa.",
    ],
    ctaLabel: "Order sekarang",
    ctaHref: `${baseUrl}/checkout`,
    preview: "PO Risol Club udah dibuka lagi.",
    idempotencyKey: `po-opened-${cycleId}-${subscriber.id}`,
  };

  const { error } = await resend.emails.send(
    {
      from: getOrderAlertSender(),
      to: subscriber.email,
      subject: payload.subject,
      html: buildSubscriberEmailHtml(payload),
      text: buildSubscriberEmailPlainText(payload),
    },
    {
      headers: {
        "Idempotency-Key": payload.idempotencyKey,
      },
    },
  );

  if (error) {
    throw new Error(error.message || "Failed to send opened PO email.");
  }

  return { sent: true as const };
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

export async function sendSellerDigestEmail(payload: SellerDigestEmailPayload) {
  const resend = getResendClient();
  const to = getOrderAlertRecipient();
  const from = getOrderAlertSender();

  if (!resend || !to) {
    return { sent: false, reason: "missing_email_config" as const };
  }

  const { data, error } = await resend.emails.send(
    {
      from,
      to,
      subject: payload.subject,
      html: buildDigestHtml(payload),
      text: buildDigestPlainText(payload),
    },
    {
      headers: {
        "Idempotency-Key": `seller-digest-${payload.dedupeKey}`,
      },
    },
  );

  if (error) {
    throw new Error(error.message || "Failed to send seller digest email.");
  }

  console.info("Seller digest email sent", {
    digestKey: payload.dedupeKey,
    emailId: data?.id,
    to: extractEmailAddress(to),
    from: extractEmailAddress(from),
  });

  return { sent: true as const };
}
