"use client";

import { NomosProductShell } from "@nomos/ui";
import { pages } from "@/lib/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  return <NomosProductShell title="Base" assistantPage="Base" appSlug="base" navigation={pages.map((page) => ({ slug: page.slug, label: page.label, href: `/${page.slug}/${page.tabs[0].slug}`, icon: page.icon }))}>{children}</NomosProductShell>;
}
