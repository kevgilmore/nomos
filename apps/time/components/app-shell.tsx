"use client";
import { NomosProductShell } from "@nomos/ui";
import { CalendarDays, Clock3, Palmtree, PieChart } from "lucide-react";
const navigation = [{ slug: "breakdown", label: "Breakdown", href: "/breakdown/", icon: PieChart }, { slug: "schedule", label: "Schedule", href: "/schedule/", icon: Clock3 }, { slug: "calendar", label: "Calendar", href: "/calendar/", icon: CalendarDays }, { slug: "holidays", label: "Holidays", href: "/holidays/", icon: Palmtree }];
export function AppShell({ children }: { children: React.ReactNode }) { return <NomosProductShell title="Time" assistantPage="Time" appSlug="time" navigation={navigation}>{children}</NomosProductShell>; }
