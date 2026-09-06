const EXERCISE_MEDIA_HOST = "d2l9nsnmtah87f.cloudfront.net";

export function exerciseVideoUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.host !== EXERCISE_MEDIA_HOST || !url.pathname.endsWith(".mp4")) return value;
    return `/api/media/exercise?url=${encodeURIComponent(url.toString())}`;
  } catch {
    return value;
  }
}

export function isAllowedExerciseMediaUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.host === EXERCISE_MEDIA_HOST && url.pathname.startsWith("/exercise-assets/") && url.pathname.endsWith(".mp4");
  } catch {
    return false;
  }
}
