"use client";
import { NomosProductShell } from "@nomos/ui";
export function AppShell({ children }: { children: React.ReactNode }) { return <NomosProductShell title="Finance" assistantPage="Finance" appSlug="finance">{children}</NomosProductShell>; }
