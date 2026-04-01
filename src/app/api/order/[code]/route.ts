import { NextResponse } from "next/server";
import { getOrderByCode, readStore } from "@/lib/data-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const store = await readStore();
  const order = getOrderByCode(store, code);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}
