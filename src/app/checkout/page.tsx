import { CheckoutForm } from "@/components/checkout-form";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { getDictionary, getLocale } from "@/lib/i18n";
import { readStore } from "@/lib/data-store";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const locale = await getLocale();
  const text = getDictionary(locale);
  const store = await readStore();
  const { product } = await searchParams;

  return (
    <div className="page-shell safe-pt min-h-screen py-6">
      <div className="flex items-center justify-between rounded-full bg-white/80 px-4 py-3 backdrop-blur">
        <BrandLogo />
        <LanguageToggle locale={locale} />
      </div>

      <div className="mb-6 mt-6">
        <p className="pill bg-white/80 text-[color:var(--brand-900)]">
          {text.checkoutTitle}
        </p>
        <h1 className="mt-4 font-display text-4xl">
          {locale === "en"
            ? "A gentle checkout flow that still feels clean on a phone."
            : "Checkout yang ringan, rapi, dan tetap nyaman dibuka dari HP."}
        </h1>
      </div>

      <CheckoutForm
        locale={locale}
        products={store.products.filter((item) => item.isActive)}
        bankName={store.settings.bankName}
        bankAccountNumber={store.settings.bankAccountNumber}
        bankAccountHolder={store.settings.bankAccountHolder}
        sellerWhatsappDisplay={store.settings.sellerWhatsappDisplay}
        initialProductSlug={product}
      />
    </div>
  );
}
