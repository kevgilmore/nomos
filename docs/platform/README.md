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
