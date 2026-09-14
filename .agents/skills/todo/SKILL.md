---
name: todo
description: Process actionable Todoist tasks in the local repository, including implementation, testing, and proof reporting.
---

Follow the Todoist workflow in `.agents/skills/todoist-agent/SKILL.md`. `$todo` has one mode: start the persistent listener, drain available `Ready` tasks and new `fix` comments on `In review` tasks sequentially, and keep polling for new work until explicitly stopped. Resume an unfinished `In progress` task before claiming another. Listen for the user's Todoist instruction, resolve the named app/project/repo, implement the task, repair failures until typecheck/lint/build plus a mobile Playwright smoke test have zero page/request/console errors, collect a screenshot only after the smoke test passes, and report a concise TL;DR. Keep tasks open when human testing or clarification is required; complete them only after stated criteria pass. Never claim success without evidence. Keep validation failures `In progress` during repair; use the existing `Failed` label only after repair attempts are exhausted. `In review` means awaiting approval; `Deploy` means approved and deploy-ready, and is not automatically processed by the repair queue.


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
