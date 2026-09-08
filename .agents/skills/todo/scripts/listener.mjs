#!/usr/bin/env node

import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "../../../../");
const todoistApi = "https://api.todoist.com/api/v1";
const pollMs = Math.max(10_000, Number(process.env.TODOIST_POLL_INTERVAL_MS || 60_000));
const projectName = (process.env.TODOIST_PROJECT_NAME || "Nomos").trim();
const token = process.env.TODOIST_API_KEY || process.env.TODOIST_API_TOKEN || await readEnvToken();
const stateDirectory = path.join(repoRoot, ".nomos");
const statePath = path.join(stateDirectory, "todo-worker.json");
const readyLabel = "Ready";
const inProgressLabel = "In progress";
const reviewLabel = "In review";
const failedLabel = "Failed";
const deployLabel = "Deploy";
const maxRepairAttempts = Math.max(1, Number(process.env.TODOIST_MAX_REPAIR_ATTEMPTS || 3));

if (!token) {
  console.error("TODOIST_API_KEY is required. Set it before starting the listener.");
  process.exit(2);
}

async function readEnvToken() {
  try {
    const env = await readFile(path.join(repoRoot, ".env"), "utf8");
    const match = env.match(/^\s*TODOIST_API_KEY\s*=\s*["']?([^"'\s#]+)["']?\s*$/m);
    return match?.[1] || env.match(/^\s*TODOIST_API_TOKEN\s*=\s*["']?([^"'\s#]+)["']?\s*$/m)?.[1];
  } catch {
    return undefined;
  }
}

async function api(pathname, init = {}) {
  const response = await fetch(`${todoistApi}${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json", ...init.headers },
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`Todoist API ${response.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  return body;
}

async function paged(pathname) {
  const results = [];
  let cursor = "";
  do {
    const separator = pathname.includes("?") ? "&" : "?";
    const page = await api(`${pathname}${separator}limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    results.push(...(page.results || page));
    cursor = page.next_cursor || "";
  } while (cursor);
  return results;
}

async function setTaskLabel(task, label) {
  const labels = [...new Set((task.labels || []).filter((name) => ![readyLabel, inProgressLabel, reviewLabel, failedLabel, deployLabel].includes(name)).concat(label))];
  await api(`/tasks/${encodeURIComponent(task.id)}`, { method: "POST", body: JSON.stringify({ labels }) });
}

async function uploadAttachment(filePath) {
  try { await access(filePath); } catch { return null; }
  const file = await readFile(filePath);
  const form = new FormData();
  form.append("file_name", path.basename(filePath));
  form.append("file", new Blob([file]), path.basename(filePath));
  const response = await fetch(`${todoistApi}/uploads`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  if (!response.ok) throw new Error(`Todoist upload ${response.status}: ${await response.text()}`);
  return response.json();
}

async function addComment(taskId, content, attachment = null) {
  const response = await fetch(`${todoistApi}/comments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ task_id: String(taskId), content: content.slice(0, 15000), ...(attachment ? { attachment: { resource_type: attachment.resource_type || "file", file_name: attachment.file_name, file_type: attachment.file_type, file_url: attachment.file_url } } : {}) }),
  });
  if (!response.ok) throw new Error(`Todoist comment ${response.status}: ${await response.text()}`);
  return response.json();
}

