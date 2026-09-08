"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, LoaderCircle, MoreHorizontal, Search, Video } from "lucide-react";
import { Badge, Card, CardContent, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@nomos/ui";
import { EXERCISE_DATASET, isFitnessExercise, type FitnessExercise } from "@/lib/exercises";
import { exerciseVideoUrl } from "@/lib/media";

type ExerciseVideoProps = { exercise: FitnessExercise };
const MUSCLE_GROUPS = ["All", "Abdominals", "Abductors", "Adductors", "Biceps", "Calves", "Cardio", "Chest", "Forearms", "Full Body", "Glutes", "Hamstrings", "Lats", "Lower Back", "Neck", "Other", "Quadriceps", "Shoulders", "Traps", "Triceps", "Upper Back"];
const EQUIPMENT_FILTERS = [{ value: "machine", label: "Machines" }, { value: "dumbbell", label: "Dumbbells" }, { value: "barbell", label: "Barbells" }];

function FilterTabs({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <div role="tablist" aria-label={label} className="flex gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {options.map((option) => { const selected = option.value === value; return <button key={option.value || "all"} type="button" role="tab" aria-selected={selected} onClick={() => onChange(option.value)} className={`relative min-h-11 shrink-0 whitespace-nowrap px-0.5 py-3 text-sm font-medium transition-colors ${selected ? "text-[var(--foreground)] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}>{option.label}</button>; })}
  </div>;
}

