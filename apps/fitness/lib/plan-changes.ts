import type { HevyExercise, HevyRoutine, HevySet } from "./hevy-types";
import type { FitnessExercise } from "./exercises";

export type PlanChangeAction = "modify" | "remove" | "add";

export type RoutineExerciseChange = {
  id: string;
  routineId: string;
  exerciseIndex: number;
  action: PlanChangeAction;
  reason?: string;
  currentExercise?: HevyExercise;
  proposedExercise?: HevyExercise;
};

export type FitnessPlanProposalChange = {
  routineId: string;
  exerciseIndex: number;
  action: PlanChangeAction;
  exerciseTemplateId?: string;
  targetSets?: number;
  reps?: number;
  repRangeStart?: number;
  repRangeEnd?: number;
  restSeconds?: number;
  reason?: string;
};

export type FitnessPlanProposal = {
  title: string;
  summary: string;
  changes: FitnessPlanProposalChange[];
};

function defaultSet(index: number): HevySet {
  return { index, type: "normal", weight_kg: null, reps: 8, distance_meters: null, duration_seconds: null, custom_metric: null, rep_range: null };
}

export function changeId(routineId: string, exerciseIndex: number, action: PlanChangeAction, exerciseTemplateId?: string) {
  return `${routineId}:${exerciseIndex}:${action}:${exerciseTemplateId || ""}`;
}

export function createModifiedExercise(exercise: HevyExercise, options: Omit<FitnessPlanProposalChange, "routineId" | "exerciseIndex" | "action"> = {}): HevyExercise {
  // Preserve the current set count for field-only edits such as rep ranges.
  // A different count is applied only when the proposal explicitly supplies it.
  const targetSets = Math.max(1, Math.round(options.targetSets ?? exercise.sets.length));
  const sourceSet = exercise.sets[exercise.sets.length - 1] || defaultSet(0);
  const sets = Array.from({ length: targetSets }, (_, index) => {
    const source = exercise.sets[index] || sourceSet;
    const next = { ...source, index };
    if (typeof options.reps === "number") { next.reps = options.reps; next.rep_range = null; }
    if (typeof options.repRangeStart === "number" || typeof options.repRangeEnd === "number") {
      next.reps = null;
      next.rep_range = { start: options.repRangeStart ?? null, end: options.repRangeEnd ?? null };
    }
    return next;
  });
  return { ...exercise, sets, ...(typeof options.restSeconds === "number" ? { rest_seconds: options.restSeconds } : {}) };
}

export function createAddedExercise(detail: FitnessExercise, index: number, options: Omit<FitnessPlanProposalChange, "routineId" | "exerciseIndex" | "action"> = {}): HevyExercise {
  const targetSets = Math.max(1, Math.round(options.targetSets ?? 1));
  const sets = Array.from({ length: targetSets }, (_, setIndex) => {
    const set = defaultSet(setIndex);
    if (typeof options.reps === "number") { set.reps = options.reps; }
    if (typeof options.repRangeStart === "number" || typeof options.repRangeEnd === "number") {
      set.reps = null;
      set.rep_range = { start: options.repRangeStart ?? null, end: options.repRangeEnd ?? null };
    }
    return set;
  });
  return {
    index,
    title: detail.name,
    notes: null,
    exercise_template_id: detail.slug.replace(/^hevy-/, ""),
    superset_id: null,
    sets,
    rest_seconds: typeof options.restSeconds === "number" ? options.restSeconds : 90,
  };
}

export function proposalToRoutineChanges(routines: HevyRoutine[], library: FitnessExercise[], proposal: FitnessPlanProposal): RoutineExerciseChange[] {
  return proposal.changes.flatMap((change): RoutineExerciseChange[] => {
    const routine = routines.find((item) => item.id === change.routineId);
    if (!routine || !Number.isInteger(change.exerciseIndex) || change.exerciseIndex < 0) return [];
    const currentExercise = routine.exercises[change.exerciseIndex];
    if (change.action === "remove") {
      return currentExercise ? [{ ...change, id: changeId(routine.id, change.exerciseIndex, change.action), routineId: routine.id, currentExercise }] : [];
    }
    if (change.action === "modify") {
      return currentExercise ? [{ ...change, id: changeId(routine.id, change.exerciseIndex, change.action), routineId: routine.id, currentExercise, proposedExercise: createModifiedExercise(currentExercise, change) }] : [];
    }
    const detail = library.find((item) => item.slug === change.exerciseTemplateId || item.slug === `hevy-${change.exerciseTemplateId}`);
    if (!detail) return [];
    const insertionIndex = Math.min(change.exerciseIndex, Math.max(0, routine.exercises.length - 1));
    return [{ ...change, id: changeId(routine.id, insertionIndex, change.action, detail.slug), routineId: routine.id, exerciseIndex: insertionIndex, proposedExercise: createAddedExercise(detail, insertionIndex + 1, change) }];
  });
}

export function applyRoutineChanges(routines: HevyRoutine[], changes: RoutineExerciseChange[]): HevyRoutine[] {
  return routines.map((routine) => {
    const routineChanges = changes.filter((change) => change.routineId === routine.id);
    if (!routineChanges.length) return routine;
    const exerciseChanges = new Map(routineChanges.filter((change) => change.action !== "add").map((change) => [change.exerciseIndex, change]));
    const additions = new Map<number, RoutineExerciseChange[]>();
    for (const change of routineChanges) {
      if (change.action !== "add" || !change.proposedExercise) continue;
      additions.set(change.exerciseIndex, [...(additions.get(change.exerciseIndex) || []), change]);
    }
    const exercises: HevyExercise[] = [];
    routine.exercises.forEach((exercise, exerciseIndex) => {
      const change = exerciseChanges.get(exerciseIndex);
      if (change?.action !== "remove") exercises.push(change?.proposedExercise || exercise);
      for (const addition of additions.get(exerciseIndex) || []) exercises.push(addition.proposedExercise as HevyExercise);
    });
    return { ...routine, exercises: exercises.map((exercise, index) => {
      const change = routineChanges.find((item) => item.proposedExercise === exercise);
      return { ...exercise, index, ...(change ? { preview_change_id: change.id } : {}) };
    }) };
  });
}
