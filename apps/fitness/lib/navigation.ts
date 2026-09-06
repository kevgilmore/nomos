import { Apple, Dumbbell, LibraryBig, TrendingUp, type LucideIcon } from "lucide-react";

export type PageConfig = { slug: string; label: string; description: string; icon: LucideIcon; tabs: { slug: string; label: string }[] };
export const pages: PageConfig[] = [
  { slug: "progress", label: "Progress", description: "Track your journey toward your physique and strength goals.", icon: TrendingUp, tabs: [{ slug: "overview", label: "Progress" }] },
  { slug: "plan", label: "Workout Plan", description: "Your current routines with exercise guidance and targets.", icon: Dumbbell, tabs: [{ slug: "current", label: "Workout Plan" }] },
  { slug: "exercises", label: "Exercises", description: "Browse exercise details and demonstrations.", icon: LibraryBig, tabs: [{ slug: "library", label: "Exercise library" }] },
  { slug: "diet", label: "Diet", description: "Plan meals and keep your nutrition targets in view.", icon: Apple, tabs: [{ slug: "overview", label: "Diet overview" }] },
];

export function getPage(pageSlug: string) { return pages.find((page) => page.slug === pageSlug); }
