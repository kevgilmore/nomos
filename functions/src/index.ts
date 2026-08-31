import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
export { authApi } from "./auth.js";
export { authGate } from "./auth-gate.js";
export { aiApi, aiRetentionCleanup } from "./ai.js";
export { dataApi } from "./data.js";
import { approvedEmails, isApprovedRequest } from "./auth.js";

const hevyApiKey = defineSecret("HEVY_API_KEY");
const HEVY_URL = "https://api.hevyapp.com/v1";
const ROUTINE_FOLDER_ID = 2637111;
const ULPPL_TITLES = new Set(["Upper", "Lower", "Push", "Pull", "Legs"]);

type HevySet = { type: "normal" | "warmup" | "dropset" | "failure"; weight_kg: number | null; reps: number | null; distance_meters: number | null; duration_seconds: number | null; custom_metric: number | null; rep_range?: { start: number | null; end: number | null } | null };
type HevyExercise = { title: string; notes: string | null; exercise_template_id: string; superset_id: number | null; sets: HevySet[]; rest_seconds: number };
type HevyRoutine = { id: string; title: string; folder_id: number; notes?: string | null; updated_at: string; created_at: string; exercises: HevyExercise[] };
type HevyWorkout = { id: string; title: string; description: string | null; start_time: string; end_time: string; updated_at: string; created_at: string; exercises: HevyExercise[] };

async function hevyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(HEVY_URL + path, { ...init, headers: { "api-key": hevyApiKey.value(), "content-type": "application/json", ...init?.headers } });
  if (!response.ok) throw new Error("Hevy request failed (" + response.status + ")");
  return response.json() as Promise<T>;
}

async function routines() {
  const result = await hevyFetch<{ routines: HevyRoutine[] }>("/routines?page=1&pageSize=10");
  return result.routines.filter((routine) => routine.folder_id === ROUTINE_FOLDER_ID && ULPPL_TITLES.has(routine.title));
}

async function workouts() {
  const result = await hevyFetch<{ workouts: HevyWorkout[] }>("/workouts?page=1&pageSize=10");
  return result.workouts.filter((workout) => ULPPL_TITLES.has(workout.title));
}

function updatePayload(routine: HevyRoutine) {
  return { routine: { title: routine.title, folder_id: routine.folder_id, notes: routine.notes ?? null, exercises: routine.exercises.map((exercise) => ({ exercise_template_id: exercise.exercise_template_id, superset_id: exercise.superset_id, rest_seconds: exercise.rest_seconds, notes: exercise.notes, sets: exercise.sets.map((set) => ({ ...set })) })) } };
}

export const fitnessApi = onRequest({ region: "europe-west2", secrets: [hevyApiKey, approvedEmails], cors: true, invoker: "public" }, async (req, res) => {
  try {
    if (!(await isApprovedRequest(req))) { res.status(401).json({ error: "Authentication required" }); return; }
    const path = req.path.replace(/^\/api\/hevy/, "") || "/";
    if (req.method === "GET" && path === "/routines") { res.json({ routines: await routines() }); return; }
    if (req.method === "GET" && path === "/workouts") { res.json({ workouts: await workouts() }); return; }
    const match = path.match(/^\/routines\/([^/]+)$/);
    if (req.method === "PUT" && match) {
      const routine = req.body as HevyRoutine;
      if (!routine || routine.id !== decodeURIComponent(match[1]) || !Array.isArray(routine.exercises)) { res.status(400).json({ error: "Invalid routine" }); return; }
      const current = await routines();
      if (!current.some((item) => item.id === routine.id && item.folder_id === routine.folder_id)) { res.status(400).json({ error: "Routine is not part of the ULPPL plan" }); return; }
      res.json({ routine: await hevyFetch<HevyRoutine>("/routines/" + encodeURIComponent(routine.id), { method: "PUT", body: JSON.stringify(updatePayload(routine)) }) }); return;
    }
    res.status(404).json({ error: "Not found" }); return;
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: error instanceof Error ? error.message : "Hevy is unavailable" });
  }
});
