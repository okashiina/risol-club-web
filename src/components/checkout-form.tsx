"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Locale, Product } from "@/lib/types";

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
  const [error, setError] = useState("");
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [cart, setCart] = useState<CartState>(() => {
    if (!initialProductSlug) {
      return {};
    }

    const product = products.find((item) => item.slug === initialProductSlug);
    return product ? { [product.id]: 1 } : {};
  });

  const selectedItems = useMemo(
    () =>
      products
        .map((product) => ({
          productId: product.id,
          productName: locale === "en" ? product.nameEn : product.name,
          quantity: cart[product.id] ?? 0,
          unitPrice: product.price,
        }))
        .filter((item) => item.quantity > 0),
    [cart, locale, products],
  );

  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  function updateQuantity(productId: string, delta: number) {
    setCart((current) => {
      const nextValue = Math.max(0, (current[productId] ?? 0) + delta);
      return {
        ...current,
        [productId]: nextValue,
      };
    });
  }

  function handleFulfillmentChange(next: "pickup" | "delivery") {
    if (next === "delivery" && fulfillment !== "delivery") {
      window.alert(
        locale === "en"
          ? `Delivery fee is not added automatically because it depends on distance. After your order is submitted, please continue the delivery discussion via WhatsApp at ${sellerWhatsappDisplay} using your order code.`
          : `Ongkir delivery tidak dihitung otomatis karena tergantung jarak. Setelah order terkirim, lanjut bahas delivery via WhatsApp ke ${sellerWhatsappDisplay} dengan nomor order kamu ya.`,
      );
    }

    setFulfillment(next);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!selectedItems.length) {
      setError(locale === "en" ? "Please choose at least one item." : "Pilih minimal satu item.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("locale", locale);
    formData.set("fulfillmentMethod", fulfillment);
    formData.set("items", JSON.stringify(selectedItems));

    startTransition(async () => {
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
        return;
      }

      router.push(`/order/${result.code}`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <form onSubmit={handleSubmit} className="surface-card rounded-[2rem] p-5 sm:p-7">
        <div className="grid gap-6">
          <section className="grid gap-4">
            <div>
              <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
                {locale === "en" ? "Choose your box" : "Pilih isi pesanan"}
              </p>
              <h2 className="mt-3 font-display text-2xl">
                {locale === "en"
                  ? "Build a simple pre-order in one screen."
                  : "Susun pre-order dalam satu layar."}
              </h2>
            </div>
            <div className="grid gap-3">
              {products.map((product) => {
                const quantity = cart[product.id] ?? 0;
                const name = locale === "en" ? product.nameEn : product.name;
                const description =
                  locale === "en"
                    ? product.shortDescriptionEn
                    : product.shortDescription;

                return (
                  <div
                    key={product.id}
                    className="rounded-[1.5rem] border border-[color:var(--paper-300)] bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold">{name}</h3>
                        <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                          {description}
                        </p>
                      </div>
                      <div className="text-right text-sm font-semibold text-[color:var(--brand-900)]">
                        Rp {product.price.toLocaleString("id-ID")}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-[color:var(--ink-700)]">
                        {locale === "en" ? "Quantity" : "Jumlah"}
                      </span>
                      <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--paper-100)] p-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, -1)}
                          className="h-10 w-10 rounded-full bg-white text-lg font-bold text-[color:var(--brand-900)]"
                        >
                          -
                        </button>
                        <span className="min-w-8 text-center text-sm font-bold">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, 1)}
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
                  ? "Delivery is available, but the fee will be discussed manually with the seller because each area is different."
                  : "Delivery tetap bisa, tapi ongkir dibahas manual dulu dengan seller karena tiap area beda harga."}
              </p>
              <p className="mt-2 font-semibold text-[color:var(--brand-900)]">
                {locale === "en"
                  ? "After order submission, use the WhatsApp button on your order page."
                  : "Setelah order masuk, pakai tombol WhatsApp di halaman order kamu ya."}
              </p>
            </div>
          ) : null}

          {fulfillment === "delivery" ? (
            <div>
              <label className="label" htmlFor="address">
                {locale === "en" ? "Delivery address" : "Alamat delivery"}
              </label>
              <textarea
                id="address"
                name="address"
                className="field min-h-28"
                required={fulfillment === "delivery"}
              />
            </div>
          ) : null}

          <div>
            <label className="label" htmlFor="note">
              {locale === "en" ? "Order notes" : "Catatan pesanan"}
            </label>
            <textarea id="note" name="note" className="field min-h-28" />
          </div>

          <div>
            <label className="label" htmlFor="paymentProof">
              {locale === "en" ? "Upload payment proof" : "Upload bukti transfer"}
            </label>
            <input
              id="paymentProof"
              name="paymentProof"
              type="file"
              accept="image/*,.pdf"
              className="field"
              required
            />
          </div>

          {error ? (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="sticky-cta sticky bottom-0 mt-6 rounded-[1.75rem] border border-[color:var(--paper-300)] bg-white/95 p-4 backdrop-blur">
          <div className="mb-3 flex items-center justify-between text-sm text-[color:var(--ink-700)]">
            <span>{locale === "en" ? "Selected items" : "Item dipilih"}</span>
            <span>{selectedItems.length}</span>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary w-full px-5 py-4 text-base font-bold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending
              ? locale === "en"
                ? "Submitting..."
                : "Mengirim..."
              : locale === "en"
                ? `Submit order - Rp ${total.toLocaleString("id-ID")}`
                : `Kirim order - Rp ${total.toLocaleString("id-ID")}`}
          </button>
        </div>
      </form>

      <aside className="flex flex-col gap-4">
        <div className="surface-card rounded-[2rem] p-5 sm:p-6">
          <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
            {locale === "en" ? "Manual transfer" : "Transfer manual"}
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-[color:var(--ink-700)]">
              {locale === "en"
                ? "Transfer first, then upload your payment proof in the form."
                : "Silakan transfer dulu, lalu upload bukti transfer di form."}
            </p>
            <div className="rounded-[1.5rem] bg-[color:var(--paper-100)] p-4">
              <p className="text-sm font-semibold text-[color:var(--ink-700)]">{bankName}</p>
              <p className="mt-2 text-xl font-black text-[color:var(--brand-900)]">
                {bankAccountNumber}
              </p>
              <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                a.n. {bankAccountHolder}
              </p>
            </div>
          </div>
        </div>

        <div className="surface-card rounded-[2rem] p-5 sm:p-6">
          <h3 className="font-display text-xl">
            {locale === "en" ? "Order summary" : "Ringkasan pesanan"}
          </h3>
          <div className="mt-4 space-y-3">
            {selectedItems.length ? (
              selectedItems.map((item) => (
                <div key={item.productId} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-[color:var(--ink-700)]">
                    {item.productName} x{item.quantity}
                  </span>
                  <span className="font-bold">
                    Rp {(item.unitPrice * item.quantity).toLocaleString("id-ID")}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-[color:var(--ink-700)]">
                {locale === "en"
                  ? "Pick at least one menu item to see your total."
                  : "Pilih minimal satu menu untuk lihat total pesanan."}
              </p>
            )}
            <div className="border-t border-dashed border-[color:var(--paper-300)] pt-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>Rp {subtotal.toLocaleString("id-ID")}</span>
              </div>
              {fulfillment === "delivery" ? (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span>{locale === "en" ? "Delivery fee" : "Ongkir"}</span>
                  <span className="text-right font-bold text-[color:var(--brand-900)]">
                    {locale === "en" ? "Discussed via chat" : "Dibahas via chat"}
                  </span>
                </div>
              ) : null}
              <div className="mt-3 flex items-center justify-between text-base font-black text-[color:var(--brand-900)]">
                <span>Total</span>
                <span>Rp {total.toLocaleString("id-ID")}</span>
              </div>
              {fulfillment === "delivery" ? (
                <p className="mt-3 text-xs leading-6 text-[color:var(--ink-700)]">
                  {locale === "en"
                    ? "Current total excludes delivery fee. Final delivery cost will be confirmed after chatting with the seller."
                    : "Total saat ini belum termasuk ongkir. Ongkir final akan dikonfirmasi setelah chat dengan seller."}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
