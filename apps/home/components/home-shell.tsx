"use client";

import { NomosHomeShell } from "@nomos/ui";
import { NOMOS_APPS } from "@nomos/ui";

export function HomeShell({ children }: { children: React.ReactNode }) {
  return <NomosHomeShell navigation={NOMOS_APPS.map((app) => ({ ...app, href: app.href }))}>{children}</NomosHomeShell>;
}
