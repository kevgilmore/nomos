"use client";

import { useMemo, useState } from "react";
import { Blocks, Search } from "lucide-react";
import { NomosLogo } from "@nomos/ui";
import { NOMOS_APPS } from "@nomos/ui";
import { NOMOS_URLS } from "@nomos/auth";

export function HomePage() {
  const [query, setQuery] = useState("");
  const apps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const appsWithBase = [...NOMOS_APPS, { slug: "base", label: "Base", href: NOMOS_URLS.base, icon: Blocks }];
    return appsWithBase.filter((app) => (normalizedQuery.length >= 4 || !["template", "base"].includes(app.slug)) && app.label.toLowerCase().includes(normalizedQuery)).slice(0, 5);
  }, [query]);

  function openApp(app: (typeof NOMOS_APPS)[number]) {
    window.location.assign(app.href);
  }

  return <section className="mx-auto flex min-h-[calc(100dvh-9rem)] w-full max-w-4xl flex-col items-center justify-center px-2 pb-8 text-center">
    <div className="mb-8"><NomosLogo compact /></div>
    <h2 className="text-4xl font-semibold tracking-[-.05em] md:text-6xl">Welcome to Nomos</h2>
    <label htmlFor="nomos-home-search" className="sr-only">Search Nomos apps</label>
    <div className="mt-8 flex h-14 w-full max-w-xl items-center gap-3 rounded-full bg-[var(--card)] px-5 shadow-[0_8px_30px_rgba(0,0,0,.16)] ring-1 ring-[color-mix(in_srgb,var(--border)_55%,transparent)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--ring)_55%,transparent)]"><Search className="size-5 shrink-0 text-[var(--muted-foreground)]"/><input id="nomos-home-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your apps" className="nomos-home-search min-w-0 flex-1 bg-transparent text-base outline-none focus:outline-none focus-visible:outline-none placeholder:text-[var(--muted-foreground)] sm:text-sm"/></div>
    <div className="mt-10 w-full"><p className="mb-4 text-left text-xs font-semibold uppercase tracking-[.16em] text-[var(--muted-foreground)]">Frequent apps</p><div className="grid grid-cols-5 gap-2 md:gap-3">{apps.map((app) => { const Icon = app.icon; return <button key={app.label} onClick={() => openApp(app)} disabled={!app.href} className="group flex min-w-0 flex-col items-center gap-2 rounded-2xl bg-[var(--card)] px-1 py-4 text-xs font-medium text-[var(--foreground)] shadow-[0_5px_18px_rgba(0,0,0,.1)] ring-1 ring-transparent transition-colors hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-default disabled:opacity-60"><span className="grid size-10 place-items-center rounded-xl bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-foreground)]"><Icon className="size-5" strokeWidth={1.8}/></span><span className="truncate">{app.label}</span></button>; })}</div>{apps.length === 0 && <p className="py-6 text-sm text-[var(--muted-foreground)]">No frequent apps found.</p>}</div>
  </section>;
}
