import { Blocks, CalendarDays, CircleDollarSign, Dumbbell, Target } from "lucide-react";
import { generatedNomosApps } from "./nomos-apps.generated";

const knownIcons = { fitness: Dumbbell, template: Blocks, finance: CircleDollarSign, goals: Target, time: CalendarDays };
function isProductionHost() {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return hostname === "nomos.codes" || hostname.endsWith(".nomos.codes");
}
const production = process.env.NEXT_PUBLIC_NOMOS_ENV === "production" || isProductionHost();

export const NOMOS_APPS = generatedNomosApps
  .filter((app) => app.slug !== "home")
  .map((app) => ({ slug: app.slug, label: app.label, href: production ? app.productionHref : app.localHref, icon: knownIcons[app.slug as keyof typeof knownIcons] ?? Blocks }));
