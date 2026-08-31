"use client";

import { ArrowUpRight, CheckCircle2, Clock3, MoreHorizontal } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Progress } from "@nomos/ui";

const data = [{day:"Mon",value:32},{day:"Tue",value:45},{day:"Wed",value:39},{day:"Thu",value:58},{day:"Fri",value:54},{day:"Sat",value:71},{day:"Sun",value:68}];
export function UIShowcase({ page, tab }: { page: string; tab: string }) {
  return <section aria-label="Component examples" className="space-y-5">
    <div className="grid gap-4 md:grid-cols-3">{[["Active work","24","+12%"],["Completion","87%","On track"],["Collaborators","128","8 online"]].map(([label,value,note]) => <Card key={label}><CardContent className="p-5"><p className="text-sm text-[var(--muted-foreground)]">{label}</p><div className="mt-3 flex items-end justify-between"><strong className="text-3xl tracking-[-.04em]">{value}</strong><Badge variant="secondary">{note}</Badge></div></CardContent></Card>)}</div>
    <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
      <Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Momentum</CardTitle><p className="mt-1 text-sm text-[var(--muted-foreground)]">A reusable Recharts surface for {page} / {tab}.</p></div><Button variant="outline" size="sm">View report <ArrowUpRight/></Button></CardHeader><CardContent><div className="h-64" role="img" aria-label="Weekly momentum trends upward from 32 to 68"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a78bda" stopOpacity={.3}/><stop offset="1" stopColor="#a78bda" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#302c39"/><XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={12}/><Tooltip/><Area type="monotone" dataKey="value" stroke="#a78bda" strokeWidth={2.5} fill="url(#areaFill)"/></AreaChart></ResponsiveContainer></div></CardContent></Card>
      <Card><CardHeader className="flex-row items-center justify-between"><CardTitle>Recent items</CardTitle><Button variant="ghost" size="icon" aria-label="More options"><MoreHorizontal/></Button></CardHeader><CardContent className="space-y-5">{[["Design system","Updated now","92"],["API foundations","Yesterday","68"],["Access review","Fri, 2:30 PM","44"]].map(([name,time,value],i) => <div key={name}><div className="mb-2 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-[var(--muted)]">{i === 0 ? <CheckCircle2 className="size-4"/> : <Clock3 className="size-4"/>}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{name}</p><p className="text-xs text-[var(--muted-foreground)]">{time}</p></div><span className="text-sm font-medium">{value}%</span></div><Progress value={Number(value)}/></div>)}</CardContent></Card>
    </div>
  </section>;
}
