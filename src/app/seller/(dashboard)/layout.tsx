import { SellerShell } from "@/components/seller-shell";
import { requireSellerSession } from "@/lib/auth";
import { readStore } from "@/lib/data-store";

export default async function SellerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSellerSession();
  const store = await readStore();

  return (
    <SellerShell
      unreadNotifications={
        store.notifications.filter((notification) => !notification.read).length
      }
    >
      {children}
    </SellerShell>
  );
}