function ExerciseVideo({ exercise }: ExerciseVideoProps) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const play = () => {
    const currentVideo = video.current;
    if (!currentVideo) return;
    void currentVideo.play().then(() => setPlaying(true)).catch(() => undefined);
  };
  const stop = () => {
    video.current?.pause();
    if (video.current) video.current.currentTime = 0;
    setPlaying(false);
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      play();
    }
  };
  return <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#17121f]">
    <div className="absolute inset-0" role="button" tabIndex={0} aria-label={`Play ${exercise.name} demonstration`} onPointerEnter={play} onPointerLeave={stop} onClick={play} onKeyDown={handleKeyDown}>
      {exercise.imageUrl && <img src={exercise.imageUrl} alt={`${exercise.name} demonstration`} className={`absolute inset-0 size-full object-contain p-4 transition-opacity ${playing ? "opacity-0" : "opacity-100"}`} />}
      {exercise.videoUrl ? <video ref={video} src={exerciseVideoUrl(exercise.videoUrl) || undefined} muted loop playsInline preload="none" className={`absolute inset-0 size-full object-cover transition-opacity ${playing || !exercise.imageUrl ? "opacity-100" : "opacity-0"}`} aria-hidden="true" /> : !exercise.imageUrl && <div className="grid size-full place-items-center text-white/40"><Video className="size-8" /></div>}
    </div>
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
  const [updatingSlug, setUpdatingSlug] = useState<string | null>(null);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [muscleGroup, setMuscleGroup] = useState("All");
  const [equipment, setEquipment] = useState<string[]>([]);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const nextOffsetRef = useRef(0);
  const searchRef = useRef("");
  const muscleGroupRef = useRef("All");
  const equipmentRef = useRef<string[]>([]);
  const panPGymRef = useRef(true);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const loadPage = useCallback(async (reset = false, requestedSearch = searchRef.current, requestedMuscleGroup = muscleGroupRef.current, requestedPanPGym = panPGymRef.current, requestedEquipment = equipmentRef.current) => {
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
      if (requestedMuscleGroup !== "All") params.set("muscle", requestedMuscleGroup);
      if (requestedPanPGym) params.set("panPGym", "true");
      if (requestedEquipment.length) params.set("equipment", requestedEquipment.join(","));
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
    muscleGroupRef.current = muscleGroup;
    equipmentRef.current = equipment;
    panPGymRef.current = panPGymEnabled;
    const timer = window.setTimeout(() => { void loadPage(true, searchRef.current, muscleGroupRef.current, panPGymRef.current, equipmentRef.current); }, 200);
    return () => window.clearTimeout(timer);
  }, [query, muscleGroup, equipment, panPGymEnabled, loadPage]);

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

  async function updatePanPGym(exercise: FitnessExercise) {
    const supportedByPanPGym = exercise.supportedByPanPGym !== true;
    setUpdatingSlug(exercise.slug);
    setSupportError(null);
    try {
      const response = await fetch(`/api/data/public/${EXERCISE_DATASET}/${encodeURIComponent(exercise.slug)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ supportedByPanPGym }),
      });
      const data = await response.json() as { item?: unknown; error?: string };
      if (!response.ok || !data.item || !isFitnessExercise(data.item)) throw new Error(data.error || "Unable to update Pan P Gym support");
      setExercises((current) => current.map((item) => item.slug === exercise.slug ? data.item as FitnessExercise : item));
      if (panPGymRef.current) void loadPage(true, searchRef.current, muscleGroupRef.current, panPGymRef.current, equipmentRef.current);
    } catch (cause) {
      setSupportError(cause instanceof Error ? cause.message : "Unable to update Pan P Gym support");
    } finally {
      setUpdatingSlug(null);
    }
  }

  function toggleEquipment(value: string) {
    setEquipment((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  const equipmentLabel = equipment.length === 0 ? "Equipment" : equipment.length === 1 ? EQUIPMENT_FILTERS.find((item) => item.value === equipment[0])?.label || "Equipment" : `${equipment.length} equipment`;

  return <div className="space-y-5">
    <div className="space-y-2"><FilterTabs label="Filter exercises by muscle group" value={muscleGroup} options={MUSCLE_GROUPS.map((group) => ({ value: group, label: group }))} onChange={setMuscleGroup}/></div>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-center"><label className="relative block min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"/><span className="sr-only">Search exercises</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, muscle, or cue" className="field-input h-11 !pl-10"/></label><div className="flex min-w-0 gap-2"><button type="button" aria-pressed={panPGymEnabled} onClick={() => setPanPGymEnabled((enabled) => !enabled)} className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors sm:flex-none ${panPGymEnabled ? "border-[var(--ring)] bg-[var(--accent)] text-[var(--foreground)]" : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]"}`}><span className={`size-2 shrink-0 rounded-full ${panPGymEnabled ? "bg-[var(--ring)]" : "bg-[var(--muted-foreground)]"}`} aria-hidden="true"/>Pan P Gym<span className="font-normal opacity-70">{panPGymEnabled ? "On" : "Off"}</span></button><DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-haspopup="menu" aria-label={`Filter by equipment${equipment.length ? ` (${equipment.join(", ")})` : ""}`} className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors sm:flex-none ${equipment.length ? "border-[var(--ring)] bg-[var(--accent)] text-[var(--foreground)]" : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]"}`}><span className="truncate">{equipmentLabel}</span><ChevronDown className="size-3.5 shrink-0" aria-hidden="true"/></button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-56"><DropdownMenuLabel>Filter by equipment</DropdownMenuLabel>{EQUIPMENT_FILTERS.map((option) => <DropdownMenuItem key={option.value} onSelect={(event) => { event.preventDefault(); toggleEquipment(option.value); }}><Check className={`size-4 ${equipment.includes(option.value) ? "opacity-100 text-[var(--ring)]" : "opacity-0"}`} aria-hidden="true"/><span>{option.label}</span></DropdownMenuItem>)}{equipment.length > 0 && <DropdownMenuItem onSelect={(event) => { event.preventDefault(); setEquipment([]); }} className="mt-1 border-t border-[var(--border)] pt-2 text-[var(--muted-foreground)]">Clear selection</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></div></div><p className="text-xs text-[var(--muted-foreground)]">{filtered.length} shown</p></div>
    {supportError && <p role="alert" className="text-sm text-[var(--destructive)]">{supportError}</p>}
    {loading && <p className="py-16 text-center text-sm text-[var(--muted-foreground)]">Loading exercise library…</p>}
    {error && !loading && <Card><CardContent className="p-8 text-center"><h3 className="font-semibold">Couldn’t load the exercise library</h3><p className="mt-2 text-sm text-[var(--muted-foreground)]">{error}</p></CardContent></Card>}
    {!loading && !error && !filtered.length && <Card><CardContent className="p-8 text-center"><h3 className="font-semibold">No matching exercises</h3><p className="mt-2 text-sm text-[var(--muted-foreground)]">Try a different name, muscle group, or movement cue.</p></CardContent></Card>}
    {!loading && !error && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map((exercise) => <Card key={exercise.slug} className="overflow-hidden"><ExerciseVideo exercise={exercise}/><CardContent className="p-3 sm:p-4"><div className="flex items-start justify-between gap-2 sm:gap-3"><div className="min-w-0"><h3 className="text-sm font-semibold sm:text-base">{exercise.name}</h3>{exercise.level && <p className="mt-0.5 text-xs text-[var(--muted-foreground)] sm:mt-1">{exercise.level}</p>}</div><div className="flex shrink-0 items-center gap-1">{exercise.videoUrl && <Video className="mt-0.5 size-4 text-[var(--muted-foreground)]" aria-label="Has video"/>}<DropdownMenu><DropdownMenuTrigger asChild><button type="button" disabled={updatingSlug === exercise.slug} aria-label={`Manage ${exercise.name} Pan P Gym support`} className="grid size-9 place-items-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] disabled:opacity-50">{updatingSlug === exercise.slug ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true"/> : <MoreHorizontal className="size-4" aria-hidden="true"/>}</button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => void updatePanPGym(exercise)}>{exercise.supportedByPanPGym === true ? "Remove from Pan P Gym" : "Add to Pan P Gym"}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div><div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3">{exercise.muscles.slice(0, 3).map((muscle) => <Badge key={muscle} variant="secondary">{muscle}</Badge>)}</div>{exercise.summary && <p className="mt-2 line-clamp-2 text-sm leading-5 text-[var(--muted-foreground)] sm:mt-3 sm:leading-6">{exercise.summary}</p>}</CardContent></Card>)}</div>}
    {!loading && !error && <div ref={sentinel} className="flex min-h-20 items-center justify-center py-5" role="status" aria-live="polite">{loadingMore && <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]"><LoaderCircle className="size-4 animate-spin" aria-hidden="true"/><span>Loading the next 10 exercises…</span></div>}{loadMoreError && <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-[var(--muted-foreground)]"><span>{loadMoreError}</span><button type="button" onClick={() => void loadPage()} className="min-h-11 rounded-lg border px-3 font-medium text-[var(--foreground)]">Try again</button></div>}{!loadingMore && !loadMoreError && !hasMore && <p className="text-sm text-[var(--muted-foreground)]">You’ve reached the end of the exercise library.</p>}</div>}
  </div>;
}
