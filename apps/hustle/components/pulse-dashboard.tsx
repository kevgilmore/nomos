"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, ExternalLink, Plus, X } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from "@nomos/ui";
import { HustleFilters } from "@/components/analytics-filters";

type RoadmapItem = { title: string; deadline: string };
type Project = {
  id: string;
  title: string;
  mission: string;
  roadmap: RoadmapItem[];
  pages: string[];
  repos: string[];
  firebase: string[];
  dependencies: string[];
};

const initialProjects: Project[] = [{
  id: "simplysent",
  title: "Simplysent",
  mission: "Help people find thoughtful gifts through a simple, personalised recommendation experience.",
  roadmap: [{ title: "Launch MVE5", deadline: "2026-12-10" }],
  pages: ["https://simplysent.com"],
  repos: ["Separate Simplysent repository (URL to add)"],
  firebase: ["Production · nomos-2aafe"],
  dependencies: ["SearchApi.io · product search"],
}];

const fields = [
  { key: "pages", label: "Pages / sites", placeholder: "One URL per line" },
  { key: "repos", label: "Repositories", placeholder: "One repository URL or name per line" },
  { key: "firebase", label: "Firebase databases", placeholder: "Production database or project ID" },
  { key: "dependencies", label: "External dependencies / APIs", placeholder: "For example, SearchApi.io · product search" },
] as const;

