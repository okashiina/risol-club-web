import { ActionButton } from "@/components/action-button";
import { updateOrderStatusAction } from "@/app/seller/actions";
import { readStore, statusLabel } from "@/lib/data-store";
import { formatCurrency, formatDateTime } from "@/lib/reports";

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

function buildWhatsappHelperMessage(order: (Awaited<ReturnType<typeof readStore>>)["orders"][number]) {
  const statusCopy: Record<(typeof statusOptions)[number], string> = {
    pending_payment:
      "pesanannya masih nunggu pembayaran dulu ya. Begitu transfernya masuk, kami lanjut cek secepatnya.",
    payment_review:
      "bukti bayarnya sudah kami terima dan lagi dicek. Sebentar lagi kami kabari lanjutannya ya.",
    confirmed:
      "ordernya sudah aman masuk antrean produksi. Tinggal tunggu kabar manis berikutnya dari kami.",
    in_production:
      "pesanannya lagi diracik di dapur kami. Sudah masuk fase wangi-wangi enak.",
    ready_for_pickup:
      "ordernya sudah siap diambil. Kalau mau confirm jam pickup, tinggal balas chat ini ya.",
    out_for_delivery:
      "ordernya lagi jalan ke kamu. Semoga sampai dengan selamat dan tetap cantik.",
    completed:
      "ordernya sudah selesai. Makasih banyak sudah jajan di Risol Club, semoga bikin hari kamu makin enak.",
    cancelled:
      "ordernya kami tandai batal dulu ya. Kalau mau dibantu bikin order baru, tinggal kabarin saja.",
  };

  return `Halo ${order.customerName}, mau kasih kabar hangat buat order ${order.code} ya. Saat ini ${statusCopy[order.status]} Kalau ada catatan kecil atau perubahan, tinggal balas chat ini aja.`;
}

function PaymentProofPreview({
  dataUrl,
  mimeType,
  alt,
}: {
  dataUrl: string;
  mimeType: string;
  alt: string;
}) {
  const showImagePreview = mimeType.startsWith("image/");
  const showPdfPreview =
    mimeType === "application/pdf" || mimeType.endsWith("/pdf");

  if (showImagePreview) {
    return (
      <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-[color:var(--paper-300)] bg-[#fffaf7]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt={alt} className="block max-h-[24rem] w-full object-contain" />
      </div>
    );
  }

  if (showPdfPreview) {
    return (
      <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-[color:var(--paper-300)] bg-white">
        <object data={dataUrl} type={mimeType} className="h-[24rem] w-full">
          <p className="p-4 text-sm text-[color:var(--ink-700)]">
            Preview PDF belum tersedia di browser ini.
          </p>
        </object>
      </div>
    );
  }

  return null;
}

export default async function SellerOrdersPage() {
  const store = await readStore();

  return (
    <div className="grid gap-6">
      <section className="surface-card rounded-[2rem] p-6">
        <h1 className="font-display text-4xl">Order queue</h1>
        <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
          Verifikasi pembayaran, update status pesanan, lihat preview bukti transfer
          langsung, dan kirim kabar follow-up yang lebih hangat ke customer.
        </p>
      </section>

      <section className="grid gap-4">
        {store.orders.map((order) => {
          const whatsappMessage = buildWhatsappHelperMessage(order);

          return (
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
                    {order.customerName} - {order.customerWhatsapp}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                    {formatDateTime(order.preorderDate)} -{" "}
                    {order.fulfillmentMethod === "delivery" ? "Delivery" : "Pickup"}
                  </p>
                  {order.address ? (
                    <p className="mt-1 text-sm text-[color:var(--ink-700)]">{order.address}</p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <a
                    href={`https://wa.me/${order.customerWhatsapp}?text=${encodeURIComponent(whatsappMessage)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-white px-4 py-3 text-center text-sm font-bold text-[color:var(--brand-900)]"
                  >
                    Kirim update hangat
                  </a>
                  {order.paymentProof ? (
                    <a
                      href={order.paymentProof.dataUrl}
                      download={order.paymentProof.fileName}
                      className="rounded-full border border-[color:var(--paper-300)] px-4 py-3 text-center text-sm font-bold text-[color:var(--brand-900)]"
                    >
                      Download proof
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
                      <span>Total invoice</span>
                      <span className="font-black text-[color:var(--brand-900)]">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>

                  {order.paymentProof ? (
                    <div className="mt-5 rounded-[1.5rem] border border-[color:var(--paper-300)] p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-[color:var(--brand-900)]">
                            Payment proof preview
                          </p>
                          <p className="text-xs text-[color:var(--ink-700)]">
                            {order.paymentProof.fileName}
                          </p>
                        </div>
                        <a
                          href={order.paymentProof.dataUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary px-4 py-3 text-center text-sm font-bold"
                        >
                          Open full file
                        </a>
                      </div>
                      <PaymentProofPreview
                        dataUrl={order.paymentProof.dataUrl}
                        mimeType={order.paymentProof.mimeType}
                        alt={`Bukti bayar ${order.code}`}
                      />
                    </div>
                  ) : (
                    <div className="mt-5 rounded-[1.5rem] border border-dashed border-[color:var(--paper-300)] p-4 text-sm text-[color:var(--ink-700)]">
                      Customer belum upload bukti pembayaran.
                    </div>
                  )}
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
          );
        })}
      </section>
    </div>
  );
}
