import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { getProductBySlug, readStore } from "@/lib/data-store";
import { getLocale } from "@/lib/i18n";
import { formatCurrency } from "@/lib/reports";

export default async function MenuDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const store = await readStore();
  const product = getProductBySlug(store, slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="page-shell safe-pt min-h-screen py-6">
      <div className="flex items-center justify-between rounded-full bg-white/80 px-4 py-3 backdrop-blur">
        <BrandLogo />
        <LanguageToggle locale={locale} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <section
          className={`rounded-[2.5rem] bg-gradient-to-br ${product.accent} p-6 shadow-[0_30px_70px_rgba(185,30,30,0.12)] sm:p-8`}
        >
          <p className="pill bg-white/70 text-[color:var(--brand-900)]">
            {locale === "en" ? product.prepLabelEn : product.prepLabel}
          </p>
          <h1 className="mt-5 font-display text-5xl leading-tight">
            {locale === "en" ? product.nameEn : product.name}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[color:var(--ink-700)]">
            {locale === "en" ? product.descriptionEn : product.description}
          </p>
        </section>

        <aside className="surface-card rounded-[2.5rem] p-6 sm:p-8">
          <p className="text-sm font-semibold text-[color:var(--ink-700)]">
            {locale === "en" ? "Starting price" : "Harga mulai"}
          </p>
          <p className="mt-2 font-display text-4xl text-[color:var(--brand-900)]">
            {formatCurrency(product.price)}
          </p>
          <p className="mt-4 text-sm leading-7 text-[color:var(--ink-700)]">
            {locale === "en"
              ? product.shortDescriptionEn
              : product.shortDescription}
          </p>
          <div className="mt-6 grid gap-3">
            <Link
              href={`/checkout?product=${product.slug}`}
              className="btn-primary px-5 py-4 text-center font-bold"
            >
              {locale === "en" ? "Order this menu" : "Pesan menu ini"}
            </Link>
            <Link
              href="/"
              className="btn-secondary px-5 py-4 text-center font-bold"
            >
              {locale === "en" ? "Back to home" : "Kembali ke beranda"}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
