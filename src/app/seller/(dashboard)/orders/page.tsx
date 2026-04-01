import { ActionButton } from "@/components/action-button";
import { readStore, statusLabel } from "@/lib/data-store";
import { formatCurrency, formatDateTime } from "@/lib/reports";
import { updateOrderStatusAction } from "@/app/seller/actions";

const statusOptions = [
  "pending_payment",
  "payment_review",
  "confirmed",
  "in_production",
  "ready_for_pickup",
  "out_for_delivery",
  "completed",
  "cancelled",
] as const;

export default async function SellerOrdersPage() {
  const store = await readStore();

  return (
    <div className="grid gap-6">
      <section className="surface-card rounded-[2rem] p-6">
        <h1 className="font-display text-4xl">Order queue</h1>
        <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
          Verifikasi pembayaran, update status pesanan, dan langsung chat customer lewat
          tombol WhatsApp helper.
        </p>
      </section>

      <section className="grid gap-4">
        {store.orders.map((order) => (
          <article key={order.id} className="surface-card rounded-[2rem] p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl">{order.code}</h2>
                  <span className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
                    {statusLabel(order.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[color:var(--ink-700)]">
                  {order.customerName} • {order.customerWhatsapp}
                </p>
                <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                  {formatDateTime(order.preorderDate)} •{" "}
                  {order.fulfillmentMethod === "delivery" ? "Delivery" : "Pickup"}
                </p>
                {order.address ? (
                  <p className="mt-1 text-sm text-[color:var(--ink-700)]">{order.address}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  href={`https://wa.me/${order.customerWhatsapp}?text=${encodeURIComponent(`Halo ${order.customerName}, update untuk order ${order.code}: status saat ini ${statusLabel(order.status)}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-white px-4 py-3 text-center text-sm font-bold text-[color:var(--brand-900)]"
                >
                  WhatsApp helper
                </a>
                {order.paymentProof ? (
                  <a
                    href={order.paymentProof.dataUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-[color:var(--paper-300)] px-4 py-3 text-center text-sm font-bold text-[color:var(--brand-900)]"
                  >
                    View proof
                  </a>
                ) : null}
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[1.5rem] bg-white p-4">
                <h3 className="text-sm font-bold text-[color:var(--brand-900)]">Items</h3>
                <div className="mt-3 space-y-3">
                  {order.items.map((item) => (
                    <div
                      key={`${order.id}-${item.productId}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-semibold text-[color:var(--ink-700)]">
                        {item.productName} x{item.quantity}
                      </span>
                      <span className="font-bold">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-dashed border-[color:var(--paper-300)] pt-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Total</span>
                    <span className="font-black text-[color:var(--brand-900)]">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                </div>
              </div>

              <form action={updateOrderStatusAction} className="rounded-[1.5rem] bg-white p-4">
                <input type="hidden" name="orderId" value={order.id} />
                <label className="label" htmlFor={`status-${order.id}`}>
                  Update status
                </label>
                <select
                  id={`status-${order.id}`}
                  name="status"
                  defaultValue={order.status}
                  className="field"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
                <ActionButton className="mt-4 w-full rounded-full bg-[color:var(--brand-900)] px-4 py-3 font-bold text-white">
                  Save status
                </ActionButton>
              </form>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
