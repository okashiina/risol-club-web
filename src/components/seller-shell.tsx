import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

type SellerShellProps = {
  children: React.ReactNode;
  unreadNotifications: number;
};

const navItems = [
  { href: "/seller", label: "Overview" },
  { href: "/seller/orders", label: "Orders" },
  { href: "/seller/menu", label: "Menu" },
  { href: "/seller/costing", label: "Costing" },
  { href: "/seller/inventory", label: "Inventory" },
  { href: "/seller/reports", label: "Reports" },
];

export function SellerShell({
  children,
  unreadNotifications,
}: SellerShellProps) {
  return (
    <div className="min-h-screen bg-[color:var(--paper-100)]">
      <header className="sticky top-0 z-30 border-b border-[color:var(--paper-300)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <BrandLogo compact variant="seller" />
          <div className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--brand-700)] transition hover:bg-[color:var(--paper-100)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--paper-100)] px-4 py-2 text-sm font-semibold text-[color:var(--brand-900)]">
            Notifications
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[color:var(--brand-900)] px-2 py-0.5 text-xs text-white">
              {unreadNotifications}
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
        {children}
      </main>
      <nav className="safe-pb sticky bottom-0 z-20 border-t border-[color:var(--paper-300)] bg-white/95 px-2 py-2 backdrop-blur md:hidden">
        <div className="grid grid-cols-3 gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl px-3 py-3 text-center text-xs font-semibold text-[color:var(--brand-700)] hover:bg-[color:var(--paper-100)]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
