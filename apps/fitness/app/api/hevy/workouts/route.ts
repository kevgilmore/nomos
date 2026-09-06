import { NextResponse } from "next/server";
import { getRecentWorkouts, getWorkoutHistory } from "@/lib/hevy";

export async function GET(request: Request) {
  try {
    const workouts = new URL(request.url).searchParams.get("history") === "true" ? await getWorkoutHistory() : await getRecentWorkouts();
    return NextResponse.json({ workouts });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load workouts" }, { status: 502 });
  }
}
