"use client";
import { NomosProductShell, GoalsDemo, Sun, ClipboardCheck, FileText, Swords } from "@nomos/ui";
const navigation = [
  { slug: "today", label: "Today", href: "/today/", icon: Sun },
  { slug: "week", label: "Week", href: "/week/", icon: ClipboardCheck },
  { slug: "quests", label: "Quests", href: "/quests/", icon: Swords },
  { slug: "reports", label: "Reports", href: "/reports/", icon: FileText },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  return <NomosProductShell title="Goals" assistantPage="Goals" appSlug="goals" navigation={navigation}><GoalsDemo>{children}</GoalsDemo></NomosProductShell>;
}
