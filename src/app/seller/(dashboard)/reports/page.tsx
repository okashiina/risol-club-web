import { readStore, statusLabel } from "@/lib/data-store";
import {
  formatCompactCurrency,
  formatCurrency,
  getReportDailySeries,
  getReportHighlights,
  getSalesBreakdown,
  getStatusBreakdown,
} from "@/lib/reports";

export default async function SellerReportsPage() {
  const store = await readStore();
  const metrics = getReportHighlights(store);
  const sales = getSalesBreakdown(store);
  const dailySeries = getReportDailySeries(store);
  const statusBreakdown = getStatusBreakdown(store);
  const maxDailyRevenue = Math.max(...dailySeries.map((item) => item.revenue), 1);
  const maxSalesRevenue = Math.max(...sales.map((item) => item.revenue), 1);
  const profitIsPositive = metrics.grossProfit >= 0;

  return (
    <div className="grid gap-6">
      <section className="surface-card rounded-[2rem] p-6">
        <h1 className="font-display text-4xl">Reports</h1>
        <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
          Revenue, HPP, gross profit, margin, dan tren order dalam satu layar dengan
          visual yang lebih gampang dibaca cepat.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
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
        <div
          className={`surface-card rounded-[2rem] p-5 ${
            profitIsPositive
              ? "border border-[#b9e2c7] bg-[linear-gradient(135deg,rgba(240,255,245,0.95),rgba(255,255,255,0.9))]"
              : "border border-[#f5c8c3] bg-[linear-gradient(135deg,rgba(255,241,239,0.95),rgba(255,255,255,0.9))]"
          }`}
        >
          <p className="text-sm text-[color:var(--ink-700)]">Gross profit</p>
          <p
            className={`mt-2 text-3xl font-black ${
              profitIsPositive ? "text-[#147a3f]" : "text-[color:var(--brand-900)]"
            }`}
          >
            {formatCompactCurrency(metrics.grossProfit)}
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-700)]">
            {profitIsPositive ? "Profit sehat" : "Perlu dicek lagi"}
          </p>
        </div>
        <div className="surface-card rounded-[2rem] p-5">
          <p className="text-sm text-[color:var(--ink-700)]">Average order value</p>
          <p className="mt-2 text-3xl font-black text-[color:var(--brand-900)]">
            {formatCompactCurrency(metrics.averageOrderValue)}
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-700)]">
            Margin {(metrics.profitMargin * 100).toFixed(1)}%
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="surface-card rounded-[2rem] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl">7-day revenue pulse</h2>
              <p className="mt-2 text-sm text-[color:var(--ink-700)]">
                Ketinggian bar mengikuti revenue harian, lalu profit hariannya ditulis di
                bawah supaya cepat terbaca.
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-white px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--ink-700)]">
                Hari ini
              </p>
              <p className="mt-1 text-lg font-black text-[color:var(--brand-900)]">
                {formatCurrency(metrics.todayRevenue)}
              </p>
            </div>
          </div>

          <div className="mt-6 grid h-[20rem] grid-cols-7 items-end gap-3">
            {dailySeries.map((item) => {
              const barHeight = `${Math.max((item.revenue / maxDailyRevenue) * 100, item.revenue ? 18 : 6)}%`;
              const profitPositive = item.profit >= 0;

              return (
                <div key={item.key} className="flex h-full flex-col justify-end">
                  <div className="rounded-[1.5rem] bg-white px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                    <div
                      className={`w-full rounded-[1.2rem] ${
                        profitPositive
                          ? "bg-[linear-gradient(180deg,#ffb8ad,#c42b23)]"
                          : "bg-[linear-gradient(180deg,#f6d3cf,#d4574d)]"
                      }`}
                      style={{ height: barHeight }}
                    />
                  </div>
                  <p className="mt-3 text-center text-xs font-black uppercase tracking-[0.12em] text-[color:var(--ink-700)]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-center text-xs font-semibold text-[color:var(--brand-900)]">
                    {formatCompactCurrency(item.revenue)}
                  </p>
                  <p
                    className={`mt-1 text-center text-[11px] font-semibold ${
                      profitPositive ? "text-[#147a3f]" : "text-[color:var(--brand-900)]"
                    }`}
                  >
                    Profit {formatCompactCurrency(item.profit)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="surface-card rounded-[2rem] p-6">
          <h2 className="font-display text-2xl">Order status mix</h2>
          <div className="mt-4 grid gap-3">
            {statusBreakdown.map((item) => {
              const width = `${
                Math.max(
                  (item.count / Math.max(...statusBreakdown.map((entry) => entry.count), 1)) *
                    100,
                  item.count ? 14 : 0,
                )
              }%`;

              return (
                <div key={item.status} className="rounded-[1.5rem] bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-[color:var(--brand-900)]">
                        {statusLabel(item.status as Parameters<typeof statusLabel>[0])}
                      </p>
                      <p className="text-xs text-[color:var(--ink-700)]">{item.label}</p>
                    </div>
                    <span className="text-xl font-black text-[color:var(--brand-900)]">
                      {item.count}
                    </span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-[color:var(--paper-100)]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#f7b5ad,#b91e1e)]"
                      style={{ width }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="surface-card rounded-[2rem] p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl">Sales by product</h2>
            <p className="mt-2 text-sm text-[color:var(--ink-700)]">
              Revenue, COGS, dan profit per menu dengan progress bar biar cepat kebaca
              menu mana yang paling sehat.
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-white px-4 py-3 text-sm text-[color:var(--ink-700)]">
            <span className="font-semibold">Total active orders:</span>{" "}
            <span className="font-black text-[color:var(--brand-900)]">
              {store.orders.filter((order) => order.status !== "cancelled").length}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {sales.map((item) => {
            const revenueWidth = `${(item.revenue / maxSalesRevenue) * 100}%`;
            const profitPositive = item.grossProfit >= 0;

            return (
              <div key={item.product.id} className="rounded-[1.75rem] bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-xl">
                    <p className="font-display text-2xl text-[color:var(--brand-900)]">
                      {item.product.name}
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                      Sold quantity: {item.quantity}
                    </p>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-[color:var(--paper-100)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#ffd7cf,#b91e1e)]"
                        style={{ width: revenueWidth }}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm lg:min-w-[16rem] lg:text-right">
                    <span>Revenue {formatCurrency(item.revenue)}</span>
                    <span>COGS {formatCurrency(item.cogs)}</span>
                    <span
                      className={`font-black ${
                        profitPositive ? "text-[#147a3f]" : "text-[color:var(--brand-900)]"
                      }`}
                    >
                      Profit {formatCurrency(item.grossProfit)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
