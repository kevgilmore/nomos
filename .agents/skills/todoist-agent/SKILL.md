---
name: td
description: Execute repository tasks from Todoist when explicitly marked ready, then report test results and evidence back to Todoist.
---

# Todoist Agent Workflow

Use this skill when processing Todoist tasks intended to drive work in a local app, project, or repository.

## Task contract

Each task should identify:

- `app/project/repo`: the application, project, or repository to use
- `task`: the requested change
- `description`: scope, context, and implementation details
- `test criteria`: how success must be verified
- `proof`: required evidence, such as a screenshot, test output, URL, or commit

Do not begin until a comment contains the exact standalone command `agent: ready` or `agent: rdy`. Do not start based on vague use of “ready”.

## Claiming a task

Before doing work, add:

```text
agent: started
repo: <resolved repository>
```

Process one task at a time unless parallel work is explicitly requested. If the repository or scope cannot be resolved, comment `agent: blocked` with the missing information and stop.

## Execution

1. Resolve the named repository and inspect its current state. Preserve unrelated user changes.
2. Read the description and test criteria before editing.
3. Make the smallest appropriate change.
4. Run the requested tests and directly relevant checks.
5. Collect the requested proof. If a screenshot is required, capture the relevant UI state and attach it to the Todoist task when supported; otherwise comment an accessible path or reference.

## Reporting

On success, add:

```text
agent: result
status: passed
summary: <what changed>
tests: <commands and outcomes>
proof: <screenshot, output, URL, or commit>
```

Complete the Todoist task only when all stated criteria are satisfied. If human testing is needed, leave it open and comment `agent: ready for test` with exact steps and expected result.

On failure or ambiguity, leave the task open and add:

```text
agent: blocked
reason: <specific issue>
attempted: <relevant commands or actions>
needed: <decision or information required>
```

Never claim success without evidence. Never attach credentials, tokens, private keys, or other sensitive data to Todoist.

## Listening behavior

This skill defines how to process a task; it does not itself run continuously or listen for Todoist events. A Todoist webhook, scheduled automation, or explicit user invocation must supply tasks. When given a batch, select only tasks containing the exact ready command and process them according to this contract.
