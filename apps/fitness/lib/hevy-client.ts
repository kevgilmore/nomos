import type { HevyRoutine } from "./hevy-types";

let cachedRoutines: HevyRoutine[] | null = null;
let cachedAt = 0;
let inFlight: Promise<HevyRoutine[]> | null = null;
const CACHE_WINDOW_MS = 5_000;

export function fetchHevyRoutines() {
  if (cachedRoutines && Date.now() - cachedAt < CACHE_WINDOW_MS) return Promise.resolve(cachedRoutines);
  if (inFlight) return inFlight;
  inFlight = fetch("/api/hevy/routines", { credentials: "include", cache: "no-store" })
    .then(async (response) => {
      const data = await response.json() as { routines?: HevyRoutine[]; error?: string };
      if (!response.ok || !Array.isArray(data.routines)) throw new Error(data.error || "Unable to load Hevy routines");
      cachedRoutines = data.routines;
      cachedAt = Date.now();
      return data.routines;
    })
    .finally(() => { inFlight = null; });
  return inFlight;
}
