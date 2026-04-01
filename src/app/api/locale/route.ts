import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { locale?: string };
  const locale = body.locale === "en" ? "en" : "id";
  const cookieStore = await cookies();

  cookieStore.set("rc-locale", locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ ok: true });
}
