"use client";
import { NomosProductShell } from "@nomos/ui";
import { Gift, Radio } from "lucide-react";
const navigation = [{ slug: "pulse", label: "Pulse", href: "/pulse/", icon: Radio }, { slug: "simplysent", label: "Simplysent", href: "/simplysent/", icon: Gift }];
export function AppShell({ children }: { children: React.ReactNode }) { return <NomosProductShell title="Hustle" assistantPage="Hustle" appSlug="hustle" navigation={navigation}>{children}</NomosProductShell>; }
