import { notFound } from "next/navigation";
import { ExerciseLibrary } from "@/components/exercise-library";
import { FitnessPlan } from "@/components/fitness-plan";
import { DietPage } from "@/components/diet-page";
import { ProgressPage } from "@/components/progress-page";
import type { HevyRoutine } from "@/lib/hevy-types";
import { getPage, pages } from "@/lib/navigation";

export function generateStaticParams() {
  return pages.map((page) => ({ page: page.slug }));
}

export default async function FitnessPage({ params }: { params: Promise<{ page: string }> }) {
  const { page: pageSlug } = await params;
  const page = getPage(pageSlug);
  if (!page) notFound();
  const routines: HevyRoutine[] = [];
  const error: string | null = null;
  return pageSlug === "exercises" ? <ExerciseLibrary /> : pageSlug === "diet" ? <DietPage /> : pageSlug === "progress" ? <ProgressPage /> : <FitnessPlan initialRoutines={routines} initialError={error} />;
}
