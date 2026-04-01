import { ActionButton } from "@/components/action-button";
import { readStore } from "@/lib/data-store";
import {
  adjustIngredientStockAction,
  adjustProductStockAction,
  recordProductionAction,
} from "@/app/seller/actions";

export default async function SellerInventoryPage() {
  const store = await readStore();

  return (
    <div className="grid gap-6">
      <section className="surface-card rounded-[2rem] p-6">
        <h1 className="font-display text-4xl">Inventory</h1>
        <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
          Kelola stock bahan, stock produk jadi, dan catat batch produksi agar mutasi
          stok tetap sistematis.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <form action={recordProductionAction} className="surface-card rounded-[2rem] p-6">
          <h2 className="font-display text-2xl">Record production</h2>
          <div className="mt-4 grid gap-4">
            <select name="productId" className="field" required>
              <option value="">Pilih produk</option>
              {store.products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <input
              name="quantity"
              type="number"
              min="1"
              className="field"
              placeholder="Jumlah batch / pcs"
            />
            <ActionButton className="rounded-full bg-[color:var(--brand-900)] px-5 py-4 font-bold text-white">
              Save production
            </ActionButton>
          </div>
        </form>

        <form action={adjustIngredientStockAction} className="surface-card rounded-[2rem] p-6">
          <h2 className="font-display text-2xl">Adjust ingredient stock</h2>
          <div className="mt-4 grid gap-4">
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
              className="field"
              placeholder="+ untuk restock, - untuk koreksi"
            />
            <input name="note" className="field" placeholder="Catatan" />
            <ActionButton className="rounded-full bg-[color:var(--brand-900)] px-5 py-4 font-bold text-white">
              Save ingredient adjustment
            </ActionButton>
          </div>
        </form>

        <form action={adjustProductStockAction} className="surface-card rounded-[2rem] p-6">
          <h2 className="font-display text-2xl">Adjust product stock</h2>
          <div className="mt-4 grid gap-4">
            <select name="productId" className="field" required>
              <option value="">Pilih produk</option>
              {store.products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <input
              name="quantity"
              type="number"
              className="field"
              placeholder="+ untuk tambah, - untuk koreksi"
            />
            <input name="note" className="field" placeholder="Catatan" />
            <ActionButton className="rounded-full bg-[color:var(--brand-900)] px-5 py-4 font-bold text-white">
              Save product adjustment
            </ActionButton>
          </div>
        </form>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card rounded-[2rem] p-6">
          <h2 className="font-display text-2xl">Ingredient stock</h2>
          <div className="mt-4 grid gap-3">
            {store.ingredients.map((ingredient) => (
              <div key={ingredient.id} className="rounded-[1.5rem] bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[color:var(--brand-900)]">
                    {ingredient.name}
                  </span>
                  <span className="font-black">
                    {ingredient.stock} {ingredient.unit}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[color:var(--ink-700)]">
                  Low stock threshold: {ingredient.lowStockThreshold} {ingredient.unit}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card rounded-[2rem] p-6">
          <h2 className="font-display text-2xl">Recent movements</h2>
          <div className="mt-4 grid gap-3">
            {store.inventoryMovements.slice(0, 10).map((movement) => (
              <div key={movement.id} className="rounded-[1.5rem] bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[color:var(--brand-900)]">
                    {movement.itemType} • {movement.type}
                  </span>
                  <span className="font-black">{movement.quantity}</span>
                </div>
                <p className="mt-2 text-sm text-[color:var(--ink-700)]">{movement.note}</p>
                <p className="mt-1 text-xs text-[color:var(--ink-700)]">{movement.createdAt}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
