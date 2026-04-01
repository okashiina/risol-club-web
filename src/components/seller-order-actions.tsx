"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { deleteOrderAction, editOrderAction } from "@/app/seller/actions";
import { ActionButton } from "@/components/action-button";
import { Order } from "@/lib/types";

type SellerOrderActionsProps = {
  order: Order;
};

function itemKey(productId: string, variantType?: string) {
  return `${productId}:${variantType ?? "legacy"}`;
}

function ModalFrame({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-[rgba(37,20,20,0.48)] px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-5xl">
        <div className="surface-card rounded-[2rem] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-3xl">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">{description}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[color:var(--paper-300)] bg-white px-4 py-2 text-sm font-bold text-[color:var(--brand-900)]"
            >
              Tutup
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function SellerOrderActions({ order }: SellerOrderActionsProps) {
  const [activeModal, setActiveModal] = useState<"edit" | "delete" | null>(null);
  const qtyLocked = ["completed", "cancelled"].includes(order.status);

  return (
    <>
      <div className="grid gap-3 self-start">
        <div className="rounded-[1.5rem] bg-white p-4">
          <button
            type="button"
            onClick={() => setActiveModal("edit")}
            className="w-full rounded-full bg-[color:var(--paper-100)] px-4 py-3 text-sm font-bold text-[color:var(--brand-900)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            Edit order
          </button>
        </div>
        <div className="rounded-[1.5rem] border border-[#efc2bc] bg-[#fff4f2] p-4">
          <button
            type="button"
            onClick={() => setActiveModal("delete")}
            className="w-full rounded-full bg-white px-4 py-3 text-sm font-bold text-[#b91c1c] transition-transform duration-200 hover:-translate-y-0.5"
          >
            Delete order
          </button>
        </div>
      </div>

      {activeModal === "edit" ? (
        <ModalFrame
          title={`Edit ${order.code}`}
          description="Seller bisa menambah qty dari item yang sudah ada, lalu upload atau ganti bukti transfer kalau customer baru kirim belakangan."
          onClose={() => setActiveModal(null)}
        >
          <form action={editOrderAction} className="mt-5 grid gap-4">
            <input type="hidden" name="orderId" value={order.id} />

            <div className="grid gap-3">
              {order.items.map((item) => {
                const key = itemKey(item.productId, item.variantType);

                return (
                  <div
                    key={`${order.id}-${key}`}
                    className="rounded-[1.25rem] border border-[color:var(--paper-300)] bg-[color:var(--paper-100)] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-[color:var(--brand-900)]">
                          {item.productName}
                        </p>
                        <p className="text-xs text-[color:var(--ink-700)]">
                          {item.variantLabel} • sekarang {item.quantity} qty • {item.pieceCount} pcs
                        </p>
                      </div>
                      <div className="w-28">
                        <label className="label text-xs" htmlFor={`increase-${order.id}-${key}`}>
                          Tambah qty
                        </label>
                        <input
                          id={`increase-${order.id}-${key}`}
                          name={`increase:${item.productId}:${item.variantType ?? "legacy"}`}
                          type="number"
                          min={0}
                          defaultValue={0}
                          disabled={qtyLocked}
                          className="field disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <label className="label" htmlFor={`proof-${order.id}`}>
                {order.paymentProof ? "Ganti / upload ulang bukti transfer" : "Tambah bukti transfer"}
              </label>
              <input
                id={`proof-${order.id}`}
                name="paymentProof"
                type="file"
                accept="image/*,application/pdf"
                className="field file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--brand-900)] file:px-4 file:py-2 file:font-semibold file:text-white"
              />
            </div>

            {qtyLocked ? (
              <p className="text-xs text-[color:var(--ink-700)]">
                Qty tidak bisa ditambah lagi karena order sudah {order.status === "completed" ? "completed" : "cancelled"}, tapi bukti transfer tetap boleh diperbarui bila perlu.
              </p>
            ) : null}

            <ActionButton className="rounded-full bg-[color:var(--brand-900)] px-4 py-3 font-bold text-white">
              Save order update
            </ActionButton>
          </form>
        </ModalFrame>
      ) : null}

      {activeModal === "delete" ? (
        <ModalFrame
          title={`Delete ${order.code}`}
          description="Gunakan ini hanya untuk bersih-bersih dummy. Kalau lanjut, order ini akan terhapus permanen dari database dan tidak bisa dikembalikan lagi."
          onClose={() => setActiveModal(null)}
        >
          <form action={deleteOrderAction} className="mt-5 grid gap-4">
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="confirmation" value="DELETE" />

            <div className="rounded-[1.25rem] border border-[#efc2bc] bg-[#fff4f2] p-4 text-sm leading-7 text-[color:var(--ink-700)]">
              Semua data order ini akan hilang permanen dari database. Stok juga akan dikembalikan otomatis kalau order sebelumnya sudah masuk fase sales.
            </div>

            <ActionButton className="rounded-full bg-[#b91c1c] px-4 py-3 font-bold text-white">
              Delete order permanently
            </ActionButton>
          </form>
        </ModalFrame>
      ) : null}
    </>
  );
}
