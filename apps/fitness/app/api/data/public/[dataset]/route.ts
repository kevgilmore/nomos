import { NextResponse } from "next/server";
import seedExercises from "@/data/exercises.json";
import { localPanPGymOverrides } from "@/lib/pan-p-gym-overrides";
import { isPanPGymMachineExercise } from "@/lib/exercises";

export const dynamic = "force-dynamic";

function localExercise(exercise: (typeof seedExercises)[number]) {
  const override = localPanPGymOverrides.get(exercise.slug);
  return override === undefined ? exercise : { ...exercise, supportedByPanPGym: override, panPGymManualOverride: true };
}

export async function GET(request: Request, { params }: { params: Promise<{ dataset: string }> }) {
  const { dataset: rawDataset } = await params;
  const dataset = rawDataset.replace(/\/+$/, "");
  const requestUrl = new URL(request.url);
  const local = ["localhost", "127.0.0.1", "0.0.0.0"].includes(requestUrl.hostname);
  if (dataset !== "fitnessExercises" || !local) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const searchParams = requestUrl.searchParams;
  const search = searchParams.get("search")?.trim().toLowerCase() || "";
  const muscle = searchParams.get("muscle")?.trim().toLowerCase() || "";
  const panPGym = searchParams.get("panPGym") === "true";
  const equipment = (searchParams.get("equipment") || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  const offset = Math.max(0, Number(searchParams.get("offset") || 0));
  const limit = Math.min(Math.max(1, Number(searchParams.get("limit") || 100)), 500);
  const sourceExercises = seedExercises.map(localExercise);
  const candidates = search || muscle || panPGym || equipment.length
    ? sourceExercises.filter((exercise) => (!panPGym || exercise.supportedByPanPGym === true) && (!muscle || exercise.muscles.some((item) => item.toLowerCase() === muscle)) && (!equipment.length || equipment.some((item) => item === "machine" ? isPanPGymMachineExercise(exercise) : (exercise.summary || "").split(" · ")[0].trim().toLowerCase() === item)) && (!search || [exercise.name, exercise.level, ...exercise.muscles, exercise.description].filter(Boolean).join(" ").toLowerCase().includes(search)))
    : sourceExercises;
  const items = candidates.slice(offset, offset + limit);
  return NextResponse.json({ items, hasMore: offset + items.length < candidates.length, nextOffset: offset + items.length, total: candidates.length });
}
