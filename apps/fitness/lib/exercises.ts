export const EXERCISE_DATASET = "fitnessExercises";

export type FitnessExercise = {
  id?: string;
  slug: string;
  name: string;
  sourceUrl: string;
  source: string;
  summary: string | null;
  description: string;
  level: string | null;
  instructions: string[];
  muscles: string[];
  muscleDetails: string[];
  videoUrl: string | null;
  imageUrl: string | null;
  updatedAt: string;
};

export function isFitnessExercise(value: unknown): value is FitnessExercise {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<FitnessExercise>;
  return typeof item.slug === "string" && typeof item.name === "string" && typeof item.description === "string" && Array.isArray(item.instructions) && Array.isArray(item.muscles) && Array.isArray(item.muscleDetails);
}
