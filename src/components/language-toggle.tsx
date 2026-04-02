"use client";

import { usePathname, useRouter } from "next/navigation";
import { Locale } from "@/lib/types";

type LanguageToggleProps = {
  locale: Locale;
};

export function LanguageToggle({ locale }: LanguageToggleProps) {
  const router = useRouter();
  const pathname = usePathname();

  async function switchLocale(nextLocale: Locale) {
    await fetch("/api/locale", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ locale: nextLocale }),
    });
    router.push(pathname);
    router.refresh();
  }

  return (
    <div className="inline-flex rounded-full border border-white/70 bg-white/70 p-1 text-xs font-semibold text-[color:var(--brand-700)] backdrop-blur">
      {(["id", "en"] as Locale[]).map((value) => (
        <button
          key={value}
          type="button"
          suppressHydrationWarning
          onClick={() => switchLocale(value)}
          className={`rounded-full px-3 py-2 transition ${
            locale === value
              ? "bg-[color:var(--brand-900)] text-white"
              : "hover:bg-[color:var(--paper-100)]"
          }`}
        >
          {value.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
