import { SellerShell } from "@/components/seller-shell";
import { requireSellerSession } from "@/lib/auth";
import { readSellerUnreadNotificationCount } from "@/lib/store-projections";

export default async function SellerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSellerSession();
  const unreadNotifications = await readSellerUnreadNotificationCount();

  return (
    <SellerShell unreadNotifications={unreadNotifications}>
      {children}
    </SellerShell>
  );
}
