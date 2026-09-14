"use client";
import { NomosProductShell } from "@nomos/ui";
import { Compass, Lightbulb, Radio, Workflow } from "lucide-react";
const navigation = [{ slug: "pulse", label: "Pulse", href: "/pulse/", icon: Radio }, { slug: "ventures", label: "Ventures", href: "/ventures/", icon: Compass }, { slug: "ideas", label: "Ideas", href: "/ideas/", icon: Lightbulb }, { slug: "experimenter-workflow", label: "Experimenter Workflow", href: "/experimenter-workflow/", icon: Workflow }];
export function AppShell({ children }: { children: React.ReactNode }) { return <NomosProductShell title="Hustle" assistantPage="Hustle" appSlug="hustle" navigation={navigation}>{children}</NomosProductShell>; }
