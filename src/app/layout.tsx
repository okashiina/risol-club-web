import type { Metadata } from "next";
import { DM_Sans, Gaegu } from "next/font/google";
import { getLocale } from "@/lib/i18n";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const gaegu = Gaegu({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-gaegu",
  display: "swap",
});

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
        url: "/brand/logo-white-bg.png?v=1",
        type: "image/png",
      },
    ],
    shortcut: [
      {
        url: "/brand/logo-white-bg.png?v=1",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/brand/logo-white-bg.png?v=1",
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
      className={`${dmSans.variable} ${gaegu.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[color:var(--paper-100)] text-[color:var(--ink-900)]">
        {children}
      </body>
    </html>
  );
}
