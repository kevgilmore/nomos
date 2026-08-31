"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Check, ChevronDown, ChevronUp, Clock3, Dumbbell, History, Loader2, Minus, Plus, RefreshCw, Save, TimerReset, Weight } from "lucide-react";
import { Badge, Button, Card, CardContent, CardTitle } from "@nomos/ui";
import type { HevyExercise, HevyRoutine, HevySet, HevyWorkout } from "@/lib/hevy-types";
import { ExerciseLibrary } from "@/components/exercise-library";

type Props = { page: string; tab: string; initialRoutines: HevyRoutine[]; workouts: HevyWorkout[]; initialError: string | null; initialSelectedId?: string };
const order = ["Upper", "Lower", "Push", "Pull", "Legs"];
const tone: Record<string, string> = { Upper: "#a78bfa", Lower: "#5eead4", Push: "#fb7185", Pull: "#60a5fa", Legs: "#fbbf24" };

function setsCount(routine: HevyRoutine) { return routine.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0); }
function duration(workout: HevyWorkout) { return Math.max(0, Math.round((new Date(workout.end_time).getTime() - new Date(workout.start_time).getTime()) / 60000)); }
function volume(workout: HevyWorkout) { return workout.exercises.flatMap((exercise) => exercise.sets).reduce((sum, set) => sum + (set.weight_kg || 0) * (set.reps || 0), 0); }
function formatDate(date: string) { return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", weekday: "short" }).format(new Date(date)); }

const DATA_CACHE_KEY = "nomos_fitness_data";
const DATA_CACHE_TTL_MS = 5 * 60 * 1000;
type FitnessData = { routines: HevyRoutine[]; workouts: HevyWorkout[]; cachedAt: number };

async function readApiResponse<T>(response: Response): Promise<T & { error?: string }> {
  const text = await response.text();
  try { return JSON.parse(text) as T & { error?: string }; }
  catch { throw new Error(response.status === 404 ? "The local Fitness API is not running. Use the deployed Fitness site for live Hevy data." : `Fitness API returned ${response.status} instead of JSON.`); }
}

export function FitnessDashboard(props: Props) {
  const [routines, setRoutines] = useState(props.initialRoutines);
  const [workouts, setWorkouts] = useState(props.workouts);
  const [error, setError] = useState(props.initialError);
  useEffect(() => { if (props.page === "exercises") return; const routineId = new URLSearchParams(window.location.search).get("routine"); if (routineId) setSelectedId(routineId); if (!routines.length && !workouts.length) void loadData(); }, [props.page, routines.length, workouts.length]);
  async function loadData() {
    try {
      const cached = sessionStorage.getItem(DATA_CACHE_KEY);
      if (cached) {
        try {
          const data = JSON.parse(cached) as FitnessData;
          if (Date.now() - data.cachedAt < DATA_CACHE_TTL_MS) {
            setRoutines(data.routines);
            setWorkouts(data.workouts);
            setError(null);
            return;
          }
        } catch {
          // Ignore malformed cache data and replace it with a fresh API response.
        }
        sessionStorage.removeItem(DATA_CACHE_KEY);
      }
      const [routineResponse, workoutResponse] = await Promise.all([fetch("/api/hevy/routines"), fetch("/api/hevy/workouts")]);
      const routineData = await readApiResponse<{ routines: HevyRoutine[] }>(routineResponse);
      const workoutData = await readApiResponse<{ workouts: HevyWorkout[] }>(workoutResponse);
      if (!routineResponse.ok) throw new Error(routineData.error);
      if (!workoutResponse.ok) throw new Error(workoutData.error);
      setRoutines(routineData.routines); setWorkouts(workoutData.workouts); setError(null);
      sessionStorage.setItem(DATA_CACHE_KEY, JSON.stringify({ routines: routineData.routines, workouts: workoutData.workouts, cachedAt: Date.now() } satisfies FitnessData));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to connect"); }
  }
  const [selectedId, setSelectedId] = useState<string | null>(props.initialSelectedId || null);
  const selected = routines.find((routine) => routine.id === selectedId);
  const sorted = [...routines].sort((a, b) => order.indexOf(a.title) - order.indexOf(b.title));

  if (error && routines.length === 0) return <ConnectionError message={error} onRetry={async () => {
    setError(null);
    try { const response = await fetch("/api/hevy/routines"); const data = await readApiResponse<{ routines: HevyRoutine[] }>(response); if (!response.ok) throw new Error(data.error); setRoutines(data.routines); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to connect"); }
  }}/>;

  if (props.page === "workouts" && props.tab === "plan") return selected
    ? <RoutineEditor routine={selected} onBack={() => setSelectedId(null)} onSaved={(updated) => setRoutines((items) => items.map((item) => item.id === updated.id ? updated : item))}/>
    : <RoutinePlan routines={sorted} onSelect={setSelectedId}/>;
  if (props.page === "workouts") return <ExerciseIndex routines={sorted}/>;
  if (props.page === "dashboard" && props.tab === "history") return <WorkoutHistory workouts={workouts}/>;
  if (props.page === "progress") return <ProgressView workouts={workouts}/>;
  if (props.page === "exercises") return <ExerciseLibrary/>;
  return <Overview routines={sorted} workouts={workouts}/>;
}

function Overview({ routines, workouts }: { routines: HevyRoutine[]; workouts: HevyWorkout[] }) {
  const totalSets = routines.reduce((sum, routine) => sum + setsCount(routine), 0);
  const latest = workouts[0];
  return <div className="space-y-7">
    <section className="overflow-hidden rounded-3xl border border-[#3d3158] bg-[radial-gradient(circle_at_82%_10%,rgba(167,139,250,.2),transparent_34%),linear-gradient(135deg,#211a30,#15121d)] p-6 md:p-8">
      <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end"><div><Badge className="mb-4 bg-[#a78bfa] text-[#181321]">HEVY CONNECTED</Badge><h2 className="max-w-2xl text-3xl font-semibold tracking-[-.045em] md:text-5xl">Five sessions.<br/><span className="text-[#a99fba]">One clear plan.</span></h2><p className="mt-4 max-w-xl text-sm leading-6 text-[#aaa3b5]">Your live Upper · Lower · Push · Pull · Legs programme, ready to review before you train.</p></div><div className="grid grid-cols-2 gap-3"><Metric value={`${routines.length}/5`} label="Routines synced"/><Metric value={String(totalSets)} label="Working sets"/></div></div>
    </section>
    <div><div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">TRAINING WEEK</p><h2 className="mt-1 text-xl font-semibold">Your ULPPL rotation</h2></div><span className="text-xs text-[var(--muted-foreground)]">Live from Hevy</span></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{routines.map((routine, index) => <Link key={routine.id} href={`/workouts/plan?routine=${encodeURIComponent(routine.id)}`} className="routine-tile group text-left"><span className="mb-8 block size-2 rounded-full" style={{ background: tone[routine.title] }}/><span className="text-xs text-[var(--muted-foreground)]">DAY {index + 1}</span><strong className="mt-1 block text-xl">{routine.title}</strong><span className="mt-4 flex items-center justify-between text-xs text-[var(--muted-foreground)]"><span>{routine.exercises.length} exercises · {setsCount(routine)} sets</span><ArrowRight className="size-4 transition-transform group-hover:translate-x-1"/></span></Link>)}</div>
    </div>
    {latest && <Card><CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center"><span className="grid size-11 place-items-center rounded-xl bg-[var(--accent)]"><History className="size-5"/></span><div className="flex-1"><p className="text-xs font-semibold tracking-widest text-[var(--muted-foreground)]">LAST SESSION · {formatDate(latest.start_time).toUpperCase()}</p><h3 className="mt-1 font-semibold">{latest.title}</h3></div><div className="flex gap-6 text-sm"><span><b>{duration(latest)}</b> min</span><span><b>{latest.exercises.length}</b> exercises</span><span><b>{Math.round(volume(latest)).toLocaleString()}</b> kg</span></div></CardContent></Card>}
  </div>;
}

function Metric({ value, label }: { value: string; label: string }) { return <div className="min-w-32 rounded-2xl border border-white/10 bg-white/[.04] p-4"><strong className="block text-2xl">{value}</strong><span className="text-xs text-[#aaa3b5]">{label}</span></div>; }

function RoutinePlan({ routines, onSelect }: { routines: HevyRoutine[]; onSelect: (id: string) => void }) {
  return <div><div className="mb-6"><p className="eyebrow">LIVE ROUTINES</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Your five-day plan</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">Choose a routine to adjust weights, targets, sets, rest, or notes. Changes save straight to Hevy.</p></div><div className="grid gap-4 lg:grid-cols-2">{routines.map((routine, index) => <Card key={routine.id} className="overflow-hidden"><button className="w-full p-5 text-left" onClick={() => onSelect(routine.id)}><div className="flex items-start"><span className="grid size-10 place-items-center rounded-xl text-sm font-bold text-[#17121f]" style={{background: tone[routine.title]}}>{index + 1}</span><div className="ml-4"><CardTitle className="text-lg">{routine.title}</CardTitle><p className="mt-1 text-xs text-[var(--muted-foreground)]">{routine.exercises.length} exercises · {setsCount(routine)} sets</p></div><ArrowRight className="ml-auto mt-2 size-5"/></div><div className="mt-5 flex flex-wrap gap-2">{routine.exercises.slice(0, 5).map((exercise) => <Badge key={exercise.exercise_template_id} variant="secondary">{exercise.title}</Badge>)}{routine.exercises.length > 5 && <Badge variant="secondary">+{routine.exercises.length - 5}</Badge>}</div></button></Card>)}</div></div>;
}

function RoutineEditor({ routine, onBack, onSaved }: { routine: HevyRoutine; onBack: () => void; onSaved: (routine: HevyRoutine) => void }) {
  const [draft, setDraft] = useState(() => structuredClone(routine));
  const [open, setOpen] = useState<number[]>([0]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const updateExercise = (index: number, exercise: HevyExercise) => setDraft((current) => ({...current, exercises: current.exercises.map((item, i) => i === index ? exercise : item)}));
  async function save() { setStatus("saving"); setError(null); try { const response = await fetch(`/api/hevy/routines/${draft.id}`, { method: "PUT", headers: {"content-type":"application/json"}, body: JSON.stringify(draft) }); const data = await readApiResponse<{ routine: HevyRoutine }>(response); if (!response.ok) throw new Error(data.error); setDraft(data.routine); onSaved(data.routine); sessionStorage.removeItem(DATA_CACHE_KEY); setStatus("saved"); setTimeout(() => setStatus("idle"), 1800); } catch (cause) { setError(cause instanceof Error ? cause.message : "Save failed"); setStatus("idle"); } }
  return <div className="mx-auto max-w-4xl"><div className="sticky top-[72px] z-20 -mx-2 mb-5 flex items-center gap-3 bg-[color-mix(in_srgb,var(--background)_92%,transparent)] px-2 py-3 backdrop-blur"><Button variant="ghost" onClick={onBack}>← Plan</Button><div className="min-w-0 flex-1"><h2 className="truncate text-xl font-semibold">{draft.title}</h2><p className="text-xs text-[var(--muted-foreground)]">{draft.exercises.length} exercises · {setsCount(draft)} sets</p></div><Button onClick={save} disabled={status === "saving"}>{status === "saving" ? <Loader2 className="animate-spin"/> : status === "saved" ? <Check/> : <Save/>}{status === "saved" ? "Saved" : "Save to Hevy"}</Button></div>{error && <p role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
    <div className="space-y-3">{draft.exercises.map((exercise, index) => { const expanded = open.includes(index); return <Card key={`${exercise.exercise_template_id}-${index}`}><button className="flex w-full items-center gap-4 p-5 text-left" onClick={() => setOpen((items) => expanded ? items.filter((item) => item !== index) : [...items, index])}><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--muted)] text-xs font-semibold">{index + 1}</span><div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{exercise.title}</h3><p className="mt-1 text-xs text-[var(--muted-foreground)]">{exercise.sets.length} sets · {exercise.rest_seconds}s rest</p></div>{expanded ? <ChevronUp/> : <ChevronDown/>}</button>{expanded && <ExerciseEditor exercise={exercise} onChange={(value) => updateExercise(index, value)}/>}</Card>; })}</div>
  </div>;
}

function ExerciseEditor({ exercise, onChange }: { exercise: HevyExercise; onChange: (exercise: HevyExercise) => void }) {
  const updateSet = (index: number, set: HevySet) => onChange({...exercise, sets: exercise.sets.map((item, i) => i === index ? set : item)});
  const addSet = () => { const previous = exercise.sets.at(-1); if (!previous) return; onChange({...exercise, sets: [...exercise.sets, {...previous, index: exercise.sets.length}]}); };
  const removeSet = (index: number) => onChange({...exercise, sets: exercise.sets.filter((_, i) => i !== index).map((set, i) => ({...set, index: i}))});
  return <CardContent className="border-t p-5"><div className="mb-5 grid gap-4 md:grid-cols-[1fr_150px]"><label className="field-label">Exercise notes<textarea className="field-input mt-2 min-h-20 resize-y py-2" value={exercise.notes || ""} placeholder="Technique cue or reminder" onChange={(event) => onChange({...exercise, notes: event.target.value || null})}/></label><label className="field-label">Rest (seconds)<input className="field-input mt-2" type="number" min="0" step="5" value={exercise.rest_seconds} onChange={(event) => onChange({...exercise, rest_seconds: Number(event.target.value)})}/></label></div><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="text-left text-xs text-[var(--muted-foreground)]"><th className="pb-3 font-medium">SET</th><th className="pb-3 font-medium">TYPE</th><th className="pb-3 font-medium">WEIGHT (KG)</th><th className="pb-3 font-medium">REPS / RANGE</th><th></th></tr></thead><tbody>{exercise.sets.map((set, index) => <tr key={index} className="border-t"><td className="py-3 font-semibold">{index + 1}</td><td className="py-3"><select className="mini-input" value={set.type} onChange={(event) => updateSet(index, {...set, type: event.target.value as HevySet["type"]})}><option value="normal">Working</option><option value="warmup">Warm-up</option><option value="dropset">Drop set</option><option value="failure">Failure</option></select></td><td className="py-3"><input aria-label={`Set ${index + 1} weight`} className="mini-input w-24" type="number" min="0" step="0.25" value={set.weight_kg ?? ""} onChange={(event) => updateSet(index, {...set, weight_kg: event.target.value === "" ? null : Number(event.target.value)})}/></td><td className="py-3">{set.rep_range ? <div className="flex items-center gap-2"><input aria-label="Minimum reps" className="mini-input w-16" type="number" value={set.rep_range.start ?? ""} onChange={(event) => updateSet(index, {...set, rep_range: {...set.rep_range!, start: event.target.value === "" ? null : Number(event.target.value)}})}/><span>–</span><input aria-label="Maximum reps" className="mini-input w-16" type="number" value={set.rep_range.end ?? ""} onChange={(event) => updateSet(index, {...set, rep_range: {...set.rep_range!, end: event.target.value === "" ? null : Number(event.target.value)}})}/></div> : <input aria-label={`Set ${index + 1} reps`} className="mini-input w-20" type="number" min="0" value={set.reps ?? ""} onChange={(event) => updateSet(index, {...set, reps: event.target.value === "" ? null : Number(event.target.value)})}/>}</td><td className="py-3 text-right"><button aria-label={`Remove set ${index + 1}`} className="icon-button" onClick={() => removeSet(index)} disabled={exercise.sets.length === 1}><Minus/></button></td></tr>)}</tbody></table></div><Button variant="outline" size="sm" className="mt-4" onClick={addSet}><Plus/>Add set</Button></CardContent>;
}

function WorkoutHistory({ workouts }: { workouts: HevyWorkout[] }) { return <div><div className="mb-6"><p className="eyebrow">RECENT TRAINING</p><h2 className="mt-1 text-2xl font-semibold">Session history</h2></div>{workouts.length ? <div className="space-y-3">{workouts.map((workout) => <Card key={workout.id}><CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex items-center gap-2"><span className="size-2 rounded-full" style={{background:tone[workout.title] || "#a78bfa"}}/><h3 className="font-semibold">{workout.title}</h3></div><p className="mt-1 text-xs text-[var(--muted-foreground)]">{formatDate(workout.start_time)} · {workout.exercises.length} exercises</p></div><div className="flex gap-5 text-sm"><span className="flex items-center gap-1.5"><Clock3 className="size-4 text-[var(--muted-foreground)]"/>{duration(workout)} min</span><span className="flex items-center gap-1.5"><Weight className="size-4 text-[var(--muted-foreground)]"/>{Math.round(volume(workout)).toLocaleString()} kg</span></div></CardContent></Card>)}</div> : <Empty title="No ULPPL workouts in the latest 10" text="Complete a named ULPPL session in Hevy and it will appear here."/>}</div>; }

function ExerciseIndex({ routines }: { routines: HevyRoutine[] }) { const exercises = useMemo(() => { const map = new Map<string, {title:string; routines:string[]; sets:number}>(); routines.forEach((routine) => routine.exercises.forEach((exercise) => { const item = map.get(exercise.exercise_template_id) || {title:exercise.title,routines:[],sets:0}; item.routines.push(routine.title); item.sets += exercise.sets.length; map.set(exercise.exercise_template_id,item); })); return [...map.values()].sort((a,b)=>a.title.localeCompare(b.title)); }, [routines]); return <div><div className="mb-5"><p className="eyebrow">PROGRAM LIBRARY</p><h2 className="mt-1 text-2xl font-semibold">{exercises.length} exercises</h2></div><Card><div className="divide-y">{exercises.map((exercise) => <div key={exercise.title} className="flex items-center gap-4 p-4"><span className="grid size-9 place-items-center rounded-xl bg-[var(--muted)]"><Dumbbell className="size-4"/></span><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold">{exercise.title}</h3><p className="mt-1 text-xs text-[var(--muted-foreground)]">{exercise.routines.join(" · ")}</p></div><Badge variant="secondary">{exercise.sets} sets / week</Badge></div>)}</div></Card></div>; }

function ProgressView({ workouts }: { workouts: HevyWorkout[] }) { const max = Math.max(1,...workouts.map(volume)); return <div><div className="mb-6"><p className="eyebrow">LOAD TREND</p><h2 className="mt-1 text-2xl font-semibold">Recent training volume</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">Working weight × completed reps across your latest ULPPL sessions.</p></div>{workouts.length ? <Card><CardContent className="p-6"><div className="flex h-64 items-end gap-3">{[...workouts].reverse().map((workout) => { const value=volume(workout); return <div key={workout.id} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2"><span className="text-center text-[10px] text-[var(--muted-foreground)]">{Math.round(value/100)/10}k</span><div className="min-h-1 rounded-t-lg opacity-85" style={{height:`${Math.max(4,(value/max)*85)}%`,background:tone[workout.title] || "#a78bfa"}}/><span className="truncate text-center text-[10px] font-medium">{workout.title}</span></div>; })}</div></CardContent></Card> : <Empty title="No recent volume yet" text="Completed ULPPL workouts will build your chart."/>}</div>; }

function Empty({title,text}:{title:string;text:string}) { return <Card><CardContent className="grid place-items-center p-12 text-center"><Activity className="mb-3 size-7 text-[var(--muted-foreground)]"/><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm text-[var(--muted-foreground)]">{text}</p></CardContent></Card>; }
function ConnectionError({message,onRetry}:{message:string;onRetry:()=>void}) { return <Card className="mx-auto max-w-xl"><CardContent className="p-8 text-center"><TimerReset className="mx-auto mb-4 size-8 text-[var(--muted-foreground)]"/><h2 className="text-lg font-semibold">Couldn’t reach Hevy</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">{message}</p><Button className="mt-5" onClick={onRetry}><RefreshCw/>Try again</Button></CardContent></Card>; }
