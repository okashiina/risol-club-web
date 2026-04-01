import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ProductGallery } from "@/components/product-gallery";
import { getDisplayPrice, getVariant } from "@/lib/catalog";
import { getLocale } from "@/lib/i18n";
import { formatCurrency } from "@/lib/reports";
import { readProductBySlugData } from "@/lib/store-projections";

export default async function MenuDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const product = await readProductBySlugData(slug);

  if (!product) {
    notFound();
  }

  const frozen = getVariant(product, "frozen");
  const fried = getVariant(product, "fried");

  return (
    <div className="page-shell safe-pt min-h-screen py-6">
      <div className="flex items-center justify-between rounded-full bg-white/80 px-4 py-3 backdrop-blur">
        <BrandLogo />
        <LanguageToggle locale={locale} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <section
          className={`rounded-[2.5rem] bg-gradient-to-br ${product.accent} p-5 shadow-[0_30px_70px_rgba(185,30,30,0.12)] sm:p-7`}
        >
          <ProductGallery
            images={product.images}
            name={locale === "en" ? product.nameEn : product.name}
            priority
            aspectClassName="aspect-[1.04/1]"
          />
        </section>

        <aside className="surface-card rounded-[2.5rem] p-6 sm:p-8">
          <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
            {locale === "en" ? product.prepLabelEn : product.prepLabel}
          </p>
          <h1 className="mt-4 font-display text-4xl leading-tight">
            {locale === "en" ? product.nameEn : product.name}
          </h1>
          <p className="mt-4 text-sm leading-7 text-[color:var(--ink-700)]">
            {locale === "en" ? product.descriptionEn : product.description}
          </p>

          <div className="mt-6 grid gap-3">
            <div className="rounded-[1.6rem] bg-[linear-gradient(135deg,#fff7ef,#fff0e7)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                    Frozen
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
                    {locale === "en"
                      ? "Best for stocking in the freezer and frying later."
                      : "Paling enak buat stok di freezer lalu digoreng nanti."}
                  </p>
                </div>
                <p className="font-display text-3xl text-[color:var(--brand-900)]">
                  {formatCurrency(frozen?.price ?? getDisplayPrice(product))}
                </p>
              </div>
            </div>
            <div className="rounded-[1.6rem] bg-[linear-gradient(135deg,#fff3ee,#fff0f7)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                    Fried
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
                    {locale === "en"
                      ? "Freshly fried and ready to enjoy right away."
                      : "Digoreng hangat dan siap langsung dinikmati."}
                  </p>
                </div>
                <p className="font-display text-3xl text-[color:var(--brand-900)]">
                  {formatCurrency(fried?.price ?? getDisplayPrice(product))}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[1.6rem] border border-[rgba(185,30,30,0.12)] bg-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
              {locale === "en" ? "Serving rule" : "Aturan porsi"}
            </p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
              {locale === "en"
                ? "1 qty always means 1 pack with 3 pieces. Order 3 qty and you get 9 pieces."
                : "1 qty selalu berarti 1 pack isi 3 pcs. Kalau pesan 3 qty, kamu akan dapat 9 pcs."}
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            <Link
              href={`/checkout?product=${product.slug}`}
              className="btn-primary px-5 py-4 text-center font-bold"
            >
              {locale === "en" ? "Order this menu" : "Pesan menu ini"}
            </Link>
            <Link href="/" className="btn-secondary px-5 py-4 text-center font-bold">
              {locale === "en" ? "Back to home" : "Kembali ke beranda"}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
