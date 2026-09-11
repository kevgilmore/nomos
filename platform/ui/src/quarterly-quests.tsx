"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Flag, Heart, Pencil, ShieldCheck, Sparkles, Swords } from "lucide-react";
import { QuestProgress } from "./quest-progress";
import { Button, Input, Textarea } from "./index";

type Quarter = { facts: string[]; feelings: string[]; purpose: string };
type QuarterBook = Record<string, Quarter>;
const storageKey = "nomos.goals.quarters.v2";
const slots = ["Work", "Life", "Career", "Chores", "Creative hobbies", "Adventure hobbies"];
const groups = [
  { name: "Main quests", note: "Work & life", icon: Swords, tone: "main", start: 0 },
  { name: "Maintenance", note: "Responsibilities", icon: ShieldCheck, tone: "maintenance", start: 2 },
  { name: "Side quests", note: "Hobbies & interests", icon: Sparkles, tone: "side", start: 4 },
];
const months = ["January — March", "April — June", "July — September", "October — December"];
const example: Quarter = {
  facts: ["I achieved a new level of independence through work I’m proud of.", "I built a healthier routine and made more time for the people I love.", "I strengthened my portfolio and kept my professional relationships active.", "I kept my home and life admin in order with a simple weekly reset.", "I finished a creative project purely for the enjoyment of making it.", "I explored three new places and made memories beyond my usual routine."],
  feelings: ["Energised", "Confident", "Free"],
  purpose: "To improve my professional and personal life in a way that serves me for the rest of my life.",
};
const blank = (): Quarter => ({ facts: Array(6).fill(""), feelings: Array(3).fill(""), purpose: "" });
const keyFor = (index: number) => `${Math.floor(index / 4)}-Q${index % 4 + 1}`;
function validQuarter(value: unknown): value is Quarter {
  if (!value || typeof value !== "object") return false;
  const q = value as Quarter;
  return Array.isArray(q.facts) && q.facts.length === 6 && q.facts.every(v => typeof v === "string") && Array.isArray(q.feelings) && q.feelings.length === 3 && q.feelings.every(v => typeof v === "string") && typeof q.purpose === "string";
}

