import { CheckoutForm } from "@/components/checkout-form";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { getDictionary, getLocale } from "@/lib/i18n";
import { readPublicCatalogData } from "@/lib/store-projections";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const locale = await getLocale();
  const text = getDictionary(locale);
  const { settings, products } = await readPublicCatalogData();
  const { product } = await searchParams;

  return (
    <div className="page-shell safe-pt min-h-screen py-6">
      <div className="flex items-center justify-between rounded-full bg-white/80 px-4 py-3 backdrop-blur">
        <BrandLogo />
        <LanguageToggle locale={locale} />
      </div>

      <div className="mb-6 mt-6">
        <p className="pill bg-white/80 text-(--brand-900)">
          {text.checkoutTitle}
        </p>
        <h1 className="mt-4 font-display text-4xl text-(--brand-900)">
          {locale === "en"
            ? "You're almost done! Complete your payment so we can process your risol right away"
            : "Tinggal selangkah lagi! Selesaikan pembayaranmu biar risolnya bisa langsung kami proses"}
        </h1>
      </div>

      <CheckoutForm
        locale={locale}
        products={products}
        bankName={settings.bankName}
        bankAccountNumber={settings.bankAccountNumber}
        bankAccountHolder={settings.bankAccountHolder}
        sellerWhatsappDisplay={settings.sellerWhatsappDisplay}
        initialProductSlug={product}
      />
    </div>
  );
}
