import { ActionButton } from "@/components/action-button";
import { calculateProductCost, getProductStock, readStore } from "@/lib/data-store";
import { formatCurrency } from "@/lib/reports";
import { upsertProductAction } from "@/app/seller/actions";

export default async function SellerMenuPage() {
  const store = await readStore();

  return (
    <div className="grid gap-6">
      <section className="surface-card rounded-[2rem] p-6">
        <h1 className="font-display text-4xl">Menu management</h1>
        <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
          Tambah menu baru, atur harga jual, aktif/nonaktifkan item, dan pantau HPP per
          produk dari resep bahan yang aktif.
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
                <label className="label" htmlFor="price">
                  Harga jual
                </label>
                <input id="price" name="price" type="number" min="0" className="field" />
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
                  Initial stock
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

            return (
              <form
                key={product.id}
                action={upsertProductAction}
                className="surface-card rounded-[2rem] p-5"
              >
                <input type="hidden" name="id" value={product.id} />
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl">{product.name}</h2>
                    <p className="text-sm text-[color:var(--ink-700)]">{product.slug}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-[color:var(--ink-700)]">
                      HPP {formatCurrency(cost)}
                    </p>
                    <p className="mt-1 font-bold text-[color:var(--brand-900)]">
                      Stock {stock?.stock ?? 0}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <input name="name" defaultValue={product.name} className="field" />
                  <input name="nameEn" defaultValue={product.nameEn} className="field" />
                  <input name="slug" defaultValue={product.slug} className="field" />
                  <input
                    name="price"
                    type="number"
                    defaultValue={product.price}
                    className="field"
                  />
                </div>
                <textarea
                  name="shortDescription"
                  defaultValue={product.shortDescription}
                  className="field mt-4 min-h-20"
                />
                <textarea
                  name="description"
                  defaultValue={product.description}
                  className="field mt-4 min-h-24"
                />
                <div className="mt-4 flex flex-wrap items-center gap-4">
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
            );
          })}
        </div>
      </section>
    </div>
  );
}
