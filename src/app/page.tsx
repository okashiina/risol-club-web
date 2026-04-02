import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ProductGallery } from "@/components/product-gallery";
import { getDisplayPrice, getVariant } from "@/lib/catalog";
import { getLocale } from "@/lib/i18n";
import { formatCurrency } from "@/lib/reports";
import { readPublicCatalogData } from "@/lib/store-projections";

const TASTY_EMOJI = "\u{1F60B}";
const SMILING_HANDS_EMOJI = "\u{1F60A}\u{1F64C}";

export default async function Home() {
  const locale = await getLocale();
  const { settings, products } = await readPublicCatalogData();

  return (
    <div className="safe-pt min-h-screen">
      <header className="page-shell sticky top-0 z-30 pt-4">
        <div className="surface-card flex items-center justify-between rounded-full px-4 py-3">
          <BrandLogo />
          <div className="hidden items-center gap-2 md:flex">
            <Link href="/" className="rounded-full px-4 py-2 text-sm font-semibold">
              {locale === "en" ? "Home" : "Beranda"}
            </Link>
            <Link href="/checkout" className="btn-primary px-4 py-2 text-sm font-semibold">
              {locale === "en" ? "Order now" : "Pesan sekarang"}
            </Link>
          </div>
          <LanguageToggle locale={locale} />
        </div>
      </header>

      <main className="page-shell pb-16 pt-6">
        <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="hero-surface grain-overlay overflow-hidden rounded-[2.9rem] p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <p className="pill bg-white/92 px-5 py-3 tracking-normal text-[color:var(--brand-900)] shadow-[0_12px_30px_rgba(173,53,49,0.12)]">
                Pre-order
              </p>
              <p className="font-note text-base text-[color:var(--hero-kicker)] sm:text-lg">
                {locale === "en" ? "Tangsel comfort snacks!" : "Comfort snack andalan Tangsel!"}
              </p>
            </div>
            <h1 className="mt-5 max-w-3xl font-heading text-4xl leading-[1.02] text-[color:var(--hero-copy)] sm:text-6xl">
              {locale === "en" ? (
                <>
                  South Tangerang&apos;s comfort-snack favorite. Take frozen packs home for later,
                  or ask for them freshly fried so they&apos;re ready to bite into{" "}
                  <span className="emoji-ios">{TASTY_EMOJI}</span>
                </>
              ) : (
                <>
                  Comfort snack andalan Tangsel! Bawa pulang frozen buat stok, atau minta
                  digorengin sekalian biar tinggal hap{" "}
                  <span className="emoji-ios">{TASTY_EMOJI}</span>
                </>
              )}
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[color:var(--ink-700)] sm:text-[0.98rem]">
              {locale === "en"
                ? "Pick your flavor, choose the serving style, upload payment proof, and keep the receipt so you can track the order again anytime."
                : "Pilih rasa, tentukan mau frozen atau fried, upload bukti transfer, lalu simpan receipt supaya progres order gampang dicek lagi kapan pun."}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/checkout" className="btn-primary px-6 py-4 text-center font-bold">
                {locale === "en" ? "Start your order" : "Mulai pesan"}
              </Link>
              <a href="#menu" className="btn-secondary px-6 py-4 text-center font-bold">
                {locale === "en" ? "See the menu" : "Lihat menu"}
              </a>
            </div>
          </div>

          <div className="mesh-card relative overflow-hidden rounded-[2.9rem] border border-[#f2c6c2] p-6 shadow-[0_30px_70px_rgba(185,30,30,0.12)]">
            <div className="absolute -right-12 -top-10 h-36 w-36 rounded-full bg-[#ffd7cf]" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-[#ffe8bf]" />
            <div className="relative grid gap-4">
              <div id="story" className="rounded-[2rem] bg-white p-5">
                <div className="relative mx-auto mb-4 h-28 w-28 sm:h-36 sm:w-36">
                  <Image
                    src="/brand/logo-red-transparent.png"
                    alt="Risol Club decorative logo"
                    fill
                    sizes="144px"
                    className="object-contain drop-shadow-[0_22px_36px_rgba(185,30,30,0.15)]"
                    priority
                  />
                </div>
                <p className="text-center font-note text-lg text-[color:var(--brand-800)]">
                  {locale === "en" ? "From our tiny kitchen" : "Dari dapur kecil kami"}
                </p>
                <p className="mt-3 text-center text-sm leading-7 text-[color:var(--ink-700)] sm:text-[0.98rem]">
                  {locale === "en" ? settings.storyEn : settings.story}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {products.map((product) => {
                  const frozen = getVariant(product, "frozen");
                  const fried = getVariant(product, "fried");

                  return (
                    <div
                      key={product.id}
                      className={`rounded-[2rem] bg-gradient-to-br ${product.accent} p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]`}
                    >
                      <p className="text-sm font-semibold text-[color:var(--brand-900)]">
                        {locale === "en" ? product.prepLabelEn : product.prepLabel}
                      </p>
                      <h2 className="mt-3 font-heading text-2xl text-[color:var(--brand-900)]">
                        {locale === "en" ? product.nameEn : product.name}
                      </h2>
                      <p className="mt-2 text-sm text-[color:var(--ink-700)]">
                        {locale === "en"
                          ? product.shortDescriptionEn
                          : product.shortDescription}
                      </p>
                      <div className="mt-4 grid gap-2 rounded-[1.35rem] bg-white/80 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[color:var(--ink-700)]">Frozen</span>
                          <span className="font-black text-[color:var(--brand-900)]">
                            {formatCurrency(frozen?.price ?? getDisplayPrice(product))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[color:var(--ink-700)]">Fried</span>
                          <span className="font-black text-[color:var(--brand-900)]">
                            {formatCurrency(fried?.price ?? getDisplayPrice(product))}
                          </span>
                        </div>
                        <p className="text-xs text-[color:var(--ink-700)]">
                          1 qty = 3 pcs
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="font-bold text-[color:var(--brand-900)]">
                          {locale === "en" ? "Starts from" : "Mulai dari"}{" "}
                          {formatCurrency(getDisplayPrice(product))}
                        </span>
                        <Link
                          href={`/menu/${product.slug}`}
                          className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[color:var(--brand-900)]"
                        >
                          {locale === "en" ? "See details" : "Lihat detail"}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="surface-card rounded-[2.5rem] p-6 sm:p-8">
            <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
              {locale === "en" ? "How ordering works" : "Cara pesan"}
            </p>
            <ol className="mt-5 grid gap-4 text-sm text-[color:var(--ink-700)] sm:text-base">
              {[
                locale === "en"
                  ? "Choose the menu and decide whether you want frozen packs or freshly fried packs."
                  : "Pilih menu dan tentukan mau frozen pack atau freshly fried pack.",
                locale === "en"
                  ? "Set the quantity in packs. Every 1 qty always equals 3 pieces."
                  : "Atur jumlah dalam pack. Setiap 1 qty selalu setara 3 pcs.",
                locale === "en"
                  ? "Transfer manually, upload the payment proof, then keep your receipt for tracking."
                  : "Transfer manual, upload bukti bayar, lalu simpan receipt untuk tracking.",
              ].map((step, index) => (
                <li
                  key={step}
                  className="rounded-[1.5rem] bg-white px-5 py-4 font-semibold"
                >
                  {index + 1}. {step}
                </li>
              ))}
            </ol>
          </div>
          <div className="surface-card rounded-[2.5rem] p-6 sm:p-8">
            <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
              {locale === "en" ? "Made for cozy moments" : "Dibuat untuk momen hangat"}
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.75rem] bg-[#fff3ee] px-5 py-5">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                  Frozen
                </p>
                <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
                  {locale === "en"
                    ? "Perfect if you want to stock comfort snacks and fry them whenever the craving hits."
                    : "Cocok buat stok comfort snack di rumah lalu digoreng kapan pun mood ngemil datang."}
                </p>
              </div>
              <div className="rounded-[1.75rem] bg-[#fff8ea] px-5 py-5">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                  Fried
                </p>
                <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
                  {locale === "en"
                    ? "Best if you want the ready-to-eat version right away for sharing or gifting."
                    : "Paling enak kalau kamu mau versi siap makan untuk dibagi, dibawa, atau dihadiahkan."}
                </p>
              </div>
              <div className="rounded-[1.75rem] bg-[#fff6f6] px-5 py-5 sm:col-span-2">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                  {locale === "en" ? "Tummy filled with joy" : "Tummy filled with joy"}
                </p>
                <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
                  {locale === "en"
                    ? `Every page is tuned to feel ringan, manis, dan gampang diikuti: pick your favorite pack, send the transfer, keep the receipt, lalu balik lagi kapan pun buat cek progresnya ${SMILING_HANDS_EMOJI}`
                    : `Setiap bagiannya dibuat supaya terasa ringan, manis, dan gampang diikuti: pilih pack favoritmu, kirim transfer, simpan receipt, lalu balik lagi kapan pun buat cek progresnya ${SMILING_HANDS_EMOJI}`}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="menu" className="mt-10 grid gap-6">
          <div className="flex items-center justify-between">
            <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
              {locale === "en" ? "Current menu" : "Menu aktif"}
            </p>
            <Link href="/checkout" className="btn-secondary px-4 py-2 text-sm font-bold">
              {locale === "en" ? "Order now" : "Pesan sekarang"}
            </Link>
          </div>

          <div className="grid gap-5">
            {products.map((product, index) => {
              const frozen = getVariant(product, "frozen");
              const fried = getVariant(product, "fried");

              return (
                <article
                  key={product.id}
                  className="surface-card overflow-hidden rounded-[2.4rem] p-4 sm:p-5"
                >
                  <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
                    <ProductGallery
                      images={product.images}
                      name={locale === "en" ? product.nameEn : product.name}
                      priority={index === 0}
                      showThumbnails={false}
                    />

                    <div className="grid gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                          {locale === "en" ? product.prepLabelEn : product.prepLabel}
                        </p>
                        <h3 className="mt-2 font-heading text-4xl text-[color:var(--brand-900)]">
                          {locale === "en" ? product.nameEn : product.name}
                        </h3>
                        <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
                          {locale === "en" ? product.descriptionEn : product.description}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.6rem] bg-[linear-gradient(135deg,#fff7ef,#fff0e7)] p-4">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                            Frozen
                          </p>
                          <p className="mt-2 font-heading text-3xl text-[color:var(--brand-900)]">
                            {formatCurrency(frozen?.price ?? getDisplayPrice(product))}
                          </p>
                          <p className="mt-2 text-sm text-[color:var(--ink-700)]">
                            {locale === "en"
                              ? "Calm, freezer-friendly, and easy to save."
                              : "Tenang, freezer-friendly, dan gampang disimpan."}
                          </p>
                        </div>
                        <div className="rounded-[1.6rem] bg-[linear-gradient(135deg,#fff3ee,#fff0f7)] p-4">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                            Fried
                          </p>
                          <p className="mt-2 font-heading text-3xl text-[color:var(--brand-900)]">
                            {formatCurrency(fried?.price ?? getDisplayPrice(product))}
                          </p>
                          <p className="mt-2 text-sm text-[color:var(--ink-700)]">
                            {locale === "en"
                              ? "Warm, fragrant, and ready for direct snacking."
                              : "Hangat, wangi, dan siap langsung dinikmati."}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-[color:var(--paper-100)] px-4 py-2 text-sm font-bold text-[color:var(--brand-900)]">
                          1 qty = 3 pcs
                        </span>
                        <Link
                          href={`/menu/${product.slug}`}
                          className="btn-secondary px-4 py-3 text-sm font-bold"
                        >
                          {locale === "en" ? "View gallery" : "Lihat gallery"}
                        </Link>
                        <Link
                          href={`/checkout?product=${product.slug}`}
                          className="btn-primary px-4 py-3 text-sm font-bold"
                        >
                          {locale === "en" ? "Order this menu" : "Pesan menu ini"}
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="surface-card rounded-[2.5rem] p-6 sm:p-8">
            <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
              {locale === "en" ? "Find your receipt again" : "Cari receipt lagi"}
            </p>
            <h2 className="mt-4 font-heading text-3xl text-[color:var(--brand-900)]">
              {locale === "en"
                ? "Already ordered? Reopen the receipt whenever you need it."
                : "Sudah pernah order? Receipt bisa dibuka lagi kapan pun kamu perlu."}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[color:var(--ink-700)]">
              {locale === "en"
                ? "Use the order code plus the customer name you entered during checkout. This keeps progress tracking a little safer."
                : "Pakai kode order plus nama pemesan yang kamu isi saat checkout. Ini bantu bikin tracking progres tetap sedikit lebih aman."}
            </p>
          </div>

          <form action="/track" className="surface-card rounded-[2.5rem] p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="track-code">
                  {locale === "en" ? "Order code" : "Kode order"}
                </label>
                <input
                  id="track-code"
                  name="code"
                  className="field"
                  placeholder="RC-0104-001"
                  suppressHydrationWarning
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="track-name">
                  {locale === "en" ? "Customer name" : "Nama pemesan"}
                </label>
                <input
                  id="track-name"
                  name="name"
                  className="field"
                  suppressHydrationWarning
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              suppressHydrationWarning
              className="btn-primary mt-5 px-5 py-4 font-bold"
            >
              {locale === "en" ? "Open my receipt" : "Buka receipt saya"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
