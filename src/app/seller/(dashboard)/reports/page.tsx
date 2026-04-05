import Link from "next/link";
import { statusLabel } from "@/lib/data-store";
import { RevenuePulseChart } from "@/components/revenue-pulse-chart";
import {
  ReportRangeDays,
  formatCompactCurrency,
  formatCurrency,
} from "@/lib/reports";
import { readSellerReportsData } from "@/lib/store-projections";

const RANGE_OPTIONS = [
  { label: "7 hari", value: 7 },
  { label: "30 hari", value: 30 },
  { label: "90 hari", value: 90 },
] as const satisfies Array<{ label: string; value: ReportRangeDays }>;

type SellerReportsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function parseRange(value: string | string[] | undefined): ReportRangeDays {
  const raw = Array.isArray(value) ? value[0] : value;

  if (raw === "30" || raw === "90") {
    return Number(raw) as ReportRangeDays;
  }

  return 7;
}

function parseHideZero(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw !== "0";
}

function makeHref(range: ReportRangeDays, hideZero: boolean) {
  const searchParams = new URLSearchParams();
  searchParams.set("range", String(range));
  searchParams.set("hideZero", hideZero ? "1" : "0");

  return `/seller/reports?${searchParams.toString()}`;
}

export default async function SellerReportsPage({
  searchParams,
}: SellerReportsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const range = parseRange(resolvedSearchParams?.range);
  const hideZero = parseHideZero(resolvedSearchParams?.hideZero);
  const { metrics, sales, dailySeries, statusBreakdown, activeOrderCount } =
    await readSellerReportsData({ range, hideZero });
  const maxStatusCount = Math.max(...statusBreakdown.map((item) => item.count), 1);
  const maxSalesRevenue = Math.max(...sales.map((item) => item.revenue), 1);
  const profitIsPositive = metrics.grossProfit >= 0;
  const visibleSales = sales.filter((item) => item.quantity > 0 || item.revenue > 0);
  const salesRows = visibleSales.length ? visibleSales : sales;

  return (
    <div className="grid gap-6">
      <section className="surface-card rounded-[2rem] p-6">
        <h1 className="font-display text-4xl">Reports</h1>
        <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
          Revenue, COGS, gross profit, margin, dan pulse harian sekarang bisa dibaca
          dengan window yang lebih fleksibel saat PO lagi padat ataupun lagi sepi.
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
              ? "border border-[#b9e2c7] bg-[linear-gradient(135deg,rgba(240,255,245,0.98),rgba(255,255,255,0.9))]"
              : "border border-[#f5c8c3] bg-[linear-gradient(135deg,rgba(255,241,239,0.98),rgba(255,255,255,0.9))]"
          }`}
        >
          <p className="text-sm text-[color:var(--ink-700)]">Gross profit</p>
          <p
            className={`mt-2 text-3xl font-black ${
              profitIsPositive ? "text-[#147a3f]" : "text-[#b91c1c]"
            }`}
          >
            {formatCompactCurrency(metrics.grossProfit)}
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-700)]">
            {profitIsPositive ? "Profit positif" : "Profit tertekan"}
          </p>
        </div>
        <div className="surface-card rounded-[2rem] p-5">
          <p className="text-sm text-[color:var(--ink-700)]">Margin</p>
          <p className="mt-2 text-3xl font-black text-[color:var(--brand-900)]">
            {(metrics.profitMargin * 100).toFixed(1)}%
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-700)]">
            AOV {formatCompactCurrency(metrics.averageOrderValue)}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="surface-card rounded-[2rem] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl">{range}-day revenue pulse</h2>
              <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
                Revenue dan profit tampil berdampingan per hari. Kalau PO lagi pause,
                hari kosong bisa disembunyikan supaya chart tetap enak dipakai.
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

          <div className="mt-5 flex flex-col gap-3 rounded-[1.7rem] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((option) => {
                const active = option.value === range;

                return (
                  <Link
                    key={option.value}
                    href={makeHref(option.value, hideZero)}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      active
                        ? "bg-[color:var(--brand-900)] text-white"
                        : "bg-[color:var(--paper-100)] text-[color:var(--brand-900)]"
                    }`}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-[color:var(--ink-700)]">
                {dailySeries.length} hari aktif tampil
              </span>
              <Link
                href={makeHref(range, !hideZero)}
                className={`rounded-full border px-4 py-2 font-bold transition ${
                  hideZero
                    ? "border-[color:var(--brand-900)] bg-[#fff1ee] text-[color:var(--brand-900)]"
                    : "border-[color:var(--paper-300)] bg-white text-[color:var(--ink-700)]"
                }`}
              >
                {hideZero ? "Sembunyikan hari tanpa order: ON" : "Sembunyikan hari tanpa order: OFF"}
              </Link>
            </div>
          </div>

          <div className="mt-6">
            <RevenuePulseChart series={dailySeries} />
          </div>
        </div>

        <div className="surface-card rounded-[2rem] p-6">
          <h2 className="font-display text-2xl">Business mix</h2>
          <div className="mt-4 grid gap-4">
            <div className="rounded-[1.7rem] bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--brand-900)]">
                Revenue vs profit
              </p>
              <div className="mt-3 grid gap-2 text-sm text-[color:var(--ink-700)]">
                <div className="flex items-center justify-between">
                  <span>Total revenue</span>
                  <span className="font-black text-[color:var(--brand-900)]">
                    {formatCurrency(metrics.revenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total COGS</span>
                  <span className="font-black text-[color:var(--brand-900)]">
                    {formatCurrency(metrics.cogs)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Gross profit</span>
                  <span className={`font-black ${profitIsPositive ? "text-[#147a3f]" : "text-[#b91c1c]"}`}>
                    {formatCurrency(metrics.grossProfit)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[1.7rem] bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--brand-900)]">
                Status mix
              </p>
              <div className="mt-4 grid gap-3">
                {statusBreakdown.map((item) => (
                  <div key={item.status}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-[color:var(--ink-700)]">
                        {statusLabel(item.status as Parameters<typeof statusLabel>[0])}
                      </span>
                      <span className="font-black text-[color:var(--brand-900)]">
                        {item.count}
                      </span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-[color:var(--paper-100)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#f7b5ad,#b91e1e)]"
                        style={{ width: `${Math.max((item.count / maxStatusCount) * 100, item.count ? 12 : 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="surface-card rounded-[2rem] p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl">Revenue and profit by menu</h2>
            <p className="mt-2 text-sm text-[color:var(--ink-700)]">
              Menu mana yang paling kuat sekarang bisa terbaca dari revenue, COGS, dan
              profit tanpa perlu bongkar angka satu-satu.
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-white px-4 py-3 text-sm text-[color:var(--ink-700)]">
            <span className="font-semibold">Total active orders:</span>{" "}
            <span className="font-black text-[color:var(--brand-900)]">
              {activeOrderCount}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {salesRows.map((item) => {
            const revenueWidth = `${Math.max((item.revenue / maxSalesRevenue) * 100, item.revenue ? 14 : 0)}%`;
            const profitPositive = item.grossProfit >= 0;

            return (
              <div key={item.product.id} className="rounded-[1.75rem] bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-xl">
                    <p className="font-display text-2xl text-[color:var(--brand-900)]">
                      {item.product.name}
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                      Sold quantity: {item.quantity} pack
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
                        profitPositive ? "text-[#147a3f]" : "text-[#b91c1c]"
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
