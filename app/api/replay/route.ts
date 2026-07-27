import { NextResponse } from "next/server";
import { replay_walker } from "@/lib/scamgraph/engine";

export async function GET() {
  return NextResponse.json(replay_walker());
}
