import { NOMOS_URLS } from "@nomos/auth";

export const appConfig = {
  slug: "fitness",
  name: "Fitness",
  brandName: "Nomos",
  description: "Plan workouts, track progress, and build healthy routines.",
  homePath: "/plan/",
  homeUrl: NOMOS_URLS.home,
} as const;
