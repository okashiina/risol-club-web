import {
  Product,
  ProductImage,
  ProductVariant,
  ProductVariantType,
} from "@/lib/types";

const SMILING_HANDS_EMOJI = "\u{1F60A}\u{1F64C}";
const MIDDLE_DOT = "\u00b7";

export const DEFAULT_PACK_SIZE = 3;

type CatalogBlueprint = {
  canonicalSlug: string;
  legacySlugs: string[];
  names: string[];
  name: string;
  nameEn: string;
  shortDescription: string;
  shortDescriptionEn: string;
  description: string;
  descriptionEn: string;
  accent: string;
  prepLabel: string;
  prepLabelEn: string;
  images: string[];
  variants: Array<{
    type: ProductVariantType;
    label: string;
    price: number;
  }>;
};

export const CATALOG_BLUEPRINTS: CatalogBlueprint[] = [
  {
    canonicalSlug: "choco-cheese",
    legacySlugs: ["risol-coklat"],
    names: ["Risol Coklat", "Choco Cheese"],
    name: "Choco Cheese",
    nameEn: "Choco Cheese",
    shortDescription:
      "Cokelat renyah yang ketemu keju lembut, manis-gurihnya bikin susah berhenti.",
    shortDescriptionEn:
      "Chocolate crunch meets soft cheese in a sweet-savory pack that is hard to stop eating.",
    description:
      `Risol Choco Cheese hadir buat kamu yang suka dessert snack dengan tekstur playful. Ada sensasi crunchy cokelat, ada lembut keju, dan setiap 1 qty selalu datang dalam 1 pack isi 3 pcs yang cocok buat dibagi atau dimakan sendiri pelan-pelan ${SMILING_HANDS_EMOJI}`,
    descriptionEn:
      "Choco Cheese Risol is made for playful dessert-snack cravings. Expect a chocolate crunch, a soft cheese finish, and 1 order quantity always packed as 3 pieces for sharing or savoring slowly.",
    accent: "from-[#fff0df] via-white to-[#ffe4d8]",
    prepLabel: `Pre-order batch ${MIDDLE_DOT} 1 qty = 3 pcs`,
    prepLabelEn: `Pre-order batch ${MIDDLE_DOT} 1 qty = 3 pcs`,
    images: [
      "/catalog/choco-cheese/01.jpeg",
      "/catalog/choco-cheese/02.jpeg",
      "/catalog/choco-cheese/03.jpeg",
    ],
    variants: [
      { type: "frozen", label: "Frozen", price: 28000 },
      { type: "fried", label: "Fried", price: 30000 },
    ],
  },
  {
    canonicalSlug: "smoked-beef-mayo",
    legacySlugs: ["risol-mayo"],
    names: ["Risol Mayo", "Smoked Beef Mayo"],
    name: "Smoked Beef Mayo",
    nameEn: "Smoked Beef Mayo",
    shortDescription:
      "Isi smoked beef, mayo, cheese, dan egg yang gurih creamy dalam pack isi 3 pcs.",
    shortDescriptionEn:
      "A creamy savory trio with smoked beef, mayo, cheese, and egg in a 3-piece pack.",
    description:
      `Smoked Beef Mayo jadi menu comfort snack yang paling aman buat ramai-ramai. Rasanya gurih, creamy, dan familiar, dengan format 1 qty = 3 pcs jadi enak buat stok freezer ataupun langsung digoreng hangat buat nyemil sore ${SMILING_HANDS_EMOJI}`,
    descriptionEn:
      "Smoked Beef Mayo is the crowd-pleasing comfort snack: savory, creamy, familiar, and sold in 3-piece packs that work well for freezer stock or a warm fried snack.",
    accent: "from-[#ffe4dd] via-white to-[#ffd9c6]",
    prepLabel: `Pre-order batch ${MIDDLE_DOT} 1 qty = 3 pcs`,
    prepLabelEn: `Pre-order batch ${MIDDLE_DOT} 1 qty = 3 pcs`,
    images: [
      "/catalog/smoked-beef-mayo/01.jpeg",
      "/catalog/smoked-beef-mayo/02.jpeg",
      "/catalog/smoked-beef-mayo/03.jpeg",
    ],
    variants: [
      { type: "frozen", label: "Frozen", price: 28000 },
      { type: "fried", label: "Fried", price: 30000 },
    ],
  },
];

export function cloneVariants(
  variants: CatalogBlueprint["variants"],
): ProductVariant[] {
  return variants.map((variant) => ({ ...variant, isActive: true }));
}

export function cloneImages(paths: string[], name: string): ProductImage[] {
  return paths.map((url, index) => ({
    id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-image-${index + 1}`,
    url,
    alt: `${name} photo ${index + 1}`,
    position: index,
  }));
}

export function findCatalogBlueprint(product: Pick<Product, "slug" | "name">) {
  const slug = product.slug.trim().toLowerCase();
  const name = product.name.trim().toLowerCase();

  return CATALOG_BLUEPRINTS.find(
    (item) =>
      item.canonicalSlug === slug ||
      item.legacySlugs.includes(slug) ||
      item.names.map((candidate) => candidate.toLowerCase()).includes(name),
  );
}

export function findCatalogBlueprintBySlug(slugCandidate: string) {
  const slug = slugCandidate.trim().toLowerCase();

  return CATALOG_BLUEPRINTS.find(
    (item) => item.canonicalSlug === slug || item.legacySlugs.includes(slug),
  );
}

export function getActiveVariants(product: Product) {
  return product.variants.filter((variant) => variant.isActive);
}

export function getVariant(
  product: Product,
  type: ProductVariantType | undefined,
) {
  if (!type) {
    return undefined;
  }

  return product.variants.find((variant) => variant.type === type && variant.isActive);
}

export function getDisplayPrice(product: Product) {
  const [firstVariant] = getActiveVariants(product).sort((a, b) => a.price - b.price);
  return firstVariant?.price ?? product.price;
}

export function getPackSize(product: Product) {
  return Math.max(product.packSize || DEFAULT_PACK_SIZE, 1);
}

export function getPieceCount(product: Product, quantity: number) {
  return getPackSize(product) * quantity;
}
