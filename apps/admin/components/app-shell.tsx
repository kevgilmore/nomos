"use client";
import { NomosProductShell } from "@nomos/ui";
import { CalendarHeart, CheckSquare, FileClock, LayoutDashboard } from "lucide-react";
const navigation = [{ slug: "overview", label: "Overview", href: "/overview/", icon: LayoutDashboard }, { slug: "chores", label: "Chores", href: "/chores/", icon: CheckSquare }, { slug: "bills", label: "Bills", href: "/bills/", icon: FileClock }, { slug: "renewals", label: "Renewals", href: "/renewals/", icon: CalendarHeart }];
export function AppShell({ children }: { children: React.ReactNode }) { return <NomosProductShell title="Admin" assistantPage="Admin" appSlug="admin" navigation={navigation}>{children}</NomosProductShell>; }
