import { readStore } from "@/lib/data-store";
import {
  formatCompactCurrency,
  formatCurrency,
  getDashboardMetrics,
  getSalesBreakdown,
} from "@/lib/reports";

export default async function SellerReportsPage() {
  const store = await readStore();
  const metrics = getDashboardMetrics(store);
  const sales = getSalesBreakdown(store);

  return (
    <div className="grid gap-6">
      <section className="surface-card rounded-[2rem] p-6">
        <h1 className="font-display text-4xl">Reports</h1>
        <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
          Revenue, COGS, gross profit, dan kontribusi tiap menu dilihat dari snapshot biaya
          pada saat order tercatat.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="surface-card rounded-[2rem] p-5">
          <p className="text-sm text-[color:var(--ink-700)]">Revenue</p>
          <p className="mt-2 text-3xl font-black text-[color:var(--brand-900)]">
            {formatCompactCurrency(metrics.revenue)}
          </p>
        </div>
        <div className="surface-card rounded-[2rem] p-5">
          <p className="text-sm text-[color:var(--ink-700)]">COGS</p>
          <p className="mt-2 text-3xl font-black text-[color:var(--brand-900)]">
            {formatCompactCurrency(metrics.cogs)}
          </p>
        </div>
        <div className="surface-card rounded-[2rem] p-5">
          <p className="text-sm text-[color:var(--ink-700)]">Gross profit</p>
          <p className="mt-2 text-3xl font-black text-[color:var(--brand-900)]">
            {formatCompactCurrency(metrics.grossProfit)}
          </p>
        </div>
      </section>

      <section className="surface-card rounded-[2rem] p-6">
        <h2 className="font-display text-2xl">Sales by product</h2>
        <div className="mt-4 grid gap-3">
          {sales.map((item) => (
            <div key={item.product.id} className="rounded-[1.5rem] bg-white p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="font-bold text-[color:var(--brand-900)]">{item.product.name}</p>
                  <p className="text-sm text-[color:var(--ink-700)]">
                    Sold quantity: {item.quantity}
                  </p>
                </div>
                <div className="grid gap-2 text-sm sm:text-right">
                  <span>Revenue {formatCurrency(item.revenue)}</span>
                  <span>COGS {formatCurrency(item.cogs)}</span>
                  <span className="font-black text-[color:var(--brand-900)]">
                    Gross profit {formatCurrency(item.grossProfit)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
