"use client";

import { BarChart3, CircleAlert, FileText, FormInput, LayoutGrid, MessageSquare, NomosProductShell, PanelRight, Sparkles } from "@nomos/ui";

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigation = [
    { slug: "overview", label: "Overview", href: "/", icon: LayoutGrid },
    { slug: "cards", label: "Cards", href: "/cards/basic/", icon: LayoutGrid },
    { slug: "forms", label: "Forms", href: "/forms/inputs/", icon: FormInput },
    { slug: "data", label: "Data", href: "/data/standard/", icon: FileText },
    { slug: "feedback", label: "Feedback", href: "/feedback/banners/", icon: MessageSquare },
    { slug: "overlays", label: "Overlays", href: "/overlays/modals/", icon: PanelRight },
    { slug: "charts", label: "Charts", href: "/charts/trends/", icon: BarChart3 },
    { slug: "actions", label: "Actions", href: "/actions/buttons/", icon: CircleAlert },
    { slug: "status", label: "Status", href: "/status/badges/", icon: LayoutGrid },
    { slug: "ai", label: "AI", href: "/ai/agent/", icon: Sparkles },
  ];
  return <NomosProductShell title="Template" assistantPage="Template" appSlug="template" navigation={navigation}>{children}</NomosProductShell>;
}
