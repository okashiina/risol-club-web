"use client";

import { useMemo, useState } from "react";
import { createManualOrderAction } from "@/app/seller/actions";
import { getPieceCount } from "@/lib/catalog";
import { Product, ProductVariantType } from "@/lib/types";
import { ActionButton } from "@/components/action-button";

type SellerManualOrderFormProps = {
  products: Product[];
};

type CartState = Record<string, number>;

function cartKey(productId: string, variantType: ProductVariantType) {
  return `${productId}:${variantType}`;
}

export function SellerManualOrderForm({ products }: SellerManualOrderFormProps) {
  const [cart, setCart] = useState<CartState>({});
  const [isOpen, setIsOpen] = useState(false);

  const selectedItems = useMemo(
    () =>
      products
        .flatMap((product) =>
          product.variants.map((variant) => ({
            productId: product.id,
            productName: product.name,
            variantType: variant.type,
            variantLabel: variant.label,
            quantity: cart[cartKey(product.id, variant.type)] ?? 0,
          })),
        )
        .filter((item) => item.quantity > 0),
    [cart, products],
  );

  function updateQuantity(productId: string, variantType: ProductVariantType, delta: number) {
    setCart((current) => {
      const key = cartKey(productId, variantType);
      const nextValue = Math.max(0, (current[key] ?? 0) + delta);
      return { ...current, [key]: nextValue };
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-full bg-[color:var(--brand-900)] px-5 py-4 text-sm font-bold text-white shadow-[0_20px_40px_rgba(185,30,30,0.18)]"
        >
          Create order for customer
        </button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(37,20,20,0.48)] px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-5xl">
            <form action={createManualOrderAction} className="surface-card rounded-[2rem] p-6">
      <input type="hidden" name="items" value={JSON.stringify(selectedItems)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl">Create order for customer</h2>
          <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
            Masukkan order yang sebelumnya datang lewat WhatsApp supaya semuanya tetap
            rapi ke-track dari dashboard ini.
          </p>
        </div>
        <div className="rounded-full bg-[color:var(--paper-100)] px-4 py-2 text-sm font-bold text-[color:var(--brand-900)]">
          {selectedItems.reduce((sum, item) => sum + item.quantity, 0)} qty •{" "}
          {selectedItems.reduce((sum, item) => {
            const product = products.find((entry) => entry.id === item.productId);
            return sum + (product ? getPieceCount(product, item.quantity) : item.quantity * 3);
          }, 0)}{" "}
          pcs
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="manual-name">
            Nama customer
          </label>
          <input id="manual-name" name="customerName" className="field" required />
        </div>
        <div>
          <label className="label" htmlFor="manual-wa">
            WhatsApp
          </label>
          <input id="manual-wa" name="customerWhatsapp" className="field" required />
        </div>
        <div>
          <label className="label" htmlFor="manual-date">
            Waktu pickup / delivery
          </label>
          <input
            id="manual-date"
            name="preorderDate"
            type="datetime-local"
            className="field"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="manual-status">
            Status awal
          </label>
          <select id="manual-status" name="status" className="field" defaultValue="confirmed">
            <option value="pending_payment">Pending payment</option>
            <option value="payment_review">Payment review</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_production">In production</option>
            <option value="ready_for_pickup">Ready for pickup</option>
            <option value="out_for_delivery">Out for delivery</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="manual-fulfillment">
            Fulfillment
          </label>
          <select id="manual-fulfillment" name="fulfillmentMethod" className="field">
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="manual-proof">
            Payment proof optional
          </label>
          <input
            id="manual-proof"
            name="paymentProof"
            type="file"
            accept="image/*,application/pdf"
            className="field file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--brand-900)] file:px-4 file:py-2 file:font-semibold file:text-white"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <div>
          <label className="label" htmlFor="manual-address">
            Alamat
          </label>
          <textarea id="manual-address" name="address" className="field min-h-24" />
        </div>
        <div>
          <label className="label" htmlFor="manual-note">
            Catatan
          </label>
          <textarea id="manual-note" name="note" className="field min-h-24" />
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {products.map((product) => (
          <div key={product.id} className="rounded-[1.6rem] border border-[color:var(--paper-300)] bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl">{product.name}</h3>
                <p className="text-sm text-[color:var(--ink-700)]">{product.shortDescription}</p>
              </div>
              <div className="rounded-full bg-[color:var(--paper-100)] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                1 qty = 3 pcs
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {product.variants.map((variant) => {
                const quantity = cart[cartKey(product.id, variant.type)] ?? 0;

                return (
                  <div
                    key={`${product.id}-${variant.type}`}
                    className="rounded-[1.35rem] bg-[color:var(--paper-100)] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                          {variant.label}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[color:var(--ink-700)]">
                          Rp {variant.price.toLocaleString("id-ID")}
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-white p-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, variant.type, -1)}
                          className="h-10 w-10 rounded-full bg-[color:var(--paper-100)] text-lg font-bold text-[color:var(--brand-900)]"
                        >
                          -
                        </button>
                        <span className="min-w-8 text-center text-sm font-black">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, variant.type, 1)}
                          className="h-10 w-10 rounded-full bg-[color:var(--brand-900)] text-lg font-bold text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    {quantity > 0 ? (
                      <p className="mt-3 text-sm text-[color:var(--ink-700)]">
                        {quantity} qty • {getPieceCount(product, quantity)} pcs
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <ActionButton className="mt-6 rounded-full bg-[color:var(--brand-900)] px-5 py-4 font-bold text-white">
        Save manual order
      </ActionButton>
            </form>
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-[rgba(255,255,255,0.38)] bg-white/90 px-5 py-3 text-sm font-bold text-[color:var(--brand-900)]"
              >
                Tutup form
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
