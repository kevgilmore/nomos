"use client";
import { NomosProductShell } from "@nomos/ui";
import { Banknote, ChartNoAxesCombined, Compass, PiggyBank } from "lucide-react";
const navigation = [{ slug: "horizon", label: "Horizon", href: "/horizon/", icon: Compass }, { slug: "budget", label: "Budget", href: "/budget/", icon: PiggyBank }, { slug: "cashflow", label: "Cashflow", href: "/cashflow/", icon: ChartNoAxesCombined }, { slug: "invest", label: "Invest", href: "/invest/", icon: Banknote }];
export function AppShell({ children }: { children: React.ReactNode }) { return <NomosProductShell title="Finance" assistantPage="Finance" appSlug="finance" navigation={navigation}>{children}</NomosProductShell>; }
