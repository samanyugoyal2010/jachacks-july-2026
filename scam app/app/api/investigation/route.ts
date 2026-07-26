import { NextResponse } from "next/server";
import { z } from "zod";
import { runInvestigation } from "@/lib/scamgraph/engine";

const answersSchema = z.object({
  contactedFirst: z.boolean().optional(),
  accountUnsafe: z.boolean().optional(),
  safeAccount: z.boolean().optional(),
  claimedBank: z.boolean().optional(),
  secrecy: z.boolean().optional(),
  urgency: z.boolean().optional(),
}).optional();

export async function GET() {
  return NextResponse.json(runInvestigation());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = answersSchema.safeParse(body.answers);
  if (!parsed.success) return NextResponse.json({ error: "Invalid answer schema" }, { status: 400 });
  return NextResponse.json(runInvestigation(parsed.data));
}
