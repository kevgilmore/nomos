import { Dumbbell, RadioTower } from "lucide-react";
import { NOMOS_URLS } from "@nomos/auth";

export const NOMOS_APPS = [
  ...(NOMOS_URLS.base ? [{ slug: "base", label: "Base", href: `${NOMOS_URLS.base}/dashboard/overview`, icon: RadioTower }] : []),
  { slug: "fitness", label: "Fitness", href: NOMOS_URLS.fitness, icon: Dumbbell },
] as const;
