import { NOMOS_URLS } from "@nomos/auth";

export const appConfig = {
  slug: "base",
  name: "Base",
  brandName: "Nomos",
  description: "The reusable Nomos base application.",
  homePath: "/mission-control/pulse-check",
  homeUrl: NOMOS_URLS.home,
} as const;
