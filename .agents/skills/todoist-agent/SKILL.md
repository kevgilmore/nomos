---
name: td
description: Execute repository tasks from Todoist when explicitly marked ready, then report test results and evidence back to Todoist.
---

# Todoist Agent Workflow

Use this skill when processing work tickets in the Todoist project named `Nomos`.

## Task contract

Task names use the format `[app] Task name`. The task description explains what to do.
Only process tasks in the Todoist project named `Nomos`, including tasks nested beneath other tasks as subtasks at any depth.
Process tasks labelled `Ready`, and also tasks labelled `In review` when they receive a new comment beginning with `fix` or `fix:`. Treat `Deploy` as an approval state, not as a work queue state.

## Claiming a task

Before doing work, replace the `Ready` label with `In progress`.

Process tasks sequentially, one at a time. A single invocation should drain the available queue: after a task reaches `In review` or is blocked, re-scan the entire `Nomos` hierarchy and pick the next `Ready` task. Do not run multiple repository tasks in parallel.

If the current task is unfinished, keep it `In progress` and continue or resume that task before claiming another. Do not abandon an implementation halfway through just because another task is available. Once implementation is complete but human testing or review remains, move it to `In review`, leave it open, and continue with the next independent `Ready` task.

If the repository or scope cannot be resolved, keep the task `In progress`, record the missing information, and retry the same task; do not abandon it for another task.

## Execution

1. Resolve the app from the `[app]` task-name prefix and inspect its current state. Preserve unrelated user changes.
2. Read the task description before editing.
3. Make the smallest appropriate change.
4. Run the changed app's typecheck, lint, and build checks.
5. Test the changed app page with Playwright at a mobile/iPhone-sized viewport. Fail the check on console errors, page errors, failed requests, HTTP 4xx/5xx responses, auth/error redirects, visible error states, or missing expected content.
6. Capture a screenshot only after that smoke test passes and upload it as a real Todoist attachment.

If any implementation or validation check fails, diagnose and fix it, then rerun the failed check. A failed check is a repair instruction, not a reason to stop. The listener gives the same task multiple repair attempts while it remains `In progress`.

## Review fixes

While a task is `In review`, a user can add a Todoist comment beginning with `fix:` followed by the requested correction. Multiple new `fix:` comments are passed to the same repair run in order. A comment containing only `fix` means the previous fix instruction still applies. Each processed fix comment is recorded so it is not run repeatedly; adding another `fix` comment requests another repair pass.

When a new fix comment is detected, the listener adds a persistent 👍 reaction to acknowledge that it has been received and is being worked on. The reaction is intentionally left in place after completion.

## Reporting

When the implementation and proof are complete:

```text
RESULT: PASS
🤖 Success: Implemented and verified with typecheck, lint, build, and mobile smoke test. Screenshot attached.
```

Replace `In progress` with `In review`. Leave the task open for review; do not complete it automatically. `In review` means implementation and automated validation passed, but human approval is still pending. The user changes the label to `Deploy` to approve the task as deploy-ready. Do not deploy or change a `Deploy` task unless a separate deployment instruction is provided.

Only after the configured repair attempts are genuinely exhausted, leave the task open with the existing `Failed` label and add:

```text
agent: blocked
reason: <specific issue>
attempted: <relevant commands or actions>
needed: <decision or information required>

Always end with `RESULT: BLOCKED` when any required check fails. Never use `RESULT: PASS` when the page shows an error or the screenshot contains an error state.
```

Never claim success without evidence. Never attach credentials, tokens, private keys, or other sensitive data to Todoist.

## Listening behavior

When invoked, search the full `Nomos` project hierarchy, including subtasks at any depth, and select only `Ready` tasks from that hierarchy. Repeat the scan after every task. Stop when no `Ready` tasks remain, the user asks you to stop, the execution budget is exhausted, or the next task depends on an unresolved blocked task.

The persistent listener is implemented at `.agents/skills/todo/scripts/listener.mjs`. A `$todo` listener invocation must start it directly with `node .agents/skills/todo/scripts/listener.mjs` and `TODOIST_API_KEY` available. It polls every 60 seconds by default (`TODOIST_POLL_INTERVAL_MS` can override this), holds a PID/heartbeat lease, never starts a second task while one is running, resumes the leased `In progress` task after a worker restart, and checks `In review` tasks for new `fix` comments. It uses the existing `Failed` and `Deploy` labels; it must not create labels. Validation failures stay `In progress` while the worker repairs and retries them. Only exhausted repair attempts receive `Failed`; changing a failed task back to `Ready` requests a fresh run. `Deploy` tasks are approved/deploy-ready and are not processed by the repair queue.

The worker remains alive after the agent turn because `$todo` launches it as a detached background process. There is one mode only: it drains the current queue, waits 60 seconds when idle, and keeps listening for new `Ready` tasks until explicitly stopped.


## Explicit retry label

The existing `retry` label requests another full attempt. Keep `retry` while
working; run the same implementation, repair, validation and screenshot workflow
as `In progress`. Resume active work before claiming a new retry, then prioritise
retry over new Ready tasks. At retry start, archive all existing comments locally,
retain their instructions and attachment references in worker context, replace
those comments in Todoist with one short LLM-written summary, and leave later
comments untouched. New completion/failure reports follow the normal rules.
Move to In review only with passing checks and screenshot proof; otherwise Failed
after repair exhaustion. Quota pauses retain the active label.

The listener posts a short Picked up acknowledgement when work starts and updates
that same tracked comment for quota pauses, success (including screenshot), or
failure. Reuse it across resumed attempts and fix passes. Retry cleanup adopts
its replacement summary as that status comment. Recreate only if it was deleted;
do not modify human comments.
