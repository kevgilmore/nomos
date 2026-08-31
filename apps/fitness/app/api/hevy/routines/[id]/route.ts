import { NextRequest, NextResponse } from "next/server";
import { type HevyRoutine, updateULPPLRoutine } from "@/lib/hevy";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const routine = await request.json() as HevyRoutine;
    if (!routine || routine.id !== id || !Array.isArray(routine.exercises)) return NextResponse.json({ error: "Invalid routine" }, { status: 400 });
    return NextResponse.json({ routine: await updateULPPLRoutine(id, routine) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update routine" }, { status: 502 });
  }
}