export function QuarterlyQuests() {
  const [current, setCurrent] = useState<number | null>(null);
  const [selected, setSelected] = useState(0);
  const [book, setBook] = useState<QuarterBook>({});
  const [draft, setDraft] = useState<Quarter | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const now = new Date();
    const index = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3);
    setCurrent(index); const requested=new URLSearchParams(window.location.search).get("quarter"); setSelected(requested && /^\d{4}-Q[1-4]$/.test(requested) ? Number(requested.slice(0,4))*4+Number(requested.slice(-1))-1 : index);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !Object.entries(parsed).every(([key, value]) => /^\d{4}-Q[1-4]$/.test(key) && validQuarter(value))) throw Error();
        setBook(parsed as QuarterBook);
      }
    } catch { setError("Saved quarters could not be loaded. Reload before editing to avoid replacing saved data."); }
  }, []);
  if (current === null) return <div className="p-6 text-sm text-[var(--muted-foreground)]" role="status">Loading quarters…</div>;
  const key = keyFor(selected);
  const year = Math.floor(selected / 4);
  const quarter = selected % 4;
  const saved = book[key];
  const isExample = !saved && selected === current;
  const content = draft ?? saved ?? (isExample ? example : blank());
  const status = selected < current ? "Past quarter" : selected === current ? "Current quarter" : "Draft";
  const years = Array.from(new Set([year, ...Array.from({ length: 12 }, (_, i) => Math.floor(current / 4) + 1 - i), ...Object.keys(book).map(k => Number(k.slice(0, 4)))])).sort((a,b) => b-a);
  function navigate(index: number) { setSelected(index); setNotice(""); }
  function begin() { setNotice(""); setDraft({ ...content, facts: [...content.facts], feelings: [...content.feelings] }); }
  function save() {
    if (!draft) return;
    const next = { ...book, [key]: { facts: draft.facts.map(v => v.trim()), feelings: draft.feelings.map(v => v.trim()), purpose: draft.purpose.trim() } };
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setBook(next); setDraft(null); setNotice("Quarter saved."); } catch { setNotice("Couldn’t save in this browser. Your edits are still here; please try again."); }
  }
  return <section className="quests-page mx-auto max-w-[1400px] pb-6">
    <header className="mb-7 flex flex-wrap items-center justify-between gap-4"><h2 className="text-3xl font-semibold tracking-tight">Quests</h2></header>
    <nav aria-label="Quarter navigation" className="quarter-navigation"><div className="quarter-year"><Button size="icon" variant="ghost" aria-label="Previous year" disabled={!!draft || year <= 1900} onClick={() => navigate(selected - 4)}><ArrowLeft /></Button><label className="sr-only" htmlFor="quest-year">Year</label><select id="quest-year" value={year} disabled={!!draft} onChange={e => navigate(Number(e.target.value) * 4 + quarter)} className="bg-transparent px-2 py-3 text-lg font-semibold">{years.map(y => <option key={y} value={y} className="bg-[var(--card)]">{y}</option>)}</select><Button size="icon" variant="ghost" aria-label="Next year" disabled={!!draft || year >= 9998} onClick={() => navigate(selected + 4)}><ArrowRight /></Button></div><div className="quarter-tabs">{[0,1,2,3].map(q => { const index = year * 4 + q; return <button key={q} disabled={!!draft} onClick={() => navigate(index)} aria-current={selected === index ? "page" : undefined} className="quarter-tab"><span className="flex flex-col items-center gap-1"><span className="font-semibold">Q{q+1}</span>{index > current && <span className="quest-draft-label">Draft</span>}</span><span className="text-xs text-[var(--muted-foreground)]">{["Jan – Mar", "Apr – Jun", "Jul – Sep", "Oct – Dec"][q]}</span>{index === current && <span className="quarter-dot" aria-label="Current quarter" />}</button>; })}</div></nav>
    <div className="my-6 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-3"><CalendarDays className="size-4 text-[var(--muted-foreground)]" aria-hidden="true" /><h3 className="text-lg font-semibold">{months[quarter]} {year}</h3><span className="rounded-md bg-[var(--accent)] px-2 py-1 text-xs text-[var(--accent-foreground)]">{status}</span>{isExample && !draft && <span className="text-xs text-[var(--muted-foreground)]">Sample content</span>}</div><div className="flex gap-2">{draft ? <><Button variant="ghost" onClick={() => { setDraft(null); setNotice(""); }}>Cancel</Button><Button onClick={save}><Check aria-hidden="true" />Save quarter</Button></> : <Button variant="outline" disabled={!!error} onClick={begin}><Pencil aria-hidden="true" />{saved || isExample ? "Edit quarter" : "Write quarter"}</Button>}</div></div>
    {error && <p role="alert" className="mb-4 rounded-lg border p-3 text-sm">{error}</p>}{notice && <p role="status" className="mb-4 text-sm">{notice}</p>}
    <div className="quarter-workspace"><div className="quarter-facts"><div className="mb-4 flex items-baseline justify-between gap-3"><h3 className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--muted-foreground)]">01 / Facts</h3>{draft && <span className="text-xs text-[var(--muted-foreground)]">Write as already achieved: “I achieved…”</span>}</div><div className="space-y-4">{groups.map(({name,note,icon:Icon,tone,start}) => <section key={name} className={`quest-group quest-${tone}`}><div className="quest-group-heading"><span className="quest-icon"><Icon className="size-4" aria-hidden="true" /></span><h4 className="text-sm font-semibold">{name}</h4><span className="ml-auto text-xs text-[var(--muted-foreground)]">{note}</span></div>{[start,start+1].map(i => <div key={i} className="quarter-fact"><span className="quest-number" aria-hidden="true">0{i+1}</span><div className="min-w-0 flex-1"><label htmlFor={draft ? `quarter-fact-${i}` : undefined} className="mb-1 block text-xs font-semibold quest-label">{slots[i]}</label>{draft ? <Textarea id={`quarter-fact-${i}`} aria-label={`${slots[i]} fact`} value={content.facts[i]} onChange={e => setDraft({...content, facts:content.facts.map((v,n) => n===i ? e.target.value : v)})} className="min-h-20" placeholder="I achieved…" /> : <p className={`text-[15px] leading-6 ${!content.facts[i] ? "text-[var(--muted-foreground)]" : ""}`}>{content.facts[i] || "Not written yet"}</p>}<QuestProgress quarter={key} questIndex={i} /></div></div>)}</section>)}</div></div>
    <aside className="quarter-intention"><section className="quarter-feelings"><div className="mb-6 flex items-center justify-between"><h3 className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--muted-foreground)]">02 / Feelings</h3><Heart className="size-4 text-[var(--ring)]" aria-hidden="true" /></div><p className="mb-5 text-lg font-medium">How I want to feel</p><div className="space-y-3">{content.feelings.map((feeling,i) => <div key={i} className="quarter-feeling"><span className="text-xs text-[var(--muted-foreground)]">0{i+1}</span>{draft ? <Input aria-label={`Feeling ${i+1}`} placeholder={["Energised","Confident","Free"][i]} value={feeling} onChange={e => setDraft({...content,feelings:content.feelings.map((v,n) => n===i ? e.target.value : v)})} /> : <span className={`text-lg ${!feeling ? "text-[var(--muted-foreground)]" : ""}`}>{feeling || "—"}</span>}</div>)}</div></section><section className="quarter-function"><div className="mb-6 flex items-center justify-between"><h3 className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--muted-foreground)]">03 / Function</h3><Flag className="size-4 text-[var(--ring)]" aria-hidden="true" /></div><label htmlFor={draft ? "quarter-purpose" : undefined} className="mb-4 block text-lg font-medium">What this quarter is for</label>{draft ? <Textarea id="quarter-purpose" aria-label="Quarter function" className="min-h-36" value={content.purpose} onChange={e => setDraft({...content,purpose:e.target.value})} placeholder="To…" /> : <p className="text-lg leading-8 tracking-tight">{content.purpose || <span className="text-[var(--muted-foreground)]">Give this quarter a purpose.</span>}</p>}</section></aside></div>
    <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-4"><Button variant="ghost" disabled={!!draft || year <= 1900} onClick={() => navigate(selected-1)}><ArrowLeft aria-hidden="true" />Previous quarter</Button><button className="min-h-10 px-3 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]" disabled={!!draft || selected===current} onClick={() => navigate(current)}>Current quarter</button></footer>
  </section>;
}
