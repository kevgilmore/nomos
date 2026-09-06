"use client";

import { useEffect } from "react";
import { NomosProductShell } from "@nomos/ui";
import { cacheFitnessAgentContext, FITNESS_AGENT_CONTEXT_KEY, FITNESS_AGENT_CONTEXT_VERSION } from "@/lib/agent-context";
import { fetchHevyRoutines } from "@/lib/hevy-client";
import { pages } from "@/lib/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.location.pathname.startsWith("/plan")) return;
    try {
      const cached = JSON.parse(window.localStorage.getItem(FITNESS_AGENT_CONTEXT_KEY) || "null") as { savedAt?: string; version?: number } | null;
      if (cached?.version === FITNESS_AGENT_CONTEXT_VERSION && cached.savedAt && Date.now() - Date.parse(cached.savedAt) < 5 * 60 * 1000) return;
    } catch {
      // Ignore malformed context and refresh it below.
    }
    fetchHevyRoutines().then((routines) => cacheFitnessAgentContext(routines)).catch(() => undefined);
  }, []);
  return <NomosProductShell title="Fitness" assistantPage="Fitness" assistantContextStorageKey={FITNESS_AGENT_CONTEXT_KEY} assistantProposalStorageKey="nomos-fitness-plan-proposal" appSlug="fitness" navigation={pages.map((page) => ({ slug: page.slug, label: page.label, href: `/${page.slug}/`, icon: page.icon }))}>{children}</NomosProductShell>;
}
