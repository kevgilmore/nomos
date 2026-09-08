"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, CalendarDays, ChevronDown, Dumbbell, RefreshCw, TimerReset, Video } from "lucide-react";
import { Button, Card, CardContent } from "@nomos/ui";
import type { HevyExercise, HevyRoutine, HevySet, HevyWorkout } from "@/lib/hevy-types";
import { EXERCISE_DATASET, isFitnessExercise, type FitnessExercise } from "@/lib/exercises";
import { exerciseVideoUrl } from "@/lib/media";
import { cacheFitnessAgentContext } from "@/lib/agent-context";
import { fetchHevyRoutines } from "@/lib/hevy-client";
import { applyRoutineChanges, proposalToRoutineChanges, type FitnessPlanProposal, type RoutineExerciseChange } from "@/lib/plan-changes";

type Props = { initialRoutines: HevyRoutine[]; initialError: string | null };
const order = ["Upper", "Lower", "Push", "Pull", "Legs"];
const tone: Record<string, string> = { Upper: "#a78bfa", Lower: "#5eead4", Push: "#fb7185", Pull: "#60a5fa", Legs: "#fbbf24" };
const DATA_CACHE_KEY = "nomos_fitness_data_my_routines";
const DATA_CACHE_TTL_MS = 5 * 60 * 1000;
const EXERCISE_CACHE_KEY = "nomos_fitness_exercise_library";
const EXERCISE_CACHE_TTL_MS = 60 * 60 * 1000;
const WORKOUT_CACHE_KEY = "nomos_fitness_workouts";
const WORKOUT_CACHE_TTL_MS = 5 * 60 * 1000;

type FitnessData = { routines: HevyRoutine[]; cachedAt: number };
type WorkoutData = { workouts: HevyWorkout[]; cachedAt: number };
type ExperimentChange = "normal" | "modify" | "delete" | "add";
type ProposalEnvelope = { version: number; savedAt: string; proposal: FitnessPlanProposal };
const PROPOSAL_STORAGE_KEY = "nomos-fitness-plan-proposal";
const PROPOSAL_EVENT = "nomos:assistant-proposal";

