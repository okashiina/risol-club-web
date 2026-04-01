import { ActionButton } from "@/components/action-button";
import {
  addIngredientAction,
  addSupplierAction,
  addSupplierPriceAction,
  deleteIngredientAction,
  deleteSupplierAction,
  deleteSupplierPriceAction,
  updateIngredientAction,
  updateSupplierAction,
  updateSupplierPriceAction,
  upsertRecipeItemAction,
} from "@/app/seller/actions";
import { readStore } from "@/lib/data-store";
import { formatCurrency, getCostingOverview, getIngredientHistory } from "@/lib/reports";

export default async function SellerCostingPage() {
  const store = await readStore();
  const costingOverview = getCostingOverview(store);
  const ingredientHistory = getIngredientHistory(store);
  const priceEntries = [...store.ingredientSupplierPrices].sort((a, b) => {
    const effective = b.effectiveFrom.localeCompare(a.effectiveFrom);
    return effective === 0 ? b.createdAt.localeCompare(a.createdAt) : effective;
  });

  return (
    <div className="grid gap-6">
      <section className="surface-card rounded-[2rem] p-6">
        <h1 className="font-display text-4xl">Costing & suppliers</h1>
        <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
          Kelola bahan, supplier, harga supplier, dan resep produk dari satu halaman.
          Riwayat harga tetap kelihatan jelas, tapi sekarang entri yang salah juga bisa
          diedit atau dibersihkan.
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
            <h2 className="font-display text-2xl">Ingredient price snapshot</h2>
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
                        {history.effectiveFrom} -{" "}
                        {store.suppliers.find((supplier) => supplier.id === history.supplierId)
                          ?.name ?? "-"}{" "}
                        - {formatCurrency(history.pricePerUnit * 1000)} / 1000 unit
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="surface-card rounded-[2rem] p-6 xl:col-span-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl">Ingredients</h2>
              <p className="mt-2 text-sm text-[color:var(--ink-700)]">
                Edit stok dasar, batas low stock, dan supplier aktif.
              </p>
            </div>
            <span className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
              {store.ingredients.length} item
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {store.ingredients.map((ingredient) => (
              <div key={ingredient.id} className="rounded-[1.5rem] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[color:var(--brand-900)]">{ingredient.name}</p>
                    <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                      Stock {ingredient.stock} {ingredient.unit} - Low stock{" "}
                      {ingredient.lowStockThreshold} {ingredient.unit}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--ink-700)]">
                      Supplier aktif:{" "}
                      {store.suppliers.find(
                        (supplier) => supplier.id === ingredient.activeSupplierId,
                      )?.name ?? "-"}
                    </p>
                  </div>
                  <form action={deleteIngredientAction}>
                    <input type="hidden" name="ingredientId" value={ingredient.id} />
                    <ActionButton className="rounded-full border border-[#f2c6c2] px-3 py-2 text-xs font-bold text-[color:var(--brand-900)]">
                      Hapus
                    </ActionButton>
                  </form>
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-bold text-[color:var(--brand-900)]">
                    Edit ingredient
                  </summary>
                  <form action={updateIngredientAction} className="mt-4 grid gap-3">
                    <input type="hidden" name="ingredientId" value={ingredient.id} />
                    <input
                      name="name"
                      defaultValue={ingredient.name}
                      className="field"
                      required
                    />
                    <div className="grid gap-3 md:grid-cols-3">
                      <input
                        name="unit"
                        defaultValue={ingredient.unit}
                        className="field"
                        required
                      />
                      <input
                        name="stock"
                        type="number"
                        defaultValue={ingredient.stock}
                        className="field"
                      />
                      <input
                        name="lowStockThreshold"
                        type="number"
                        defaultValue={ingredient.lowStockThreshold}
                        className="field"
                      />
                    </div>
                    <select
                      name="activeSupplierId"
                      defaultValue={ingredient.activeSupplierId ?? ""}
                      className="field"
                    >
                      <option value="">Tanpa supplier aktif</option>
                      {store.suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                    <ActionButton className="rounded-full bg-[color:var(--brand-900)] px-4 py-3 font-bold text-white">
                      Save changes
                    </ActionButton>
                  </form>
                </details>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card rounded-[2rem] p-6 xl:col-span-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl">Suppliers</h2>
              <p className="mt-2 text-sm text-[color:var(--ink-700)]">
                Update kontak supplier dan nonaktifkan yang sudah tidak dipakai.
              </p>
            </div>
            <span className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
              {store.suppliers.length} supplier
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {store.suppliers.map((supplier) => (
              <div key={supplier.id} className="rounded-[1.5rem] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[color:var(--brand-900)]">{supplier.name}</p>
                    <p className="mt-1 text-sm text-[color:var(--ink-700)]">{supplier.contact}</p>
                    {supplier.notes ? (
                      <p className="mt-1 text-xs text-[color:var(--ink-700)]">{supplier.notes}</p>
                    ) : null}
                  </div>
                  <form action={deleteSupplierAction}>
                    <input type="hidden" name="supplierId" value={supplier.id} />
                    <ActionButton className="rounded-full border border-[#f2c6c2] px-3 py-2 text-xs font-bold text-[color:var(--brand-900)]">
                      Hapus
                    </ActionButton>
                  </form>
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-bold text-[color:var(--brand-900)]">
                    Edit supplier
                  </summary>
                  <form action={updateSupplierAction} className="mt-4 grid gap-3">
                    <input type="hidden" name="supplierId" value={supplier.id} />
                    <input
                      name="name"
                      defaultValue={supplier.name}
                      className="field"
                      required
                    />
                    <input name="contact" defaultValue={supplier.contact} className="field" />
                    <textarea
                      name="notes"
                      defaultValue={supplier.notes}
                      className="field min-h-24"
                    />
                    <label className="flex items-center gap-3 rounded-[1rem] bg-[color:var(--paper-100)] px-4 py-3 text-sm font-semibold text-[color:var(--ink-700)]">
                      <input
                        name="isActive"
                        type="checkbox"
                        defaultChecked={supplier.isActive}
                        className="h-4 w-4"
                      />
                      Supplier aktif
                    </label>
                    <ActionButton className="rounded-full bg-[color:var(--brand-900)] px-4 py-3 font-bold text-white">
                      Save changes
                    </ActionButton>
                  </form>
                </details>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card rounded-[2rem] p-6 xl:col-span-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl">Supplier prices</h2>
              <p className="mt-2 text-sm text-[color:var(--ink-700)]">
                Edit histori harga kalau ada typo, atau hapus entri yang memang sudah tidak relevan.
              </p>
            </div>
            <span className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
              {priceEntries.length} price row
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {priceEntries.map((price) => (
              <div key={price.id} className="rounded-[1.5rem] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[color:var(--brand-900)]">
                      {store.ingredients.find((ingredient) => ingredient.id === price.ingredientId)
                        ?.name ?? "-"}
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                      {store.suppliers.find((supplier) => supplier.id === price.supplierId)?.name ??
                        "-"}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--ink-700)]">
                      Berlaku {price.effectiveFrom} - {formatCurrency(price.pricePerUnit * 1000)} /
                      1000 unit
                    </p>
                  </div>
                  <form action={deleteSupplierPriceAction}>
                    <input type="hidden" name="priceId" value={price.id} />
                    <ActionButton className="rounded-full border border-[#f2c6c2] px-3 py-2 text-xs font-bold text-[color:var(--brand-900)]">
                      Hapus
                    </ActionButton>
                  </form>
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-bold text-[color:var(--brand-900)]">
                    Edit price entry
                  </summary>
                  <form action={updateSupplierPriceAction} className="mt-4 grid gap-3">
                    <input type="hidden" name="priceId" value={price.id} />
                    <select name="ingredientId" defaultValue={price.ingredientId} className="field" required>
                      {store.ingredients.map((ingredient) => (
                        <option key={ingredient.id} value={ingredient.id}>
                          {ingredient.name}
                        </option>
                      ))}
                    </select>
                    <select name="supplierId" defaultValue={price.supplierId} className="field" required>
                      {store.suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        name="pricePerUnit"
                        type="number"
                        step="0.01"
                        defaultValue={price.pricePerUnit}
                        className="field"
                        required
                      />
                      <input
                        name="effectiveFrom"
                        type="date"
                        defaultValue={price.effectiveFrom}
                        className="field"
                        required
                      />
                    </div>
                    <textarea
                      name="notes"
                      defaultValue={price.notes}
                      className="field min-h-20"
                    />
                    <ActionButton className="rounded-full bg-[color:var(--brand-900)] px-4 py-3 font-bold text-white">
                      Save changes
                    </ActionButton>
                  </form>
                </details>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
