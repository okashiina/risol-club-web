import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { getOrderByCode, readStore, statusLabel } from "@/lib/data-store";
import { getLocale } from "@/lib/i18n";
import { formatCurrency, formatDateTime } from "@/lib/reports";

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const locale = await getLocale();
  const store = await readStore();
  const { code } = await params;
  const order = getOrderByCode(store, code);

  if (!order) {
    notFound();
  }

  const paymentProofLabel =
    order.paymentProof?.fileName.startsWith("data:")
      ? locale === "en"
        ? "Open payment proof"
        : "Buka bukti transfer"
      : order.paymentProof?.fileName;
  const showImagePreview = Boolean(order.paymentProof?.mimeType.startsWith("image/"));
  const showPdfPreview =
    order.paymentProof?.mimeType === "application/pdf" ||
    order.paymentProof?.mimeType.endsWith("/pdf");
  const sellerWhatsapp = store.settings.sellerWhatsapp;
  const sellerWhatsappDisplay = store.settings.sellerWhatsappDisplay;
  const deliveryWhatsappMessage =
    locale === "en"
      ? `Hi, I want to discuss delivery for order ${order.code} under the name ${order.customerName}.`
      : `Halo, saya mau bahas delivery untuk order ${order.code} atas nama ${order.customerName}.`;
  const deliveryWhatsappHref = `https://wa.me/${sellerWhatsapp}?text=${encodeURIComponent(
    deliveryWhatsappMessage,
  )}`;

  return (
    <div className="page-shell safe-pt min-h-screen py-6">
      <div className="flex items-center justify-between rounded-full bg-white/80 px-4 py-3 backdrop-blur">
        <BrandLogo />
        <LanguageToggle locale={locale} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="surface-card rounded-[2.5rem] p-6 sm:p-8">
          <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
            {locale === "en" ? "Order received" : "Order diterima"}
          </p>
          <h1 className="mt-4 font-display text-4xl">
            {locale === "en"
              ? "Thanks, your order is in."
              : "Thank you, order kamu sudah masuk."}
          </h1>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] bg-[color:var(--paper-100)] p-4">
              <p className="text-sm text-[color:var(--ink-700)]">Order code</p>
              <p className="mt-2 text-2xl font-black text-[color:var(--brand-900)]">
                {order.code}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-[color:var(--paper-100)] p-4">
              <p className="text-sm text-[color:var(--ink-700)]">Status</p>
              <p className="mt-2 text-2xl font-black text-[color:var(--brand-900)]">
                {statusLabel(order.status)}
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-[1.75rem] border border-[color:var(--paper-300)] p-5">
            <p className="text-sm font-semibold text-[color:var(--ink-700)]">
              {locale === "en"
                ? "We will verify your payment proof and confirm the order via WhatsApp."
                : "Kami akan cek bukti transfer lalu konfirmasi order via WhatsApp."}
            </p>
            <p className="mt-3 text-sm text-[color:var(--ink-700)]">
              {locale === "en" ? "Pre-order time" : "Waktu pre-order"}:{" "}
              {formatDateTime(order.preorderDate)}
            </p>
            {order.fulfillmentMethod === "delivery" && order.address ? (
              <p className="mt-2 text-sm text-[color:var(--ink-700)]">
              {locale === "en" ? "Delivery to" : "Alamat delivery"}: {order.address}
              </p>
            ) : null}
          </div>

          {order.fulfillmentMethod === "delivery" ? (
            <div className="mt-6 rounded-[1.9rem] border border-[#f1d3b4] bg-[linear-gradient(135deg,#fff9ef,#fff2dc)] p-5 shadow-[0_18px_40px_rgba(231,169,61,0.08)]">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                {locale === "en" ? "Delivery follow-up" : "Lanjutan delivery"}
              </p>
              <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
                {locale === "en"
                  ? "Delivery fee is discussed manually because it depends on distance. Tap the button below and your order code will be included automatically."
                  : "Ongkir delivery dibahas manual karena tergantung jarak. Tekan tombol di bawah dan nomor order kamu akan ikut terisi otomatis."}
              </p>
              <a
                href={deliveryWhatsappHref}
                target="_blank"
                rel="noreferrer"
                className="btn-primary mt-4 px-5 py-4 text-center font-bold"
              >
                {locale === "en"
                  ? `Discuss delivery via WhatsApp (${sellerWhatsappDisplay})`
                  : `Bahas delivery via WhatsApp (${sellerWhatsappDisplay})`}
              </a>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/checkout"
              className="btn-primary px-5 py-4 text-center font-bold"
            >
              {locale === "en" ? "Create another order" : "Buat order baru"}
            </Link>
            <Link
              href="/"
              className="btn-secondary px-5 py-4 text-center font-bold"
            >
              {locale === "en" ? "Back home" : "Kembali ke beranda"}
            </Link>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="surface-card rounded-[2rem] p-5 sm:p-6">
            <h2 className="font-display text-2xl">
              {locale === "en" ? "Order summary" : "Ringkasan order"}
            </h2>
            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-[color:var(--ink-700)]">
                    {item.productName} x{item.quantity}
                  </span>
                  <span className="font-bold">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
              <div className="border-t border-dashed border-[color:var(--paper-300)] pt-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span>{locale === "en" ? "Delivery" : "Ongkir"}</span>
                  <span className="text-right">
                    {order.fulfillmentMethod === "delivery" && order.deliveryFee === 0
                      ? locale === "en"
                        ? "Discussed via chat"
                        : "Dibahas via chat"
                      : formatCurrency(order.deliveryFee)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-base font-black text-[color:var(--brand-900)]">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
                {order.fulfillmentMethod === "delivery" && order.deliveryFee === 0 ? (
                  <p className="mt-3 text-xs leading-6 text-[color:var(--ink-700)]">
                    {locale === "en"
                      ? "Current total excludes delivery fee. Final delivery cost will be confirmed after chatting with the seller."
                      : "Total saat ini belum termasuk ongkir. Ongkir final akan dikonfirmasi setelah chat dengan seller."}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {order.paymentProof ? (
            <div className="surface-card rounded-[2rem] p-5 sm:p-6">
              <h3 className="font-display text-xl">
                {locale === "en" ? "Payment proof" : "Bukti pembayaran"}
              </h3>
              {showImagePreview ? (
                <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-[color:var(--paper-300)] bg-[#fffaf7]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={order.paymentProof.dataUrl}
                    alt={
                      locale === "en"
                        ? `Payment proof for ${order.code}`
                        : `Bukti transfer untuk ${order.code}`
                    }
                    className="block max-h-[28rem] w-full object-contain"
                  />
                </div>
              ) : null}
              {showPdfPreview ? (
                <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-[color:var(--paper-300)] bg-white">
                  <object
                    data={order.paymentProof.dataUrl}
                    type={order.paymentProof.mimeType}
                    className="h-[28rem] w-full"
                  >
                    <p className="p-4 text-sm text-[color:var(--ink-700)]">
                      {locale === "en"
                        ? "PDF preview is not available in this browser."
                        : "Preview PDF belum tersedia di browser ini."}
                    </p>
                  </object>
                </div>
              ) : null}
              <a
                href={order.paymentProof.dataUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary mt-4 px-4 py-3 text-sm font-bold"
              >
                {locale === "en"
                  ? `Open full file${paymentProofLabel ? ` - ${paymentProofLabel}` : ""}`
                  : `Buka file penuh${paymentProofLabel ? ` - ${paymentProofLabel}` : ""}`}
              </a>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