async function acknowledgeFix(commentId) {
  const uuid = randomUUID();
  const response = await fetch(`${todoistApi}/sync`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ commands: JSON.stringify([{ type: "note_reaction_add", uuid, args: { id: String(commentId), reaction: "👍" } }]) }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Todoist reaction ${response.status}: ${text}`);
  const body = JSON.parse(text);
  if (body.sync_status?.[uuid] !== "ok") throw new Error(`Todoist reaction failed: ${text}`);
}

function fixComment(content) {
  const match = String(content || "").trim().match(/^fix(?:\s*:\s*([\s\S]*))?$/i);
  return match ? (match[1]?.trim() || "") : null;
}

async function findReviewFix(task, state) {
  const comments = await paged(`/comments?task_id=${encodeURIComponent(task.id)}`);
  const fixes = comments
    .map((comment) => ({ ...comment, instruction: fixComment(comment.content) }))
    .filter((comment) => comment.instruction !== null)
    .sort((a, b) => Date.parse(a.posted_at || "") - Date.parse(b.posted_at || ""));
  if (!fixes.length) return null;
  const previousId = state?.fixes?.[task.id]?.lastCommentId;
  const previousIndex = previousId ? fixes.findIndex((comment) => String(comment.id) === String(previousId)) : -1;
  const pending = fixes.slice(previousIndex + 1);
  if (!pending.length) return null;
  let previousInstruction = state?.fixes?.[task.id]?.lastInstruction || "";
  const instructions = [];
  for (const comment of pending) {
    if (comment.instruction) previousInstruction = comment.instruction;
    if (previousInstruction) instructions.push(previousInstruction);
  }
  return {
    commentId: pending.at(-1).id,
    commentIds: pending.map((comment) => comment.id),
    instruction: [...new Set(instructions)].join("\n\n") || "Recheck and fix the issue described by the previous fix instruction.",
  };
}

async function findQueue() {
  const projects = await paged("/projects");
  const wanted = projectName.toLocaleLowerCase();
  const project = projects.find((item) => item.name.trim().toLocaleLowerCase() === wanted)
    || projects.find((item) => item.name.trim().toLocaleLowerCase().includes(wanted));
  if (!project) {
    const available = projects.map((item) => item.name).join(", ");
    throw new Error(`Todoist project '${projectName}' was not found. Available projects: ${available}`);
  }
  const tasks = await paged(`/tasks?project_id=${encodeURIComponent(project.id)}`);
  return { project, tasks };
}

async function readState() {
  try { return JSON.parse(await readFile(statePath, "utf8")); } catch { return null; }
}

async function writeState(value) {
  await mkdir(stateDirectory, { recursive: true });
  await writeFile(statePath, JSON.stringify({ ...value, heartbeatAt: new Date().toISOString() }, null, 2) + "\n");
}

function processExists(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

async function claimWorker() {
  const existing = await readState();
  if (existing && processExists(existing.pid) && existing.pid !== process.pid) {
    throw new Error(`Todoist listener already running as PID ${existing.pid}`);
  }
  await writeState({ pid: process.pid, taskId: null, startedAt: new Date().toISOString() });
}

async function runTask(task, fix = null) {
  await setTaskLabel(task, inProgressLabel);
  await writeState({ pid: process.pid, taskId: task.id, taskName: task.content, startedAt: new Date().toISOString() });
  let previousFailure = "";
  for (let attempt = 1; attempt <= maxRepairAttempts; attempt += 1) {
    const prompt = [
      "Process this Todoist task using the repository's $todo workflow.",
      "Work only on this task. You are responsible for fixing failures, not merely reporting them.",
      "Do not change Todoist labels yourself; the listener manages task state.",
      "Before reporting PASS, run the changed app's typecheck, lint, and build checks, then run a mobile Playwright smoke test against the changed page.",
      "The Playwright smoke test must fail on console errors, page errors, failed requests, HTTP 4xx/5xx responses, auth/error redirects, visible error states, or a page that does not load the expected content. Do not call a screenshot proof if the page has an error.",
      "If any check fails, diagnose the cause, change the repository to fix it, and rerun the failed check. Keep iterating until every required check passes.",
      "Do not report RESULT: BLOCKED just because a test failed. Use RESULT: BLOCKED only when the failure is genuinely external or cannot be fixed safely in the repository after this repair attempt.",
      `This is repair attempt ${attempt} of ${maxRepairAttempts}.`,
      fix ? `Todoist fix instruction:\n${fix.instruction}` : "This is the initial implementation pass.",
      previousFailure ? `Previous attempt failure summary; fix this before rechecking:\n${previousFailure}` : "There is no previous attempt; inspect and implement the task now.",
      "End your response with exactly one machine-readable line: RESULT: PASS or RESULT: BLOCKED. Use RESULT: PASS only when every required check passes.",
      "Keep the final report concise: TL;DR, checks, and screenshot path only. Never include source code, diffs, or raw tool output.",
      `Todoist task ID: ${task.id}`,
      `Task name: ${task.content}`,
      `Task description: ${task.description || "(none)"}`,
      `Task URL: ${task.url || "(not supplied)"}`,
    ].join("\n\n");
    const child = spawn(process.env.CODEX_BIN || "codex", ["exec", "--dangerously-bypass-approvals-and-sandbox", "-C", repoRoot, prompt], { cwd: repoRoot, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString(); process.stdout.write(chunk); });
    child.stderr.on("data", (chunk) => { output += chunk.toString(); process.stderr.write(chunk); });
    const exitCode = await new Promise((resolve) => child.once("close", resolve));
    const finalOutput = output.slice(-12000);
    const passed = exitCode === 0 && /(?:^|\n)\s*RESULT:\s*PASS\b/i.test(finalOutput);
    const blocked = /(?:^|\n)\s*RESULT:\s*(?:BLOCKED|FAILED)\b/i.test(finalOutput);
    const screenshotPath = [...output.matchAll(/(?:Screenshot|screenshot):\s*(?:\[[^\]]+\]\()?([^\s)]+\.png)/gi)].at(-1)?.[1] || null;
    let attachment = null;
    let attachmentError = null;
    if (passed && screenshotPath) {
      try {
        attachment = await uploadAttachment(screenshotPath);
      } catch (error) {
        attachmentError = error instanceof Error ? error.message : String(error);
      }
    }
    if (passed && !attachmentError) {
      const summary = `🤖 Success: Implemented and verified with typecheck, lint, build, and mobile smoke test.${attachment ? " Screenshot attached." : ""}`;
      await setTaskLabel(task, reviewLabel);
      const report = await addComment(task.id, summary, attachment);
      const nextState = { ...(await readState()), pid: process.pid, taskId: null, lastTaskId: task.id, lastResult: reviewLabel, completedAt: new Date().toISOString() };
      if (fix) nextState.fixes = { ...(await readState())?.fixes, [task.id]: { lastCommentId: fix.commentId, lastInstruction: fix.instruction } };
      nextState.lastReportCommentId = report?.id || null;
      await writeState(nextState);
      return;
    }
    previousFailure = attachmentError
      ? `Screenshot proof upload failed: ${attachmentError}`
      : `Attempt ${attempt} did not pass. ${exitCode !== 0 ? `Worker exited with code ${exitCode}.` : blocked ? "The worker reported blocked checks." : "The worker did not provide RESULT: PASS."}\n${finalOutput.slice(-3000)}`;
    if (attempt < maxRepairAttempts) {
      console.log(`[todo] validation failed for ${task.id}; keeping In progress and starting repair attempt ${attempt + 1}/${maxRepairAttempts}`);
    }
  }
  await setTaskLabel(task, failedLabel);
  await addComment(task.id, `🤖 Could not reach a passing validation state after ${maxRepairAttempts} repair attempts. Task remains open for retry. ${previousFailure.split("\n")[0]}`);
  await writeState({ ...(await readState()), pid: process.pid, taskId: null, lastTaskId: task.id, lastResult: failedLabel, completedAt: new Date().toISOString() });
}

async function poll() {
  const { tasks } = await findQueue();
  const state = await readState();
  const current = state?.taskId ? tasks.find((task) => String(task.id) === String(state.taskId)) : null;
  let fix = null;
  let task = current && current.labels?.includes(inProgressLabel)
    ? current
    : tasks.find((item) => item.labels?.includes(inProgressLabel));
  if (!task) {
    for (const candidate of tasks.filter((item) => item.labels?.includes(reviewLabel))) {
      fix = await findReviewFix(candidate, state);
      if (fix) {
        await Promise.all(fix.commentIds.map(async (commentId) => {
          try { await acknowledgeFix(commentId); }
          catch (error) { console.error(`[todo] could not acknowledge fix comment ${commentId}: ${error instanceof Error ? error.message : String(error)}`); }
        }));
        task = candidate;
        break;
      }
    }
  }
  if (!task) task = tasks.find((item) => item.labels?.includes(readyLabel));
  if (!task) {
    console.log(`[todo] no task available; next poll in ${pollMs / 1000}s`);
    return false;
  }
  console.log(`[todo] processing ${task.id}: ${task.content}`);
  await runTask(task, fix);
  return true;
}

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  const state = await readState();
  if (state?.pid === process.pid) await unlink(statePath).catch(() => undefined);
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

await claimWorker();
const heartbeat = setInterval(() => {
  void readState().then((state) => state?.pid === process.pid ? writeState(state) : undefined).catch(() => undefined);
}, Math.min(30_000, pollMs));
try {
  do {
    try { await poll(); }
    catch (error) { console.error(`[todo] listener error: ${error instanceof Error ? error.message : String(error)}`); }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  } while (!stopping);
} finally {
  clearInterval(heartbeat);
  await stop();
}
