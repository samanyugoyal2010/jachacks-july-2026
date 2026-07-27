import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ ok: true, id: "demo-case", status: "reset" });
}
