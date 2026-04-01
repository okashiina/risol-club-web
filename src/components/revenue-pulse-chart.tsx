"use client";

import { useMemo, useState } from "react";

type RevenuePulsePoint = {
  key: string;
  label: string;
  revenue: number;
  cogs: number;
  profit: number;
};

type RevenuePulseChartProps = {
  series: RevenuePulsePoint[];
};

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function RevenuePulseChart({ series }: RevenuePulseChartProps) {
  const defaultIndex = Math.max(
    series.findLastIndex((item) => item.revenue > 0 || item.profit !== 0),
    0,
  );
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const maxSeriesValue = useMemo(
    () => Math.max(...series.flatMap((item) => [item.revenue, Math.abs(item.profit)]), 1),
    [series],
  );

  return (
    <div className="rounded-[1.8rem] bg-white p-5">
      <div className="mb-5 flex flex-wrap gap-4 text-xs font-bold uppercase tracking-[0.16em]">
        <span className="inline-flex items-center gap-2 text-[color:var(--ink-700)]">
          <span className="h-3 w-3 rounded-full bg-[#c72f27]" />
          Revenue
        </span>
        <span className="inline-flex items-center gap-2 text-[color:var(--ink-700)]">
          <span className="h-3 w-3 rounded-full bg-[#2d9556]" />
          Profit
        </span>
      </div>

      <div className="grid h-[19rem] grid-cols-7 items-end gap-3">
        {series.map((item, index) => {
          const revenueHeight = `${Math.max((item.revenue / maxSeriesValue) * 100, item.revenue ? 10 : 4)}%`;
          const profitHeight = `${Math.max((Math.abs(item.profit) / maxSeriesValue) * 100, item.profit ? 10 : 4)}%`;
          const profitPositive = item.profit >= 0;
          const isActive = activeIndex === index;

          return (
            <div key={item.key} className="grid h-full grid-rows-[1fr_auto] gap-3">
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                className={`group relative flex items-end justify-center gap-2 rounded-[1.4rem] px-2 pb-3 pt-4 text-left transition duration-300 ${
                  isActive
                    ? "bg-[linear-gradient(180deg,rgba(255,244,241,0.98),rgba(255,255,255,0.98))] shadow-[0_18px_38px_rgba(185,30,30,0.12)]"
                    : "bg-[color:var(--paper-100)] hover:bg-[linear-gradient(180deg,rgba(255,244,241,0.9),rgba(255,255,255,0.92))]"
                }`}
                aria-label={`${item.label}: revenue ${formatCurrency(item.revenue)}, profit ${formatCurrency(item.profit)}`}
              >
                {isActive ? (
                  <div className="pointer-events-none absolute -top-24 left-1/2 z-10 w-[10.75rem] -translate-x-1/2 rounded-[1.25rem] border border-[rgba(185,30,30,0.12)] bg-[rgba(255,255,255,0.98)] p-3 shadow-[0_18px_40px_rgba(80,24,24,0.12)] backdrop-blur">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[color:var(--ink-700)]">
                      {item.label}
                    </p>
                    <div className="mt-2 grid gap-1.5 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-[color:var(--ink-700)]">Revenue</span>
                        <span className="font-black text-[#c72f27]">
                          {formatCurrency(item.revenue)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-[color:var(--ink-700)]">Profit</span>
                        <span className={`font-black ${profitPositive ? "text-[#2d9556]" : "text-[#b91c1c]"}`}>
                          {formatCurrency(item.profit)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-[color:var(--ink-700)]">COGS</span>
                        <span className="font-black text-[color:var(--brand-900)]">
                          {formatCurrency(item.cogs)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="flex h-full w-1/2 items-end">
                  <div
                    className={`w-full rounded-t-[1rem] transition-all duration-300 ${
                      isActive
                        ? "bg-[linear-gradient(180deg,#ffb09e,#c72f27)] shadow-[0_10px_20px_rgba(199,47,39,0.22)]"
                        : "bg-[linear-gradient(180deg,#ffcabf,#c72f27)]"
                    }`}
                    style={{ height: revenueHeight }}
                  />
                </div>
                <div className="flex h-full w-1/2 items-end">
                  <div
                    className={`w-full rounded-t-[1rem] transition-all duration-300 ${
                      profitPositive
                        ? isActive
                          ? "bg-[linear-gradient(180deg,#a7efc1,#2d9556)] shadow-[0_10px_20px_rgba(45,149,86,0.18)]"
                          : "bg-[linear-gradient(180deg,#c7f0d5,#2d9556)]"
                        : isActive
                          ? "bg-[linear-gradient(180deg,#ffc9c2,#c14d42)] shadow-[0_10px_20px_rgba(193,77,66,0.16)]"
                          : "bg-[linear-gradient(180deg,#ffd8d2,#c14d42)]"
                    }`}
                    style={{ height: profitHeight }}
                  />
                </div>
              </button>

              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[color:var(--ink-700)]">
                  {item.label}
                </p>
                <p className="mt-1 text-xs font-bold text-[color:var(--brand-900)]">
                  {formatCompactCurrency(item.revenue)}
                </p>
                <p
                  className={`mt-1 text-[11px] font-semibold ${
                    profitPositive ? "text-[#147a3f]" : "text-[#b91c1c]"
                  }`}
                >
                  {formatCompactCurrency(item.profit)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
