import { ChartNoAxesCombined, Dumbbell, LibraryBig, LayoutDashboard, type LucideIcon } from "lucide-react";

export type PageConfig = { slug: string; label: string; description: string; icon: LucideIcon; tabs: { slug: string; label: string }[] };
export const pages: PageConfig[] = [
  { slug: "dashboard", label: "Overview", description: "Your ULPPL week at a glance.", icon: LayoutDashboard, tabs: [{ slug: "overview", label: "This week" }, { slug: "history", label: "Recent sessions" }] },
  { slug: "workouts", label: "Routines", description: "View and edit the five routines in your ULPPL plan.", icon: Dumbbell, tabs: [{ slug: "plan", label: "My ULPPL" }, { slug: "exercises", label: "Exercise index" }] },
  { slug: "progress", label: "Progress", description: "See training volume and consistency.", icon: ChartNoAxesCombined, tabs: [{ slug: "trends", label: "Training trends" }] },
  { slug: "exercises", label: "Exercises", description: "Browse exercise details and demonstrations.", icon: LibraryBig, tabs: [{ slug: "library", label: "All exercises" }] },
];

export function getPage(pageSlug: string) { return pages.find((page) => page.slug === pageSlug); }
