import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { runPoScheduleSync } from "@/lib/po-workflows";

function readSecret(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  return bearer || request.headers.get("x-cron-secret")?.trim() || "";
}

async function handlePoSync(request: Request) {
  const configuredSecret = process.env.CRON_SECRET?.trim() || "";

  if (configuredSecret) {
    const providedSecret = readSecret(request);

    if (providedSecret !== configuredSecret) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET is required in production." },
      { status: 500 },
    );
  }

  const result = await runPoScheduleSync();

  revalidatePath("/");
  revalidatePath("/checkout");
  revalidatePath("/po-notice");
  revalidatePath("/seller");
  revalidatePath("/seller/po");

  return NextResponse.json({
    ok: true,
    ...result,
  });
}

export async function GET(request: Request) {
  return handlePoSync(request);
}

export async function POST(request: Request) {
  return handlePoSync(request);
}
