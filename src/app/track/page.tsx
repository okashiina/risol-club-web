import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { orderMatchesCustomerName } from "@/lib/data-store";
import { getLocale } from "@/lib/i18n";
import { readOrderByCodeData } from "@/lib/store-projections";

export default async function OrderLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; name?: string }>;
}) {
  const locale = await getLocale();
  const { code = "", name = "" } = await searchParams;
  const trimmedCode = code.trim();
  const trimmedName = name.trim();

  let error = "";

  if (trimmedCode || trimmedName) {
    if (!trimmedCode || !trimmedName) {
      error =
        locale === "en"
          ? "Please fill in both order code and customer name."
          : "Isi kode order dan nama pemesan dua-duanya ya.";
    } else {
      const order = await readOrderByCodeData(trimmedCode);

      if (!order) {
        error =
          locale === "en"
            ? "We could not find that order code yet."
            : "Kode order itu belum ketemu di sistem.";
      } else if (!orderMatchesCustomerName(order, trimmedName)) {
        error =
          locale === "en"
            ? "The customer name does not match that order."
            : "Nama pemesannya belum cocok dengan kode order itu.";
      } else {
        redirect(`/order/${order.code}?name=${encodeURIComponent(order.customerName)}`);
      }
    }
  }

  return (
    <div className="page-shell safe-pt min-h-screen py-6">
      <div className="flex items-center justify-between rounded-full bg-white/80 px-4 py-3 backdrop-blur">
        <BrandLogo />
        <LanguageToggle locale={locale} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-start">
        <section className="surface-card rounded-[2.5rem] p-6 sm:p-8">
          <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
            {locale === "en" ? "Tracking center" : "Pusat tracking"}
          </p>
          <h1 className="mt-4 font-display text-4xl">
            {locale === "en"
              ? "Need your receipt again? Just use your order code."
              : "Mau buka receipt lagi? Tinggal pakai kode order kamu."}
          </h1>
          <p className="mt-4 text-base leading-8 text-[color:var(--ink-700)]">
            {locale === "en"
              ? "Enter the order code plus the customer name used during checkout. This helps keep tracking a little safer even though the order codes are sequential."
              : "Masukkan kode order plus nama pemesan yang dipakai saat checkout. Ini bantu bikin tracking lebih aman walaupun format kode order-nya berurutan."}
          </p>

          <form action="/track" className="mt-6 grid gap-4">
            <div>
              <label className="label" htmlFor="code">
                {locale === "en" ? "Order code" : "Kode order"}
              </label>
              <input
                id="code"
                name="code"
                className="field"
                defaultValue={trimmedCode}
                placeholder="RC-0104-001"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="name">
                {locale === "en" ? "Customer name" : "Nama pemesan"}
              </label>
              <input
                id="name"
                name="name"
                className="field"
                defaultValue={trimmedName}
                placeholder={
                  locale === "en" ? "The same name used when ordering" : "Nama yang dipakai saat pesan"
                }
                required
              />
            </div>

            {error ? (
              <p className="rounded-[1.4rem] bg-[#fff2ef] px-4 py-3 text-sm font-semibold text-[color:var(--brand-900)]">
                {error}
              </p>
            ) : null}

            <button type="submit" className="btn-primary px-5 py-4 font-bold">
              {locale === "en" ? "Find my receipt" : "Cari receipt saya"}
            </button>
          </form>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link href="/checkout" className="btn-secondary px-5 py-4 text-center font-bold">
              {locale === "en" ? "Create order" : "Buat order"}
            </Link>
            <Link href="/" className="btn-secondary px-5 py-4 text-center font-bold">
              {locale === "en" ? "Back home" : "Kembali ke beranda"}
            </Link>
          </div>
        </section>

        <aside className="surface-card rounded-[2.5rem] p-6 sm:p-8">
          <div className="rounded-[2rem] bg-[linear-gradient(135deg,#fffaf3,#fff3e8)] p-5 shadow-[0_18px_40px_rgba(231,169,61,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
              {locale === "en" ? "Quick reminder" : "Pengingat kecil"}
            </p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
              {locale === "en"
                ? "After placing an order, please save the receipt page or at least copy the order code. It will make progress checks much easier later."
                : "Setelah order berhasil dibuat, simpan halaman receipt atau minimal catat kode order-nya ya. Nanti ini bikin cek progres jadi jauh lebih gampang."}
            </p>
          </div>

          <div className="mt-5 rounded-[2rem] bg-white p-5">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
              {locale === "en" ? "What you need" : "Data yang dibutuhkan"}
            </p>
            <ul className="mt-4 grid gap-3 text-sm leading-7 text-[color:var(--ink-700)]">
              <li className="rounded-[1.3rem] bg-[color:var(--paper-100)] px-4 py-3">
                1. {locale === "en" ? "Order code from the receipt page" : "Kode order dari halaman receipt"}
              </li>
              <li className="rounded-[1.3rem] bg-[color:var(--paper-100)] px-4 py-3">
                2. {locale === "en" ? "The customer name used during checkout" : "Nama pemesan yang dipakai saat checkout"}
              </li>
              <li className="rounded-[1.3rem] bg-[color:var(--paper-100)] px-4 py-3">
                3. {locale === "en" ? "That is enough to reopen the receipt and track status" : "Itu cukup untuk buka receipt dan pantau status lagi"}
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
