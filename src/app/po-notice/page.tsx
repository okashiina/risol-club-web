import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { PoWaitlistForm } from "@/components/po-waitlist-form";
import { getDisplayPrice } from "@/lib/catalog";
import { formatPoDateTime } from "@/lib/po";
import { formatCurrency } from "@/lib/reports";
import { getLocale } from "@/lib/i18n";
import { readPublicCatalogData } from "@/lib/store-projections";

export default async function PoNoticePage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const locale = await getLocale();
  const { product } = await searchParams;
  const { products, poState } = await readPublicCatalogData();

  if (poState.isOpen) {
    redirect(product ? `/checkout?product=${encodeURIComponent(product)}` : "/checkout");
  }

  return (
    <div className="safe-pt min-h-screen pb-12">
      <header className="page-shell pt-4">
        <div className="surface-card flex items-center justify-between rounded-full px-4 py-3">
          <BrandLogo />
          <LanguageToggle locale={locale} />
        </div>
      </header>

      <main className="page-shell mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden rounded-[2.9rem] border border-[rgba(173,53,49,0.08)] bg-[linear-gradient(145deg,#fffdf8_0%,#fff6ec_40%,#fff1e8_100%)] p-6 shadow-[0_30px_80px_rgba(124,58,48,0.11)] sm:p-8">
          <div className="absolute -right-14 -top-10 h-40 w-40 rounded-full bg-[rgba(235,152,57,0.15)] blur-3xl" />
          <div className="absolute -bottom-10 left-0 h-36 w-36 rounded-full bg-[rgba(173,53,49,0.12)] blur-3xl" />

          <div className="relative z-10">
            <p className="pill bg-white/90 text-[color:var(--brand-900)] shadow-[0_12px_30px_rgba(173,53,49,0.12)]">
              {locale === "en" ? "PO pause" : "PO lagi jeda"}
            </p>
            <p className="mt-4 font-note text-xl text-[color:var(--brand-900)]">
              {locale === "en"
                ? "dear diary... the next batch is warming up behind the scenes"
                : "dear diary... batch berikutnya lagi kita siapin pelan-pelan"}
            </p>
            <h1 className="mt-4 max-w-3xl font-heading text-4xl leading-[1.02] text-[color:var(--brand-900)] sm:text-6xl">
              {locale === "en"
                ? "Sorry, we're not taking pre-orders right now"
                : "Maaf, sekarang kita lagi belum buka PO dulu ya"}
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-8 text-[color:var(--ink-700)] sm:text-[0.98rem]">
              {locale === "en"
                ? "Take your time exploring the menu, save your favorites, and leave your details so we can email you when the next batch gets scheduled or finally opens"
                : "Sambil nunggu batch berikutnya, kamu bisa santai lihat-lihat menu dulu buat nandain mana yang pengin kamu ambil nanti, terus titip data kamu biar kita bisa email pas jadwalnya diumumin atau pas window-nya beneran kebuka"}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[2rem] bg-white/88 p-5 shadow-[0_18px_40px_rgba(173,53,49,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                  {locale === "en" ? "Next opening" : "Perkiraan buka berikutnya"}
                </p>
                <p className="mt-3 font-heading text-3xl leading-tight text-[color:var(--brand-900)]">
                  {poState.nextOpenAt
                    ? formatPoDateTime(poState.nextOpenAt, locale)
                    : locale === "en"
                      ? "We'll share it soon"
                      : "Nanti kita kabarin yaa"}
                </p>
                <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
                  {poState.nextCloseAt
                    ? locale === "en"
                      ? `The planned window runs until ${formatPoDateTime(poState.nextCloseAt, locale)}`
                      : `Window yang direncanakan bakal jalan sampai ${formatPoDateTime(poState.nextCloseAt, locale)}`
                    : locale === "en"
                      ? "The next PO window hasn't been locked in just yet"
                      : "Window berikutnya lagi kita rapihin dulu"}
                </p>
              </div>

              <div className="rounded-[2rem] bg-[linear-gradient(135deg,#fff8ef,#fff1e7)] p-5 shadow-[0_18px_40px_rgba(231,169,61,0.08)]">
                <div className="relative mx-auto h-32 w-32">
                  <Image
                    src="/brand/logo-red-transparent.png"
                    alt="Risol Club logo"
                    fill
                    sizes="128px"
                    className="object-contain drop-shadow-[0_18px_30px_rgba(173,53,49,0.15)]"
                  />
                </div>
                <p className="mt-3 text-center text-sm leading-7 text-[color:var(--ink-700)]">
                  {locale === "en"
                    ? "No worries, the cozy menu is still here for browsing"
                    : "Tenang, menu-menu favoritmu tetap bisa kamu intip dulu di sini"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/" className="btn-primary px-6 py-4 text-center font-bold">
                {locale === "en" ? "Browse the menu first" : "Lihat-lihat menu dulu"}
              </Link>
              <Link href="/track" className="btn-secondary px-6 py-4 text-center font-bold">
                {locale === "en" ? "Check an existing order" : "Cek order yang udah masuk"}
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6">
          <div className="surface-card rounded-[2.6rem] p-6 sm:p-8">
            <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
              {locale === "en" ? "Waitlist" : "Daftar kabar-kabar"}
            </p>
            <h2 className="mt-4 font-display text-3xl text-[color:var(--brand-900)]">
              {locale === "en"
                ? "Want a heads-up when we open again?"
                : "Mau dikabarin pas kita buka lagi?"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
              {locale === "en"
                ? "Drop your email, WhatsApp number, and name so next time we can say hi properly and nudge you right on time"
                : "Isi email, nomor WhatsApp, dan nama kamu yaa, nanti pas batch berikutnya siap kita nyapa kamu pakai nama juga"}
            </p>

            <div className="mt-6 rounded-[2rem] bg-white p-5">
              <PoWaitlistForm locale={locale} />
            </div>
          </div>

          <div className="surface-card rounded-[2.6rem] p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
                  {locale === "en" ? "Menu teaser" : "Intip menu dulu"}
                </p>
                <h2 className="mt-4 font-display text-3xl text-[color:var(--brand-900)]">
                  {locale === "en" ? "Still worth a little scroll" : "Sambil nunggu, boleh banget ngintip dulu"}
                </h2>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {products.slice(0, 3).map((productItem) => (
                <div
                  key={productItem.id}
                  className="rounded-[1.7rem] border border-[color:var(--paper-300)] bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                        {locale === "en" ? productItem.prepLabelEn : productItem.prepLabel}
                      </p>
                      <h3 className="mt-2 font-heading text-2xl text-[color:var(--brand-900)]">
                        {locale === "en" ? productItem.nameEn : productItem.name}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
                        {locale === "en"
                          ? productItem.shortDescriptionEn
                          : productItem.shortDescription}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-heading text-2xl text-[color:var(--brand-900)]">
                        {formatCurrency(getDisplayPrice(productItem))}
                      </p>
                      <Link
                        href={`/menu/${productItem.slug}`}
                        className="btn-secondary mt-3 px-4 py-3 text-sm font-bold"
                      >
                        {locale === "en" ? "See details" : "Lihat detail"}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
