import { cookies } from "next/headers";
import { Locale } from "@/lib/types";

export const dictionary = {
  id: {
    navHome: "Beranda",
    navMenu: "Menu",
    navCheckout: "Pesan",
    navSeller: "Seller",
    heroTitle: "Risol rumahan yang cantik, hangat, dan siap bantu jualan makin rapi.",
    heroBody:
      "Customer bisa lihat menu, order, dan upload bukti bayar. Seller bisa kelola menu, supplier, HPP, stok, dan laporan profit dalam satu dashboard.",
    heroPrimary: "Pesan sekarang",
    heroSecondary: "Lihat seller dashboard",
    sectionMenu: "Menu favorit",
    sectionFlow: "Flow order yang sederhana",
    sectionOps: "Yang seller bisa urus",
    flow1: "Pilih menu dan isi detail pre-order.",
    flow2: "Transfer manual lalu upload bukti bayar.",
    flow3: "Seller verifikasi, produksi, lalu update status.",
    ops1: "Tambah menu dan atur harga jual.",
    ops2: "Kelola bahan, supplier, dan histori perubahan harga.",
    ops3: "Pantau stok, omzet, HPP, dan gross profit.",
    checkoutTitle: "Checkout pre-order",
    orderTrackingTitle: "Tracking order",
    sellerLoginTitle: "Masuk ke seller dashboard",
    footerTag: "Handmade risol, seller-friendly operations.",
  },
  en: {
    navHome: "Home",
    navMenu: "Menu",
    navCheckout: "Checkout",
    navSeller: "Seller",
    heroTitle:
      "A warm, cute risol storefront with a seller dashboard built for smooth daily operations.",
    heroBody:
      "Customers can browse, order, and upload payment proof. The seller can manage menu items, suppliers, COGS, stock, and profit reporting in one place.",
    heroPrimary: "Place an order",
    heroSecondary: "Open seller dashboard",
    sectionMenu: "Featured menu",
    sectionFlow: "Simple order flow",
    sectionOps: "What the seller can manage",
    flow1: "Choose menu items and fill in pre-order details.",
    flow2: "Transfer manually and upload payment proof.",
    flow3: "The seller verifies, prepares, and updates status.",
    ops1: "Add menu items and set selling prices.",
    ops2: "Manage ingredients, suppliers, and price history.",
    ops3: "Track stock, revenue, COGS, and gross profit.",
    checkoutTitle: "Pre-order checkout",
    orderTrackingTitle: "Order tracking",
    sellerLoginTitle: "Seller dashboard login",
    footerTag: "Handmade risol, seller-friendly operations.",
  },
} as const;

export function getDictionary(locale: Locale) {
  return dictionary[locale];
}

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get("rc-locale")?.value;
  return value === "en" ? "en" : "id";
}
