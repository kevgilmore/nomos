import type { HevyRoutine } from "./hevy-types";

export const FITNESS_AGENT_CONTEXT_KEY = "nomos-fitness-agent-context";
export const FITNESS_AGENT_CONTEXT_VERSION = 5;
const FITNESS_AGENT_CONTEXT_BASE_VERSION = 4;

export function cacheFitnessAgentContext(routines: HevyRoutine[], exerciseCatalog: Array<{ slug: string; name: string }> = []) {
  if (typeof window === "undefined" || !routines.length) return;
  try {
    const previous = JSON.parse(window.localStorage.getItem(FITNESS_AGENT_CONTEXT_KEY) || "null") as { exerciseCatalog?: Array<{ slug: string; name: string }> } | null;
    const catalog = exerciseCatalog.length ? exerciseCatalog : previous?.exerciseCatalog || [];
    const routineNames = [...new Set(routines.map((routine) => routine.title))];
    window.localStorage.setItem(FITNESS_AGENT_CONTEXT_KEY, JSON.stringify({
      version: catalog.length ? FITNESS_AGENT_CONTEXT_VERSION : FITNESS_AGENT_CONTEXT_BASE_VERSION,
      source: "Hevy",
      type: "fitness-routines",
      scope: {
        folder: "My Routines",
        routineNames,
        instruction: "Use only the routines listed here from My Routines, which is the active plan. ULPPL is a backup and must not be modified. If the user says Upper, use the routine named Upper exactly; do not invent Upper A, Upper B, or another program/cycle. When reviewing a workout or proposing plan changes, return a concrete review proposal using the fitness response format. Proposals are previews only until the user accepts them.",
      },
      savedAt: new Date().toISOString(),
      routines,
      ...(catalog.length ? { exerciseCatalog: catalog } : {}),
    }));
  } catch {
    // Local storage can be unavailable or full; the Plan still works from memory.
  }
}
