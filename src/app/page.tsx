import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { getLocale } from "@/lib/i18n";
import { formatCurrency } from "@/lib/reports";
import { readStore } from "@/lib/data-store";

export default async function Home() {
  const locale = await getLocale();
  const store = await readStore();
  const products = store.products.filter((product) => product.isActive);

  return (
    <div className="safe-pt min-h-screen">
      <header className="page-shell sticky top-0 z-30 pt-4">
        <div className="surface-card flex items-center justify-between rounded-full px-4 py-3">
          <BrandLogo />
          <div className="hidden items-center gap-2 md:flex">
            <Link href="/" className="rounded-full px-4 py-2 text-sm font-semibold">
              {locale === "en" ? "Home" : "Beranda"}
            </Link>
            <Link href="/checkout" className="rounded-full px-4 py-2 text-sm font-semibold">
              {locale === "en" ? "Order" : "Pesan"}
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
          <div className="hero-surface grain-overlay overflow-hidden rounded-[2.75rem] p-6 sm:p-8">
            <div className="mb-6 inline-flex rounded-[1.9rem] border border-white/80 bg-white/75 p-2 shadow-[0_16px_40px_rgba(185,30,30,0.1)] backdrop-blur">
              <BrandLogo />
            </div>
            <p className="pill bg-white/90 text-[color:var(--brand-900)]">
              {locale === "en" ? "Handmade pre-order risol" : "Risol pre-order handmade"}
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight sm:text-6xl">
              {locale === "en"
                ? "Soft wrappers, generous fillings, and a tiny brand world that feels giftable."
                : "Kulit lembut, isian royal, dan dunia kecil Risol Club yang terasa manis buat dihadiahkan."}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[color:var(--ink-700)] sm:text-lg">
              {locale === "en"
                ? "Browse the menu, choose pickup or delivery, upload your payment proof, and continue delivery discussion by WhatsApp if needed."
                : "Lihat menu, pilih pickup atau delivery, upload bukti transfer, lalu lanjut bahas ongkir via WhatsApp kalau memang perlu delivery."}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/checkout"
                className="btn-primary px-6 py-4 text-center font-bold"
              >
                {locale === "en" ? "Start your order" : "Mulai pesan"}
              </Link>
              <a href="#menu" className="btn-secondary px-6 py-4 text-center font-bold">
                {locale === "en" ? "See the menu" : "Lihat menu"}
              </a>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] bg-white/80 px-4 py-4">
                <p className="text-sm font-black text-[color:var(--brand-900)]">2 menu</p>
                <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                  {locale === "en" ? "Curated and easy to choose." : "Kurasi singkat, gampang dipilih."}
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-white/80 px-4 py-4">
                <p className="text-sm font-black text-[color:var(--brand-900)]">1 day lead</p>
                <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                  {locale === "en" ? "Best for planned pre-orders." : "Cocok untuk pre-order terencana."}
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-white/80 px-4 py-4">
                <p className="text-sm font-black text-[color:var(--brand-900)]">Manual transfer</p>
                <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                  {locale === "en" ? "Simple checkout, no account needed." : "Checkout simpel tanpa akun."}
                </p>
              </div>
            </div>
          </div>

          <div className="mesh-card relative overflow-hidden rounded-[2.75rem] border border-[#f2c6c2] p-6 shadow-[0_30px_70px_rgba(185,30,30,0.12)]">
            <div className="absolute -right-12 -top-10 h-36 w-36 rounded-full bg-[#ffd7cf]" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-[#ffe8bf]" />
            <div className="relative grid gap-4">
              <div id="story" className="rounded-[2rem] bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--brand-900)]">
                  {locale === "en" ? "From the kitchen" : "Dari dapur kecil kami"}
                </p>
                <p className="text-sm font-semibold text-[color:var(--ink-700)]">
                  {locale === "en" ? store.settings.storyEn : store.settings.story}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className={`rounded-[2rem] bg-gradient-to-br ${product.accent} p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]`}
                  >
                    <p className="text-sm font-semibold text-[color:var(--brand-900)]">
                      {locale === "en" ? product.prepLabelEn : product.prepLabel}
                    </p>
                    <h2 className="mt-3 font-display text-2xl">
                      {locale === "en" ? product.nameEn : product.name}
                    </h2>
                    <p className="mt-2 text-sm text-[color:var(--ink-700)]">
                      {locale === "en"
                        ? product.shortDescriptionEn
                        : product.shortDescription}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-bold text-[color:var(--brand-900)]">
                        {formatCurrency(product.price)}
                      </span>
                      <Link
                        href={`/menu/${product.slug}`}
                        className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[color:var(--brand-900)]"
                      >
                        {locale === "en" ? "See details" : "Lihat detail"}
                      </Link>
                    </div>
                  </div>
                ))}
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
                  ? "Choose your menu and preferred pre-order time."
                  : "Pilih menu dan tentukan waktu pre-order yang kamu mau.",
                locale === "en"
                  ? "Transfer manually, then upload your payment proof."
                  : "Transfer manual, lalu upload bukti transfer kamu.",
                locale === "en"
                  ? "We verify the payment and confirm pickup or delivery by WhatsApp."
                  : "Kami verifikasi pembayaran lalu konfirmasi pickup atau delivery via WhatsApp.",
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
              {locale === "en" ? "Made for little joyful moments" : "Cocok buat momen kecil yang manis"}
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.75rem] bg-[#fff3ee] px-5 py-5">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                  {locale === "en" ? "Pick-up" : "Pickup"}
                </p>
                <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
                  {locale === "en"
                    ? "Best if you want the fastest handoff and zero delivery fee."
                    : "Paling cocok kalau mau pengambilan cepat dan tanpa ongkir."}
                </p>
              </div>
              <div className="rounded-[1.75rem] bg-[#fff8ea] px-5 py-5">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                  Delivery
                </p>
                <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
                  {locale === "en"
                    ? "Delivery fee is discussed manually first, so the final cost can match the distance."
                    : "Ongkir dibahas manual dulu, jadi biaya akhirnya bisa menyesuaikan jarak."}
                </p>
              </div>
              <div className="rounded-[1.75rem] bg-[#fff6f6] px-5 py-5 sm:col-span-2">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                  {locale === "en" ? "Payment" : "Pembayaran"}
                </p>
                <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
                  {locale === "en"
                    ? "Manual transfer with payment proof upload, so the order feels lightweight and fast."
                    : "Transfer manual dengan upload bukti bayar, supaya proses order tetap ringan dan cepat."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="menu" className="mt-10">
          <div className="mb-5 flex items-center justify-between">
            <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
              {locale === "en" ? "Current menu" : "Menu hari ini"}
            </p>
            <Link
              href="/checkout"
              className="btn-secondary px-4 py-2 text-sm font-bold"
            >
              {locale === "en" ? "Order now" : "Pesan sekarang"}
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {products.map((product) => (
              <article key={product.id} className="surface-card rounded-[2rem] p-5 sm:p-6">
                <p className="text-sm font-semibold text-[color:var(--brand-900)]">
                  {locale === "en" ? product.prepLabelEn : product.prepLabel}
                </p>
                <h3 className="mt-3 font-display text-3xl">
                  {locale === "en" ? product.nameEn : product.name}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
                  {locale === "en" ? product.descriptionEn : product.description}
                </p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-lg font-black text-[color:var(--brand-900)]">
                    {formatCurrency(product.price)}
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={`/menu/${product.slug}`}
                      className="btn-secondary px-4 py-2 text-sm font-bold"
                    >
                      Detail
                    </Link>
                    <Link
                      href={`/checkout?product=${product.slug}`}
                      className="btn-primary px-4 py-2 text-sm font-bold"
                    >
                      {locale === "en" ? "Add" : "Tambah"}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="surface-card mt-10 rounded-[2.5rem] p-6 sm:p-8">
          <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr] md:items-center">
            <div>
              <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
                {locale === "en" ? "Pre-order notes" : "Catatan pre-order"}
              </p>
              <h2 className="mt-4 font-display text-3xl">
                {locale === "en"
                  ? "Freshly arranged for small gatherings, office cravings, or surprise gifts."
                  : "Diracik segar untuk kumpul kecil, bekal kantor, atau hadiah iseng yang manis."}
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.75rem] bg-[#fff4ef] px-4 py-4 text-sm leading-7 text-[color:var(--ink-700)]">
                {locale === "en"
                  ? "Pre-order at least one day ahead for the smoothest handoff."
                  : "Idealnya pre-order minimal satu hari sebelumnya biar semuanya rapi."}
              </div>
              <div className="rounded-[1.75rem] bg-[#fff8ea] px-4 py-4 text-sm leading-7 text-[color:var(--ink-700)]">
                {locale === "en"
                  ? "For delivery, we confirm the fee manually first so it stays fair for each area."
                  : "Untuk delivery, ongkir dikonfirmasi manual dulu supaya tetap fair sesuai area."}
              </div>
              <div className="rounded-[1.75rem] bg-[#fff3f5] px-4 py-4 text-sm leading-7 text-[color:var(--ink-700)]">
                {locale === "en"
                  ? "After payment review, order updates continue through the order tracker page."
                  : "Setelah pembayaran dicek, update order bisa dipantau lewat halaman tracking."}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
