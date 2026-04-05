import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { PaymentProofPreview } from "@/components/payment-proof-preview";
import { SellerManualOrderForm } from "@/components/seller-manual-order-form";
import { SellerOrderActions } from "@/components/seller-order-actions";
import { updateOrderStatusAction } from "@/app/seller/actions";
import { statusLabel } from "@/lib/data-store";
import { getPaymentProofHref } from "@/lib/payment-proof";
import { formatCurrency, formatDateTime } from "@/lib/reports";
import { readSellerOrdersData } from "@/lib/store-projections";

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

const MIDDLE_DOT = "\u00b7";

const WHATSAPP_TEMPLATE_BY_STATUS: Record<(typeof statusOptions)[number], string> = {
  pending_payment:
    "Halo {name}, order kamu masih nunggu pembayaran yaa 😊 Kalau transfernya sudah masuk, kita lanjut cek secepatnya ya terima kasih",
  payment_review:
    "Halo {name}, bukti transfer kamu sudah masuk dan lagi kita cek yaa 😊 Kalau sudah beres, kita langsung update lagi di chat ini terima kasih",
  confirmed:
    "Halo {name}, order kamu sudah aman masuk antrean yaa 🙌 Tinggal tunggu update hangat berikutnya dari kita terima kasih",
  in_production:
    "Halo {name}, order kamu lagi diproses di dapur kita yaa ✨ Nanti kalau sudah makin dekat ke tahap berikutnya, kita kabarin lagi terima kasih",
  ready_for_pickup:
    "Halo {name}, order kamu sudah ready buat di-pickup yaa 🙌 Kalau mau, kamu bisa balas jam ambil yang paling enak buat kamu terima kasih",
  out_for_delivery:
    "Halo {name}, order kamu sudah OTW yaa 🚚✨ Nanti kalau sudah sampai, kita kabarin lagi di sini terima kasih",
  completed:
    "Halo {name}, order kamu sudah selesai yaa 😊 Semoga suka dan enjoy, kalau mau repeat order kapan-kapan tinggal chat kita lagi terima kasih",
  cancelled:
    "Halo {name}, order kamu saat ini kita tandai batal dulu yaa 🙏 Kalau nanti mau dibantu bikin order baru, tinggal chat kita lagi terima kasih",
};

function buildWhatsappHelperMessage(
  order: Awaited<ReturnType<typeof readSellerOrdersData>>["orders"][number],
) {
  return WHATSAPP_TEMPLATE_BY_STATUS[order.status].replace("{name}", order.customerName);
}

type SellerOrdersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SellerOrdersPage({ searchParams }: SellerOrdersPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const pageParam = Array.isArray(resolvedSearchParams?.page)
    ? resolvedSearchParams?.page[0]
    : resolvedSearchParams?.page;
  const currentPage = Math.max(Number(pageParam) || 1, 1);
  const { orders, products, pagination } = await readSellerOrdersData(currentPage, 10);

  return (
    <div className="grid gap-6">
      <section className="surface-card rounded-[2rem] p-6">
        <h1 className="font-display text-4xl">Order queue</h1>
        <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
          Verifikasi pembayaran, tambah order manual dari WhatsApp, kirim kabar follow-up
          yang lebih hangat, dan hapus dummy order dengan warning permanen.
        </p>
      </section>

      <SellerManualOrderForm products={products} />

      <section className="grid gap-4">
        <div className="surface-card rounded-[2rem] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[color:var(--brand-900)]">Database orders</p>
              <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                Menampilkan {orders.length ? (pagination.page - 1) * pagination.pageSize + 1 : 0}
                {" - "}
                {(pagination.page - 1) * pagination.pageSize + orders.length} dari {pagination.totalCount} order.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[color:var(--brand-900)]">
              Page {pagination.page} / {pagination.totalPages}
            </div>
          </div>
        </div>

        {orders.map((order) => {
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
                    <span className="pill bg-white text-[color:var(--ink-700)]">
                      {order.source === "seller_manual" ? "Seller manual" : "Website"}
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
                    Kirim update hangat 😊
                  </a>
                  {order.paymentProof ? (
                    <a
                      href={getPaymentProofHref(order.paymentProof)}
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
                        key={`${order.id}-${item.productId}-${item.variantType ?? "legacy"}-${item.customMixLabel ?? item.productName}`}
                        className="flex items-center justify-between gap-4 text-sm"
                      >
                        <div>
                          <span className="font-semibold text-[color:var(--ink-700)]">
                            {item.productName}
                          </span>
                          <p className="text-xs text-[color:var(--ink-700)]">
                            {item.variantLabel} {MIDDLE_DOT} {item.quantity} qty {MIDDLE_DOT} {item.pieceCount} pcs
                          </p>
                          {item.customMixLabel ? (
                            <p className="mt-1 text-xs text-[color:var(--ink-700)]">
                              Custom mix {MIDDLE_DOT} {item.customMixLabel}
                            </p>
                          ) : null}
                          {item.customMixComponents?.length ? (
                            <p className="mt-1 text-xs text-[color:var(--ink-700)]">
                              Isi per pack:{" "}
                              {item.customMixComponents
                                .map((component) => `${component.quantity} pcs ${component.productName}`)
                                .join(" + ")}
                            </p>
                          ) : null}
                        </div>
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
                          href={getPaymentProofHref(order.paymentProof)}
                          download={order.paymentProof.fileName}
                          className="btn-secondary px-4 py-3 text-center text-sm font-bold"
                        >
                          Download proof
                        </a>
                      </div>
                      <PaymentProofPreview
                        href={getPaymentProofHref(order.paymentProof)}
                        mimeType={order.paymentProof.mimeType}
                        alt={`Bukti bayar ${order.code}`}
                      />
                    </div>
                  ) : (
                    <div className="mt-5 rounded-[1.5rem] border border-dashed border-[color:var(--paper-300)] p-4 text-sm text-[color:var(--ink-700)]">
                      Belum ada payment proof untuk order ini.
                    </div>
                  )}
                </div>

                <div className="grid gap-4">
                  <SellerOrderActions order={order} products={products} />

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
              </div>
            </article>
          );
        })}

        {orders.length === 0 ? (
          <div className="surface-card rounded-[2rem] p-6 text-sm leading-7 text-[color:var(--ink-700)]">
            Belum ada order di halaman ini. Coba pindah page lain atau buat order baru dari tombol di atas.
          </div>
        ) : null}
      </section>

      <section className="surface-card rounded-[2rem] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[color:var(--ink-700)]">
            Queue dipecah per halaman biar seller page tetap ringan walau order terus bertambah.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {pagination.page > 1 ? (
              <Link
                href={`/seller/orders?page=${pagination.page - 1}`}
                className="rounded-full border border-[color:var(--paper-300)] bg-white px-4 py-3 text-sm font-bold text-[color:var(--brand-900)]"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-full border border-[color:var(--paper-300)] bg-[color:var(--paper-100)] px-4 py-3 text-sm font-bold text-[color:var(--ink-700)] opacity-60">
                Previous
              </span>
            )}
            {pagination.page < pagination.totalPages ? (
              <Link
                href={`/seller/orders?page=${pagination.page + 1}`}
                className="rounded-full bg-[color:var(--brand-900)] px-4 py-3 text-sm font-bold text-white"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-full bg-[color:var(--paper-100)] px-4 py-3 text-sm font-bold text-[color:var(--ink-700)] opacity-60">
                Next
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
