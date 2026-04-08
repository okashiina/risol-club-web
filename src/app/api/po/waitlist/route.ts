import { NextResponse } from "next/server";
import { z } from "zod";
import { writeStore } from "@/lib/data-store";
import { upsertPoWaitlistSubscriber } from "@/lib/po-workflows";

const waitlistSchema = z.object({
  locale: z.enum(["id", "en"]).optional().default("id"),
  name: z.string().trim().min(2),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  whatsapp: z.string().trim().min(8),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = waitlistSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Isi nama, email, dan nomor WhatsApp yang valid dulu ya",
      },
      { status: 400 },
    );
  }

  const { locale } = parsed.data;

  let resultStatus: "created" | "updated" = "created";

  await writeStore((store) => {
    const result = upsertPoWaitlistSubscriber(store, parsed.data);
    resultStatus = result.status;
    return store;
  });

  return NextResponse.json({
    ok: true,
    status: resultStatus,
    message:
      resultStatus === "created"
        ? locale === "en"
          ? "Yay you're on the list, we'll let you know when PO is back"
          : "Asik kamu udah masuk list, nanti pas PO buka kita kabarin"
        : locale === "en"
          ? "You're already on the list, we just freshened up your details"
          : "Kamu udah masuk list kok, datanya barusan kita rapihin biar kabarnya tetap nyampe",
  });
}
