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
import {
  calculateProductCost,
  getLatestIngredientPrice,
  getRecipeForProduct,
} from "@/lib/data-store";
import { formatCurrency } from "@/lib/reports";
import { readSellerOperationsStore } from "@/lib/store-projections";

const packagingPattern = /(plastic|sticker|container|bag|label|mika|box)/i;

function isPackagingIngredient(name: string) {
  return packagingPattern.test(name);
}

export default async function SellerCostingPage() {
  const store = await readSellerOperationsStore();
  const supplierById = new Map(store.suppliers.map((supplier) => [supplier.id, supplier]));
  const ingredientById = new Map(store.ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const priceEntries = [...store.ingredientSupplierPrices].sort((a, b) => {
    const effective = b.effectiveFrom.localeCompare(a.effectiveFrom);
    return effective === 0 ? b.createdAt.localeCompare(a.createdAt) : effective;
  });

  const packagingIngredients = store.ingredients.filter((ingredient) =>
    isPackagingIngredient(ingredient.name),
  );
  const coreIngredients = store.ingredients.filter(
    (ingredient) => !isPackagingIngredient(ingredient.name),
  );

  const productBreakdowns = store.products.map((product) => {
    const recipe = getRecipeForProduct(store, product.id);
    const stock = store.productStocks.find((entry) => entry.productId === product.id);
    const items =
      recipe?.items.map((item) => {
        const ingredient = ingredientById.get(item.ingredientId);
        const activePrice = getLatestIngredientPrice(store, item.ingredientId);
        return {
          id: item.ingredientId,
          ingredientName: ingredient?.name ?? "Bahan tidak ditemukan",
          quantity: item.quantity,
          unit: ingredient?.unit ?? "unit",
          estimatedCost: Math.round(item.quantity * (activePrice?.pricePerUnit ?? 0)),
          isPackaging: ingredient ? isPackagingIngredient(ingredient.name) : false,
        };
      }) ?? [];

    return {
      product,
      stock: stock?.stock ?? 0,
      lowStockThreshold: stock?.lowStockThreshold ?? 0,
      totalCost: calculateProductCost(store, product.id),
      coreCost: items
        .filter((item) => !item.isPackaging)
        .reduce((sum, item) => sum + item.estimatedCost, 0),
      packagingCost: items
        .filter((item) => item.isPackaging)
        .reduce((sum, item) => sum + item.estimatedCost, 0),
      items,
    };
  });

  const averagePackagingCost =
    productBreakdowns.length > 0
      ? Math.round(
          productBreakdowns.reduce((sum, entry) => sum + entry.packagingCost, 0) /
            productBreakdowns.length,
        )
      : 0;

  return (
    <div className="grid gap-6">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-[color:var(--paper-300)] bg-[radial-gradient(circle_at_top_left,_rgba(255,225,209,0.95),_rgba(255,248,242,0.96)_42%,_rgba(255,255,255,1)_78%)] p-6 shadow-[0_24px_80px_rgba(127,71,52,0.10)] sm:p-8">
        <div className="absolute inset-y-0 right-[-7rem] w-[16rem] rounded-full bg-[radial-gradient(circle,_rgba(127,71,52,0.15),_transparent_68%)] blur-2xl" />
        <div className="relative grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-white/70 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--brand-900)]">
              Costing Studio
            </span>
            <h1 className="mt-5 font-display text-4xl leading-none text-[color:var(--brand-900)] sm:text-5xl">
              HPP sekarang dipisah jelas:
              <span className="mt-2 block text-[color:#a85d39]">bahan inti, packaging, dan data operasional.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[color:var(--ink-700)] sm:text-base">
              CRUD tetap aktif, tapi cara bacanya aku geser jadi lebih operasional. Kamu bisa cek
              komposisi HPP per menu, lihat packaging sebagai komponen sendiri, lalu edit data
              langsung dari bawah.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-2">
            <div className="rounded-[1.8rem] border border-white/80 bg-white/85 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-700)]">
                Menu aktif
              </p>
              <p className="mt-3 font-display text-4xl text-[color:var(--brand-900)]">
                {productBreakdowns.length}
              </p>
            </div>
            <div className="rounded-[1.8rem] border border-white/80 bg-white/85 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-700)]">
                Bahan inti
              </p>
              <p className="mt-3 font-display text-4xl text-[color:var(--brand-900)]">
                {coreIngredients.length}
              </p>
            </div>
            <div className="rounded-[1.8rem] border border-white/80 bg-white/85 p-5 backdrop-blur sm:col-span-3 xl:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-700)]">
                    Rata-rata packaging
                  </p>
                  <p className="mt-3 font-display text-4xl text-[color:var(--brand-900)]">
                    {formatCurrency(averagePackagingCost)}
                  </p>
                </div>
                <div className="rounded-[1.25rem] bg-[color:var(--paper-100)] px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--ink-700)]">
                    Komponen
                  </p>
                  <p className="mt-1 text-lg font-black text-[color:var(--brand-900)]">
                    {packagingIngredients.length} packaging
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        {productBreakdowns.map((entry) => (
          <article
            key={entry.product.id}
            className="overflow-hidden rounded-[2.2rem] border border-[color:var(--paper-300)] bg-white shadow-[0_20px_70px_rgba(127,71,52,0.08)]"
          >
            <div className="grid gap-0 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="border-b border-[color:var(--paper-300)] bg-[linear-gradient(135deg,rgba(255,244,236,0.92),rgba(255,255,255,1))] p-6 xl:border-b-0 xl:border-r">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-lg">
                    <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:#a85d39]">
                      Recipe breakdown
                    </div>
                    <h2 className="mt-4 font-display text-3xl text-[color:var(--brand-900)]">
                      {entry.product.name}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
                      Estimasi HPP per pack isi {entry.product.packSize} pcs. Komponen recipe
                      dipisah jadi bahan inti dan packaging supaya margin lebih gampang dibaca.
                    </p>
                  </div>

                  <div className="rounded-[1.6rem] bg-[color:var(--brand-900)] px-5 py-4 text-white shadow-[0_16px_45px_rgba(74,43,31,0.18)]">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/70">HPP / pack</p>
                    <p className="mt-2 text-3xl font-black">{formatCurrency(entry.totalCost)}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.4rem] border border-white/70 bg-white/85 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--ink-700)]">
                      Bahan inti
                    </p>
                    <p className="mt-2 text-2xl font-black text-[color:var(--brand-900)]">
                      {formatCurrency(entry.coreCost)}
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] border border-white/70 bg-white/85 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--ink-700)]">
                      Packaging
                    </p>
                    <p className="mt-2 text-2xl font-black text-[color:var(--brand-900)]">
                      {formatCurrency(entry.packagingCost)}
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] border border-white/70 bg-white/85 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--ink-700)]">
                      Stock jadi
                    </p>
                    <p className="mt-2 text-2xl font-black text-[color:var(--brand-900)]">
                      {entry.stock} pack
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--ink-700)]">
                      Alert di {entry.lowStockThreshold} pack
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-6 lg:grid-cols-2">
                <div className="rounded-[1.8rem] border border-[color:rgba(168,93,57,0.18)] bg-[linear-gradient(180deg,rgba(255,248,243,1),rgba(255,255,255,1))] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:#a85d39]">
                        Bahan inti
                      </p>
                      <p className="mt-2 text-sm text-[color:var(--ink-700)]">Komponen rasa utama.</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-[color:var(--brand-900)]">
                      {formatCurrency(entry.coreCost)}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {entry.items.filter((item) => !item.isPackaging).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-[1.2rem] border border-[color:var(--paper-300)] bg-white px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[color:var(--brand-900)]">
                              {item.ingredientName}
                            </p>
                            <p className="mt-1 text-xs text-[color:var(--ink-700)]">
                              {item.quantity} {item.unit} per pcs
                            </p>
                          </div>
                          <span className="text-sm font-black text-[color:var(--brand-900)]">
                            {formatCurrency(item.estimatedCost)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.8rem] border border-[color:rgba(111,75,43,0.14)] bg-[linear-gradient(180deg,rgba(255,250,245,1),rgba(255,255,255,1))] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:#8d5b2b]">
                        Packaging
                      </p>
                      <p className="mt-2 text-sm text-[color:var(--ink-700)]">Komponen kemasan per pack.</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-[color:var(--brand-900)]">
                      {formatCurrency(entry.packagingCost)}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {entry.items.filter((item) => item.isPackaging).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-[1.2rem] border border-[color:var(--paper-300)] bg-white px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[color:var(--brand-900)]">
                              {item.ingredientName}
                            </p>
                            <p className="mt-1 text-xs text-[color:var(--ink-700)]">
                              {item.quantity} {item.unit} per pcs
                            </p>
                          </div>
                          <span className="text-sm font-black text-[color:var(--brand-900)]">
                            {formatCurrency(item.estimatedCost)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-6">
          <div className="rounded-[2.2rem] border border-[color:var(--paper-300)] bg-white p-6 shadow-[0_20px_70px_rgba(127,71,52,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:#a85d39]">
                  Input desk
                </p>
                <h2 className="mt-3 font-display text-3xl text-[color:var(--brand-900)]">
                  Update data inti
                </h2>
              </div>
              <div className="rounded-[1.3rem] bg-[color:var(--paper-100)] px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.15em] text-[color:var(--ink-700)]">
                  Supplier aktif
                </p>
                <p className="mt-1 text-xl font-black text-[color:var(--brand-900)]">
                  {store.suppliers.filter((supplier) => supplier.isActive).length}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <form action={addIngredientAction} className="rounded-[1.8rem] border border-[color:var(--paper-300)] bg-[color:var(--paper-100)] p-5">
                <h3 className="font-display text-2xl text-[color:var(--brand-900)]">Add ingredient</h3>
                <div className="mt-4 grid gap-4">
                  <input name="name" placeholder="Nama bahan" className="field" required />
                  <div className="grid gap-4 md:grid-cols-3">
                    <input name="unit" placeholder="Satuan" className="field" required />
                    <input name="stock" type="number" placeholder="Stock" className="field" />
                    <input name="lowStockThreshold" type="number" placeholder="Low stock" className="field" />
                  </div>
                  <select name="activeSupplierId" className="field">
                    <option value="">Pilih supplier aktif</option>
                    {store.suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                  <ActionButton className="rounded-full bg-[color:var(--brand-900)] px-5 py-4 font-bold text-white">
                    Save ingredient
                  </ActionButton>
                </div>
              </form>

              <form action={addSupplierAction} className="rounded-[1.8rem] border border-[color:var(--paper-300)] bg-[color:var(--paper-100)] p-5">
                <h3 className="font-display text-2xl text-[color:var(--brand-900)]">Add supplier</h3>
                <div className="mt-4 grid gap-4">
                  <input name="name" placeholder="Nama supplier" className="field" required />
                  <input name="contact" placeholder="Kontak" className="field" />
                  <textarea name="notes" placeholder="Catatan" className="field min-h-24" />
                  <ActionButton className="rounded-full bg-[color:var(--brand-900)] px-5 py-4 font-bold text-white">
                    Save supplier
                  </ActionButton>
                </div>
              </form>

              <form action={addSupplierPriceAction} className="rounded-[1.8rem] border border-[color:var(--paper-300)] bg-[color:var(--paper-100)] p-5">
                <h3 className="font-display text-2xl text-[color:var(--brand-900)]">Add supplier price</h3>
                <div className="mt-4 grid gap-4">
                  <select name="ingredientId" className="field" required>
                    <option value="">Pilih bahan</option>
                    {store.ingredients.map((ingredient) => (
                      <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>
                    ))}
                  </select>
                  <select name="supplierId" className="field" required>
                    <option value="">Pilih supplier</option>
                    {store.suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input name="pricePerUnit" type="number" step="0.01" placeholder="Harga per satuan" className="field" required />
                    <input name="effectiveFrom" type="date" className="field" required />
                  </div>
                  <textarea name="notes" className="field min-h-20" placeholder="Catatan perubahan" />
                  <ActionButton className="rounded-full bg-[color:var(--brand-900)] px-5 py-4 font-bold text-white">
                    Save price history
                  </ActionButton>
                </div>
              </form>

              <form action={upsertRecipeItemAction} className="rounded-[1.8rem] border border-[color:var(--paper-300)] bg-[color:var(--paper-100)] p-5">
                <h3 className="font-display text-2xl text-[color:var(--brand-900)]">Update recipe item</h3>
                <div className="mt-4 grid gap-4">
                  <select name="productId" className="field" required>
                    <option value="">Pilih produk</option>
                    {store.products.map((product) => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                  <select name="ingredientId" className="field" required>
                    <option value="">Pilih bahan</option>
                    {store.ingredients.map((ingredient) => (
                      <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>
                    ))}
                  </select>
                  <input name="quantity" type="number" step="0.01" placeholder="Quantity per pcs" className="field" required />
                  <ActionButton className="rounded-full bg-[color:var(--brand-900)] px-5 py-4 font-bold text-white">
                    Save recipe item
                  </ActionButton>
                </div>
              </form>
            </div>
          </div>

          <div className="rounded-[2.2rem] border border-[color:var(--paper-300)] bg-white p-6 shadow-[0_20px_70px_rgba(127,71,52,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:#a85d39]">
                  Master data
                </p>
                <h2 className="mt-3 font-display text-3xl text-[color:var(--brand-900)]">
                  Ingredients
                </h2>
              </div>
              <span className="rounded-full bg-[color:var(--paper-100)] px-4 py-2 text-sm font-semibold text-[color:var(--brand-900)]">
                {store.ingredients.length} item
              </span>
            </div>

            <div className="mt-6 grid gap-3">
              {store.ingredients.map((ingredient) => (
                <div
                  key={ingredient.id}
                  className="rounded-[1.45rem] border border-[color:var(--paper-300)] bg-[color:var(--paper-100)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-[color:var(--brand-900)]">{ingredient.name}</p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-700)]">
                          {isPackagingIngredient(ingredient.name) ? "Packaging" : "Bahan inti"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                        Stock {ingredient.stock} {ingredient.unit} - Low stock{" "}
                        {ingredient.lowStockThreshold} {ingredient.unit}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--ink-700)]">
                        Supplier aktif:{" "}
                        {store.suppliers.find((supplier) => supplier.id === ingredient.activeSupplierId)
                          ?.name ?? "-"}
                      </p>
                    </div>
                    <form action={deleteIngredientAction}>
                      <input type="hidden" name="ingredientId" value={ingredient.id} />
                      <ActionButton className="rounded-full border border-[#f2c6c2] bg-white px-3 py-2 text-xs font-bold text-[color:var(--brand-900)]">
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
                      <input name="name" defaultValue={ingredient.name} className="field" required />
                      <div className="grid gap-3 md:grid-cols-3">
                        <input name="unit" defaultValue={ingredient.unit} className="field" required />
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
        </div>

        <div className="grid gap-6">
          <div className="rounded-[2.2rem] border border-[color:var(--paper-300)] bg-white p-6 shadow-[0_20px_70px_rgba(127,71,52,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:#a85d39]">
                  Ingredient board
                </p>
                <h2 className="mt-3 font-display text-3xl text-[color:var(--brand-900)]">
                  Ingredient snapshot
                </h2>
              </div>
              <span className="rounded-full bg-[color:var(--paper-100)] px-4 py-2 text-sm font-semibold text-[color:var(--brand-900)]">
                {store.ingredients.length} item
              </span>
            </div>
            <div className="mt-6 grid gap-3">
              {[...coreIngredients, ...packagingIngredients].map((ingredient) => {
                const activePrice = getLatestIngredientPrice(store, ingredient.id);
                const supplier = ingredient.activeSupplierId
                  ? supplierById.get(ingredient.activeSupplierId)
                  : undefined;
                const packaging = isPackagingIngredient(ingredient.name);

                return (
                  <div
                    key={ingredient.id}
                    className="rounded-[1.45rem] border border-[color:var(--paper-300)] bg-[color:var(--paper-100)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-[color:var(--brand-900)]">{ingredient.name}</p>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-700)]">
                            {packaging ? "Packaging" : "Bahan inti"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-[color:var(--ink-700)]">
                          Supplier aktif: {supplier?.name ?? "-"}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--ink-700)]">
                          Stock {ingredient.stock} {ingredient.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--ink-700)]">
                          Harga aktif
                        </p>
                        <p className="mt-2 text-lg font-black text-[color:var(--brand-900)]">
                          {formatCurrency(activePrice?.pricePerUnit ?? 0)}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--ink-700)]">
                          / {ingredient.unit}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2.2rem] border border-[color:var(--paper-300)] bg-white p-6 shadow-[0_20px_70px_rgba(127,71,52,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:#a85d39]">
                  Partner ledger
                </p>
                <h2 className="mt-3 font-display text-3xl text-[color:var(--brand-900)]">
                  Suppliers
                </h2>
              </div>
              <span className="rounded-full bg-[color:var(--paper-100)] px-4 py-2 text-sm font-semibold text-[color:var(--brand-900)]">
                {store.suppliers.length} supplier
              </span>
            </div>
            <div className="mt-6 grid gap-3">
              {store.suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="rounded-[1.45rem] border border-[color:var(--paper-300)] bg-[color:var(--paper-100)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-[color:var(--brand-900)]">{supplier.name}</p>
                      <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                        {supplier.contact || "Kontak dikosongkan"}
                      </p>
                      {supplier.notes ? (
                        <p className="mt-1 text-xs text-[color:var(--ink-700)]">{supplier.notes}</p>
                      ) : null}
                    </div>
                    <form action={deleteSupplierAction}>
                      <input type="hidden" name="supplierId" value={supplier.id} />
                      <ActionButton className="rounded-full border border-[#f2c6c2] bg-white px-3 py-2 text-xs font-bold text-[color:var(--brand-900)]">
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
                      <input name="name" defaultValue={supplier.name} className="field" required />
                      <input name="contact" defaultValue={supplier.contact} className="field" />
                      <textarea
                        name="notes"
                        defaultValue={supplier.notes}
                        className="field min-h-24"
                      />
                      <label className="flex items-center gap-3 rounded-[1rem] bg-white px-4 py-3 text-sm font-semibold text-[color:var(--ink-700)]">
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

          <div className="rounded-[2.2rem] border border-[color:var(--paper-300)] bg-white p-6 shadow-[0_20px_70px_rgba(127,71,52,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:#a85d39]">
                  Price ledger
                </p>
                <h2 className="mt-3 font-display text-3xl text-[color:var(--brand-900)]">
                  Supplier prices
                </h2>
              </div>
              <span className="rounded-full bg-[color:var(--paper-100)] px-4 py-2 text-sm font-semibold text-[color:var(--brand-900)]">
                {priceEntries.length} row
              </span>
            </div>
            <div className="mt-6 grid gap-3">
              {priceEntries.map((price) => {
                const ingredient = ingredientById.get(price.ingredientId);
                return (
                  <div
                    key={price.id}
                    className="rounded-[1.45rem] border border-[color:var(--paper-300)] bg-[color:var(--paper-100)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-[color:var(--brand-900)]">
                            {ingredient?.name ?? "-"}
                          </p>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-700)]">
                            {ingredient && isPackagingIngredient(ingredient.name)
                              ? "Packaging"
                              : "Bahan inti"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                          {supplierById.get(price.supplierId)?.name ?? "-"}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--ink-700)]">
                          Berlaku {price.effectiveFrom} - {formatCurrency(price.pricePerUnit)} /{" "}
                          {ingredient?.unit ?? "unit"}
                        </p>
                      </div>
                      <form action={deleteSupplierPriceAction}>
                        <input type="hidden" name="priceId" value={price.id} />
                        <ActionButton className="rounded-full border border-[#f2c6c2] bg-white px-3 py-2 text-xs font-bold text-[color:var(--brand-900)]">
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
                        <select
                          name="ingredientId"
                          defaultValue={price.ingredientId}
                          className="field"
                          required
                        >
                          {store.ingredients.map((ingredientOption) => (
                            <option key={ingredientOption.id} value={ingredientOption.id}>
                              {ingredientOption.name}
                            </option>
                          ))}
                        </select>
                        <select
                          name="supplierId"
                          defaultValue={price.supplierId}
                          className="field"
                          required
                        >
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
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
