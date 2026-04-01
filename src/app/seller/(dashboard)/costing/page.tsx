import { ActionButton } from "@/components/action-button";
import { readStore } from "@/lib/data-store";
import { getCostingOverview, getIngredientHistory, formatCurrency } from "@/lib/reports";
import {
  addIngredientAction,
  addSupplierAction,
  addSupplierPriceAction,
  upsertRecipeItemAction,
} from "@/app/seller/actions";

export default async function SellerCostingPage() {
  const store = await readStore();
  const costingOverview = getCostingOverview(store);
  const ingredientHistory = getIngredientHistory(store);

  return (
    <div className="grid gap-6">
      <section className="surface-card rounded-[2rem] p-6">
        <h1 className="font-display text-4xl">Costing & suppliers</h1>
        <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
          Update bahan, supplier, harga per supplier, dan resep produk. Semua perubahan
          harga tetap terekam sebagai histori append-only.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <form action={addIngredientAction} className="surface-card rounded-[2rem] p-6">
          <h2 className="font-display text-2xl">Add ingredient</h2>
          <div className="mt-4 grid gap-4">
            <input name="name" placeholder="Nama bahan" className="field" required />
            <div className="grid gap-4 md:grid-cols-3">
              <input name="unit" placeholder="Satuan" className="field" required />
              <input name="stock" type="number" placeholder="Stock" className="field" />
              <input
                name="lowStockThreshold"
                type="number"
                placeholder="Low stock"
                className="field"
              />
            </div>
            <select name="activeSupplierId" className="field">
              <option value="">Pilih supplier aktif</option>
              {store.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <ActionButton className="rounded-full bg-[color:var(--brand-900)] px-5 py-4 font-bold text-white">
              Save ingredient
            </ActionButton>
          </div>
        </form>

        <form action={addSupplierAction} className="surface-card rounded-[2rem] p-6">
          <h2 className="font-display text-2xl">Add supplier</h2>
          <div className="mt-4 grid gap-4">
            <input name="name" placeholder="Nama supplier" className="field" required />
            <input name="contact" placeholder="Kontak" className="field" />
            <textarea name="notes" placeholder="Catatan" className="field min-h-24" />
            <ActionButton className="rounded-full bg-[color:var(--brand-900)] px-5 py-4 font-bold text-white">
              Save supplier
            </ActionButton>
          </div>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-6">
          <form action={addSupplierPriceAction} className="surface-card rounded-[2rem] p-6">
            <h2 className="font-display text-2xl">Add supplier price</h2>
            <div className="mt-4 grid gap-4">
              <select name="ingredientId" className="field" required>
                <option value="">Pilih bahan</option>
                {store.ingredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name}
                  </option>
                ))}
              </select>
              <select name="supplierId" className="field" required>
                <option value="">Pilih supplier</option>
                {store.suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  name="pricePerUnit"
                  type="number"
                  step="0.01"
                  placeholder="Harga per unit"
                  className="field"
                  required
                />
                <input name="effectiveFrom" type="date" className="field" required />
              </div>
              <textarea name="notes" className="field min-h-20" placeholder="Catatan perubahan" />
              <ActionButton className="rounded-full bg-[color:var(--brand-900)] px-5 py-4 font-bold text-white">
                Save price history
              </ActionButton>
            </div>
          </form>

          <form action={upsertRecipeItemAction} className="surface-card rounded-[2rem] p-6">
            <h2 className="font-display text-2xl">Update recipe item</h2>
            <div className="mt-4 grid gap-4">
              <select name="productId" className="field" required>
                <option value="">Pilih produk</option>
                {store.products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              <select name="ingredientId" className="field" required>
                <option value="">Pilih bahan</option>
                {store.ingredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name}
                  </option>
                ))}
              </select>
              <input
                name="quantity"
                type="number"
                step="0.01"
                placeholder="Quantity per recipe"
                className="field"
                required
              />
              <ActionButton className="rounded-full bg-[color:var(--brand-900)] px-5 py-4 font-bold text-white">
                Save recipe item
              </ActionButton>
            </div>
          </form>
        </div>

        <div className="grid gap-6">
          <div className="surface-card rounded-[2rem] p-6">
            <h2 className="font-display text-2xl">Current HPP per menu</h2>
            <div className="mt-4 grid gap-3">
              {costingOverview.map((item) => (
                <div key={item.product.id} className="rounded-[1.5rem] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[color:var(--brand-900)]">
                      {item.product.name}
                    </span>
                    <span className="font-black">{formatCurrency(item.cost)}</span>
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--ink-700)]">
                    Stock produk jadi: {item.stock}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card rounded-[2rem] p-6">
            <h2 className="font-display text-2xl">Ingredient price history</h2>
            <div className="mt-4 grid gap-3">
              {ingredientHistory.map((entry) => (
                <div key={entry.ingredient.id} className="rounded-[1.5rem] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-[color:var(--brand-900)]">
                        {entry.ingredient.name}
                      </p>
                      <p className="text-sm text-[color:var(--ink-700)]">
                        Active supplier:{" "}
                        {store.suppliers.find(
                          (supplier) => supplier.id === entry.ingredient.activeSupplierId,
                        )?.name ?? "-"}
                      </p>
                    </div>
                    <span className="text-sm font-black">
                      {formatCurrency((entry.activePrice?.pricePerUnit ?? 0) * 1000)} / 1000 unit
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {entry.history.slice(0, 3).map((history) => (
                      <div
                        key={history.id}
                        className="rounded-2xl bg-[color:var(--paper-100)] px-3 py-2 text-sm text-[color:var(--ink-700)]"
                      >
                        {history.effectiveFrom} •{" "}
                        {
                          store.suppliers.find((supplier) => supplier.id === history.supplierId)
                            ?.name
                        }{" "}
                        • {formatCurrency(history.pricePerUnit * 1000)} / 1000 unit
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
