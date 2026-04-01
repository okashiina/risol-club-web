import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { PaymentProofPreview } from "@/components/payment-proof-preview";
import {
  getOrderByCode,
  orderMatchesCustomerName,
  readStore,
  statusLabel,
} from "@/lib/data-store";
import { getLocale } from "@/lib/i18n";
import { getPaymentProofHref } from "@/lib/payment-proof";
import { formatCurrency, formatDateTime } from "@/lib/reports";

export default async function OrderTrackingPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ name?: string }>;
}) {
  const locale = await getLocale();
  const store = await readStore();
  const { code } = await params;
  const { name } = await searchParams;
  const order = getOrderByCode(store, code);

  if (!order) {
    notFound();
  }

  const providedName = String(name ?? "").trim();
  const hasAccess =
    providedName.length > 0 && orderMatchesCustomerName(order, providedName);
  const paymentProofLabel =
    !order.paymentProof?.fileName || order.paymentProof.fileName.startsWith("data:")
      ? locale === "en"
        ? "Payment proof file"
        : "File bukti transfer"
      : order.paymentProof?.fileName;
  const sellerWhatsapp = store.settings.sellerWhatsapp;
  const sellerWhatsappDisplay = store.settings.sellerWhatsappDisplay;
  const deliveryWhatsappMessage =
    locale === "en"
      ? `Hi, I want to discuss delivery for order ${order.code} under the name ${order.customerName}.`
      : `Halo, saya mau bahas delivery untuk order ${order.code} atas nama ${order.customerName}.`;
  const deliveryWhatsappHref = `https://wa.me/${sellerWhatsapp}?text=${encodeURIComponent(
    deliveryWhatsappMessage,
  )}`;

  if (!hasAccess) {
    return (
      <div className="page-shell safe-pt min-h-screen py-6">
        <div className="flex items-center justify-between rounded-full bg-white/80 px-4 py-3 backdrop-blur">
          <BrandLogo />
          <LanguageToggle locale={locale} />
        </div>

        <section className="surface-card mx-auto mt-6 max-w-3xl rounded-[2.5rem] p-6 sm:p-8">
          <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
            {locale === "en" ? "Open your receipt" : "Buka receipt kamu"}
          </p>
          <h1 className="mt-4 font-display text-4xl">
            {locale === "en"
              ? "Use your order code and customer name to unlock the receipt."
              : "Masukkan kode order dan nama pemesan untuk buka receipt ini."}
          </h1>
          <p className="mt-4 text-base leading-8 text-[color:var(--ink-700)]">
            {locale === "en"
              ? "This extra check helps keep order tracking a little safer, especially because order codes are sequential."
              : "Check tambahan ini bantu bikin tracking order lebih aman, apalagi karena kode order sifatnya berurutan."}
          </p>

          <div className="mt-6 rounded-[1.75rem] bg-[color:var(--paper-100)] p-5">
            <p className="text-sm text-[color:var(--ink-700)]">
              {locale === "en" ? "Order code" : "Kode order"}
            </p>
            <p className="mt-2 text-2xl font-black text-[color:var(--brand-900)]">
              {order.code}
            </p>
          </div>

          <form action={`/order/${order.code}`} className="mt-6 grid gap-4">
            <div>
              <label className="label" htmlFor="customerName">
                {locale === "en" ? "Customer name" : "Nama pemesan"}
              </label>
              <input
                id="customerName"
                name="name"
                className="field"
                defaultValue={providedName}
                placeholder={
                  locale === "en" ? "Type the same name used when ordering" : "Ketik nama yang dipakai saat pesan"
                }
                required
              />
            </div>

            {providedName ? (
              <p className="rounded-[1.4rem] bg-[#fff2ef] px-4 py-3 text-sm font-semibold text-[color:var(--brand-900)]">
                {locale === "en"
                  ? "The name does not match this order yet. Try the exact customer name used when ordering."
                  : "Namanya belum cocok dengan order ini. Coba pakai nama pemesan yang sama persis saat checkout."}
              </p>
            ) : null}

            <button type="submit" className="btn-primary px-5 py-4 font-bold">
              {locale === "en" ? "Open my receipt" : "Buka receipt saya"}
            </button>
          </form>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link href="/track" className="btn-secondary px-5 py-4 text-center font-bold">
              {locale === "en" ? "Go to tracking center" : "Ke pusat tracking"}
            </Link>
            <Link href="/" className="btn-secondary px-5 py-4 text-center font-bold">
              {locale === "en" ? "Back home" : "Kembali ke beranda"}
            </Link>
          </div>
        </section>
      </div>
    );
  }

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

          <div className="mt-6 rounded-[1.9rem] border border-[#f2d5c4] bg-[linear-gradient(135deg,#fff8ef,#fff4e6)] p-5 shadow-[0_18px_40px_rgba(231,169,61,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
              {locale === "en" ? "Save this receipt" : "Simpan receipt ini"}
            </p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
              {locale === "en"
                ? `Please keep your order code ${order.code} and customer name ${order.customerName}. You can use both later in the tracking center to reopen this receipt and monitor progress.`
                : `Tolong simpan kode order ${order.code} dan nama pemesan ${order.customerName}. Nanti dua data ini bisa dipakai lagi di pusat tracking untuk buka receipt dan cek progres order.`}
            </p>
            <Link href="/track" className="btn-secondary mt-4 px-5 py-3 text-sm font-bold">
              {locale === "en" ? "Open tracking center" : "Buka pusat tracking"}
            </Link>
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
            <Link href="/checkout" className="btn-primary px-5 py-4 text-center font-bold">
              {locale === "en" ? "Create another order" : "Buat order baru"}
            </Link>
            <Link href="/" className="btn-secondary px-5 py-4 text-center font-bold">
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
                <div
                  key={`${item.productId}-${item.variantType ?? "legacy"}`}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="font-semibold text-[color:var(--ink-700)]">
                      {item.productName}
                    </span>
                    <p className="text-xs text-[color:var(--ink-700)]">
                      {item.variantLabel} • {item.quantity} qty • {item.pieceCount} pcs
                    </p>
                  </div>
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
              <PaymentProofPreview
                href={getPaymentProofHref(order.paymentProof)}
                mimeType={order.paymentProof.mimeType}
                alt={
                  locale === "en"
                    ? `Payment proof for ${order.code}`
                    : `Bukti transfer untuk ${order.code}`
                }
              />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <a
                  href={getPaymentProofHref(order.paymentProof)}
                  download={order.paymentProof.fileName}
                  className="btn-primary px-4 py-3 text-center text-sm font-bold"
                >
                  {locale === "en" ? "Download proof" : "Download bukti bayar"}
                </a>
                {paymentProofLabel ? (
                  <p className="rounded-[1rem] bg-[color:var(--paper-100)] px-4 py-3 text-sm font-semibold text-[color:var(--ink-700)]">
                    {paymentProofLabel}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
