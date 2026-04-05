import "server-only";

import { makeId, nowIso, readStore, writeStore } from "@/lib/data-store";
import {
  type SellerDigestEmailPayload,
  sendSellerDigestEmail,
} from "@/lib/email";
import {
  formatCurrency,
  getBusinessDateKey,
  getInactivitySignals,
  getReportDigestData,
} from "@/lib/reports";
import { Notification, StoreData } from "@/lib/types";

const REPORTS_HREF = "/seller/reports?range=30&hideZero=1";

export type ScheduledDigestMode = "weekly" | "monthly" | "inactivity";

type ScheduledNotificationJob = {
  title: string;
  body: string;
  href: string;
  kind: string;
  dedupeKey: string;
  email: SellerDigestEmailPayload;
};

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatRangeLabel(days: number) {
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function buildTopPerformersLine(store: StoreData, days?: number, currentMonth?: boolean) {
  const data = getReportDigestData(store, { days, currentMonth });

  if (!data.topPerformers.length) {
    return "Belum ada menu yang terjual di periode ini.";
  }

  return `Top menu: ${data.topPerformers
    .map((item) => `${item.product.name} ${item.quantity} pack`)
    .join(", ")}.`;
}

function buildDigestSections(
  store: StoreData,
  options: { days?: number; currentMonth?: boolean },
) {
  const data = getReportDigestData(store, options);

  return {
    data,
    sections: [
      {
        title: "Performance",
        lines: [
          `Revenue ${formatCurrency(data.revenue)}`,
          `COGS ${formatCurrency(data.cogs)}`,
          `Gross profit ${formatCurrency(data.grossProfit)}`,
          `Margin ${formatPercent(data.profitMargin)}`,
          `Order count ${data.orderCount}`,
          `Average order value ${formatCurrency(data.averageOrderValue)}`,
        ],
      },
      {
        title: "Top menu",
        lines: data.topPerformers.length
          ? data.topPerformers.map(
              (item) =>
                `${item.product.name}: ${item.quantity} pack, revenue ${formatCurrency(item.revenue)}`,
            )
          : ["Belum ada penjualan menu di periode ini."],
      },
      {
        title: "Inventory attention",
        lines: [
          `Low stock bahan: ${data.lowStockIngredientCount}`,
          `Low stock produk jadi: ${data.lowStockProductCount}`,
          ...data.inventoryAttention,
        ],
      },
      {
        title: "Reminder",
        lines: data.inactivityWarnings.length
          ? data.inactivityWarnings
          : ["Tidak ada warning inaktivitas saat ini."],
      },
    ],
  };
}

function createWeeklyJob(store: StoreData): ScheduledNotificationJob {
  const todayKey = getBusinessDateKey(new Date());
  const periodLabel = formatRangeLabel(7);
  const { data, sections } = buildDigestSections(store, { days: 7 });

  return {
    title: `Laporan mingguan siap dibaca`,
    body: `${data.orderCount} order, revenue ${formatCurrency(data.revenue)}, gross profit ${formatCurrency(data.grossProfit)}. ${buildTopPerformersLine(store, 7)}`,
    href: REPORTS_HREF,
    kind: "digest_weekly",
    dedupeKey: `digest:weekly:${todayKey}`,
    email: {
      subject: `Laporan mingguan seller - ${periodLabel}`,
      title: `Ringkasan mingguan ${periodLabel}`,
      intro: `Performa 7 hari terakhir sudah dirangkum, lengkap dengan top menu, inventory attention, dan reminder operasional.`,
      preview: `Revenue ${formatCurrency(data.revenue)} dan gross profit ${formatCurrency(data.grossProfit)} untuk 7 hari terakhir.`,
      sections,
      ctaHref: REPORTS_HREF,
      ctaLabel: "Buka seller reports",
      dedupeKey: `weekly-${todayKey}`,
    },
  };
}

function createMonthlyJob(store: StoreData): ScheduledNotificationJob {
  const now = new Date();
  const monthKey = getBusinessDateKey(now).slice(0, 7);
  const monthLabel = formatMonthLabel(now);
  const { data, sections } = buildDigestSections(store, { currentMonth: true });

  return {
    title: `Laporan bulanan ${monthLabel}`,
    body: `${data.orderCount} order month-to-date, revenue ${formatCurrency(data.revenue)}, gross profit ${formatCurrency(data.grossProfit)}. ${buildTopPerformersLine(store, undefined, true)}`,
    href: REPORTS_HREF,
    kind: "digest_monthly",
    dedupeKey: `digest:monthly:${monthKey}`,
    email: {
      subject: `Laporan bulanan seller - ${monthLabel}`,
      title: `Ringkasan bulanan ${monthLabel}`,
      intro: `Performa bulan berjalan sudah siap dipantau dari revenue sampai warning inventory dan inaktivitas.`,
      preview: `Revenue ${formatCurrency(data.revenue)} dan gross profit ${formatCurrency(data.grossProfit)} untuk ${monthLabel}.`,
      sections,
      ctaHref: REPORTS_HREF,
      ctaLabel: "Buka seller reports",
      dedupeKey: `monthly-${monthKey}`,
    },
  };
}

function createInactivityJobs(store: StoreData) {
  const inactivity = getInactivitySignals(store);
  const jobs: ScheduledNotificationJob[] = [];

  if (inactivity.noOrderDays !== null && inactivity.noOrderDays >= 7) {
    const lastOrderKey = inactivity.lastOrderDate
      ? getBusinessDateKey(inactivity.lastOrderDate)
      : "never";

    jobs.push({
      title: `Reminder: order sepi ${inactivity.noOrderDays} hari`,
      body: `Sudah ${inactivity.noOrderDays} hari tidak ada order non-cancelled. Cek follow-up pelanggan, promo, atau pembukaan PO berikutnya.`,
      href: REPORTS_HREF,
      kind: "digest_inactivity_no_order",
      dedupeKey: `digest:inactivity:no-order:${lastOrderKey}`,
      email: {
        subject: `Reminder seller - tidak ada order ${inactivity.noOrderDays} hari`,
        title: `Order belum masuk selama ${inactivity.noOrderDays} hari`,
        intro: `Sudah cukup lama tidak ada order non-cancelled yang masuk. Ini saat yang pas buat cek funnel order dan rencana PO berikutnya.`,
        preview: `Tidak ada order non-cancelled selama ${inactivity.noOrderDays} hari.`,
        sections: [
          {
            title: "Status",
            lines: [
              `Hari tanpa order: ${inactivity.noOrderDays}`,
              `Order terakhir: ${inactivity.lastOrderDate ?? "belum ada data"}`,
            ],
          },
          {
            title: "Aksi yang disarankan",
            lines: [
              "Cek pesan pelanggan yang belum ditindaklanjuti.",
              "Siapkan jadwal PO atau promo mingguan berikutnya.",
              "Tinjau laporan seller untuk lihat pola penjualan terakhir.",
            ],
          },
        ],
        ctaHref: REPORTS_HREF,
        ctaLabel: "Buka seller reports",
        dedupeKey: `inactivity-no-order-${lastOrderKey}`,
      },
    });
  }

  if (inactivity.poClosedDays !== null && inactivity.poClosedDays >= 14) {
    const poClosedKey = inactivity.poClosedSince
      ? getBusinessDateKey(inactivity.poClosedSince)
      : "unknown";

    jobs.push({
      title: `Reminder: PO belum dibuka ${inactivity.poClosedDays} hari`,
      body: `Semua menu aktif sudah nonaktif sekitar ${inactivity.poClosedDays} hari. Kalau mau buka PO lagi, nyalakan menu yang siap dijual.`,
      href: REPORTS_HREF,
      kind: "digest_inactivity_po_closed",
      dedupeKey: `digest:inactivity:po-closed:${poClosedKey}`,
      email: {
        subject: `Reminder seller - semua menu nonaktif ${inactivity.poClosedDays} hari`,
        title: `PO terlihat tutup selama ${inactivity.poClosedDays} hari`,
        intro: `Semua menu yang bisa dijual sedang nonaktif. Kalau ini tidak disengaja, sekarang saat yang bagus untuk re-open PO.`,
        preview: `Semua menu aktif sudah nonaktif selama ${inactivity.poClosedDays} hari.`,
        sections: [
          {
            title: "Status",
            lines: [
              `Hari PO tertutup: ${inactivity.poClosedDays}`,
              `Terakhir semua menu jadi nonaktif: ${inactivity.poClosedSince ?? "belum ada data"}`,
            ],
          },
          {
            title: "Aksi yang disarankan",
            lines: [
              "Aktifkan kembali menu yang siap dijual.",
              "Cek stok dan costing sebelum buka batch berikutnya.",
              "Pantau overview dan reports untuk lihat momentum penjualan terakhir.",
            ],
          },
        ],
        ctaHref: "/seller/menu",
        ctaLabel: "Buka seller menu",
        dedupeKey: `inactivity-po-closed-${poClosedKey}`,
      },
    });
  }

  return jobs;
}

function buildJobsForMode(store: StoreData, mode: ScheduledDigestMode) {
  if (mode === "weekly") {
    return [createWeeklyJob(store)];
  }

  if (mode === "monthly") {
    return [createMonthlyJob(store)];
  }

  return createInactivityJobs(store);
}

function createNotificationFromJob(job: ScheduledNotificationJob): Notification {
  return {
    id: makeId("notif"),
    title: job.title,
    body: job.body,
    href: job.href,
    read: false,
    kind: job.kind,
    dedupeKey: job.dedupeKey,
    createdAt: nowIso(),
  };
}

export async function runScheduledDigest(mode: ScheduledDigestMode) {
  const store = await readStore();
  const jobs = buildJobsForMode(store, mode);
  const createdJobs: ScheduledNotificationJob[] = [];

  await writeStore((current) => {
    const existingKeys = new Set(
      current.notifications
        .map((notification) => notification.dedupeKey)
        .filter((value): value is string => Boolean(value)),
    );

    for (const job of jobs) {
      if (existingKeys.has(job.dedupeKey)) {
        continue;
      }

      current.notifications.unshift(createNotificationFromJob(job));
      createdJobs.push(job);
      existingKeys.add(job.dedupeKey);
    }

    return current;
  });

  let emailsSent = 0;
  let emailsSkipped = 0;

  for (const job of createdJobs) {
    try {
      const result = await sendSellerDigestEmail(job.email);

      if (result.sent) {
        emailsSent += 1;
      } else {
        emailsSkipped += 1;
      }
    } catch (error) {
      emailsSkipped += 1;
      console.error("Failed to send scheduled digest email", {
        mode,
        dedupeKey: job.dedupeKey,
        error,
      });
    }
  }

  return {
    mode,
    discovered: jobs.length,
    created: createdJobs.length,
    skipped: jobs.length - createdJobs.length,
    emailsSent,
    emailsSkipped,
    createdKeys: createdJobs.map((job) => job.dedupeKey),
  };
}
