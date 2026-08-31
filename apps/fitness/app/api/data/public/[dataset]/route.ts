import { NextResponse } from "next/server";
import seedExercises from "@/data/exercises.json";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ dataset: string }> }) {
  const { dataset: rawDataset } = await params;
  const dataset = rawDataset.replace(/\/+$/, "");
  const requestUrl = new URL(request.url);
  const local = ["localhost", "127.0.0.1", "0.0.0.0"].includes(requestUrl.hostname);
  if (dataset !== "fitnessExercises" || !local) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const search = new URL(request.url).searchParams.get("search")?.trim().toLowerCase() || "";
  const offset = Math.max(0, Number(new URL(request.url).searchParams.get("offset") || 0));
  const limit = Math.min(Math.max(1, Number(new URL(request.url).searchParams.get("limit") || 100)), 500);
  const candidates = search
    ? seedExercises.filter((exercise) => [exercise.name, exercise.level, ...exercise.muscles, exercise.description].filter(Boolean).join(" ").toLowerCase().includes(search))
    : seedExercises;
  const items = candidates.slice(offset, offset + limit);
  return NextResponse.json({ items, hasMore: offset + items.length < candidates.length, nextOffset: offset + items.length, total: candidates.length });
}
