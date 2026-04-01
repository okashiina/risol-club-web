import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { getDashboardMetrics, formatCompactCurrency, formatDateTime } from "@/lib/reports";
import { readStore, statusLabel } from "@/lib/data-store";
import { markNotificationsReadAction, sellerLogoutAction } from "@/app/seller/actions";

export default async function SellerOverviewPage() {
  const store = await readStore();
  const metrics = getDashboardMetrics(store);
  const recentOrders = store.orders.slice(0, 5);

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
            <form action={markNotificationsReadAction}>
              <ActionButton className="w-full rounded-full bg-[color:var(--brand-900)] px-4 py-3 font-bold text-white">
                Mark notifications as read
              </ActionButton>
            </form>
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
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Notifications</h2>
            <span className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
              {metrics.unreadNotifications} unread
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {store.notifications.length ? (
              store.notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-[1.5rem] border p-4 ${
                    notification.read
                      ? "border-[color:var(--paper-300)] bg-white"
                      : "border-[#f3cfca] bg-[#fff5f3]"
                  }`}
                >
                  <p className="font-bold text-[color:var(--brand-900)]">
                    {notification.title}
                  </p>
                  <p className="mt-2 text-sm text-[color:var(--ink-700)]">
                    {notification.body}
                  </p>
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
