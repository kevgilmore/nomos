---
name: todo
description: Process actionable Todoist tasks in the local repository, including implementation, testing, and proof reporting.
---

Follow the Todoist workflow in `.agents/skills/todoist-agent/SKILL.md`. `$todo` has one mode: start the persistent listener, drain available `Ready` tasks and new `fix` comments on `In review` tasks sequentially, and keep polling for new work until explicitly stopped. Resume an unfinished `In progress` task before claiming another. Listen for the user's Todoist instruction, resolve the named app/project/repo, implement the task, repair failures until typecheck/lint/build plus a mobile Playwright smoke test have zero page/request/console errors, collect a screenshot only after the smoke test passes, and report a concise TL;DR. Keep tasks open when human testing or clarification is required; complete them only after stated criteria pass. Never claim success without evidence. Keep validation failures `In progress` during repair; use the existing `Failed` label only after repair attempts are exhausted. `In review` means awaiting approval; `Deploy` means approved and deploy-ready, and is not automatically processed by the repair queue.
