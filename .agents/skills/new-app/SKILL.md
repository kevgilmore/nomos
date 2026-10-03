---
name: new-app
description: Create a new Nomos product app and prepare its workspace registration; use for app scaffolding, not for product feature work.
---

# New Nomos app

Use the repository generator from the Nomos root:

```bash
pnpm create:app <slug> [Display Name]
pnpm install
```

The generated app belongs under `apps/<slug>`. Keep it lean: routes and product code live in the app; reusable code comes from `@nomos/api`, `@nomos/ui`, `@nomos/auth`, `@nomos/data`, and `@nomos/ai`.

UI is platform-only by default. Compose every screen from `@nomos/ui` primitives and page patterns (`Page`, `PageHeader`, `PageSection`, `MetricCard`, and the shared shell). Do not add raw buttons, inputs, selects, textareas, hard-coded colors, arbitrary Tailwind values, app-local shells, or page-specific theme tokens. If a reusable pattern is missing, add it to `platform/ui` before implementing the app feature. Run `pnpm lint`, `pnpm typecheck`, and the affected app build before finishing.

Every new app must follow this sequence:

1. Use the generated `NomosProductShell`; do not create a competing shell.
2. Build the first screen with `Page`, `PageHeader`, `PageSection`, and an
   existing page pattern rather than blank JSX.
3. Use only exported `@nomos/ui` controls and semantic theme tokens.
4. Put reusable UI in `platform/ui`, `platform/layout`, or `platform/patterns`.
   App-local components require explicit justification because the default is
   platform ownership.
5. Add the app's important states—loading, empty, error, mobile, light theme,
   and dark theme—using platform components.
6. Add or extend the shared Playwright visual matrix for desktop/mobile ×
   light/dark and add component coverage for any new platform pattern.
7. Run `pnpm lint`, `pnpm lint:ui-policy`, `pnpm typecheck`, the app build, and
   the relevant UI tests. Do not report the app complete while any check fails.

The generator is a starting point, not permission to invent a local design
system. New product requirements should result in a new reusable platform
pattern when they are likely to recur.

Data behavior is offline-first by default: render cached data immediately,
revalidate reads in the background, and use `@nomos/data/offline` for durable
optimistic mutations with retry and an explicit conflict or rollback policy.
Never make a non-critical page wait for a network request before becoming
usable.

The generator creates `apps/<slug>`, wires the app to the shared `@nomos/ui` shell (top navbar, left navigation, and AI agent), registers the app in the generated waffle-menu registry, adds its Firebase Hosting target and `<slug>.nomos.codes` identity, runs typecheck/build, provisions Firebase custom-domain and Cloudflare DNS records, and verifies both HTTP and HTTPS responses. It requires Firebase CLI credentials and Cloudflare DNS edit credentials; a failed infrastructure or verification step fails the command instead of reporting a partial success.

Do not create `platform/apps`, `platform/packages`, or another platform directory. Do not copy an existing product as a template.
