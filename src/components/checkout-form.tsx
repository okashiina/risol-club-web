"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProductGallery } from "@/components/product-gallery";
import {
  findCatalogBlueprintBySlug,
  getDisplayPrice,
  getPackSize,
  getPieceCount,
} from "@/lib/catalog";
import { Locale, OrderItem, Product, ProductVariantType } from "@/lib/types";

const MIDDLE_DOT = "\u00b7";
const HYDRATION_SAFE_CONTROL_PROPS = {
  suppressHydrationWarning: true,
} as const;

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
type CustomMixState = Record<string, number>;

function cartKey(productId: string, variantType: ProductVariantType) {
  return `${productId}:${variantType}`;
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
  const [customPackQuantity, setCustomPackQuantity] = useState(0);
  const [customPackVariantType, setCustomPackVariantType] =
    useState<ProductVariantType>("frozen");
  const [customPackPieces, setCustomPackPieces] = useState<CustomMixState>(() =>
    Object.fromEntries(products.map((product) => [product.id, 0])),
  );

  const productItems = useMemo(
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
  const customPackPreview = useMemo(() => {
    const components = products
      .map((product) => {
        const quantity = Math.max(0, customPackPieces[product.id] ?? 0);

        if (!quantity) {
          return null;
        }

        const variant = product.variants.find((item) => item.type === customPackVariantType);
        const packPrice = variant?.price ?? getDisplayPrice(product);

        return {
          productId: product.id,
          productName: locale === "en" ? product.nameEn : product.name,
          quantity,
          variantType: customPackVariantType,
          variantLabel: variant?.label ?? customPackVariantType,
          piecePrice: packPrice / Math.max(getPackSize(product), 1),
        };
      })
      .filter((item): item is {
        productId: string;
        productName: string;
        quantity: number;
        variantType: ProductVariantType;
        variantLabel: string;
        piecePrice: number;
      } => Boolean(item));

    const piecesPerPack = components.reduce((sum, item) => sum + item.quantity, 0);
    const unitPrice = components.reduce(
      (sum, item) => sum + item.quantity * item.piecePrice,
      0,
    );

    const customMixItem: OrderItem | null =
      customPackQuantity > 0 && piecesPerPack === 3
        ? {
            productId: "custom-mix-pack",
            productName: locale === "en" ? "Custom mix pack" : "Pack campur custom",
            variantType: customPackVariantType,
            variantLabel:
              locale === "en"
                ? `Custom ${customPackVariantType}`
                : `Custom ${customPackVariantType}`,
            quantity: customPackQuantity,
            pieceCount: customPackQuantity * piecesPerPack,
            unitPrice: Math.round(unitPrice),
            costSnapshot: 0,
            customMixLabel: components
              .map((item) => `${item.quantity} pcs ${item.productName}`)
              .join(" + "),
            customMixComponents: components.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              variantType: item.variantType,
              variantLabel: item.variantLabel,
            })),
          }
        : null;

    return {
      components,
      piecesPerPack,
      unitPrice: Math.round(unitPrice),
      valid: customPackQuantity > 0 && piecesPerPack === 3,
      customMixItem,
    };
  }, [customPackPieces, customPackQuantity, customPackVariantType, locale, products]);
  const selectedItems = useMemo(
    () => [...productItems, ...(customPackPreview.customMixItem ? [customPackPreview.customMixItem] : [])],
    [customPackPreview.customMixItem, productItems],
  );

  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;
  const totalPieces = selectedItems.reduce((sum, item) => sum + item.pieceCount, 0);

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

    if (customPackQuantity > 0 && !customPackPreview.valid) {
      setError(
        locale === "en"
          ? "Custom mix pack must total exactly 3 pieces per pack."
          : "Pack campur custom harus pas 3 pcs per pack.",
      );
      return;
    }

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

      router.push(`/order/${result.code}?name=${encodeURIComponent(customerName)}`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <form onSubmit={handleSubmit} className="surface-card rounded-4xl p-5 sm:p-7">
        <div className="grid gap-7">
          <section className="grid gap-4">
            <div>
              <p className="pill bg-background text-(--brand-900)">
                {locale === "en" ? "Choose your packs" : "Pilih pack favoritmu"}
              </p>
              <h2 className="mt-3 font-display text-2xl text-(--brand-900) sm:text-3xl">
                {locale === "en"
                  ? "Frozen or fried, every quantity is always packed as 3 pieces"
                  : "Mau frozen atau fried, setiap 1 qty selalu berisi 3 pcs"}
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
                    className="overflow-hidden rounded-4xl border border-[rgba(185,30,30,0.12)] bg-white shadow-[0_20px_40px_rgba(185,30,30,0.06)]"
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
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-(--brand-900)">
                            {locale === "en"
                              ? product.prepLabelEn
                              : product.prepLabel}
                          </p>
                          <h3 className="mt-2 font-display text-3xl text-(--brand-900)">
                            {name}
                          </h3>
                          <p className="mt-3 text-(--ink-700) text-sm leading-7">
                            {description}
                          </p>
                        </div>

                        <div className="rounded-[1.6rem] bg-[linear-gradient(135deg,#fff7f1,#fff1ea)] p-4">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-(--brand-900)">
                            {locale === "en" ? "How the quantity works" : "Cara hitung qty"}
                          </p>
                          <p className="mt-2 text-(--ink-700) text-sm leading-7">
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
                                className="rounded-3xl border border-(--paper-300) bg-background p-4"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-black uppercase tracking-[0.18em] text-(--brand-900)">
                                      {variant.label}
                                    </p>
                                    <p className="mt-1 text-(--ink-700) text-sm">
                                      {variant.type === "frozen"
                                        ? locale === "en"
                                          ? "Ready to stock in your freezer!"
                                          : "Siap masuk freezer dan digoreng nanti!"
                                        : locale === "en"
                                          ? "Freshly fried for direct snacking!"
                                          : "Digoreng hangat untuk langsung disantap!"}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-(--brand-900) text-lg font-black">
                                      Rp {variant.price.toLocaleString("id-ID")}
                                    </p>
                                    <p className="text-(--ink-700) text-xs">
                                      / 3 pcs
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                  <div className="text-(--ink-700) text-sm">
                                    {quantity > 0 ? (
                                      <span>
                                        {quantity} qty {MIDDLE_DOT} {getPieceCount(product, quantity)} pcs
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
                                      {...HYDRATION_SAFE_CONTROL_PROPS}
                                      type="button"
                                      onClick={() =>
                                        updateQuantity(product.id, variant.type, -1)
                                      }
                                      className="h-10 w-10 rounded-full bg-background text-(--brand-900) text-lg font-bold"
                                    >
                                      -
                                    </button>
                                    <span className="min-w-10 text-center text-sm font-black">
                                      {quantity}
                                    </span>
                                    <button
                                      {...HYDRATION_SAFE_CONTROL_PROPS}
                                      type="button"
                                      onClick={() =>
                                        updateQuantity(product.id, variant.type, 1)
                                      }
                                      className="h-10 w-10 rounded-full bg-(--brand-900) text-lg font-bold text-white"
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

          <section className="grid gap-4">
            <div className="surface-card rounded-[2rem] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="pill bg-background text-(--brand-900)">Custom mix pack</p>
                  <h3 className="mt-3 font-display text-2xl text-(--brand-900)">
                    {locale === "en"
                      ? "Build a mixed pack of 3 pieces"
                      : "Rakit pack campur isi 3 pcs"}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-(--ink-700)">
                    {locale === "en"
                      ? "Example: 1 piece Choco Cheese + 2 pieces Risol Mayo in one qty."
                      : "Contoh: 1 pcs Choco Cheese + 2 pcs Risol Mayo dalam 1 qty."}
                  </p>
                </div>
                <div className="rounded-full bg-background px-4 py-2 text-sm font-bold text-(--brand-900)">
                  {customPackPreview.piecesPerPack}/3 pcs
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label" htmlFor="custom-pack-qty">
                    {locale === "en" ? "Custom pack qty" : "Qty pack custom"}
                  </label>
                  <input
                    id="custom-pack-qty"
                    name="customPackQty"
                    type="number"
                    min="0"
                    className="field"
                    value={customPackQuantity}
                    onChange={(event) =>
                      setCustomPackQuantity(Math.max(0, Number(event.target.value) || 0))
                    }
                  />
                </div>
                <div>
                  <span className="label">
                    {locale === "en" ? "Serving style" : "Gaya sajian"}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomPackVariantType("frozen")}
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                        customPackVariantType === "frozen"
                          ? "border-(--brand-900) bg-(--brand-900) text-white"
                          : "border-(--paper-300) bg-white text-(--ink-700)"
                      }`}
                    >
                      Frozen
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomPackVariantType("fried")}
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                        customPackVariantType === "fried"
                          ? "border-(--brand-900) bg-(--brand-900) text-white"
                          : "border-(--paper-300) bg-white text-(--ink-700)"
                      }`}
                    >
                      Fried
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {products.map((product) => {
                  const quantity = customPackPieces[product.id] ?? 0;

                  return (
                    <div
                      key={`custom-${product.id}`}
                      className="rounded-3xl border border-(--paper-300) bg-background p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black uppercase tracking-[0.18em] text-(--brand-900)">
                            {locale === "en" ? product.nameEn : product.name}
                          </p>
                          <p className="mt-1 text-sm text-(--ink-700)">
                            {locale === "en"
                              ? "Pieces in one custom pack"
                              : "Jumlah pcs di dalam 1 pack custom"}
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white p-1">
                          <button
                            type="button"
                            onClick={() =>
                              setCustomPackPieces((current) => ({
                                ...current,
                                [product.id]: Math.max(0, (current[product.id] ?? 0) - 1),
                              }))
                            }
                            className="h-10 w-10 rounded-full bg-background text-lg font-bold text-(--brand-900)"
                          >
                            -
                          </button>
                          <span className="min-w-8 text-center text-sm font-black">{quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomPackPieces((current) => ({
                                ...current,
                                [product.id]: Math.min(3, (current[product.id] ?? 0) + 1),
                              }))
                            }
                            className="h-10 w-10 rounded-full bg-(--brand-900) text-lg font-bold text-white"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-[1.6rem] bg-[linear-gradient(135deg,#fff7ef,#fff0e7)] p-4">
                <div className="flex items-center justify-between text-sm text-(--ink-700)">
                  <span>
                    {locale === "en"
                      ? "Custom mix preview"
                      : "Preview campuran custom"}
                  </span>
                  <span className="font-bold">{customPackPreview.piecesPerPack}/3 pcs</span>
                </div>
                <p className="mt-2 text-sm leading-7 text-(--ink-700)">
                  {customPackPreview.valid
                    ? customPackPreview.customMixItem?.customMixLabel
                    : locale === "en"
                      ? "Set the pieces until the total reaches exactly 3 per pack."
                      : "Atur pcs sampai totalnya pas 3 per pack."}
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">
                {locale === "en" ? "Your name" : "Nama pemesan"}
              </label>
              <input
                {...HYDRATION_SAFE_CONTROL_PROPS}
                id="name"
                name="customerName"
                className="field"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="whatsapp">
                WhatsApp
              </label>
              <input
                {...HYDRATION_SAFE_CONTROL_PROPS}
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
                {...HYDRATION_SAFE_CONTROL_PROPS}
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
                  {...HYDRATION_SAFE_CONTROL_PROPS}
                  type="button"
                  onClick={() => handleFulfillmentChange("pickup")}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    fulfillment === "pickup"
                      ? "border-(--brand-900) bg-(--brand-900) text-white"
                      : "border-(--paper-300) bg-white text-(--ink-700)"
                  }`}
                >
                  Pickup
                </button>
                <button
                  {...HYDRATION_SAFE_CONTROL_PROPS}
                  type="button"
                  onClick={() => handleFulfillmentChange("delivery")}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    fulfillment === "delivery"
                      ? "border-(--brand-900) bg-(--brand-900) text-white"
                      : "border-(--paper-300) bg-white text-(--ink-700)"
                  }`}
                >
                  Delivery
                </button>
              </div>
            </div>
          </section>

          {fulfillment === "delivery" ? (
            <div className="rounded-[1.75rem] border border-[#f1d3b4] bg-[linear-gradient(135deg,#fff9ef,#fff3dd)] p-4 text-(--ink-700) text-sm leading-7 shadow-[0_18px_40px_rgba(231,169,61,0.08)]">
              <p className="font-black uppercase tracking-[0.18em] text-(--brand-900)">
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
            <textarea
              {...HYDRATION_SAFE_CONTROL_PROPS}
              id="address"
              name="address"
              className="field min-h-24"
            />
          </div>

          <div>
            <label className="label" htmlFor="note">
              {locale === "en" ? "Order notes" : "Catatan pesanan"}
            </label>
            <textarea
              {...HYDRATION_SAFE_CONTROL_PROPS}
              id="note"
              name="note"
              className="field min-h-24"
            />
          </div>

          <div>
            <label className="label" htmlFor="paymentProof">
              {locale === "en" ? "Upload payment proof" : "Upload bukti transfer"}
            </label>
            <input
              {...HYDRATION_SAFE_CONTROL_PROPS}
              id="paymentProof"
              name="paymentProof"
              type="file"
              accept="image/*,application/pdf"
              className="field file:mr-4 file:rounded-full file:border-0 file:bg-(--brand-900) file:px-4 file:py-2 file:font-semibold file:text-white"
              required
            />
          </div>

          {error ? (
            <div className="rounded-3xl bg-[#fff2ef] px-4 py-3 text-(--brand-900) text-sm font-semibold">
              {error}
            </div>
          ) : null}

          <button
            {...HYDRATION_SAFE_CONTROL_PROPS}
            type="submit"
            disabled={isPending}
            className="btn-primary px-6 py-4 text-center font-bold disabled:opacity-60"
          >
            {isPending
              ? locale === "en"
                ? "Sending your order..."
                : "Mengirim order..."
              : locale === "en"
                ? `Submit order - Rp ${total.toLocaleString("id-ID")}`
                : `Kirim order - Rp ${total.toLocaleString("id-ID")}`}
          </button>
        </div>
      </form>

      <aside className="grid content-start gap-4">
        <div className="surface-card rounded-4xl p-5 sm:p-6">
          <p className="pill bg-background text-(--brand-900)">
            {locale === "en" ? "Order summary" : "Ringkasan pesanan"}
          </p>
          <div className="mt-4 space-y-4">
            {selectedItems.length > 0 ? (
              selectedItems.map((item) => (
                <div
                  key={`${item.productId}-${item.variantType}`}
                  className="rounded-3xl border border-(--paper-300) bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-(--brand-900)">
                        {item.productName}
                      </p>
                      <p className="mt-1 text-(--ink-700) text-sm">
                        {item.variantLabel} {MIDDLE_DOT} {item.quantity} qty {MIDDLE_DOT} {item.pieceCount} pcs
                      </p>
                    </div>
                    <p className="text-(--brand-900) text-sm font-black">
                      Rp {(item.unitPrice * item.quantity).toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-(--paper-300) bg-white px-4 py-5 text-(--ink-700) text-sm leading-7">
                {locale === "en"
                  ? "Your summary will appear here as soon as you add frozen or fried packs!"
                  : "Ringkasan akan muncul di sini begitu kamu menambahkan pack frozen atau fried!"}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-[1.6rem] bg-[linear-gradient(135deg,#fff7ef,#fff0e7)] p-4">
            <div className="flex items-center justify-between text-(--ink-700) text-sm">
              <span>{locale === "en" ? "Total packs" : "Total qty pack"}</span>
              <span className="font-bold">
                {selectedItems.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-(--ink-700) text-sm">
              <span>{locale === "en" ? "Total pieces" : "Total pcs"}</span>
              <span className="font-bold">{totalPieces}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-(--ink-700) text-sm">
              <span>Subtotal</span>
              <span className="font-bold">Rp {subtotal.toLocaleString("id-ID")}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-(--ink-700) text-sm">
              <span>{locale === "en" ? "Delivery fee" : "Ongkir"}</span>
              <span className="font-bold">
                {fulfillment === "delivery"
                  ? locale === "en"
                    ? "Discussed later"
                    : "Dibahas menyusul"
                  : "Rp 0"}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-dashed border-[rgba(185,30,30,0.18)] pt-3 text-(--brand-900) text-base font-black">
              <span>Total</span>
              <span>Rp {total.toLocaleString("id-ID")}</span>
            </div>
          </div>
        </div>

        <div className="surface-card rounded-4xl p-5 sm:p-6">
          <p className="pill bg-background text-(--brand-900)">
            {locale === "en" ? "Transfer info" : "Info transfer"}
          </p>
          <div className="mt-4 rounded-[1.6rem] bg-white p-4">
            <p className="text-(--ink-700) text-sm">{bankName}</p>
            <p className="mt-1 text-(--brand-900) text-2xl font-black">
              {bankAccountNumber}
            </p>
            <p className="mt-1 text-(--ink-700) text-sm font-semibold">
              a.n. {bankAccountHolder}
            </p>
          </div>
          <p className="mt-4 text-(--ink-700) text-sm leading-7">
            {locale === "en"
              ? "Transfer -> upload proof -> save the receipt so it’s easy to track later!"
              : "Transfer -> upload bukti -> save receipt agar nanti mudah dilacak lagi!"}
          </p>
        </div>
      </aside>
    </div>
  );
}
