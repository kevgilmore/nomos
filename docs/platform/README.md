# Platform

```text
platform/
├── id/        # local identity and SSO proof-of-concept app
├── base/      # runnable shared base application
├── api/       # API contracts and clients
├── ui/        # reusable React UI primitives
├── auth/      # authentication contracts and adapters
├── data/      # platform data and app registry
├── db/        # shared Firebase/Firestore adapters
├── ai/        # AI contracts and clients
├── functions/ # deployed Firebase Functions
└── infra/     # deployment, DNS, Skaffold, and infrastructure-as-code
```

Each code directory is a workspace package (`@nomos/api`, `@nomos/ui`, `@nomos/auth`, `@nomos/data`, and `@nomos/ai`). `infra` is configuration, not a React package.

## How the platform works

Nomos uses a platform-first composition model. Product apps own routes,
product language, and domain decisions. The platform owns the decisions that
should be consistent everywhere:

```text
requirements
    -> choose a platform page pattern
    -> compose @nomos/ui and shared layout
    -> read/write through platform data contracts
    -> add app behavior and permanent tests
    -> verify desktop/mobile and light/dark behavior
```

The dependency direction is deliberately one-way:

```text
apps/*  ->  @nomos/ui, @nomos/data, @nomos/auth, @nomos/api, @nomos/ai
              platform packages do not import apps/*
```

If a page needs a missing primitive, layout rule, or repeated product pattern,
add it to the relevant platform package first. Do not solve the gap with a
page-local component or a second shell.

### UI contract

`@nomos/ui` is the public UI surface. Apps compose its controls, page patterns,
tabs, shell, tokens, and responsive behavior. The shared shell owns authentication
readiness, navigation, document surfaces, safe areas, scrolling, theme
application, and global viewport behavior. Apps configure the shell but do not
override those concerns.

The UI policy is enforced by `pnpm lint:ui-policy`; the visual matrix is in
`tests/visual`. A UI change is incomplete until the relevant browser behavior
and visual states are covered.

### Standard tabs

Use `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent` from `@nomos/ui` for
interactive page sections. The platform component owns tab roles, keyboard
navigation, focus treatment, the active indicator, overflow behavior, and theme
tokens. Apps provide tab values and content only; they must not build a local
tab strip from `Button`, `Link`, borders, or custom active-state CSS. Route-
backed navigation tabs may use the platform `SectionTabs` component. When a
new tab variant is needed, add it to `platform/ui` and test it once.
When tabs share a page with filters or actions, compose them in one responsive
toolbar with a shared baseline and border; do not create separate stacked
control rows with page-specific margins.

### Standard page frame

Every app route uses `PageFrame` from `@nomos/ui` as its root content frame.
It provides a shared full-width canvas, stable shell-relative gutters, `min-w-0`
flex behavior, and a page overflow boundary. Apps do not add a second root
container, custom page padding, or another max-width system. Components may use
narrower internal reading widths when the content itself benefits from it; the
route frame must grow with the shell so entering full-screen does not introduce
a new centered-content breakpoint.

The shell title and left navigation already identify the app and current page.
Screens therefore do not repeat the navigation label as a large page title.
Use `PageHeader` only for meaningful contextual headings, descriptions, or
actions.

### Document title contract

The browser tab title is the app name only, regardless of the active route. Each
app sets one static `metadata.title` in its root `app/layout.tsx`; route files do
not export `metadata` or `generateMetadata`, and layouts do not use title
templates or append page/brand suffixes. The UI policy check rejects route-level
metadata and title templates so this remains true for new apps.

Responsive acceptance covers iPhone 390px, iPad 768px/1024px, and desktop
1440px. Content must reflow without document-level horizontal scrolling; wide
tables use platform overflow primitives. The shell remains the only owner of
safe areas, viewport height, navigation placement, theme surfaces, and global
scrolling.

### Data contract: instant first, sync later

Non-critical reads use stale-while-revalidate behavior: render the latest
known local state immediately, then refresh in the background. User mutations
are optimistic and durable. Update the local state first, enqueue the server
operation through `@nomos/data/offline`, retry when the browser is online, and
define a conflict or rollback rule for the resource.

The offline queue is intentionally a platform capability. New apps should not
invent separate local-storage keys, retry loops, or mutation queues. Existing
browser-local features may remain local-only when their product contract says
there is no backend sync; document that explicitly rather than implying that
local data is synced.

### Agents and tools

The policy is shared across coding agents:

- Codex reads `AGENTS.md` and the relevant `.agents/skills/*/SKILL.md`.
- Claude Code reads `CLAUDE.md`, which imports the same `AGENTS.md` policy and
  points to the same skills.
- Both agents must use the implement -> verify -> fix -> verify loop and must
  provide test evidence before completion.

The skills are procedural guidance; enforcement comes from the repository
checks, Playwright tests, builds, and deployment validation. A model can use
different tool names, but it must produce the same evidence.

All new components belong in `platform/` by default. Keep domain-neutral primitives in `platform/ui` and separate domain-specific components from generic primitives within the platform. An app-local component must be specific to that app and requires explicit user permission before creation. See the root [AGENTS.md](../../AGENTS.md) for the platform-first rules.

`VideoPreview` in `@nomos/ui` displays a paused video frame without downloading a separate image. Fitness uses it on both Exercises and Workout Plan. Nearby previews load the video at a still frame; mouse hover plays, leaving pauses, and touch or keyboard activation toggles playback. Media failures show an explicit unavailable state.

## Mobile shell defaults

All root layouts export `nomosViewport` from `@nomos/ui/viewport`. This enables
`viewport-fit=cover`, so the shared shell's top and bottom safe-area padding
works on edge-to-edge devices. The app generator uses the same export.
`NomosShell` owns evenly distributed mobile navigation for up to five items,
scrollable navigation beyond that, and bottom content clearance including the
home-indicator inset. Keep these defaults in the platform rather than app CSS.

Every app imports `@nomos/ui/document.css` after Tailwind in its global CSS.
This shares Fitness's document surface (`--card`) and minimum dynamic viewport
height, so Safari safe areas and overscroll match the shell. Do not override
the document background per app. Header height and top padding include the
safe-area inset at every breakpoint, including tablet widths. When validating,
check light/dark themes, portrait/landscape, and scrolling with both zero and
nonzero insets; simulated insets do not replace a real iOS Safari check.

The desktop content rhythm uses the standard 44px top inset and a full-width
canvas with stable shell-relative gutters. At desktop widths the shared frame
adds a small right-side clearance for the fixed AI agent; pages must not add
their own right padding or competing root margin. This keeps the content aligned
to the navigation and top bar as the window grows, while preventing the agent
control from crowding or overlapping it across every app.

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
