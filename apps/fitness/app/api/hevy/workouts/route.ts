import { NextResponse } from "next/server";
import { getRecentWorkouts } from "@/lib/hevy";

export async function GET() {
  try {
    return NextResponse.json({ workouts: await getRecentWorkouts() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load workouts" }, { status: 502 });
  }
}
