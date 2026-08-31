import { notFound } from "next/navigation";
import { SectionTabs } from "@nomos/ui";
import { FitnessDashboard } from "@/components/fitness-dashboard";
import type { HevyRoutine, HevyWorkout } from "@/lib/hevy-types";
import { getPage, pages } from "@/lib/navigation";

export function generateStaticParams() { return pages.flatMap((page) => page.tabs.map((tab) => ({ page: page.slug, tab: tab.slug }))); }
export default async function PlatformPage({ params }: { params: Promise<{ page: string; tab: string }> }) {
  const { page: pageSlug, tab } = await params;
  const page = getPage(pageSlug);
  if (!page || !page.tabs.some((item) => item.slug === tab)) notFound();
  const routines: HevyRoutine[] = [];
  const workouts: HevyWorkout[] = [];
  const error: string | null = null;
  return <><SectionTabs pageSlug={pageSlug} tabs={page.tabs} activeTab={tab}/><FitnessDashboard key={`${pageSlug}/${tab}`} page={pageSlug} tab={tab} initialRoutines={routines} workouts={workouts} initialError={error}/></>;
}
