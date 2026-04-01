import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { isSellerAuthenticated } from "@/lib/auth";
import { sellerLoginAction } from "@/app/seller/actions";

export default async function SellerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isSellerAuthenticated()) {
    redirect("/seller");
  }

  const { error } = await searchParams;

  return (
    <div className="page-shell flex min-h-screen items-center py-8">
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="surface-card rounded-[2.5rem] p-6 sm:p-8">
          <BrandLogo variant="seller" />
          <p className="pill mt-6 bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
            Seller dashboard
          </p>
          <h1 className="mt-4 font-display text-4xl">
            Kelola order, stok, supplier, dan profit dalam satu tempat.
          </h1>
          <p className="mt-4 text-base leading-8 text-[color:var(--ink-700)]">
            Dashboard ini khusus owner. Default credential development bisa diganti lewat
            environment variable `SELLER_EMAIL` dan `SELLER_PASSWORD`.
          </p>
          <div className="mt-6 rounded-[2rem] bg-[color:var(--paper-100)] p-5 text-sm text-[color:var(--ink-700)]">
            <p className="font-semibold text-[color:var(--brand-900)]">Default dev login</p>
            <p className="mt-2">Email: owner@risolclub.local</p>
            <p>Password: risolclub123</p>
          </div>
        </section>

        <section className="surface-card rounded-[2.5rem] p-6 sm:p-8">
          <h2 className="font-display text-3xl">Masuk</h2>
          <p className="mt-2 text-sm text-[color:var(--ink-700)]">
            Pakai akun owner untuk buka dashboard seller.
          </p>

          <form action={sellerLoginAction} className="mt-6 grid gap-4">
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input id="email" name="email" type="email" className="field" required />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="field"
                required
              />
            </div>
            {error === "invalid" ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                Email atau password belum cocok.
              </p>
            ) : null}
            <button
              type="submit"
              className="btn-primary mt-2 px-5 py-4 font-bold"
            >
              Masuk ke dashboard
            </button>
          </form>

          <Link
            href="/"
            className="btn-secondary mt-4 inline-flex px-4 py-3 text-sm font-bold"
          >
            Kembali ke storefront
          </Link>
        </section>
      </div>
    </div>
  );
}
