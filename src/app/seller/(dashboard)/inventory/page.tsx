import { ActionButton } from "@/components/action-button";
import {
  adjustIngredientStockAction,
  adjustProductStockAction,
  recordProductionAction,
} from "@/app/seller/actions";
import { formatDateTime } from "@/lib/reports";
import { readSellerInventoryData, readSellerOperationsStore } from "@/lib/store-projections";

export default async function SellerInventoryPage() {
  const [{ ingredients, movements }, store] = await Promise.all([
    readSellerInventoryData(),
    readSellerOperationsStore(),
  ]);
  const lowStockCount = ingredients.filter(
    (ingredient) => ingredient.stock <= ingredient.lowStockThreshold,
  ).length;
  const itemLabelById = new Map([
    ...store.products.map((product) => [product.id, product.name] as const),
    ...ingredients.map((ingredient) => [ingredient.id, ingredient.name] as const),
  ]);

  return (
    <div className="grid gap-6">
      <section className="surface-card rounded-[2rem] p-6">
        <h1 className="font-display text-4xl">Inventory</h1>
        <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
          Form produksi, adjustment stock bahan, dan adjustment stock produk jadi tetap aktif.
          Halamannya aku balikin ke mode operasional, tapi tampilannya tetap ringkas buat skala
          produksi sekarang.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="surface-card rounded-[2rem] p-5">
          <p className="text-sm text-[color:var(--ink-700)]">Produk aktif</p>
          <p className="mt-2 text-3xl font-black text-[color:var(--brand-900)]">
            {store.products.length}
          </p>
        </div>
        <div className="surface-card rounded-[2rem] p-5">
          <p className="text-sm text-[color:var(--ink-700)]">Bahan dipantau</p>
          <p className="mt-2 text-3xl font-black text-[color:var(--brand-900)]">
            {ingredients.length}
          </p>
        </div>
        <div className="surface-card rounded-[2rem] p-5">
          <p className="text-sm text-[color:var(--ink-700)]">Low stock</p>
          <p className="mt-2 text-3xl font-black text-[color:var(--brand-900)]">
            {lowStockCount}
          </p>
        </div>
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
              placeholder="Jumlah pack yang diproduksi"
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
              {ingredients.map((ingredient) => (
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

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="surface-card rounded-[2rem] p-6">
          <h2 className="font-display text-2xl">Product stock</h2>
          <div className="mt-4 grid gap-3">
            {store.productStocks.map((productStock) => {
              const product = store.products.find((item) => item.id === productStock.productId);
              const low = productStock.stock <= productStock.lowStockThreshold;

              return (
                <div key={productStock.productId} className="rounded-[1.5rem] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-[color:var(--brand-900)]">
                      {product?.name ?? productStock.productId}
                    </span>
                    <span className="font-black">{productStock.stock} pack</span>
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--ink-700)]">
                    Low stock alert di {productStock.lowStockThreshold} pack
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--ink-700)]">
                    {low ? "Perlu dicek ulang stok jadi." : "Stok masih aman."}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="surface-card rounded-[2rem] p-6">
          <h2 className="font-display text-2xl">Ingredient stock</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {ingredients.map((ingredient) => {
              const low = ingredient.stock <= ingredient.lowStockThreshold;

              return (
                <div key={ingredient.id} className="rounded-[1.5rem] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-[color:var(--brand-900)]">{ingredient.name}</p>
                      <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                        {ingredient.stock} {ingredient.unit}
                      </p>
                    </div>
                    <span
                      className={`pill ${
                        low
                          ? "bg-[#fff0ee] text-[#b91c1c]"
                          : "bg-[color:var(--paper-100)] text-[color:var(--brand-900)]"
                      }`}
                    >
                      {low ? "Cek stok" : "Aman"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--ink-700)]">
                    Ambang minimum {ingredient.lowStockThreshold} {ingredient.unit}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="surface-card rounded-[2rem] p-6">
        <h2 className="font-display text-2xl">Recent movements</h2>
        {movements.length ? (
          <div className="mt-4 grid gap-3">
            {movements.map((movement) => (
              <div key={movement.id} className="rounded-[1.5rem] bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-[color:var(--brand-900)]">
                      {itemLabelById.get(movement.itemId) ?? movement.itemId}
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                      {movement.itemType} - {movement.type}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-black text-[color:var(--brand-900)]">
                      {movement.quantity > 0 ? "+" : ""}
                      {movement.quantity}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--ink-700)]">
                      {formatDateTime(movement.createdAt)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-[color:var(--ink-700)]">{movement.note}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-7 text-[color:var(--ink-700)]">
            Belum ada mutasi terakhir yang perlu ditampilkan.
          </p>
        )}
      </section>
    </div>
  );
}
