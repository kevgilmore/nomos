import "server-only";

const HEVY_URL = "https://api.hevyapp.com/v1";
const ULPPL_TITLES = ["Upper", "Lower", "Push", "Pull", "Legs"] as const;

export type HevySet = {
  index: number;
  type: "normal" | "warmup" | "dropset" | "failure";
  weight_kg: number | null;
  reps: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  custom_metric: number | null;
  rep_range?: { start: number | null; end: number | null } | null;
};

export type HevyExercise = {
  index: number;
  title: string;
  notes: string | null;
  exercise_template_id: string;
  superset_id: number | null;
  sets: HevySet[];
  rest_seconds: number;
};

export type HevyRoutine = {
  id: string;
  title: string;
  folder_id: number | null;
  notes?: string | null;
  updated_at: string;
  created_at: string;
  exercises: HevyExercise[];
};

export type HevyWorkout = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  updated_at: string;
  created_at: string;
  exercises: HevyExercise[];
};

function apiKey() {
  const key = process.env.HEVY_API_KEY || process.env.HEVY_API_TOKEN;
  if (!key) throw new Error("HEVY_API_KEY is not configured");
  if (/^cf(?:at|ut|k)_/.test(key)) {
    throw new Error("HEVY_API_KEY contains a Cloudflare credential. Set it to your Hevy API key; keep Cloudflare tokens in CLOUDFLARE_API_TOKEN.");
  }
  return key;
}

async function hevyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const response = await fetch(`${HEVY_URL}${path}`, {
    ...init,
    headers: { "api-key": apiKey(), "content-type": "application/json", ...init?.headers },
    ...(method === "GET" ? { next: { revalidate: 300 } } : { cache: "no-store" }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Hevy request failed (${response.status}): ${detail || response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function getULPPLRoutines() {
  const wanted = new Set<string>(ULPPL_TITLES);
  const routines = await getAllRoutines();
  return ULPPL_TITLES.flatMap((title) => routines.filter((routine) => routine.folder_id === null && wanted.has(routine.title) && routine.title === title));
}

async function getAllRoutines() {
  const routines: HevyRoutine[] = [];
  let page = 1;
  let pageCount = 1;
  do {
    const result = await hevyFetch<{ page: number; page_count: number; routines: HevyRoutine[] }>(`/routines?page=${page}&pageSize=10`);
    pageCount = result.page_count;
    routines.push(...result.routines);
    page += 1;
  } while (page <= pageCount);
  return routines;
}

function routineReplacePayload(routine: HevyRoutine) {
  return { routine: { title: routine.title, folder_id: routine.folder_id, notes: routine.notes ?? null, exercises: routine.exercises.map((exercise) => ({ exercise_template_id: exercise.exercise_template_id, superset_id: exercise.superset_id, rest_seconds: exercise.rest_seconds, notes: exercise.notes, sets: exercise.sets.map((set) => ({ type: set.type, weight_kg: set.weight_kg, reps: set.reps, distance_meters: set.distance_meters, duration_seconds: set.duration_seconds, custom_metric: set.custom_metric, ...(set.rep_range ? { rep_range: set.rep_range } : {}) })) })) } };
}

export async function updateMyRoutines(routines: HevyRoutine[], routineIds: string[] = []) {
  const current = await getULPPLRoutines();
  const requestedIds = new Set(routineIds);
  const toUpdate = routines.filter((routine) => ULPPL_TITLES.includes(routine.title as typeof ULPPL_TITLES[number]) && (!requestedIds.size || requestedIds.has(routine.id)));
  if (!toUpdate.length) throw new Error("No valid My Routines changes were supplied");
  const updated = [] as HevyRoutine[];
  for (const routine of toUpdate) {
    if (!current.some((item) => item.id === routine.id && item.folder_id === null)) throw new Error(`${routine.title} is not part of My Routines`);
    updated.push(await hevyFetch<HevyRoutine>(`/routines/${encodeURIComponent(routine.id)}`, { method: "PUT", body: JSON.stringify(routineReplacePayload(routine)) }));
  }
  return { routines: updated };
}

export async function getRecentWorkouts() {
  const wanted = new Set<string>(ULPPL_TITLES);
  const result = await hevyFetch<{ workouts: HevyWorkout[] }>("/workouts?page=1&pageSize=10");
  return result.workouts.filter((workout) => wanted.has(workout.title));
}

export async function getWorkoutHistory() {
  const workouts: HevyWorkout[] = [];
  let page = 1;
  let pageCount = 1;
  do {
    const result = await hevyFetch<{ page: number; page_count: number; workouts: HevyWorkout[] }>(`/workouts?page=${page}&pageSize=10`);
    pageCount = result.page_count;
    workouts.push(...result.workouts);
    page += 1;
  } while (page <= pageCount);
  return workouts;
}

export function routineUpdatePayload(routine: HevyRoutine) {
  return {
    routine: {
      title: routine.title,
      folder_id: routine.folder_id,
      notes: routine.notes ?? null,
      exercises: routine.exercises.map((exercise) => ({
        exercise_template_id: exercise.exercise_template_id,
        superset_id: exercise.superset_id,
        rest_seconds: exercise.rest_seconds,
        notes: exercise.notes,
        sets: exercise.sets.map((set) => ({
          type: set.type,
          weight_kg: set.weight_kg,
          reps: set.reps,
          distance_meters: set.distance_meters,
          duration_seconds: set.duration_seconds,
          custom_metric: set.custom_metric,
          ...(set.rep_range ? { rep_range: set.rep_range } : {}),
        })),
      })),
    },
  };
}

export async function updateULPPLRoutine(id: string, routine: HevyRoutine) {
  const current = await getULPPLRoutines();
  if (!current.some((item) => item.id === id && item.folder_id === null)) throw new Error("Routine is not part of My Routines");
  return hevyFetch<HevyRoutine>(`/routines/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(routineUpdatePayload(routine)) });
}