function setsCount(routine: HevyRoutine) { return routine.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0); }
function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function localStartOfDay(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function workoutDate(workout: HevyWorkout) { const date = new Date(workout.start_time); return Number.isNaN(date.getTime()) ? null : date; }
function daysSince(date: Date, now = new Date()) { return Math.max(0, Math.floor((localStartOfDay(now).getTime() - localStartOfDay(date).getTime()) / 86_400_000)); }
function proposalIsValid(value: unknown): value is ProposalEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const envelope = value as Partial<ProposalEnvelope>;
  const proposal = envelope.proposal as Partial<FitnessPlanProposal> | undefined;
  return typeof envelope.version === "number" && typeof envelope.savedAt === "string" && typeof proposal?.title === "string" && typeof proposal.summary === "string" && Array.isArray(proposal.changes);
}
function readProposal(): ProposalEnvelope | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(PROPOSAL_STORAGE_KEY) || "null");
    return proposalIsValid(value) ? value : null;
  } catch { return null; }
}
function changeType(action: RoutineExerciseChange["action"]): ExperimentChange { return action === "remove" ? "delete" : action; }
function changeCounts(changes: RoutineExerciseChange[], routineId: string, ignoredChanges: string[]) {
  return changes.filter((change) => (!routineId || change.routineId === routineId) && !ignoredChanges.includes(change.id)).reduce((counts, change) => {
    counts[change.action === "add" ? "added" : change.action === "remove" ? "removed" : "modified"] += 1;
    return counts;
  }, { added: 0, removed: 0, modified: 0 });
}
function changeBreakdown(counts: { added: number; removed: number; modified: number }) {
  return [counts.added > 0 ? `${counts.added} added` : "", counts.modified > 0 ? `${counts.modified} modified` : "", counts.removed > 0 ? `${counts.removed} removed` : ""].filter(Boolean).join(" · ");
}
function normalizeExerciseName(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function findExerciseDetails(exercise: HevyExercise, library: FitnessExercise[]) {
  const byTemplateId = library.find((item) => item.slug === `hevy-${exercise.exercise_template_id.toLowerCase()}`);
  if (byTemplateId) return byTemplateId;
  const normalizedTitle = normalizeExerciseName(exercise.title);
  const exact = library.find((item) => normalizeExerciseName(item.name) === normalizedTitle);
  if (exact) return exact;
  const candidates = library.filter((item) => {
    const normalizedName = normalizeExerciseName(item.name);
    return normalizedTitle.length > 3 && normalizedName.length > 3 && (normalizedName.includes(normalizedTitle) || normalizedTitle.includes(normalizedName));
  });
  return candidates.length === 1 ? candidates[0] : undefined;
}
function formatSetTarget(set: HevySet) {
  if (set.rep_range && (set.rep_range.start !== null || set.rep_range.end !== null)) return `${set.rep_range.start ?? "?"}–${set.rep_range.end ?? "?"} reps`;
  if (set.reps !== null) return `${set.reps} reps`;
  if (set.duration_seconds !== null) return `${set.duration_seconds}s`;
  if (set.distance_meters !== null) return `${set.distance_meters}m`;
  return "Target not set";
}
function formatSetCountTarget(sets: HevySet[], count = sets.length) { return `${count} × ${sets[0] ? formatSetTarget(sets[0]) : "Target not set"}`; }

async function readApiResponse<T>(response: Response): Promise<T & { error?: string }> {
  const text = await response.text();
  try { return JSON.parse(text) as T & { error?: string }; }
  catch { throw new Error(response.status === 404 ? "The local Fitness API is not running. Use the deployed Fitness site for live Hevy data." : `Fitness API returned ${response.status} instead of JSON.`); }
}

export function FitnessPlan({ initialRoutines, initialError }: Props) {
  const [routines, setRoutines] = useState(initialRoutines);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(initialRoutines.length === 0 && !initialError);

  async function loadData() {
    setLoading(true);
    try {
      const cached = localStorage.getItem(DATA_CACHE_KEY) || sessionStorage.getItem(DATA_CACHE_KEY);
      if (cached) {
        try {
          const data = JSON.parse(cached) as FitnessData;
          if (Array.isArray(data.routines) && Date.now() - data.cachedAt < DATA_CACHE_TTL_MS) { setRoutines(data.routines); cacheFitnessAgentContext(data.routines); setError(null); return; }
        } catch {
          // Ignore malformed cache data and replace it with a fresh API response.
        }
        sessionStorage.removeItem(DATA_CACHE_KEY);
      }
      const nextRoutines = await fetchHevyRoutines();
      setRoutines(nextRoutines);
      setError(null);
      const cachedData = JSON.stringify({ routines: nextRoutines, cachedAt: Date.now() } satisfies FitnessData);
      localStorage.setItem(DATA_CACHE_KEY, cachedData);
      sessionStorage.setItem(DATA_CACHE_KEY, cachedData);
      cacheFitnessAgentContext(nextRoutines);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to connect"); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (!routines.length) void loadData(); }, [routines.length]);
  const sorted = [...routines].sort((a, b) => order.indexOf(a.title) - order.indexOf(b.title));
  if (error && routines.length === 0) return <ConnectionError message={error} onRetry={async () => { setError(null); await loadData(); }}/>;
  if (loading && routines.length === 0) return <Card><CardContent className="grid place-items-center p-12 text-center"><TimerReset className="mb-3 size-7 animate-pulse text-[var(--muted-foreground)]"/><h2 className="font-semibold">Loading your current plan</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">Syncing routines from Hevy…</p></CardContent></Card>;
  return <PlanView routines={sorted}/>;
}

function PlanView({ routines }: { routines: HevyRoutine[] }) {
  const [baseRoutines] = useState(routines);
  const [library, setLibrary] = useState<FitnessExercise[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [ignoredChanges, setIgnoredChanges] = useState<string[]>([]);
  const [proposalEnvelope, setProposalEnvelope] = useState<ProposalEnvelope | null>(() => readProposal());
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<HevyWorkout[]>([]);
  const [workoutsLoading, setWorkoutsLoading] = useState(true);
  const [workoutsError, setWorkoutsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadLibrary() {
      try {
        const cached = sessionStorage.getItem(EXERCISE_CACHE_KEY);
        if (cached) {
          const data = JSON.parse(cached) as { exercises?: unknown[]; cachedAt?: number };
          if (Array.isArray(data.exercises) && typeof data.cachedAt === "number" && Date.now() - data.cachedAt < EXERCISE_CACHE_TTL_MS) {
            if (active) {
              const exercises = data.exercises.filter(isFitnessExercise);
              setLibrary(exercises);
              cacheFitnessAgentContext(baseRoutines, exercises.map((exercise) => ({ slug: exercise.slug, name: exercise.name })));
              setLibraryLoading(false);
            }
            return;
          }
          sessionStorage.removeItem(EXERCISE_CACHE_KEY);
        }
        const response = await fetch(`/api/data/public/${EXERCISE_DATASET}?limit=500&offset=0`, { credentials: "include" });
        const data = await response.json() as { items?: unknown[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Unable to load exercise details");
        const exercises = (data.items || []).filter(isFitnessExercise);
        sessionStorage.setItem(EXERCISE_CACHE_KEY, JSON.stringify({ exercises, cachedAt: Date.now() }));
        if (active) {
          setLibrary(exercises);
          cacheFitnessAgentContext(baseRoutines, exercises.map((exercise) => ({ slug: exercise.slug, name: exercise.name })));
        }
      } catch (cause) {
        if (active) setLibraryError(cause instanceof Error ? cause.message : "Unable to load exercise details");
      } finally {
        if (active) setLibraryLoading(false);
      }
    }
    void loadLibrary();
    return () => { active = false; };
  }, [baseRoutines]);

  useEffect(() => {
    const update = (value: ProposalEnvelope | null) => { setProposalEnvelope(value); setIgnoredChanges([]); setSaveMessage(null); };
    const onStorage = (event: StorageEvent) => { if (event.key === PROPOSAL_STORAGE_KEY) update(readProposal()); };
    const onProposal = (event: Event) => {
      const detail = (event as CustomEvent<{ storageKey?: string; version?: number; savedAt?: string; proposal?: FitnessPlanProposal | null }>).detail;
      if (detail?.storageKey !== PROPOSAL_STORAGE_KEY || typeof detail.version !== "number" || typeof detail.savedAt !== "string") return;
      if (detail.proposal === null) { update(null); return; }
      if (detail.proposal) update({ version: detail.version, savedAt: detail.savedAt, proposal: detail.proposal });
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(PROPOSAL_EVENT, onProposal);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(PROPOSAL_EVENT, onProposal); };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadWorkouts() {
      try {
        const cached = sessionStorage.getItem(WORKOUT_CACHE_KEY);
        if (cached) {
          try {
            const data = JSON.parse(cached) as WorkoutData;
            if (Array.isArray(data.workouts) && Date.now() - data.cachedAt < WORKOUT_CACHE_TTL_MS) {
              if (active) { setWorkouts(data.workouts); setWorkoutsError(null); setWorkoutsLoading(false); }
              return;
            }
          } catch {
            // Ignore malformed cache data and replace it with a fresh response.
          }
          sessionStorage.removeItem(WORKOUT_CACHE_KEY);
        }
        const response = await fetch("/api/hevy/workouts", { cache: "no-store" });
        const data = await readApiResponse<{ workouts?: HevyWorkout[] }>(response);
        if (!response.ok) throw new Error(data.error || "Unable to load workout history");
        const nextWorkouts = Array.isArray(data.workouts) ? data.workouts : [];
        sessionStorage.setItem(WORKOUT_CACHE_KEY, JSON.stringify({ workouts: nextWorkouts, cachedAt: Date.now() } satisfies WorkoutData));
        if (active) { setWorkouts(nextWorkouts); setWorkoutsError(null); }
      } catch (cause) {
        if (active) setWorkoutsError(cause instanceof Error ? cause.message : "Unable to load workout history");
      } finally {
        if (active) setWorkoutsLoading(false);
      }
    }
    void loadWorkouts();
    return () => { active = false; };
  }, []);

  function toggleIgnoredChange(id: string) {
    setIgnoredChanges((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }
  const proposal = proposalEnvelope?.proposal;
  const proposalChanges = proposal && Array.isArray(proposal.changes) ? proposalToRoutineChanges(baseRoutines, library, proposal) : [];
  const appliedChanges = proposalChanges.filter((change) => !ignoredChanges.includes(change.id));
  const previewRoutines = proposal ? applyRoutineChanges(baseRoutines, proposalChanges) : baseRoutines;
  const changeSummary = proposal ? changeCounts(appliedChanges, "", []) : { added: 0, removed: 0, modified: 0 };
  const changeCount = changeSummary.added + changeSummary.removed + changeSummary.modified;
  async function acceptChanges() {
    if (!appliedChanges.length || saving) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const nextRoutines = applyRoutineChanges(baseRoutines, appliedChanges);
      const response = await fetch("/api/hevy/suggested", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ routines: nextRoutines, routineIds: [...new Set(appliedChanges.map((change) => change.routineId))] }) });
      const data = await readApiResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Unable to save My Routines changes");
      localStorage.removeItem(PROPOSAL_STORAGE_KEY);
      setProposalEnvelope(null);
      setIgnoredChanges([]);
      setSaveMessage("Plan changes saved to Hevy in My Routines.");
    } catch (cause) {
      setSaveMessage(cause instanceof Error ? cause.message : "Unable to save changes");
    } finally { setSaving(false); }
  }
  function cancelChanges() {
    localStorage.removeItem(PROPOSAL_STORAGE_KEY);
    setProposalEnvelope(null);
    setIgnoredChanges([]);
    setSaveMessage(null);
  }
  if (!baseRoutines.length) return <Empty title="No current plan" text="Your Hevy routines will appear here once they are available."/>;
  return <div className="mx-auto max-w-6xl space-y-6">
    <WorkoutBanner routines={baseRoutines} workouts={workouts} loading={workoutsLoading} error={workoutsError}/>
    {libraryError && <p role="status" className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">Exercise media is unavailable right now. Your plan and targets are still shown.</p>}
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">{previewRoutines.map((routine, index) => { const routineChanges = proposalChanges.filter((change) => change.routineId === routine.id); const removedChanges = routineChanges.filter((change) => change.action === "remove"); return <section key={routine.id} className="space-y-5 border-t border-[var(--border)] pt-6 first:border-t-0 first:pt-0 lg:border-t-0 lg:pt-0"><details open><summary className="flex min-h-24 cursor-pointer list-none items-start gap-3 pt-5 [&::-webkit-details-marker]:hidden"><span className="grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold text-[#17121f]" style={{ background: tone[routine.title] || "#a78bfa" }}>{index + 1}</span><div className="min-w-0 flex-1"><h3 className="text-lg font-semibold">{routine.title}</h3><span className="mt-0.5 block truncate text-xs text-[var(--muted-foreground)]">{routine.exercises.length} exercises · {setsCount(routine)} sets{routine.notes ? ` · ${routine.notes}` : ""}</span><RoutineChangeSummary changes={routineChanges} ignoredChanges={ignoredChanges}/></div><ChevronDown className="mt-1 size-4 shrink-0 text-[var(--muted-foreground)]"/></summary><div className="space-y-8 pt-5">{routine.exercises.map((exercise, exerciseIndex) => { const change = routineChanges.find((item) => item.id === exercise.preview_change_id); return <PlanExercise key={`${routine.id}-${exercise.exercise_template_id}-${exerciseIndex}`} exercise={exercise} currentExercise={change?.currentExercise} index={exerciseIndex} detail={findExerciseDetails(exercise, library)} libraryLoading={libraryLoading} experiment change={change ? changeType(change.action) : "normal"} ignored={Boolean(change && ignoredChanges.includes(change.id))} onToggleIgnore={change ? () => toggleIgnoredChange(change.id) : undefined}/>; })}{removedChanges.map((change) => <PlanExercise key={change.id} exercise={change.currentExercise!} index={change.exerciseIndex} detail={findExerciseDetails(change.currentExercise!, library)} libraryLoading={libraryLoading} experiment change="delete" ignored={ignoredChanges.includes(change.id)} onToggleIgnore={() => toggleIgnoredChange(change.id)}/>)}</div></details></section>; })}</div>
    {(proposal || saveMessage) && <div className="border-t border-[var(--border)] pb-24 pt-6 sm:pb-0"><div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div className="min-w-0 flex-1">{saveMessage && <p role="status" className="text-sm text-[var(--muted-foreground)]">{saveMessage}</p>}{proposal && <div aria-live="polite"><p className="text-xs font-semibold uppercase tracking-[.14em] text-[var(--muted-foreground)]">Changes to review</p><p className="mt-1 text-sm font-semibold leading-6 text-[var(--foreground)]">{changeCount > 0 ? changeBreakdown(changeSummary) : "No changes selected"}</p><p className="mt-0.5 text-sm leading-6 text-[var(--muted-foreground)]">{changeCount > 0 ? "Review the highlighted exercises before saving to My Routines." : "Select at least one change to continue."}</p></div>}</div>{proposal && <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto"><Button variant="outline" disabled={saving} onClick={cancelChanges} className="min-h-12 w-full px-4 text-base sm:w-auto sm:px-6">Cancel</Button><Button disabled={saving || changeCount === 0} onClick={() => void acceptChanges()} className="min-h-12 w-full px-4 text-base sm:w-auto sm:px-6">{saving ? "Saving…" : "Save changes"}</Button></div>}</div></div>}
  </div>;
}

function RoutineChangeSummary({ changes, ignoredChanges }: { changes: RoutineExerciseChange[]; ignoredChanges: string[] }) {
  const { added, removed, modified } = changeCounts(changes.filter((change) => !ignoredChanges.includes(change.id)), "", []);
  return <div className="mt-1 flex min-h-4 flex-wrap gap-1.5 text-[10px] font-semibold" aria-live="polite">{added > 0 && <span className="rounded bg-emerald-300/15 px-1.5 py-0.5 text-emerald-200">{added} added</span>}{removed > 0 && <span className="rounded bg-rose-300/15 px-1.5 py-0.5 text-rose-200">{removed} removed</span>}{modified > 0 && <span className="rounded bg-violet-300/15 px-1.5 py-0.5 text-violet-200">{modified} modified</span>}</div>;
}

function WorkoutBanner({ routines, workouts, loading, error }: { routines: HevyRoutine[]; workouts: HevyWorkout[]; loading: boolean; error: string | null }) {
  const recentWorkouts = [...workouts].sort((a, b) => (workoutDate(b)?.getTime() ?? 0) - (workoutDate(a)?.getTime() ?? 0));
  const lastWorkout = recentWorkouts.find((workout) => workoutDate(workout));
  const lastWorkoutDate = lastWorkout ? workoutDate(lastWorkout) : null;
  const lastRoutineIndex = lastWorkout ? order.indexOf(lastWorkout.title) : -1;
  const nextTitle = lastRoutineIndex >= 0 ? order[(lastRoutineIndex + 1) % order.length] : order[0];
  const today = new Date();
  const recentDays = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (4 - index));
    const key = localDateKey(date);
    const workout = recentWorkouts.find((item) => {
      const date = workoutDate(item);
      return date ? localDateKey(date) === key : false;
    });
    return { date, workout };
  });
  return <section className="overflow-hidden rounded-3xl border border-[#3d3158] bg-[radial-gradient(circle_at_82%_10%,rgba(167,139,250,.2),transparent_34%),linear-gradient(135deg,#211a30,#15121d)] p-6 md:p-8"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="eyebrow">CURRENT PLAN</p><h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-[-.045em] md:text-5xl">Train with intent.<br/><span className="text-[#a99fba]">Follow your plan.</span></h2><p className="mt-4 max-w-xl text-sm leading-6 text-[#aaa3b5]">Your live ULPPL rhythm, pulled from Hevy.</p></div><div className="min-w-0 text-left md:text-right"><div className="flex justify-start gap-1.5 sm:gap-2 md:justify-end">{recentDays.map(({ date, workout }) => <div key={localDateKey(date)} title={workout ? `${workout.title} logged` : "No workout logged"} aria-label={`${date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}: ${workout ? `${workout.title} logged` : "no workout"}`} className={`grid size-10 place-items-center rounded-full text-center transition-colors sm:size-12 ${workout ? "bg-fuchsia-200 text-[#2b173e]" : "bg-white/10 text-white/55"}`}><span><span className="block text-[8px] font-bold uppercase tracking-[.08em] sm:text-[9px]">{date.toLocaleDateString(undefined, { weekday: "short" })}</span><span className="block text-xs font-semibold sm:text-sm">{date.getDate()}</span></span></div>)}</div>{loading && <p className="mt-2 text-[11px] text-white/50">Checking Hevy…</p>}{!loading && error && <p className="mt-2 text-[11px] text-amber-100/80">Workout history unavailable</p>}<div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3"><div className="min-w-0 rounded-2xl border border-white/10 bg-white/[.04] p-2 text-left sm:min-w-24 sm:p-4"><div className="flex items-center gap-1 text-fuchsia-100/65"><Dumbbell className="size-4 shrink-0"/><span className="whitespace-nowrap text-[9px] font-bold uppercase leading-4 tracking-[.08em] sm:text-[10px] sm:tracking-[.12em]">NEXT</span></div><strong className="mt-2 block break-words text-center text-lg font-semibold sm:mt-3 sm:text-left sm:text-2xl">{loading ? "Loading…" : nextTitle}</strong></div><div className="min-w-0 rounded-2xl border border-white/10 bg-white/[.04] p-2 text-left sm:min-w-24 sm:p-4"><span className="block whitespace-nowrap text-[9px] font-bold uppercase leading-4 tracking-[.08em] text-fuchsia-100/65 sm:text-[10px] sm:tracking-[.12em]">EX. COUNT</span><strong className="mt-2 block text-center text-lg font-semibold sm:mt-3 sm:text-left sm:text-2xl">{routines.reduce((sum, routine) => sum + routine.exercises.length, 0)}</strong></div><div className="min-w-0 rounded-2xl border border-white/10 bg-white/[.04] p-2 text-left sm:min-w-24 sm:p-4"><div className="flex items-center gap-1 text-fuchsia-100/65"><CalendarDays className="size-4 shrink-0"/><span className="whitespace-nowrap text-[9px] font-bold uppercase leading-4 tracking-[.08em] sm:text-[10px] sm:tracking-[.12em]">LAST W.O</span></div><strong className="mt-2 block text-center text-lg font-semibold sm:mt-3 sm:text-left sm:text-2xl">{loading || !lastWorkoutDate ? "—" : daysSince(lastWorkoutDate)}</strong></div></div></div></div></section>;
}

function ExerciseMedia({ exercise, detail, libraryLoading }: { exercise: HevyExercise; detail?: FitnessExercise; libraryLoading: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const hasVideo = Boolean(detail?.videoUrl);
  const hasImage = Boolean(detail?.imageUrl);
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
  return <div className="relative aspect-square self-start overflow-hidden rounded-lg bg-[#17121f] ring-1 ring-inset ring-white/15"><div className="absolute inset-0" role="button" tabIndex={0} aria-label={`Play ${exercise.title} demonstration`} onPointerEnter={play} onPointerLeave={stop} onClick={play} onKeyDown={handleKeyDown}>{hasImage && <img src={detail?.imageUrl || undefined} alt={`${exercise.title} demonstration`} className={`absolute inset-0 size-full object-contain p-2 transition-opacity ${playing ? "opacity-0" : "opacity-100"}`}/>} {hasVideo ? <video ref={video} src={exerciseVideoUrl(detail?.videoUrl) || undefined} muted loop playsInline preload="none" className={`absolute inset-0 size-full object-cover transition-opacity ${playing || !hasImage ? "opacity-100" : "opacity-0"}`} aria-hidden="true"/> : !hasImage && <div className="grid size-full place-items-center text-center text-sm text-white/50"><div><Video className="mx-auto mb-2 size-8"/><span>{libraryLoading ? "Loading demonstration…" : "No demonstration available"}</span></div></div>}</div></div>;
}

function CompactPlanExercise({ exercise, detail, libraryLoading, change = "normal", currentExercise, ignored, onToggleIgnore }: { exercise: HevyExercise; detail?: FitnessExercise; libraryLoading: boolean; change?: ExperimentChange; currentExercise?: HevyExercise; ignored: boolean; onToggleIgnore: () => void }) {
  return <ExperimentStatsExercise exercise={exercise} currentExercise={currentExercise} detail={detail} libraryLoading={libraryLoading} change={change} ignored={ignored} onToggleIgnore={onToggleIgnore}/>;
}

function ExperimentStatsExercise({ exercise, currentExercise, detail, libraryLoading, change, ignored = false, onToggleIgnore }: { exercise: HevyExercise; currentExercise?: HevyExercise; detail?: FitnessExercise; libraryLoading: boolean; change: ExperimentChange; ignored?: boolean; onToggleIgnore?: () => void }) {
  const isModify = change === "modify";
  const isDelete = change === "delete";
  const isAdd = change === "add";
  const current = isAdd ? currentExercise : currentExercise || exercise;
  return <div role="group" aria-label={`${exercise.title} ${change}`} className={`grid grid-cols-[minmax(104px,32%)_1fr] items-start gap-3 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#3b3a45,#1a1921)] p-3 shadow-[0_12px_30px_rgba(20,20,28,.28)] sm:grid-cols-[minmax(136px,26%)_1fr] sm:gap-5 ${isDelete ? "opacity-90" : ""}`}><div className={isDelete ? "opacity-55" : ""}><ExerciseMedia exercise={exercise} detail={detail} libraryLoading={libraryLoading}/></div><div className="relative min-w-0"><div className="flex items-start gap-2 pr-14"><div className="min-w-0"><h3 className={`min-h-10 line-clamp-2 text-sm font-semibold leading-5 ${isDelete ? "line-through decoration-rose-300/80" : ""} ${isAdd ? "text-emerald-300" : ""}`}>{exercise.title}</h3></div></div><div className="absolute right-0 top-0">{(isModify || isDelete || isAdd) && onToggleIgnore && <label className={`grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl transition-colors ${ignored ? "bg-white/15 text-white" : "bg-black/20 text-white/65 hover:bg-white/15 hover:text-white"}`} title={ignored ? "Include change" : "Exclude change"}><input type="checkbox" checked={!ignored} onChange={onToggleIgnore} aria-label={ignored ? "Include change" : "Exclude change"} className="size-5 accent-[var(--ring)]"/></label>}</div><p className="mt-1 truncate pr-14 text-xs text-white/60">{detail?.muscles.slice(0, 3).join(" · ") || "Chest · Triceps"}</p><div className={`mt-3 border-t border-white/15 pt-2 ${isModify || isAdd ? "grid grid-cols-2 gap-x-3" : ""}`}><div><span className="block text-[10px] text-white/55">CURRENT</span><strong className="block truncate text-xs font-medium text-white/85">{current ? formatSetCountTarget(current.sets) : "—"}</strong></div>{(isModify || isAdd) && <div><span className="block text-[10px] text-white/65">PROPOSED</span><strong className="block truncate text-xs font-semibold text-emerald-300/90">{isAdd ? formatSetCountTarget(exercise.sets) : formatSetCountTarget(exercise.sets)}</strong></div>}</div></div></div>;
}

function PlanExercise({ exercise, currentExercise, detail, libraryLoading, experiment = false, change = "normal", ignored = false, onToggleIgnore }: { exercise: HevyExercise; currentExercise?: HevyExercise; index?: number; detail?: FitnessExercise; libraryLoading: boolean; experiment?: boolean; change?: ExperimentChange; ignored?: boolean; onToggleIgnore?: () => void }) {
  if (experiment) return <CompactPlanExercise exercise={exercise} currentExercise={currentExercise} detail={detail} libraryLoading={libraryLoading} change={change} ignored={ignored} onToggleIgnore={onToggleIgnore || (() => undefined)}/>;
  return <ExperimentStatsExercise exercise={exercise} detail={detail} libraryLoading={libraryLoading} change="normal"/>;
}

function Empty({ title, text }: { title: string; text: string }) { return <Card><CardContent className="grid place-items-center p-12 text-center"><Activity className="mb-3 size-7 text-[var(--muted-foreground)]"/><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm text-[var(--muted-foreground)]">{text}</p></CardContent></Card>; }
function ConnectionError({ message, onRetry }: { message: string; onRetry: () => void | Promise<void> }) { return <Card className="mx-auto max-w-xl"><CardContent className="p-8 text-center"><TimerReset className="mx-auto mb-4 size-8 text-[var(--muted-foreground)]"/><h2 className="text-lg font-semibold">Couldn’t reach Hevy</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">{message}</p><Button className="mt-5" onClick={onRetry}><RefreshCw/>Try again</Button></CardContent></Card>; }
