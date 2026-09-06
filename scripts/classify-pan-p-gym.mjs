#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const inputPath = path.join(root, "apps/fitness/data/exercises.json");
const projectId = "nomos-2aafe";
const collectionPath = "public/fitnessExercises/items";
const model = process.env.OPENAI_MODEL || "gpt-5-mini";
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");
const normalize = process.argv.includes("--normalize");
const batchSize = 10;
const concurrency = 4;

const equipment = {
  tricep_extension: "arm extension tricep",
  abductor: "abductor",
  adductor: "adductor",
  lower_back: "lower back",
  total_abdominal: "total abdominal",
  bicep_curl: "arm curl bicep",
  leg_curl: "leg curl",
  leg_extension: "leg extension",
  low_row: "low row",
  vertical_traction: "vertical traction",
  chest_press: "chest press",
  pec_deck: "pec-deck",
  shoulder_press: "shoulder press",
  leg_press: "leg press",
  calf_raise: "calf raise",
  rack: "rack",
  bench: "benches",
  dumbbells: "dumbells",
  kettlebells: "kettlebells",
  barbell: "bar",
  ez_bar: "ezy bar",
  landmine: "landmind",
  ab_crunch_bench: "abs crunch bench",
};
const equipmentIds = Object.keys(equipment);
const machineEquipmentIds = new Set([
  "tricep_extension", "abductor", "adductor", "lower_back", "total_abdominal", "bicep_curl",
  "leg_curl", "leg_extension", "low_row", "vertical_traction", "chest_press", "pec_deck",
  "shoulder_press", "leg_press", "calf_raise",
]);

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          slug: { type: "string" },
          supportedByPanPGym: { type: "boolean" },
          requiredEquipment: { type: "array", items: { type: "string", enum: equipmentIds } },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          reason: { type: "string" },
        },
        required: ["slug", "supportedByPanPGym", "requiredEquipment", "confidence", "reason"],
      },
    },
  },
  required: ["results"],
};

function readOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  return (data.output || []).flatMap((item) => item.content || []).map((item) => item.text || "").join("\n");
}

async function classifyBatch(exercises) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const prompt = [
    "Classify these exercises for the Pan P Gym equipment inventory.",
    "Return one result for every input slug, with no omissions or extra slugs.",
    "The inventory is exhaustive. supportedByPanPGym is true when the exercise needs no equipment or its exact required equipment is listed. It is false when it requires a machine, implement, or station that is not listed.",
    "Never mark an exercise supported because listed equipment is a substitute, approximation, or similar movement. A dedicated machine requires that exact machine; do not map high row to low row or vertical traction, hip thrust machine to smith_machine, hack/pendulum squat to leg_press, lateral raise machine to shoulder_press, or any unnamed machine to the closest listed machine.",
    "Only accept a direct, unambiguous synonym or an obvious variation of a listed item: for example, seated row is low row and machine chest fly is pec-deck. A cable exercise is not a Pan P Gym machine exercise, even if Hevy labels its equipment category as Machine; do not map cable pulldowns, face pulls, or other cable movements to vertical traction or another station. Smith-machine exercises are never Pan P Gym-supported. Exercises explicitly using a barbell, EZ bar, dumbbell, kettlebell, bench, rack, cable machine, or landmine may use that listed item only when that item is in the inventory.",
    "If an exercise is ambiguous or machine-specific and the exact equipment is not listed, mark supportedByPanPGym false, use an empty requiredEquipment list, and use low confidence.",
    `Inventory: ${JSON.stringify(equipment)}`,
    `Exercises: ${JSON.stringify(exercises.map((exercise) => ({ slug: exercise.slug, name: exercise.name, summary: exercise.summary, muscles: exercise.muscles, instructions: exercise.instructions.slice(0, 4) })))}`,
  ].join("\n\n");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      store: false,
      input: prompt,
      text: { format: { type: "json_schema", name: "pan_p_gym_classification", strict: true, schema } },
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `OpenAI request failed (${response.status})`);
  const parsed = JSON.parse(readOutputText(data));
  if (!Array.isArray(parsed.results) || parsed.results.length !== exercises.length) throw new Error("OpenAI returned an incomplete classification batch");
  const expected = new Set(exercises.map((exercise) => exercise.slug));
  const seen = new Set();
  for (const result of parsed.results) {
    if (!expected.has(result.slug) || seen.has(result.slug)) throw new Error(`OpenAI returned an invalid or duplicate slug: ${result.slug}`);
    if (!result.requiredEquipment.every((id) => equipmentIds.includes(id))) throw new Error(`OpenAI returned unknown equipment for ${result.slug}`);
    seen.add(result.slug);
  }
  return parsed.results;
}

function accessToken() {
  if (process.env.FIREBASE_ACCESS_TOKEN) return process.env.FIREBASE_ACCESS_TOKEN;
  return execFileSync("gcloud", ["auth", "print-access-token"], { encoding: "utf8" }).trim();
}

function firestoreValue(value) {
  if (typeof value === "boolean") return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  return { stringValue: String(value) };
}

