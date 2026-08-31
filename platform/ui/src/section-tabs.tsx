"use client";

import Link from "next/link";

export type SectionTab = { slug: string; label: string };

export function SectionTabs({ pageSlug, tabs, activeTab }: { pageSlug: string; tabs: SectionTab[]; activeTab: string }) {
  return <header className="mb-7"><nav aria-label="Section tabs" className="flex gap-6 overflow-x-auto">{tabs.map((tab) => { const selected = tab.slug === activeTab; const href = `/${pageSlug}/${tab.slug}`; return <Link key={tab.slug} href={href} aria-current={selected ? "page" : undefined} className={`relative min-h-11 whitespace-nowrap px-0.5 py-3 text-sm font-medium ${selected ? "text-[var(--foreground)] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}>{tab.label}</Link>; })}</nav></header>;
}
