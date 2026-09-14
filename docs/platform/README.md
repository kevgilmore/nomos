# Platform

```text
platform/
├── id/        # local identity and SSO proof-of-concept app
├── base/      # runnable shared base application
├── api/       # API contracts and clients
├── ui/        # reusable React UI primitives
├── auth/      # authentication contracts and adapters
├── data/      # platform data and app registry
├── ai/        # AI contracts and clients
└── infra/     # deployment, DNS, Skaffold, and infrastructure-as-code
```

Each code directory is a workspace package (`@nomos/api`, `@nomos/ui`, `@nomos/auth`, `@nomos/data`, and `@nomos/ai`). `infra` is configuration, not a React package.

All new components belong in `platform/` by default. Keep domain-neutral primitives in `platform/ui` and separate domain-specific components from generic primitives within the platform. An app-local component must be specific to that app and requires explicit user permission before creation. See the root [AGENTS.md](../../AGENTS.md) for the platform-first rules.

`VideoPreview` in `@nomos/ui` displays a paused video frame without downloading a separate image. Fitness uses it on both Exercises and Workout Plan. Nearby previews load the video at a still frame; mouse hover plays, leaving pauses, and touch or keyboard activation toggles playback. Media failures show an explicit unavailable state.

## Mobile shell defaults

All root layouts export `nomosViewport` from `@nomos/ui/viewport`. This enables
`viewport-fit=cover`, so the shared shell's top and bottom safe-area padding
works on edge-to-edge devices. The app generator uses the same export.
`NomosShell` owns evenly distributed mobile navigation for up to five items,
scrollable navigation beyond that, and bottom content clearance including the
home-indicator inset. Keep these defaults in the platform rather than app CSS.

## Todoist worker failure reporting

The listener captures the worker's final answer separately from tool output and
requires both a passing result and screenshot attachment before moving to review.
Failed attempts retain redacted diagnostic tails under `.nomos/task-*-attempt-*.log`.
Todoist receives a short model-written cause/next-step summary, with bounded
length, timeout and plain-language fallback when the summariser is unavailable.
Usage-limit failures retain In progress and pause for one hour before retrying;
they do not burn through repository repair attempts. Restart preserves the lease
and fix-comment history. Existing Failed tasks require Ready to request a retry.

`nomos deploy` snapshots tickets labelled Deploy in the Nomos Todoist project
before building. It adds a brief production success comment or an LLM-written
failure explanation to those tickets when the command finishes. Labels and
completion state are unchanged. Failures may represent a partial deployment.
Missing Todoist credentials skip reporting; notification errors are reported in
the terminal separately from the deployment outcome.