async function writeFirestore(classified) {
  const token = accessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:batchWrite`;
  for (let offset = 0; offset < classified.length; offset += 400) {
    const writes = classified.slice(offset, offset + 400).map((exercise) => ({
      update: {
        name: `projects/${projectId}/databases/(default)/documents/${collectionPath}/${exercise.slug}`,
        fields: {
          supportedByPanPGym: firestoreValue(exercise.supportedByPanPGym),
          panPGymEquipment: firestoreValue(exercise.requiredEquipment),
          panPGymConfidence: firestoreValue(exercise.confidence),
          panPGymReason: firestoreValue(exercise.reason),
          panPGymClassifier: firestoreValue(model),
        },
      },
      updateMask: { fieldPaths: ["supportedByPanPGym", "panPGymEquipment", "panPGymConfidence", "panPGymReason", "panPGymClassifier"] },
    }));
    const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ writes }) });
    const data = await response.json();
    if (!response.ok || (data.status || []).some((status) => status.code)) throw new Error(data.error?.message || `Firestore batch failed at offset ${offset}`);
    console.log(`Firestore batch committed: ${Math.min(offset + 400, classified.length)}/${classified.length}`);
  }
}

const exercises = JSON.parse(await readFile(inputPath, "utf8"));
const pending = force ? exercises : exercises.filter((exercise) => typeof exercise.supportedByPanPGym !== "boolean");
console.log(JSON.stringify({ projectId, model, total: exercises.length, pending: pending.length, dryRun, force, normalize }));
function normalizeClassification(exercise) {
  const category = String(exercise.summary || "").split(" · ")[0].trim().toLowerCase();
  const requiredEquipment = Array.isArray(exercise.panPGymEquipment) ? exercise.panPGymEquipment : [];
  const isMachine = category === "machine";
  const hasBlockedEquipment = requiredEquipment.some((item) => item === "cable_machine" || item === "smith_machine");
  const hasCableOrSmithName = /\b(?:cable|smith)\b/i.test(exercise.name || "");
  const hasApprovedMachine = requiredEquipment.length > 0 && requiredEquipment.every((item) => machineEquipmentIds.has(item));
  if (!isMachine || (!hasBlockedEquipment && !hasCableOrSmithName && hasApprovedMachine)) return null;
  return {
    slug: exercise.slug,
    supportedByPanPGym: false,
    requiredEquipment: [],
    confidence: "high",
    reason: hasCableOrSmithName || hasBlockedEquipment ? "Cable and Smith-machine exercises are not Pan P Gym machine stations." : "This machine is not one of the Pan P Gym stations in the equipment inventory.",
  };
}
if (normalize) {
  const results = exercises.map(normalizeClassification).filter(Boolean);
  const changed = new Map(results.map((result) => [result.slug, result]));
  const classified = exercises.map((exercise) => {
    const result = changed.get(exercise.slug);
    if (!result) return exercise;
    return { ...exercise, supportedByPanPGym: result.supportedByPanPGym, panPGymEquipment: result.requiredEquipment, panPGymConfidence: result.confidence, panPGymReason: result.reason, panPGymClassifier: "pan-p-gym-normalizer" };
  });
  console.log(JSON.stringify({ normalized: results.length, slugs: results.map((result) => result.slug) }, null, 2));
  if (!dryRun) {
    await writeFile(inputPath, `${JSON.stringify(classified, null, 2)}\n`);
    await writeFirestore(results);
    console.log(`Normalized ${results.length} machine classifications in ${inputPath} and Firestore project ${projectId}.`);
  }
  process.exit(0);
}
if (!pending.length) {
  console.log("All exercises already have Pan P Gym classification. Use --force to reclassify.");
  process.exit(0);
}

const results = [];
async function classifyWithRetries(batch, offset) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const batchResults = await classifyBatch(batch);
      console.log(`OpenAI batch classified: ${Math.min(offset + batch.length, pending.length)}/${pending.length}`);
      lastError = null;
      return batchResults;
    } catch (error) {
      lastError = error;
      console.warn(`Batch ${offset}-${offset + batch.length} attempt ${attempt} failed: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  if (lastError) throw lastError;
}
for (let offset = 0; offset < pending.length; offset += batchSize * concurrency) {
  const jobs = [];
  for (let batchOffset = offset; batchOffset < Math.min(offset + batchSize * concurrency, pending.length); batchOffset += batchSize) {
    jobs.push(classifyWithRetries(pending.slice(batchOffset, batchOffset + batchSize), batchOffset));
  }
  const completed = await Promise.all(jobs);
  completed.forEach((batchResults) => results.push(...batchResults));
}

const bySlug = new Map(results.map((result) => [result.slug, result]));
const classified = exercises.map((exercise) => {
  const result = bySlug.get(exercise.slug);
  if (!result) return exercise;
  return {
    ...exercise,
    supportedByPanPGym: result.supportedByPanPGym,
    panPGymEquipment: result.requiredEquipment,
    panPGymConfidence: result.confidence,
    panPGymReason: result.reason,
    panPGymClassifier: model,
  };
});

if (dryRun) {
  console.log(JSON.stringify({ classified: results.length, supported: results.filter((result) => result.supportedByPanPGym).length, unsupported: results.filter((result) => !result.supportedByPanPGym).length }, null, 2));
} else {
  await writeFile(inputPath, `${JSON.stringify(classified, null, 2)}\n`);
  await writeFirestore(results);
  console.log(`Updated ${results.length} exercises in ${inputPath} and Firestore project ${projectId}.`);
}
