"use client";

import * as React from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger } from "@nomos/ui";
import { HustleFilters } from "@/components/analytics-filters";
import { SimplysentProjectDetailsButton } from "@/components/pulse-dashboard";

const factoryColumns = [
  { title: "Backlog", tone: "muted", tasks: [["Improve product matching", "Product", "SS-142"], ["Add gift occasion filters", "Discovery", "SS-151"]] },
  { title: "In progress", tone: "accent", tasks: [["MVE5 launch checklist", "Launch", "SS-138"], ["Search results tuning", "Search", "SS-145"]] },
  { title: "Review", tone: "muted", tasks: [["Recommendation card refresh", "Design", "SS-133"]] },
  { title: "Done", tone: "muted", tasks: [["Onboarding event tracking", "Analytics", "SS-129"], ["Merchant click attribution", "Analytics", "SS-124"]] },
] as const;

function FactoryBoard() {
  return <section aria-label="Factory kanban board" data-testid="factory-board" className="overflow-x-auto"><div className="grid min-w-max grid-cols-4 gap-3 pb-2">{factoryColumns.map((column) => <div key={column.title} className="w-64 min-w-0 rounded-xl bg-[var(--muted)]/50 p-3"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">{column.title}</h2><Badge variant="secondary">{column.tasks.length}</Badge></div><div className="space-y-2">{column.tasks.map(([title, category, key]) => <Card key={key}><CardContent className="space-y-3 p-3"><div className="flex items-start justify-between gap-2"><p className="text-sm font-medium leading-5">{title}</p><Button variant="ghost" size="icon" aria-label={`More actions for ${title}`} className="size-8 min-h-8 shrink-0">···</Button></div><div className="flex items-center justify-between gap-2"><Badge variant="secondary">{category}</Badge><span className="text-xs text-[var(--muted-foreground)]">{key}</span></div></CardContent></Card>)}</div></div>)}</div></section>;
}

const adMetrics = [
  { label: "CTR", value: "2.84%", change: "+0.32%" },
  { label: "CPC", value: "£0.46", change: "−£0.08" },
  { label: "Views", value: "128.4K", change: "+18.6%" },
  { label: "CPR", value: "£1.92", change: "−£0.21" },
  { label: "Result rate", value: "4.18%", change: "+0.44%" },
  { label: "Cost per engaged visitor", value: "£0.73", change: "−£0.12" },
];

function AdsManager() {
  const campaigns = [
    ["Gift guide · UK prospecting", "Active", "41.2K", "2.92%", "£0.42", "£1.74", "4.8%", "£0.68"],
    ["Shopping for a partner", "Active", "36.8K", "2.71%", "£0.48", "£1.96", "4.3%", "£0.76"],
    ["Last-minute gifting", "Learning", "28.6K", "3.08%", "£0.39", "£1.66", "4.6%", "£0.64"],
    ["Interest-led · home & lifestyle", "Paused", "21.8K", "2.54%", "£0.55", "£2.34", "3.7%", "£0.91"],
  ];
  return <div className="space-y-4" data-testid="ads-manager"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{adMetrics.map((metric) => <Card key={metric.label}><CardContent className="p-4"><p className="text-xs text-[var(--muted-foreground)]">{metric.label}</p><div className="mt-2 flex items-baseline justify-between gap-2"><p className="text-2xl font-semibold tracking-tight">{metric.value}</p><span className="text-xs text-[var(--ring)]">{metric.change}</span></div><p className="mt-1 text-xs text-[var(--muted-foreground)]">vs previous period</p></CardContent></Card>)}</div><Card><CardHeader className="flex-row items-center justify-between gap-3"><div><CardTitle>Campaigns</CardTitle><p className="mt-1 text-xs text-[var(--muted-foreground)]">Meta Ads · mock data · last 30 days</p></div><Button variant="outline" size="sm">All campaigns</Button></CardHeader><CardContent><div className="w-full overflow-x-auto"><table className="w-full min-w-max text-left text-sm"><thead className="text-xs text-[var(--muted-foreground)]"><tr>{["Campaign", "Delivery", "Views", "CTR", "CPC", "CPR", "Result rate", "Cost / engaged visitor"].map((heading) => <th key={heading} className="whitespace-nowrap pb-3 pr-4 font-medium">{heading}</th>)}</tr></thead><tbody>{campaigns.map((row) => <tr key={row[0]} className="border-t"><td className="whitespace-nowrap py-3 pr-4 font-medium">{row[0]}</td><td className="py-3 pr-4"><Badge variant="secondary">{row[1]}</Badge></td>{row.slice(2).map((value, index) => <td key={index} className="whitespace-nowrap py-3 pr-4">{value}</td>)}</tr>)}</tbody></table></div></CardContent></Card></div>;
}

function Funnel() {
  const stages = [
    ["Visitors", "4,820", 100],
    ["Started onboarding", "3,856", 80],
    ["Completed onboarding", "3,443", 71.4],
    ["Viewed recommendations", "3,095", 64.2],
    ["Opened a product", "1,350", 28],
    ["Clicked through to retailer", "896", 18.6],
  ] as const;
  return <Card data-testid="simplysent-funnel"><CardHeader className="flex-row items-center justify-between gap-3"><div><CardTitle>Conversion funnel</CardTitle><p className="mt-1 text-xs text-[var(--muted-foreground)]">Visitor journey · mock data · last 30 days</p></div><Badge variant="secondary">4,820 visitors</Badge></CardHeader><CardContent className="space-y-4">{stages.map(([label, value, rate], index) => <div key={label} className="space-y-2"><div className="flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2 font-medium"><span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--muted)] text-[10px] text-[var(--muted-foreground)]">{String(index + 1).padStart(2, "0")}</span><span className="truncate">{label}</span></span><span className="shrink-0 text-xs text-[var(--muted-foreground)]">{value} · {rate}%</span></div><div className="h-3 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-[var(--ring)] transition-[width]" style={{ width: `${rate}%`, opacity: 1 - index * 0.09 }} /></div></div>)}</CardContent></Card>;
}

function Engagement() {
  const metrics = [
    ["Engagement visit rate", "68.2%", "Visitors who meaningfully interact with the experience"],
    ["Time to first recommendation", "1m 42s", "Median time from session start to first result"],
    ["Recommendation exploration depth", "4.7", "Average recommendations explored per visitor"],
    ["Recommendation interaction rate", "34.0%", "Visitors who save, open, or interact with a result"],
  ];
  return <div className="space-y-4" data-testid="engagement-dashboard"><div className="grid gap-3 sm:grid-cols-2">{metrics.map(([label, value, description]) => <Card key={label}><CardContent className="p-5"><p className="text-sm text-[var(--muted-foreground)]">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">{description}</p></CardContent></Card>)}</div><Card><CardHeader><CardTitle>Engagement over time</CardTitle><p className="text-xs text-[var(--muted-foreground)]">Daily engaged visit rate · mock data</p></CardHeader><CardContent><div className="flex h-40 items-end gap-2 rounded-xl bg-[var(--muted)]/30 p-4" role="img" aria-label="Daily engaged visit rate sample chart">{[38, 46, 43, 56, 52, 61, 58, 68, 63, 72, 67, 78, 74, 84].map((height, index) => <div key={index} className="flex-1 rounded-t bg-[var(--ring)]" style={{ height: `${height}%`, opacity: 0.42 + index * 0.04 }} />)}</div><div className="mt-3 flex justify-between text-xs text-[var(--muted-foreground)]"><span>Nov 1</span><span>Nov 7</span><span>Nov 14</span><span>Nov 21</span><span>Today</span></div></CardContent></Card></div>;
}

export function SimplysentDashboard() {
  return <Tabs defaultValue="factory" className="space-y-5"><div className="flex flex-col gap-3 border-b border-[var(--border)] md:flex-row md:items-end md:justify-between"><TabsList className="min-w-0 flex-1 border-b-0" label="Simplysent project pages"><TabsTrigger value="factory">Factory</TabsTrigger><TabsTrigger value="ads">Ads</TabsTrigger><TabsTrigger value="funnel">Funnel</TabsTrigger><TabsTrigger value="engagement">Engagement</TabsTrigger></TabsList><div className="flex flex-wrap items-center gap-2 pb-3 md:justify-end"><SimplysentProjectDetailsButton /><HustleFilters mode="simplysent" /></div></div><TabsContent value="factory"><FactoryBoard /></TabsContent><TabsContent value="ads"><AdsManager /></TabsContent><TabsContent value="funnel"><Funnel /></TabsContent><TabsContent value="engagement"><Engagement /></TabsContent></Tabs>;
}
