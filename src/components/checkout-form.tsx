"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProductGallery } from "@/components/product-gallery";
import { findCatalogBlueprintBySlug, getPieceCount } from "@/lib/catalog";
import { Locale, Product, ProductVariantType } from "@/lib/types";

type CheckoutFormProps = {
  locale: Locale;
  products: Product[];
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  sellerWhatsappDisplay: string;
  initialProductSlug?: string;
};

type CartState = Record<string, number>;

type SubmissionSnapshot = {
  customerName: string;
  fulfillment: "pickup" | "delivery";
  total: number;
  totalPacks: number;
  totalPieces: number;
};

function cartKey(productId: string, variantType: ProductVariantType) {
  return `${productId}:${variantType}`;
}

function CheckoutSendingOverlay({
  locale,
  snapshot,
}: {
  locale: Locale;
  snapshot: SubmissionSnapshot;
}) {
  const progressCopy =
    locale === "en"
      ? [
          "Packing your checkout details",
          "Saving the order into our kitchen queue",
          "Preparing your receipt page",
        ]
      : [
          "Merapikan detail checkout kamu",
          "Menyimpan order ke antrean dapur",
          "Menyiapkan halaman receipt kamu",
        ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(255,248,242,0.78)] px-4 backdrop-blur-md">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-[rgba(185,30,30,0.14)] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(255,244,236,0.95))] p-6 shadow-[0_28px_80px_rgba(129,47,26,0.18)] sm:p-7">
        <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(232,166,60,0.36),rgba(232,166,60,0))] blur-2xl" />
        <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(185,30,30,0.18),rgba(185,30,30,0))] blur-2xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-3 rounded-full border border-[rgba(185,30,30,0.12)] bg-white/90 px-4 py-2 shadow-[0_10px_24px_rgba(129,47,26,0.08)]">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-[color:var(--brand-700)] opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-[color:var(--brand-900)]" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-[0.24em] text-[color:var(--brand-900)]">
              {locale === "en" ? "Kitchen relay active" : "Relay dapur aktif"}
            </span>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-sm font-semibold text-[color:var(--ink-700)]">
                {locale === "en"
                  ? `Sending ${snapshot.customerName || "your"} order now`
                  : `Lagi kirim order${snapshot.customerName ? ` ${snapshot.customerName}` : ""}`}
              </p>
              <h3 className="mt-2 font-display text-3xl leading-tight text-[color:var(--brand-900)] sm:text-[2.2rem]">
                {locale === "en"
                  ? "Your tray is heading into the system."
                  : "Tray order kamu lagi masuk ke sistem."}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
                {locale === "en"
                  ? "Please keep this page open for a moment. We are locking the order, checking the upload, and preparing the receipt."
                  : "Tahan sebentar ya, jangan tutup halaman ini dulu. Kami lagi mengunci order, mengecek upload, lalu menyiapkan receipt-nya."}
              </p>

              <div className="mt-5 space-y-3">
                {progressCopy.map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-[1.2rem] border border-[rgba(185,30,30,0.08)] bg-white/88 px-4 py-3"
                  >
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--paper-100)] text-xs font-black text-[color:var(--brand-900)] animate-pulse"
                      style={{ animationDelay: `${index * 120}ms` }}
                    >
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-[color:var(--ink-700)]">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.7rem] border border-[rgba(185,30,30,0.1)] bg-[linear-gradient(160deg,#fff8ef,#fff0e8)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <div className="absolute inset-x-5 top-5 h-1.5 overflow-hidden rounded-full bg-white/80">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-[linear-gradient(90deg,#b91c1c,#e8a63c)]" />
              </div>

              <div className="mt-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                    {locale === "en" ? "Live snapshot" : "Snapshot order"}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                    {snapshot.fulfillment === "delivery"
                      ? locale === "en"
                        ? "Delivery follow-up will continue after this."
                        : "Lanjutan delivery dibahas setelah ini."
                      : locale === "en"
                        ? "Pickup flow selected."
                        : "Flow pickup yang dipilih."}
                  </p>
                </div>
                <div className="flex items-end gap-1">
                  <span className="h-8 w-2 animate-bounce rounded-full bg-[color:var(--brand-900)] [animation-delay:0ms]" />
                  <span className="h-11 w-2 animate-bounce rounded-full bg-[color:var(--brand-700)] [animation-delay:120ms]" />
                  <span className="h-6 w-2 animate-bounce rounded-full bg-[color:var(--accent-gold)] [animation-delay:240ms]" />
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-[1.25rem] bg-white/90 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--brand-900)]">
                    {locale === "en" ? "Total packs" : "Total pack"}
                  </p>
                  <p className="mt-1 text-2xl font-black text-[color:var(--brand-900)]">
                    {snapshot.totalPacks}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[1.25rem] bg-white/82 px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--brand-900)]">
                      {locale === "en" ? "Pieces" : "Pcs"}
                    </p>
                    <p className="mt-1 text-xl font-black text-[color:var(--brand-900)]">
                      {snapshot.totalPieces}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] bg-white/82 px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--brand-900)]">
                      {locale === "en" ? "Mode" : "Mode"}
                    </p>
                    <p className="mt-1 text-xl font-black capitalize text-[color:var(--brand-900)]">
                      {snapshot.fulfillment}
                    </p>
                  </div>
                </div>
                <div className="rounded-[1.25rem] border border-dashed border-[rgba(185,30,30,0.18)] bg-white/88 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--brand-900)]">
                    {locale === "en" ? "Estimated total" : "Estimasi total"}
                  </p>
                  <p className="mt-1 text-2xl font-black text-[color:var(--brand-900)]">
                    Rp {snapshot.total.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CheckoutForm({
  locale,
  products,
  bankName,
  bankAccountNumber,
  bankAccountHolder,
  sellerWhatsappDisplay,
  initialProductSlug,
}: CheckoutFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSnapshot, setSubmissionSnapshot] =
    useState<SubmissionSnapshot | null>(null);
  const [error, setError] = useState("");
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [cart, setCart] = useState<CartState>(() => {
    if (!initialProductSlug) {
      return {};
    }

    const blueprint = findCatalogBlueprintBySlug(initialProductSlug);
    const product = products.find(
      (item) =>
        item.slug === initialProductSlug ||
        (blueprint ? item.slug === blueprint.canonicalSlug : false),
    );
    return product ? { [cartKey(product.id, "frozen")]: 1 } : {};
  });

  const selectedItems = useMemo(
    () =>
      products
        .flatMap((product) =>
          product.variants.map((variant) => ({
            productId: product.id,
            productName: locale === "en" ? product.nameEn : product.name,
            variantType: variant.type,
            variantLabel: variant.label,
            quantity: cart[cartKey(product.id, variant.type)] ?? 0,
            unitPrice: variant.price,
            pieceCount: getPieceCount(
              product,
              cart[cartKey(product.id, variant.type)] ?? 0,
            ),
          })),
        )
        .filter((item) => item.quantity > 0),
    [cart, locale, products],
  );

  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;
  const totalPieces = selectedItems.reduce((sum, item) => sum + item.pieceCount, 0);
  const totalPacks = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const isBusy = isSubmitting || isPending;

  function updateQuantity(productId: string, variantType: ProductVariantType, delta: number) {
    setCart((current) => {
      const key = cartKey(productId, variantType);
      const nextValue = Math.max(0, (current[key] ?? 0) + delta);
      return {
        ...current,
        [key]: nextValue,
      };
    });
  }

  function handleFulfillmentChange(next: "pickup" | "delivery") {
    if (next === "delivery" && fulfillment !== "delivery") {
      window.alert(
        locale === "en"
          ? `Delivery fee is discussed manually first. After your order is sent, continue the delivery chat on WhatsApp at ${sellerWhatsappDisplay} with your order code.`
          : `Ongkir delivery dibahas manual dulu ya. Setelah order terkirim, lanjutkan chat delivery via WhatsApp ke ${sellerWhatsappDisplay} sambil bawa kode order kamu.`,
      );
    }

    setFulfillment(next);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!selectedItems.length) {
      setError(
        locale === "en" ? "Please choose at least one variant." : "Pilih minimal satu varian menu ya.",
      );
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const customerName = String(formData.get("customerName") ?? "").trim();
    formData.set("locale", locale);
    formData.set("fulfillmentMethod", fulfillment);
    formData.set("items", JSON.stringify(selectedItems));
    setSubmissionSnapshot({
      customerName,
      fulfillment,
      total,
      totalPacks,
      totalPieces,
    });
    setIsSubmitting(true);

    let submitted = false;

    try {
      const response = await fetch("/api/order", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as { code?: string; error?: string };

      if (!response.ok || !result.code) {
        setError(
          result.error ??
            (locale === "en" ? "Unable to submit order." : "Order belum bisa dikirim."),
        );
        setIsSubmitting(false);
        return;
      }

      submitted = true;
      startTransition(() => {
        router.push(`/order/${result.code}?name=${encodeURIComponent(customerName)}`);
        router.refresh();
      });
    } catch {
      setError(
        locale === "en"
          ? "Unable to submit order right now. Please try again."
          : "Order belum bisa dikirim sekarang. Coba sebentar lagi ya.",
      );
      setIsSubmitting(false);
    } finally {
      if (!submitted) {
        setSubmissionSnapshot(null);
      }
    }
  }

  return (
    <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      {isSubmitting && submissionSnapshot ? (
        <CheckoutSendingOverlay locale={locale} snapshot={submissionSnapshot} />
      ) : null}

      <form
        onSubmit={handleSubmit}
        aria-busy={isBusy}
        className={`surface-card rounded-[2rem] p-5 transition duration-300 sm:p-7 ${
          isBusy ? "pointer-events-none scale-[0.995] opacity-80 blur-[1px]" : ""
        }`}
      >
        <div className="grid gap-7">
          <section className="grid gap-4">
            <div>
              <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
                {locale === "en" ? "Choose your packs" : "Pilih pack favoritmu"}
              </p>
              <h2 className="mt-3 font-display text-2xl sm:text-3xl">
                {locale === "en"
                  ? "Frozen or fried, every quantity is always packed as 3 pieces."
                  : "Mau frozen atau fried, setiap 1 qty selalu berisi 3 pcs."}
              </h2>
            </div>

            <div className="grid gap-4">
              {products.map((product) => {
                const name = locale === "en" ? product.nameEn : product.name;
                const description =
                  locale === "en"
                    ? product.shortDescriptionEn
                    : product.shortDescription;

                return (
                  <div
                    key={product.id}
                    className="overflow-hidden rounded-[2rem] border border-[rgba(185,30,30,0.12)] bg-white shadow-[0_20px_40px_rgba(185,30,30,0.06)]"
                  >
                    <div className="grid gap-4 p-4 lg:grid-cols-[0.92fr_1.08fr]">
                      <ProductGallery
                        images={product.images}
                        name={name}
                        aspectClassName="aspect-[1.02/1]"
                        showThumbnails={false}
                      />

                      <div className="grid content-start gap-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--brand-900)]">
                            {locale === "en"
                              ? product.prepLabelEn
                              : product.prepLabel}
                          </p>
                          <h3 className="mt-2 font-display text-3xl">{name}</h3>
                          <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
                            {description}
                          </p>
                        </div>

                        <div className="rounded-[1.6rem] bg-[linear-gradient(135deg,#fff7f1,#fff1ea)] p-4">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                            {locale === "en" ? "How the quantity works" : "Cara hitung qty"}
                          </p>
                          <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
                            {locale === "en"
                              ? "1 qty = 1 pack = 3 pieces. So if you order 3 qty, you get 9 pieces."
                              : "1 qty = 1 pack = 3 pcs. Jadi kalau pesan 3 qty, kamu akan dapat 9 pcs."}
                          </p>
                        </div>

                        <div className="grid gap-3">
                          {product.variants.map((variant) => {
                            const quantity = cart[cartKey(product.id, variant.type)] ?? 0;

                            return (
                              <div
                                key={`${product.id}-${variant.type}`}
                                className="rounded-[1.5rem] border border-[color:var(--paper-300)] bg-[color:var(--paper-100)] p-4"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                                      {variant.label}
                                    </p>
                                    <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                                      {variant.type === "frozen"
                                        ? locale === "en"
                                          ? "Ready to stock in your freezer."
                                          : "Siap masuk freezer dan digoreng kapan pun."
                                        : locale === "en"
                                          ? "Freshly fried for direct snacking."
                                          : "Digoreng hangat buat langsung dinikmati."}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-black text-[color:var(--brand-900)]">
                                      Rp {variant.price.toLocaleString("id-ID")}
                                    </p>
                                    <p className="text-xs text-[color:var(--ink-700)]">
                                      / 3 pcs
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                  <div className="text-sm text-[color:var(--ink-700)]">
                                    {quantity > 0 ? (
                                      <span>
                                        {quantity} qty - {getPieceCount(product, quantity)} pcs
                                      </span>
                                    ) : (
                                      <span>
                                        {locale === "en"
                                          ? "Tap plus to add packs"
                                          : "Tekan plus untuk tambah pack"}
                                      </span>
                                    )}
                                  </div>
                                  <div className="inline-flex items-center gap-2 rounded-full bg-white p-1 shadow-[inset_0_0_0_1px_rgba(185,30,30,0.08)]">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateQuantity(product.id, variant.type, -1)
                                      }
                                      className="h-10 w-10 rounded-full bg-[color:var(--paper-100)] text-lg font-bold text-[color:var(--brand-900)]"
                                    >
                                      -
                                    </button>
                                    <span className="min-w-10 text-center text-sm font-black">
                                      {quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateQuantity(product.id, variant.type, 1)
                                      }
                                      className="h-10 w-10 rounded-full bg-[color:var(--brand-900)] text-lg font-bold text-white"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">
                {locale === "en" ? "Your name" : "Nama pemesan"}
              </label>
              <input id="name" name="customerName" className="field" required />
            </div>
            <div>
              <label className="label" htmlFor="whatsapp">
                WhatsApp
              </label>
              <input
                id="whatsapp"
                name="customerWhatsapp"
                className="field"
                required
                placeholder="08..."
              />
            </div>
            <div>
              <label className="label" htmlFor="preorderDate">
                {locale === "en" ? "Pickup / delivery time" : "Waktu pickup / delivery"}
              </label>
              <input
                id="preorderDate"
                name="preorderDate"
                type="datetime-local"
                className="field"
                required
              />
            </div>
            <div>
              <span className="label">
                {locale === "en" ? "Fulfillment" : "Metode pengambilan"}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleFulfillmentChange("pickup")}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    fulfillment === "pickup"
                      ? "border-[color:var(--brand-900)] bg-[color:var(--brand-900)] text-white"
                      : "border-[color:var(--paper-300)] bg-white text-[color:var(--ink-700)]"
                  }`}
                >
                  Pickup
                </button>
                <button
                  type="button"
                  onClick={() => handleFulfillmentChange("delivery")}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    fulfillment === "delivery"
                      ? "border-[color:var(--brand-900)] bg-[color:var(--brand-900)] text-white"
                      : "border-[color:var(--paper-300)] bg-white text-[color:var(--ink-700)]"
                  }`}
                >
                  Delivery
                </button>
              </div>
            </div>
          </section>

          {fulfillment === "delivery" ? (
            <div className="rounded-[1.75rem] border border-[#f1d3b4] bg-[linear-gradient(135deg,#fff9ef,#fff3dd)] p-4 text-sm leading-7 text-[color:var(--ink-700)] shadow-[0_18px_40px_rgba(231,169,61,0.08)]">
              <p className="font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                {locale === "en" ? "Delivery note" : "Catatan delivery"}
              </p>
              <p className="mt-2">
                {locale === "en"
                  ? "Delivery fee is discussed manually first, because it depends on distance. Fill in your address so we can continue smoothly after payment review."
                  : "Ongkir delivery dibahas manual dulu ya, karena tergantung jarak. Isi alamat biar nanti lanjut ngobrolnya lebih enak setelah pembayaran dicek."}
              </p>
            </div>
          ) : null}

          <div>
            <label className="label" htmlFor="address">
              {locale === "en" ? "Address (optional for pickup)" : "Alamat (opsional kalau pickup)"}
            </label>
            <textarea id="address" name="address" className="field min-h-24" />
          </div>

          <div>
            <label className="label" htmlFor="note">
              {locale === "en" ? "Order notes" : "Catatan pesanan"}
            </label>
            <textarea id="note" name="note" className="field min-h-24" />
          </div>

          <div>
            <label className="label" htmlFor="paymentProof">
              {locale === "en" ? "Upload payment proof" : "Upload bukti transfer"}
            </label>
            <input
              id="paymentProof"
              name="paymentProof"
              type="file"
              accept="image/*,application/pdf"
              className="field file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--brand-900)] file:px-4 file:py-2 file:font-semibold file:text-white"
              required
            />
          </div>

          {error ? (
            <div className="rounded-[1.5rem] bg-[#fff2ef] px-4 py-3 text-sm font-semibold text-[color:var(--brand-900)]">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isBusy}
            className="btn-primary px-6 py-4 text-center font-bold disabled:opacity-60"
          >
            <span className="inline-flex items-center justify-center gap-3">
              {isBusy ? (
                <>
                  <span className="relative flex h-5 w-5 items-center justify-center">
                    <span className="absolute h-5 w-5 animate-ping rounded-full border border-white/45" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white" />
                  </span>
                  <span>
                    {locale === "en" ? "Sending your order..." : "Mengirim order..."}
                  </span>
                </>
              ) : locale === "en" ? (
                `Submit order - Rp ${total.toLocaleString("id-ID")}`
              ) : (
                `Kirim order - Rp ${total.toLocaleString("id-ID")}`
              )}
            </span>
          </button>
        </div>
      </form>

      <aside className="grid content-start gap-4">
        <div className="surface-card rounded-[2rem] p-5 sm:p-6">
          <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
            {locale === "en" ? "Order summary" : "Ringkasan pesanan"}
          </p>
          <div className="mt-4 space-y-4">
            {selectedItems.length > 0 ? (
              selectedItems.map((item) => (
                <div
                  key={`${item.productId}-${item.variantType}`}
                  className="rounded-[1.5rem] border border-[color:var(--paper-300)] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-[color:var(--brand-900)]">
                        {item.productName}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                        {item.variantLabel} - {item.quantity} qty - {item.pieceCount} pcs
                      </p>
                    </div>
                    <p className="text-sm font-black text-[color:var(--brand-900)]">
                      Rp {(item.unitPrice * item.quantity).toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-[color:var(--paper-300)] bg-white px-4 py-5 text-sm leading-7 text-[color:var(--ink-700)]">
                {locale === "en"
                  ? "Your summary will appear here as soon as you add frozen or fried packs."
                  : "Ringkasan akan muncul di sini begitu kamu menambahkan pack frozen atau fried."}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-[1.6rem] bg-[linear-gradient(135deg,#fff7ef,#fff0e7)] p-4">
            <div className="flex items-center justify-between text-sm text-[color:var(--ink-700)]">
              <span>{locale === "en" ? "Total packs" : "Total qty pack"}</span>
              <span className="font-bold">
                {selectedItems.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-[color:var(--ink-700)]">
              <span>{locale === "en" ? "Total pieces" : "Total pcs"}</span>
              <span className="font-bold">{totalPieces}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-[color:var(--ink-700)]">
              <span>Subtotal</span>
              <span className="font-bold">Rp {subtotal.toLocaleString("id-ID")}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-[color:var(--ink-700)]">
              <span>{locale === "en" ? "Delivery fee" : "Ongkir"}</span>
              <span className="font-bold">
                {fulfillment === "delivery"
                  ? locale === "en"
                    ? "Discussed later"
                    : "Dibahas menyusul"
                  : "Rp 0"}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-dashed border-[rgba(185,30,30,0.18)] pt-3 text-base font-black text-[color:var(--brand-900)]">
              <span>Total</span>
              <span>Rp {total.toLocaleString("id-ID")}</span>
            </div>
          </div>
        </div>

        <div className="surface-card rounded-[2rem] p-5 sm:p-6">
          <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
            {locale === "en" ? "Transfer info" : "Info transfer"}
          </p>
          <div className="mt-4 rounded-[1.6rem] bg-white p-4">
            <p className="text-sm text-[color:var(--ink-700)]">{bankName}</p>
            <p className="mt-1 text-2xl font-black text-[color:var(--brand-900)]">
              {bankAccountNumber}
            </p>
            <p className="mt-1 text-sm font-semibold text-[color:var(--ink-700)]">
              a.n. {bankAccountHolder}
            </p>
          </div>
          <p className="mt-4 text-sm leading-7 text-[color:var(--ink-700)]">
            {locale === "en"
              ? "Transfer first, upload the proof here, and keep your receipt after checkout so tracking stays easy."
              : "Transfer dulu, upload buktinya di sini, lalu simpan receipt setelah checkout supaya progress order gampang dilacak lagi."}
          </p>
        </div>
      </aside>
    </div>
  );
}
