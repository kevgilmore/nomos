"use client";
import { NomosProductShell } from "@nomos/ui";
export function AppShell({ children }: { children: React.ReactNode }) { return <NomosProductShell title="Goals" assistantPage="Goals" appSlug="goals">{children}</NomosProductShell>; }
