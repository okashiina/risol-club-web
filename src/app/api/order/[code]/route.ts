import { NextResponse } from "next/server";
import { getOrderByCode, orderMatchesCustomerName, readStore } from "@/lib/data-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const store = await readStore();
  const order = getOrderByCode(store, code);
  const customerName = new URL(_request.url).searchParams.get("name");

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (customerName && !orderMatchesCustomerName(order, customerName)) {
    return NextResponse.json({ error: "Customer name does not match" }, { status: 403 });
  }

  return NextResponse.json(order);
}
