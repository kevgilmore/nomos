import { NextRequest, NextResponse } from "next/server";
import { updateMyRoutines, type HevyRoutine } from "@/lib/hevy";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { routines?: HevyRoutine[]; routineIds?: string[] };
    if (!Array.isArray(body.routines) || !body.routines.length || body.routines.some((routine) => !routine || typeof routine.id !== "string" || !Array.isArray(routine.exercises))) {
      return NextResponse.json({ error: "Invalid suggested routines" }, { status: 400 });
    }
    return NextResponse.json(await updateMyRoutines(body.routines, Array.isArray(body.routineIds) ? body.routineIds : []));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save My Routines changes" }, { status: 502 });
  }
}
