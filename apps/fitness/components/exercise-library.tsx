"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Search, Video } from "lucide-react";
import { Badge, Card, CardContent } from "@nomos/ui";
import { EXERCISE_DATASET, isFitnessExercise, type FitnessExercise } from "@/lib/exercises";

type ExerciseVideoProps = { exercise: FitnessExercise };

function ExerciseVideo({ exercise }: ExerciseVideoProps) {
  const video = useRef<HTMLVideoElement>(null);
  return <div className="relative aspect-[1.85] overflow-hidden rounded-2xl bg-[#17121f] sm:aspect-[1.45]">
    {exercise.videoUrl ? <video ref={video} src={exercise.videoUrl} poster={exercise.imageUrl || undefined} muted loop playsInline preload="metadata" onMouseEnter={() => void video.current?.play()} onMouseLeave={() => { video.current?.pause(); if (video.current) video.current.currentTime = 0; }} className="size-full object-cover" aria-label={`${exercise.name} demonstration`} /> : exercise.imageUrl ? <img src={exercise.imageUrl} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center text-white/40"><Video className="size-8" /></div>}
  </div>;
}

export function ExerciseLibrary() {
  const [exercises, setExercises] = useState<FitnessExercise[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [panPGymEnabled, setPanPGymEnabled] = useState(true);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const nextOffsetRef = useRef(0);
  const searchRef = useRef("");
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const loadPage = useCallback(async (reset = false, requestedSearch = searchRef.current) => {
    if (reset) {
      requestIdRef.current += 1;
      abortRef.current?.abort();
      loadingRef.current = false;
    } else if (loadingRef.current || !hasMoreRef.current) return;
    const requestId = requestIdRef.current;
    loadingRef.current = true;
    const offset = reset ? 0 : nextOffsetRef.current;
    if (reset) {
      nextOffsetRef.current = 0;
      hasMoreRef.current = true;
      setHasMore(true);
      setExercises([]);
      setError(null);
      setLoadMoreError(null);
      setLoading(true);
    } else {
      setLoadingMore(true);
      setLoadMoreError(null);
    }
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const params = new URLSearchParams({ limit: "10", offset: String(offset) });
      if (requestedSearch) params.set("search", requestedSearch);
      const response = await fetch(`/api/data/public/${EXERCISE_DATASET}?${params}`, { credentials: "include", signal: controller.signal });
      const data = await response.json() as { items?: unknown[]; error?: string; hasMore?: boolean; nextOffset?: number };
      if (!response.ok) throw new Error(data.error || "Unable to load exercise library");
      if (requestId !== requestIdRef.current) return;
      const items = (data.items || []).filter(isFitnessExercise);
      const nextOffset = typeof data.nextOffset === "number" ? data.nextOffset : offset + items.length;
      const nextHasMore = data.hasMore === true;
      nextOffsetRef.current = nextOffset;
      hasMoreRef.current = nextHasMore;
      setHasMore(nextHasMore);
      setExercises((current) => reset ? items : [...current, ...items]);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      if (requestId !== requestIdRef.current) return;
      const message = cause instanceof Error ? cause.message : "Unable to load exercise library";
      if (reset) setError(message);
      else setLoadMoreError(message);
    } finally {
      if (requestId === requestIdRef.current) {
        loadingRef.current = false;
        if (reset) setLoading(false);
        else setLoadingMore(false);
        if (abortRef.current === controller) abortRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    searchRef.current = query.trim().toLowerCase();
    const timer = window.setTimeout(() => { void loadPage(true, searchRef.current); }, 200);
    return () => window.clearTimeout(timer);
  }, [query, loadPage]);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadPage();
    }, { rootMargin: "0px", threshold: 0.1 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasMore, loading, loadPage]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return exercises;
    return exercises.filter((exercise) => [exercise.name, exercise.level, ...exercise.muscles, exercise.description].filter(Boolean).join(" ").toLowerCase().includes(normalized));
  }, [exercises, query]);

  return <div className="space-y-7">
    <section className="overflow-hidden rounded-3xl border border-[#3d3158] bg-[radial-gradient(circle_at_82%_10%,rgba(167,139,250,.2),transparent_34%),linear-gradient(135deg,#211a30,#15121d)] p-6 md:p-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="eyebrow">MOVEMENT LIBRARY</p><h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-[-.045em] md:text-5xl">Know the lift.<br/><span className="text-[#a99fba]">Own the movement.</span></h2><p className="mt-4 max-w-xl text-sm leading-6 text-[#aaa3b5]">A searchable catalogue of exercise cues, target muscles, and short demonstrations.</p></div><div className="min-w-36 rounded-2xl border border-white/10 bg-white/[.04] p-4"><strong className="block text-2xl">{exercises.length}</strong><span className="text-xs text-[#aaa3b5]">Exercises loaded</span></div></div>
    </section>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 flex-1 gap-2 sm:max-w-xl"><label className="relative block min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"/><span className="sr-only">Search exercises</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, muscle, or cue" className="field-input h-11 !pl-10"/></label><button type="button" aria-pressed={panPGymEnabled} onClick={() => setPanPGymEnabled((enabled) => !enabled)} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors ${panPGymEnabled ? "border-[var(--ring)] bg-[var(--accent)] text-[var(--foreground)]" : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]"}`}><span className={`size-2 rounded-full ${panPGymEnabled ? "bg-[var(--ring)]" : "bg-[var(--muted-foreground)]"}`} aria-hidden="true"/>Pan P Gym<span className="font-normal opacity-70">{panPGymEnabled ? "On" : "Off"}</span></button></div><p className="text-xs text-[var(--muted-foreground)]">{filtered.length} shown</p></div>
    {loading && <p className="py-16 text-center text-sm text-[var(--muted-foreground)]">Loading exercise library…</p>}
    {error && !loading && <Card><CardContent className="p-8 text-center"><h3 className="font-semibold">Couldn’t load the exercise library</h3><p className="mt-2 text-sm text-[var(--muted-foreground)]">{error}</p></CardContent></Card>}
    {!loading && !error && !filtered.length && <Card><CardContent className="p-8 text-center"><h3 className="font-semibold">No matching exercises</h3><p className="mt-2 text-sm text-[var(--muted-foreground)]">Try a different name, muscle group, or movement cue.</p></CardContent></Card>}
    {!loading && !error && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map((exercise) => <Card key={exercise.slug} className="overflow-hidden"><ExerciseVideo exercise={exercise}/><CardContent className="p-3 sm:p-4"><div className="flex items-start justify-between gap-2 sm:gap-3"><div className="min-w-0"><h3 className="text-sm font-semibold sm:text-base">{exercise.name}</h3>{exercise.level && <p className="mt-0.5 text-xs text-[var(--muted-foreground)] sm:mt-1">{exercise.level}</p>}</div>{exercise.videoUrl && <Video className="mt-0.5 size-4 shrink-0 text-[var(--muted-foreground)]" aria-label="Has video"/>}</div><div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3">{exercise.muscles.slice(0, 3).map((muscle) => <Badge key={muscle} variant="secondary">{muscle}</Badge>)}</div>{exercise.summary && <p className="mt-2 line-clamp-2 text-sm leading-5 text-[var(--muted-foreground)] sm:mt-3 sm:leading-6">{exercise.summary}</p>}</CardContent></Card>)}</div>}
    {!loading && !error && <div ref={sentinel} className="flex min-h-20 items-center justify-center py-5" role="status" aria-live="polite">{loadingMore && <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]"><LoaderCircle className="size-4 animate-spin" aria-hidden="true"/><span>Loading the next 10 exercises…</span></div>}{loadMoreError && <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-[var(--muted-foreground)]"><span>{loadMoreError}</span><button type="button" onClick={() => void loadPage()} className="min-h-11 rounded-lg border px-3 font-medium text-[var(--foreground)]">Try again</button></div>}{!loadingMore && !loadMoreError && !hasMore && <p className="text-sm text-[var(--muted-foreground)]">You’ve reached the end of the exercise library.</p>}</div>}
  </div>;
}
