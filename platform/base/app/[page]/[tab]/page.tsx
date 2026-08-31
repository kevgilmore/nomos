import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionTabs } from "@nomos/ui";
import { UIShowcase } from "@/components/ui-showcase";
import { getPage, pages } from "@/lib/navigation";

export function generateStaticParams() { return pages.flatMap((page) => page.tabs.map((tab) => ({ page: page.slug, tab: tab.slug }))); }
export default async function PlatformPage({ params }: { params: Promise<{ page: string; tab: string }> }) { const { page: pageSlug, tab } = await params; const page = getPage(pageSlug); if (!page || !page.tabs.some((item) => item.slug === tab)) notFound(); return <AppShell><SectionTabs pageSlug={pageSlug} tabs={page.tabs} activeTab={tab}/><UIShowcase page={pageSlug} tab={tab}/></AppShell>; }
