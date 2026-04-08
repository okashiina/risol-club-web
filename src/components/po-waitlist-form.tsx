"use client";

import { useState, useTransition } from "react";
import { Locale } from "@/lib/types";

type PoWaitlistFormProps = {
  locale: Locale;
};

export function PoWaitlistForm({ locale }: PoWaitlistFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error" | "idle">("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setMessageTone("idle");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      locale,
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      whatsapp: String(formData.get("whatsapp") ?? "").trim(),
    };

    startTransition(async () => {
      const response = await fetch("/api/po/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => null)) as
        | { message?: string; error?: string }
        | null;

      if (!response.ok) {
        setMessage(
          result?.error ??
            (locale === "en"
              ? "We couldn't save your details just yet"
              : "Data kamu belum kesimpan nih"),
        );
        setMessageTone("error");
        return;
      }

      setMessage(
        result?.message ??
          (locale === "en"
            ? "You're on the list and we'll nudge you when PO opens"
            : "Yay kamu udah masuk list, nanti pas PO buka kita kabarin"),
      );
      setMessageTone("success");
      form.reset();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div>
        <label className="label" htmlFor="po-name">
          {locale === "en" ? "Your name" : "Nama kamu"}
        </label>
        <input
          id="po-name"
          name="name"
          className="field"
          placeholder={locale === "en" ? "for example, Hana" : "contoh: Hana"}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="po-email">
          Email
        </label>
        <input
          id="po-email"
          name="email"
          type="email"
          className="field"
          placeholder="contoh: kamu@gmail.com"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="po-whatsapp">
          {locale === "en" ? "WhatsApp number" : "Nomor WhatsApp"}
        </label>
        <input
          id="po-whatsapp"
          name="whatsapp"
          className="field"
          placeholder="contoh: 08123456789"
          required
        />
      </div>

      {message ? (
        <p
          className={`rounded-[1.4rem] px-4 py-3 text-sm font-semibold ${
            messageTone === "success"
              ? "bg-[#eef7ec] text-[#2f6a39]"
              : "bg-[#fff2ef] text-[color:var(--brand-900)]"
          }`}
        >
          {message}
        </p>
      ) : null}

      <button type="submit" disabled={isPending} className="btn-primary px-5 py-4 font-bold">
        {isPending
          ? locale === "en"
            ? "Saving your spot..."
            : "Lagi nyimpen datamu..."
          : locale === "en"
            ? "Keep me posted"
            : "Kabarin aku ya"}
      </button>
    </form>
  );
}
