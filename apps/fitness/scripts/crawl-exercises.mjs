import vm from "node:vm";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAdminFirestore, writeFirestoreDocuments } from "@nomos/db/admin";

const ROOT = "https://hevy.com";
const SEED_PAGE = `${ROOT}/exercise/582ADA23`;
const defaultOutput = path.resolve(import.meta.dirname, "../data/exercises.json");
const shouldWrite = process.argv.includes("--write");
const output = process.argv.find((arg) => arg.startsWith("--output="))?.split("=").slice(1).join("=") || defaultOutput;

async function getText(url) {
  const response = await fetch(url, { headers: { "user-agent": "Nomos Fitness official exercise importer" } });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

function absoluteUrl(value) {
  return new URL(value, ROOT).toString();
}

function findAppBundleUrl(pageHtml) {
  const scripts = [...pageHtml.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((match) => match[1]);
  const appScript = scripts.find((script) => /\/_next\/static\/chunks\/pages\/_app-[^/]+\.js$/.test(script));
  if (!appScript) throw new Error("Could not find the canonical Hevy application bundle");
  return absoluteUrl(appScript);
}

function extractEmbeddedExercises(bundle) {
  const marker = `JSON.parse(${String.fromCharCode(39)}`;
  let searchFrom = 0;
  while (true) {
    const start = bundle.indexOf(marker, searchFrom);
    if (start < 0) throw new Error("Could not find the canonical Hevy exercise dataset");
    const dataStart = start + marker.length;
    if (bundle[dataStart] !== "[") { searchFrom = dataStart; continue; }

    let end = dataStart;
    let backslashes = 0;
    for (; end < bundle.length; end += 1) {
      const character = bundle[end];
      if (character === String.fromCharCode(39) && backslashes % 2 === 0 && bundle.slice(end + 1, end + 3) === ");") break;
      if (character === "\\") backslashes += 1;
      else backslashes = 0;
    }
    if (end >= bundle.length) throw new Error("Canonical Hevy exercise dataset is not terminated as expected");

    try {
      // The bundle contains a JavaScript string with a JSON payload (including
      // a few \\x escapes), so use a VM only to decode that string literal.
      const raw = bundle.slice(dataStart, end);
      const exercises = vm.runInNewContext(`JSON.parse(${String.fromCharCode(39)}${raw}${String.fromCharCode(39)})`, { JSON });
      if (Array.isArray(exercises) && exercises.every((exercise) => exercise && typeof exercise.id === "string")) return exercises;
    } catch {
      searchFrom = dataStart;
    }
  }
}

function label(value) {
  return String(value || "other").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function instructionsFor(exercise) {
  return String(exercise.localised_instructions?.en || "")
    .split(/\n+/)
    .map((instruction) => instruction.trim())
    .filter(Boolean);
}

function toFitnessExercise(exercise) {
  const instructions = instructionsFor(exercise);
  const muscles = [exercise.muscle_group, ...(exercise.other_muscles || [])].filter(Boolean).map(label);
  return {
    slug: `hevy-${exercise.id.toLowerCase()}`,
    name: exercise.title,
    sourceUrl: `${ROOT}/exercise/${exercise.id}`,
    source: "hevy-canonical-exercise-library",
    summary: muscles.length ? `${label(exercise.equipment_category)} · ${muscles.join(", ")}` : null,
    description: instructions.join("\n") || `${exercise.title} exercise from Hevy's official exercise library.`,
    level: null,
    instructions,
    muscles,
    muscleDetails: muscles,
    videoUrl: exercise.url,
    imageUrl: exercise.thumbnail_url,
    updatedAt: new Date().toISOString(),
  };
}

async function main() {
  const pageHtml = await getText(SEED_PAGE);
  const bundleUrl = findAppBundleUrl(pageHtml);
  const canonicalExercises = extractEmbeddedExercises(await getText(bundleUrl));
  const mediaExercises = canonicalExercises.filter((exercise) => exercise.media_type === "video" && exercise.url && exercise.thumbnail_url);
  const excluded = canonicalExercises.filter((exercise) => !mediaExercises.includes(exercise));
  if (!mediaExercises.length) throw new Error("Canonical Hevy dataset contained no media-complete exercises");
  if (new Set(mediaExercises.map((exercise) => new URL(exercise.url).host)).size !== 1 || new Set(mediaExercises.map((exercise) => new URL(exercise.thumbnail_url).host)).size !== 1) {
    throw new Error("Canonical Hevy media hosts are not uniform");
  }

  const exercises = mediaExercises.map(toFitnessExercise).sort((left, right) => left.name.localeCompare(right.name));
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(exercises, null, 2)}\n`);
  if (shouldWrite) {
    const firestore = getAdminFirestore();
    if (firestore.app.options.projectId !== "nomos-2aafe") throw new Error(`Refusing to write exercises: Admin SDK is configured for ${firestore.app.options.projectId || "an unknown project"}, not nomos-2aafe`);
    await writeFirestoreDocuments("public/fitnessExercises/items", exercises.map((exercise) => ({ id: exercise.slug, data: exercise })));
    console.log(`Wrote ${exercises.length} uniform exercises to Firestore.`);
  }
  console.log(JSON.stringify({ source: SEED_PAGE, bundle: bundleUrl, canonicalCount: canonicalExercises.length, savedCount: exercises.length, excludedWithoutMedia: excluded.map((exercise) => ({ id: exercise.id, title: exercise.title })) }));
  console.log(`Saved ${exercises.length} exercises to ${output}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
