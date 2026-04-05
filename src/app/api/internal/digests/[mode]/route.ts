import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  type ScheduledDigestMode,
  runScheduledDigest,
} from "@/lib/report-digests";

type RouteContext = {
  params: Promise<{
    mode: string;
  }>;
};

function isScheduledMode(value: string): value is ScheduledDigestMode {
  return value === "weekly" || value === "monthly" || value === "inactivity";
}

function readSecret(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  return bearer || request.headers.get("x-cron-secret")?.trim() || "";
}

async function handleDigestRequest(request: Request, context: RouteContext) {
  const { mode } = await context.params;

  if (!isScheduledMode(mode)) {
    return NextResponse.json({ error: "Unknown digest mode." }, { status: 404 });
  }

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

  const result = await runScheduledDigest(mode);

  revalidatePath("/seller");
  revalidatePath("/seller/reports");

  return NextResponse.json({
    ok: true,
    ...result,
  });
}

export async function GET(request: Request, context: RouteContext) {
  return handleDigestRequest(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return handleDigestRequest(request, context);
}
