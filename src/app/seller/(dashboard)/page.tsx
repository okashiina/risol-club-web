import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { formatCompactCurrency, formatDateTime } from "@/lib/reports";
import { statusLabel } from "@/lib/data-store";
import {
  clearNotificationsAction,
  deleteNotificationAction,
  markNotificationsReadAction,
  sellerLogoutAction,
} from "@/app/seller/actions";
import { readSellerOverviewData } from "@/lib/store-projections";

function formatNotificationKind(kind?: string) {
  return (kind || "update").replaceAll("_", " ");
}

export default async function SellerOverviewPage() {
  const { metrics, notifications, recentOrders } = await readSellerOverviewData();

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="surface-card rounded-[2rem] p-6">
          <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
            Overview
          </p>
          <h1 className="mt-4 font-display text-4xl">Seller command center</h1>
          <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
            Pantau order baru, pergerakan stok, dan gross profit tanpa keluar dari satu
            dashboard.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.5rem] bg-white p-4">
              <p className="text-sm text-[color:var(--ink-700)]">Revenue</p>
              <p className="mt-2 text-2xl font-black text-[color:var(--brand-900)]">
                {formatCompactCurrency(metrics.revenue)}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-white p-4">
              <p className="text-sm text-[color:var(--ink-700)]">Gross profit</p>
              <p className="mt-2 text-2xl font-black text-[color:var(--brand-900)]">
                {formatCompactCurrency(metrics.grossProfit)}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-white p-4">
              <p className="text-sm text-[color:var(--ink-700)]">Today</p>
              <p className="mt-2 text-2xl font-black text-[color:var(--brand-900)]">
                {formatCompactCurrency(metrics.todayRevenue)}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-white p-4">
              <p className="text-sm text-[color:var(--ink-700)]">Pending orders</p>
              <p className="mt-2 text-2xl font-black text-[color:var(--brand-900)]">
                {metrics.pendingOrders}
              </p>
            </div>
          </div>
        </div>

        <div className="surface-card rounded-[2rem] p-6">
          <h2 className="font-display text-2xl">Owner actions</h2>
          <div className="mt-5 grid gap-3">
            <form action={sellerLogoutAction}>
              <ActionButton className="w-full rounded-full border border-[color:var(--paper-300)] px-4 py-3 font-bold text-[color:var(--brand-900)]">
                Logout
              </ActionButton>
            </form>
            <Link
              href="/seller/orders"
              className="rounded-full bg-white px-4 py-3 text-center font-bold text-[color:var(--brand-900)]"
            >
              Open order queue
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card rounded-[2rem] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-2xl">Notifications</h2>
              <p className="mt-2 text-sm text-[color:var(--ink-700)]">
                Ringkas order baru, reminder operasional, dan nanti digest performa mingguan
                bakal numpuk di sini.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
                {metrics.unreadNotifications} unread
              </span>
              <form action={markNotificationsReadAction}>
                <ActionButton className="rounded-full bg-[color:var(--brand-900)] px-4 py-2 text-sm font-bold text-white">
                  Mark all read
                </ActionButton>
              </form>
              <form action={clearNotificationsAction}>
                <input type="hidden" name="confirmation" value="DELETE" />
                <ActionButton className="rounded-full border border-[color:var(--paper-300)] bg-white px-4 py-2 text-sm font-bold text-[color:var(--brand-900)]">
                  Clear all
                </ActionButton>
              </form>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {notifications.length ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-[1.5rem] border p-4 ${
                    notification.read
                      ? "border-[color:var(--paper-300)] bg-white"
                      : "border-[#f3cfca] bg-[#fff5f3]"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-[color:var(--brand-900)]">
                          {notification.title}
                        </p>
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--ink-700)]">
                          {formatNotificationKind(notification.kind)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[color:var(--ink-700)]">
                        {notification.body}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--ink-700)]">
                        <span>{formatDateTime(notification.createdAt)}</span>
                        {notification.href ? (
                          <Link
                            href={notification.href}
                            className="text-[color:var(--brand-900)] underline underline-offset-4"
                          >
                            Open
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    <form action={deleteNotificationAction}>
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <ActionButton className="rounded-full border border-[color:var(--paper-300)] bg-white px-4 py-2 text-sm font-bold text-[color:var(--brand-900)]">
                        Delete
                      </ActionButton>
                    </form>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[color:var(--ink-700)]">
                Belum ada notifikasi baru.
              </p>
            )}
          </div>
        </div>

        <div className="surface-card rounded-[2rem] p-6">
          <h2 className="font-display text-2xl">Recent orders</h2>
          <div className="mt-4 grid gap-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="rounded-[1.5rem] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-[color:var(--brand-900)]">{order.code}</p>
                    <p className="text-sm text-[color:var(--ink-700)]">
                      {order.customerName}
                    </p>
                  </div>
                  <span className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
                    {statusLabel(order.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-[color:var(--ink-700)]">
                  {formatDateTime(order.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
