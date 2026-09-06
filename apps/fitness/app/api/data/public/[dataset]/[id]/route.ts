import { NextResponse } from "next/server";
import seedExercises from "@/data/exercises.json";
import { localPanPGymOverrides } from "@/lib/pan-p-gym-overrides";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ dataset: string; id: string }> }) {
  const { dataset, id } = await params;
  const hostname = new URL(request.url).hostname;
  if (dataset !== "fitnessExercises" || !["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await request.json().catch(() => null) as { supportedByPanPGym?: unknown } | null;
  if (typeof body?.supportedByPanPGym !== "boolean") {
    return NextResponse.json({ error: "A supportedByPanPGym boolean is required" }, { status: 400 });
  }
  const slug = decodeURIComponent(id);
  const exercise = seedExercises.find((item) => item.slug === slug);
  if (!exercise) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  localPanPGymOverrides.set(slug, body.supportedByPanPGym);
  return NextResponse.json({ item: { ...exercise, supportedByPanPGym: body.supportedByPanPGym, panPGymManualOverride: true } });
}
