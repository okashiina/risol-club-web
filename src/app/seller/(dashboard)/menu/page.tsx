import Image from "next/image";
import { ActionButton } from "@/components/action-button";
import {
  deleteProductImageAction,
  reorderProductImageAction,
  setPrimaryProductImageAction,
  upsertProductAction,
} from "@/app/seller/actions";
import { calculateProductCost, getProductStock } from "@/lib/data-store";
import { formatCurrency } from "@/lib/reports";
import { readSellerOperationsStore } from "@/lib/store-projections";

export default async function SellerMenuPage() {
  const store = await readSellerOperationsStore();

  return (
    <div className="grid gap-6">
      <section className="surface-card rounded-[2rem] p-6">
        <h1 className="font-display text-4xl">Menu management</h1>
        <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
          Atur menu aktif, upload beberapa foto, pilih cover image yang aman, dan
          bedakan harga frozen vs fried dengan logika 1 qty = 3 pcs yang tetap rapi.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <form action={upsertProductAction} className="surface-card rounded-[2rem] p-6">
          <h2 className="font-display text-2xl">Add new menu</h2>
          <div className="mt-4 grid gap-4">
            <div>
              <label className="label" htmlFor="name">
                Nama produk
              </label>
              <input id="name" name="name" className="field" required />
            </div>
            <div>
              <label className="label" htmlFor="slug">
                Slug
              </label>
              <input id="slug" name="slug" className="field" required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="nameEn">
                  Name EN
                </label>
                <input id="nameEn" name="nameEn" className="field" />
              </div>
              <div>
                <label className="label" htmlFor="packSize">
                  Pack size
                </label>
                <input
                  id="packSize"
                  name="packSize"
                  type="number"
                  min="1"
                  defaultValue={3}
                  className="field"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="frozenPrice">
                  Harga Frozen
                </label>
                <input
                  id="frozenPrice"
                  name="frozenPrice"
                  type="number"
                  min="0"
                  defaultValue={28000}
                  className="field"
                />
              </div>
              <div>
                <label className="label" htmlFor="friedPrice">
                  Harga Fried
                </label>
                <input
                  id="friedPrice"
                  name="friedPrice"
                  type="number"
                  min="0"
                  defaultValue={30000}
                  className="field"
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="shortDescription">
                Short description
              </label>
              <textarea id="shortDescription" name="shortDescription" className="field min-h-24" />
            </div>
            <div>
              <label className="label" htmlFor="description">
                Description
              </label>
              <textarea id="description" name="description" className="field min-h-28" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="stock">
                  Initial stock (pack)
                </label>
                <input id="stock" name="stock" type="number" className="field" />
              </div>
              <div>
                <label className="label" htmlFor="lowStockThreshold">
                  Low stock threshold
                </label>
                <input
                  id="lowStockThreshold"
                  name="lowStockThreshold"
                  type="number"
                  className="field"
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="images">
                Foto menu
              </label>
              <input
                id="images"
                name="images"
                type="file"
                multiple
                accept="image/*"
                className="field file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--brand-900)] file:px-4 file:py-2 file:font-semibold file:text-white"
              />
            </div>
            <div className="rounded-[1.5rem] bg-[color:var(--paper-100)] p-4 text-sm leading-7 text-[color:var(--ink-700)]">
              Owner note: quantity customer akan dibaca sebagai jumlah pack, dan tiap
              1 qty otomatis berarti 3 pcs.
            </div>
            <label className="inline-flex items-center gap-3 text-sm font-semibold text-[color:var(--ink-700)]">
              <input name="isActive" type="checkbox" defaultChecked />
              Active
            </label>
            <label className="inline-flex items-center gap-3 text-sm font-semibold text-[color:var(--ink-700)]">
              <input name="featured" type="checkbox" defaultChecked />
              Featured
            </label>
            <ActionButton className="rounded-full bg-[color:var(--brand-900)] px-5 py-4 font-bold text-white">
              Save menu
            </ActionButton>
          </div>
        </form>

        <div className="grid gap-4">
          {store.products.map((product) => {
            const stock = getProductStock(store, product.id);
            const cost = calculateProductCost(store, product.id);
            const frozen = product.variants.find((variant) => variant.type === "frozen");
            const fried = product.variants.find((variant) => variant.type === "fried");

            return (
              <article key={product.id} className="surface-card rounded-[2rem] p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl">{product.name}</h2>
                    <p className="text-sm text-[color:var(--ink-700)]">{product.slug}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-[color:var(--ink-700)]">
                      HPP / pack {formatCurrency(cost)}
                    </p>
                    <p className="mt-1 font-bold text-[color:var(--brand-900)]">
                      Stock {stock?.stock ?? 0} pack
                    </p>
                  </div>
                </div>

                <form action={upsertProductAction} className="grid gap-4">
                  <input type="hidden" name="id" value={product.id} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <input name="name" defaultValue={product.name} className="field" />
                    <input name="nameEn" defaultValue={product.nameEn} className="field" />
                    <input name="slug" defaultValue={product.slug} className="field" />
                    <input
                      name="packSize"
                      type="number"
                      defaultValue={product.packSize}
                      className="field"
                    />
                    <input
                      name="frozenPrice"
                      type="number"
                      defaultValue={frozen?.price ?? 28000}
                      className="field"
                    />
                    <input
                      name="friedPrice"
                      type="number"
                      defaultValue={fried?.price ?? 30000}
                      className="field"
                    />
                  </div>
                  <textarea
                    name="shortDescription"
                    defaultValue={product.shortDescription}
                    className="field min-h-20"
                  />
                  <textarea
                    name="description"
                    defaultValue={product.description}
                    className="field min-h-24"
                  />
                  <div>
                    <label className="label" htmlFor={`images-${product.id}`}>
                      Tambah foto baru
                    </label>
                    <input
                      id={`images-${product.id}`}
                      name="images"
                      type="file"
                      multiple
                      accept="image/*"
                      className="field file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--brand-900)] file:px-4 file:py-2 file:font-semibold file:text-white"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <label className="inline-flex items-center gap-3 text-sm font-semibold text-[color:var(--ink-700)]">
                      <input name="isActive" type="checkbox" defaultChecked={product.isActive} />
                      Active
                    </label>
                    <label className="inline-flex items-center gap-3 text-sm font-semibold text-[color:var(--ink-700)]">
                      <input name="featured" type="checkbox" defaultChecked={product.featured} />
                      Featured
                    </label>
                    <ActionButton className="rounded-full bg-[color:var(--brand-900)] px-4 py-3 text-sm font-bold text-white">
                      Update menu
                    </ActionButton>
                  </div>
                </form>

                <section className="mt-4 rounded-[1.6rem] border border-[color:var(--paper-300)] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-[color:var(--brand-900)]">
                        Gallery menu
                      </p>
                      <p className="text-xs text-[color:var(--ink-700)]">
                        Cover image wajib selalu ada. Cover yang aktif tidak bisa dihapus atau
                        digeser sampai kamu memilih cover baru.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {product.images.map((image, index) => {
                      const isCover = index === 0;
                      const isOnlyImage = product.images.length === 1;

                      return (
                        <div
                          key={image.id}
                          className="overflow-hidden rounded-[1.35rem] border border-[color:var(--paper-300)] bg-white"
                        >
                          <div className="relative aspect-[1.02/1]">
                            <Image
                              src={image.url}
                              alt={image.alt}
                              fill
                              sizes="(max-width: 768px) 100vw, 20vw"
                              className="object-cover"
                            />
                          </div>
                          <div className="grid gap-3 p-3">
                            <p className="text-xs font-semibold text-[color:var(--ink-700)]">
                              {isCover ? "Current cover image" : `Photo ${index + 1}`}
                            </p>

                            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2">
                              <form action={reorderProductImageAction}>
                                <input type="hidden" name="productId" value={product.id} />
                                <input type="hidden" name="imageId" value={image.id} />
                                <input type="hidden" name="direction" value="left" />
                                <button
                                  type="submit"
                                  disabled={isCover}
                                  className="btn-secondary px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  ←
                                </button>
                              </form>

                              <form action={setPrimaryProductImageAction}>
                                <input type="hidden" name="productId" value={product.id} />
                                <input type="hidden" name="imageId" value={image.id} />
                                <button
                                  type="submit"
                                  disabled={isCover}
                                  className="btn-secondary w-full px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {isCover ? "Sudah jadi cover" : "Jadikan cover"}
                                </button>
                              </form>

                              <form action={reorderProductImageAction}>
                                <input type="hidden" name="productId" value={product.id} />
                                <input type="hidden" name="imageId" value={image.id} />
                                <input type="hidden" name="direction" value="right" />
                                <button
                                  type="submit"
                                  disabled={isCover || index === product.images.length - 1}
                                  className="btn-secondary px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  →
                                </button>
                              </form>

                              <form action={deleteProductImageAction}>
                                <input type="hidden" name="productId" value={product.id} />
                                <input type="hidden" name="imageId" value={image.id} />
                                <button
                                  type="submit"
                                  disabled={isCover || isOnlyImage}
                                  className="rounded-full bg-[#b91c1c] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-[#e7b7b3] disabled:text-white/80"
                                >
                                  Hapus
                                </button>
                              </form>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
