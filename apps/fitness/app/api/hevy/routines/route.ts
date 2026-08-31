import { NextResponse } from "next/server";
import { getULPPLRoutines } from "@/lib/hevy";

export async function GET() {
  try {
    return NextResponse.json({ routines: await getULPPLRoutines() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load routines" }, { status: 502 });
  }
}