function ProjectForm({ project, onSave, onCancel }: { project?: Project; onSave: (project: Project) => void; onCancel: () => void }) {
  const [title, setTitle] = React.useState(project?.title ?? "");
  const [mission, setMission] = React.useState(project?.mission ?? "");
  const [roadmap, setRoadmap] = React.useState<RoadmapItem[]>(project?.roadmap.length ? project.roadmap : [{ title: "", deadline: "" }]);
  const [resources, setResources] = React.useState<Record<(typeof fields)[number]["key"], string>>({ pages: project?.pages.join("\n") ?? "", repos: project?.repos.join("\n") ?? "", firebase: project?.firebase.join("\n") ?? "", dependencies: project?.dependencies.join("\n") ?? "" });
  const [error, setError] = React.useState("");

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) { setError("Add a project title to continue."); return; }
    onSave({
      id: project?.id ?? `${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      title: title.trim(), mission: mission.trim(),
      roadmap: roadmap.filter((item) => item.title.trim()).map((item) => ({ ...item, title: item.title.trim() })),
      pages: resources.pages.split("\n").map((item) => item.trim()).filter(Boolean),
      repos: resources.repos.split("\n").map((item) => item.trim()).filter(Boolean),
      firebase: resources.firebase.split("\n").map((item) => item.trim()).filter(Boolean),
      dependencies: resources.dependencies.split("\n").map((item) => item.trim()).filter(Boolean),
    });
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><section role="dialog" aria-modal="true" aria-labelledby="project-form-title" className="my-auto w-full max-w-2xl overflow-y-auto rounded-[var(--radius)] border bg-[var(--card)] text-[var(--card-foreground)] shadow-xl"><div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-[var(--card)] p-5"><div><h2 id="project-form-title" className="text-lg font-semibold">{project ? `Project details · ${project.title}` : "Create a project"}</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Keep its mission, roadmap and important links together.</p></div><Button type="button" variant="ghost" size="icon" aria-label="Close project form" onClick={onCancel}><X /></Button></div><form onSubmit={save} className="space-y-5 p-5"><label className="grid gap-2 text-sm font-medium">Project title<Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Simplysent" /></label><label className="grid gap-2 text-sm font-medium">Mission<Textarea value={mission} onChange={(event) => setMission(event.target.value)} placeholder="What is this project here to do?" /></label><fieldset className="space-y-3"><legend className="mb-2 text-sm font-medium">Roadmap and deadlines</legend>{roadmap.map((item, index) => <div key={index} className="grid gap-2 sm:grid-cols-2"><Input aria-label={`Roadmap item ${index + 1}`} value={item.title} onChange={(event) => setRoadmap((items) => items.map((current, row) => row === index ? { ...current, title: event.target.value } : current))} placeholder="Milestone" /><Input aria-label={`Deadline for roadmap item ${index + 1}`} type="date" value={item.deadline} onChange={(event) => setRoadmap((items) => items.map((current, row) => row === index ? { ...current, deadline: event.target.value } : current))} /></div>)}<Button type="button" variant="outline" size="sm" onClick={() => setRoadmap((items) => [...items, { title: "", deadline: "" }])}><Plus />Add roadmap item</Button></fieldset><div className="grid gap-4 sm:grid-cols-2">{fields.map((field) => <label key={field.key} className="grid gap-2 text-sm font-medium">{field.label}<Textarea className="min-h-20" value={resources[field.key]} onChange={(event) => setResources((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} /></label>)}</div>{error && <p role="alert" className="text-sm text-[var(--ring)]">{error}</p>}<div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" className="bg-[var(--ring)] text-white hover:bg-[var(--primary)]">{project ? "Save changes" : "Create project"}</Button></div></form></section></div>;
}

function ResourceList({ label, items }: { label: string; items: string[] }) {
  return <section className="min-w-0 space-y-2"><h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{label}</h3>{items.length ? <ul className="space-y-1.5">{items.map((item) => <li key={item} className="flex min-w-0 items-start gap-2 text-sm"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--ring)]" /><span className="min-w-0 break-words">{item.startsWith("https://") ? <a href={item} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--ring)] hover:underline">{item}<ExternalLink className="size-3" /></a> : item}</span></li>)}</ul> : <p className="text-sm text-[var(--muted-foreground)]">No details added</p>}</section>;
}

const funnelRows = [["Visitors", "4,820", "100%"], ["Onboarding completed", "3,443", "71.4%"], ["Merchant clicked", "896", "18.6%"]] as const;
const adRows = [["Gift guide · November", "9.8%", "£0.31", "14.2%"], ["Shopping for a partner", "7.4%", "£0.44", "10.8%"], ["Last-minute gifts", "6.9%", "£0.52", "8.6%"]] as const;
const engagementRows = [["Engaged visit rate", "68.2%", "Time to first recommendation", "1m 42s"], ["Recommendation exploration depth", "4.7 recs", "Interaction rate", "34.0%"], ["Cost per engaged visitor", "£0.56", "vs previous period", "-£0.08"]] as const;

function TitleStat({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-lg bg-[var(--muted)]/30 px-2 py-1.5"><p className="truncate text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">{label}</p><p className="mt-0.5 truncate text-sm font-semibold">{value}</p></div>;
}

function AnalyticsTable({ title, subtitle, headers, rows }: { title: string; subtitle: string; headers: string[]; rows: string[][] }) {
  return <section><div className="mb-2 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{title}</h3><span className="text-xs text-[var(--muted-foreground)]">{subtitle}</span></div><div className="w-full overflow-x-auto"><table className="w-full min-w-full table-fixed text-left text-xs"><thead className="text-[var(--muted-foreground)]"><tr>{headers.map((header) => <th key={header} className="py-1.5 font-medium">{header}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row[0]} className="border-t border-[var(--border)]">{row.map((value, index) => <td key={index} className={`truncate py-2 ${index === row.length - 1 ? "text-right text-[var(--ring)]" : ""}`}>{value}</td>)}</tr>)}</tbody></table></div></section>;
}

const revenueTrend = [24, 31, 28, 39, 35, 47, 44, 54, 49, 62, 58, 72, 68, 83, 78, 94];
const chartPoints = revenueTrend.map((value, index) => `${(index / (revenueTrend.length - 1)) * 100},${100 - value}`).join(" ");

function RevenueMetric({ label, value, change, note }: { label: string; value: string; change: string; note: string }) {
  return <Card><CardHeader className="gap-3 p-4 sm:p-5"><div className="flex items-start justify-between gap-2"><p className="text-sm text-[var(--muted-foreground)]">{label}</p><span className="rounded-md bg-[var(--accent)] px-2 py-1 text-xs font-medium text-[var(--accent-foreground)]">{change}</span></div><div><p className="text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{note}</p></div></CardHeader></Card>;
}

function RevenueTrend() {
  return <Card><CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle>Revenue</CardTitle><p className="mt-1 text-xs text-[var(--muted-foreground)]">Net proceeds over time · sample data</p></div><div className="text-right"><p className="text-xl font-semibold">£12,840</p><p className="text-xs text-[var(--ring)]">↑ 12.8% vs previous period</p></div></CardHeader><CardContent><div className="h-56 w-full" role="img" aria-label="Revenue trend rising from £4,200 to £12,840"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible"><defs><linearGradient id="pulse-revenue-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--ring)" stopOpacity=".28" /><stop offset="100%" stopColor="var(--ring)" stopOpacity="0" /></linearGradient></defs><line x1="0" x2="100" y1="25" y2="25" stroke="var(--border)" strokeDasharray="1 2" /><line x1="0" x2="100" y1="50" y2="50" stroke="var(--border)" strokeDasharray="1 2" /><line x1="0" x2="100" y1="75" y2="75" stroke="var(--border)" strokeDasharray="1 2" /><polygon points={`0,100 ${chartPoints} 100,100`} fill="url(#pulse-revenue-fill)" /><polyline points={chartPoints} fill="none" stroke="var(--ring)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" /></svg></div><div className="mt-3 flex justify-between text-xs text-[var(--muted-foreground)]"><span>Nov 1</span><span>Nov 7</span><span>Nov 14</span><span>Nov 21</span><span>Today</span></div></CardContent></Card>;
}

function RevenueByProduct() {
  const products = [{ name: "Simplysent Plus · Monthly", amount: "£8,420", share: 66 }, { name: "Simplysent Plus · Annual", amount: "£3,210", share: 25 }, { name: "Lifetime access", amount: "£1,210", share: 9 }];
  return <Card><CardHeader><CardTitle>Revenue by product</CardTitle><p className="text-xs text-[var(--muted-foreground)]">Net proceeds · current period</p></CardHeader><CardContent className="space-y-5">{products.map((product) => <div key={product.name} className="space-y-2"><div className="flex items-center justify-between gap-3 text-sm"><span className="truncate">{product.name}</span><span className="shrink-0 font-medium">{product.amount}</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-[var(--ring)]" style={{ width: `${product.share}%` }} /></div><p className="text-xs text-[var(--muted-foreground)]">{product.share}% of revenue</p></div>)}</CardContent></Card>;
}

function RecentActivity() {
  const rows = [["Today, 10:42", "New subscription", "Simplysent Plus · Monthly", "£4.99", "Successful"], ["Today, 09:18", "Renewal", "Simplysent Plus · Annual", "£39.99", "Successful"], ["Yesterday, 18:06", "Trial started", "Simplysent Plus · Monthly", "—", "In trial"], ["Yesterday, 14:31", "Renewal", "Simplysent Plus · Monthly", "£4.99", "Successful"]];
  return <Card><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle>Recent activity</CardTitle><p className="mt-1 text-xs text-[var(--muted-foreground)]">Latest subscription events · sample data</p></div><Button variant="outline" size="sm">View all</Button></div></CardHeader><CardContent><div className="w-full overflow-x-auto"><table className="w-full min-w-full text-left text-sm"><thead className="text-xs text-[var(--muted-foreground)]"><tr>{["Time", "Event", "Product", "Amount", "Status"].map((heading) => <th key={heading} className="pb-3 pr-4 font-medium">{heading}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={`${row[0]}-${row[1]}`} className="border-t"><td className="py-3 pr-4 text-xs text-[var(--muted-foreground)]">{row[0]}</td><td className="py-3 pr-4">{row[1]}</td><td className="py-3 pr-4 text-xs">{row[2]}</td><td className="py-3 pr-4 font-medium">{row[3]}</td><td className="py-3"><Badge variant="secondary">{row[4]}</Badge></td></tr>)}</tbody></table></div></CardContent></Card>;
}

function RevenueOverview() {
  return <section className="space-y-4" aria-label="Revenue overview"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><RevenueMetric label="Monthly recurring revenue" value="£12,840" change="↑ 12.8%" note="vs previous 30 days" /><RevenueMetric label="Annual run rate" value="£154,080" change="↑ 10.2%" note="based on current MRR" /><RevenueMetric label="Active subscribers" value="2,486" change="↑ 8.4%" note="net change +192" /><RevenueMetric label="Active trials" value="318" change="↑ 5.1%" note="42 convert this week" /></div><div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]"><RevenueTrend /><RevenueByProduct /></div><RecentActivity /></section>;
}

function ProjectSection({ project, initiallyOpen = false }: { project: Project; initiallyOpen?: boolean }) {
  const [open, setOpen] = React.useState(initiallyOpen);
  return <Card className="hustle-project-panel" data-open={open} data-testid={project.id === "simplysent" ? "simplysent-project" : `project-${project.id}`}><CardHeader className="border-b border-[var(--border)] p-3 sm:p-4"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-semibold text-[var(--accent-foreground)]">{project.title.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><div className="flex items-center gap-2"><CardTitle className="truncate text-base">{project.title}</CardTitle><Badge variant="secondary">{project.id === "simplysent" ? "Live" : "Planning"}</Badge></div><p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">Gift recommendation experience · 4,820 visitors</p></div></div><Button variant="ghost" size="icon" aria-expanded={open} aria-controls="simplysent-project-body" aria-label={`${open ? "Collapse" : "Expand"} Simplysent project`} onClick={() => setOpen((value) => !value)}>{open ? <ChevronUp /> : <ChevronDown />}</Button></div><div data-testid="project-summary" className="grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-3 sm:grid-cols-6"><TitleStat label="Ads · CTR" value="8.4%" /><TitleStat label="Ads · CPC" value="£0.38" /><TitleStat label="Funnel · visitors" value="4,820" /><TitleStat label="Funnel · click rate" value="18.6%" /><TitleStat label="Engagement · engaged" value="68.2%" /><TitleStat label="Engagement · interaction" value="34.0%" /></div></CardHeader>{open && <div id="simplysent-project-body" data-testid="project-body" className="hustle-project-panel-content"><Tabs defaultValue="ads" className="flex min-h-0 min-w-0 flex-col"><div className="flex justify-end border-b border-[var(--border)] px-3 py-2 sm:px-4"><TabsList className="hustle-pill-tabs border-0" label="Simplysent project analytics"><TabsTrigger className="hustle-pill-tab" value="ads">Ads</TabsTrigger><TabsTrigger className="hustle-pill-tab" value="funnel">Funnel</TabsTrigger><TabsTrigger className="hustle-pill-tab" value="engagement">Engagement</TabsTrigger></TabsList></div><div className="p-3 sm:p-4"><TabsContent value="ads"><AnalyticsTable title="Ad campaigns" subtitle="Meta Ads · mock data" headers={["Campaign", "CTR", "CPC", "Result"]} rows={adRows.map((row) => [...row])} /></TabsContent><TabsContent value="funnel"><AnalyticsTable title="Conversion funnel" subtitle="Simplysent" headers={["Stage", "Visitors", "Rate"]} rows={funnelRows.map((row) => [...row])} /></TabsContent><TabsContent value="engagement"><AnalyticsTable title="Website engagement" subtitle="Mock data" headers={["Metric", "Value", "Metric", "Value"]} rows={engagementRows.map((row) => [...row])} /></TabsContent></div></Tabs></div>}</Card>;
}

export function PulseDashboard() {
  const [projects, setProjects] = React.useState<Project[]>(initialProjects);
  const [loaded, setLoaded] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem("hustle-projects");
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) setProjects(parsed as Project[]);
      }
    } catch {
      window.localStorage.removeItem("hustle-projects");
    } finally {
      setLoaded(true);
    }
  }, []);
  React.useEffect(() => {
    if (loaded) window.localStorage.setItem("hustle-projects", JSON.stringify(projects));
  }, [loaded, projects]);
  return <div className="space-y-5" data-testid="pulse-dashboard"><div className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Pulse</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Subscription performance overview · illustrative data</p></div><div className="flex flex-wrap items-center gap-2"><Button onClick={() => setCreating(true)} className="bg-[var(--ring)] text-white hover:bg-[var(--primary)]"><Plus />New project</Button><HustleFilters mode="pulse" /></div></div><RevenueOverview /><section className="space-y-3"><h2 className="text-sm font-semibold">Projects</h2>{projects.map((project) => <ProjectSection key={project.id} project={project} initiallyOpen={project.id === "simplysent"} />)}</section>{creating && <ProjectForm onCancel={() => setCreating(false)} onSave={(project) => { setProjects((current) => [...current, project]); setCreating(false); }} />}</div>;
}

export function SimplysentProjectDetailsButton() {
  const [project, setProject] = React.useState<Project>(initialProjects[0]);
  const [editing, setEditing] = React.useState(false);
  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem("hustle-projects");
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const match = (parsed as Project[]).find((item) => item.id === "simplysent");
          if (match) setProject(match);
        }
      }
    } catch { window.localStorage.removeItem("hustle-projects"); }
  }, []);
  return <><Button onClick={() => setEditing(true)} className="bg-[var(--ring)] text-white hover:bg-[var(--primary)]">Project details</Button>{editing && <ProjectForm project={project} onCancel={() => setEditing(false)} onSave={(updated) => {
    setProject(updated);
    try {
      const stored = window.localStorage.getItem("hustle-projects");
      const parsed: unknown = stored ? JSON.parse(stored) : initialProjects;
      const projects = Array.isArray(parsed) ? parsed as Project[] : initialProjects;
      window.localStorage.setItem("hustle-projects", JSON.stringify(projects.map((item) => item.id === updated.id ? updated : item)));
    } catch { window.localStorage.setItem("hustle-projects", JSON.stringify([updated])); }
    setEditing(false);
  }} />}</>;
}
