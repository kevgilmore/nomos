import { NOMOS_URLS } from "@nomos/auth";

export const appConfig = {
  slug: "base",
  name: "Base",
  brandName: "Nomos",
  description: "The reusable Nomos base application.",
  homePath: "/",
  homeUrl: NOMOS_URLS.home,
} as const;
