import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Risol Club",
    template: "%s | Risol Club",
  },
  description:
    "Mobile-first handmade risol storefront with a cozy pre-order flow for pickup or local delivery.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    title: "Risol Club",
    capable: true,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      {
        url: "/brand/logo-red-transparent.png?v=4",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/brand/logo-red-transparent.png?v=4",
        type: "image/png",
      },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full bg-[color:var(--paper-100)] text-[color:var(--ink-900)]">
        {children}
      </body>
    </html>
  );
}
