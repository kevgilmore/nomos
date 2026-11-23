# Nomos

Nomos is a reusable platform for personal product apps. Apps live in `apps/*`;
shared capabilities and UI live in `platform/*`; apps consume platform packages
through `@nomos/*`; platform packages never import apps.

## Boundaries

- Do not create root directories unless the user explicitly requests them.
- New reusable components belong in `platform/`. App-local components require
  explicit justification and must be genuinely app-specific.
- Use `pnpm create:app <slug> [Display Name]` for new apps; do not copy an app.
- Keep credentials and privileged clients server-side.
- Preserve the existing Firebase Hosting and custom-domain workflow. Read the
  relevant `docs/platform` guidance before deployment.
- Keep Simplysent in its separate repository.

## UI platform contract

Agents compose UI; they do not redesign it per page. Use `platform/ui` through
`@nomos/ui`; its exports currently provide the primitive, layout, and page
pattern layers. If a needed primitive or pattern is missing, add it to the
platform first.

- Use `@nomos/ui` controls and patterns: `Page`, `PageHeader`, `PageSection`,
  `PageGrid`, `ListPage`, `DetailPage`, `FormPage`, `DashboardPage`,
  `SettingsPage`, `MetricCard`, `Tabs`, `TabsList`, `TabsTrigger`,
  `TabsContent`, tables, dialogs, toasts, and the shared shell.
- All page-level tabs use the shared `Tabs` primitives. Do not create a local
  tab strip from buttons, links, borders, or page-specific active-state CSS.
  If the required tab behavior or visual variant is missing, extend the
  platform tabs component first and add platform-level coverage.
- When a page has filters or actions alongside tabs, use one responsive toolbar
  row: tabs own the left side, actions own the right side, and the platform
  border/gap is shared. Do not stack unrelated controls with ad hoc margins.
- No raw controls, page-local UI primitives, hard-coded colors, arbitrary
  Tailwind values, random radii, page-specific spacing systems, or local
  responsive/theme logic.
- There is one `AppShell`. It owns navigation, scrolling, viewport height,
  global background, theme application, and iOS safe areas. Apps configure it;
  they do not modify its behavior.
- Use semantic tokens only. Apps may consume platform packages but may not
  recreate platform functionality or import app-specific paths.
- Treat network data as stale-while-revalidate by default: render the latest
  cached state immediately, refresh in the background, and never block a
  usable page on a non-critical read.
- User mutations must be optimistic and durable: update local state first,
  enqueue the server mutation through `@nomos/data/offline`, retry when online,
  and define an explicit conflict or rollback rule for every syncable resource.

### Page frame and responsive contract

- The shell title is the product identity and the left navigation identifies the
  current page. Do not repeat a navigation label as an app-level `<h1>`.
- The browser document title is always the app name, on every route. Set it once
  in the app's root `app/layout.tsx`; route files must not export metadata or
  `generateMetadata`, and layouts must not use title templates or page-name
  suffixes.
- Every app route must use `PageFrame` from `@nomos/ui` as its root content
  frame. It provides the shared full-width canvas, stable shell-relative
  gutters, spacing, min-width, and overflow contract. Do not add a competing
  root `max-w-*`, page padding, or container. The frame must grow with the
  available shell width; a desktop max-width must not create a breakpoint jump.
- Use `PageHeader` only for meaningful contextual headings or actions; it is
  optional and is not a substitute for shell navigation.
- Layouts must work at iPhone 390px, iPad 768px/1024px, and desktop 1440px.
  Grids reflow, long labels wrap, tables scroll inside platform primitives, and
  no page may create horizontal document overflow.
- The shell alone owns safe areas, viewport height, global scrolling,
  navigation placement, and document surfaces.
- The shared desktop content rhythm uses the standard 44px top inset and a
  full-width canvas with stable shell-relative gutters. At desktop widths,
  reserve the platform's small right-side clearance for the fixed AI agent; do
  not add page-specific right padding. Pages must not compensate with their own
  top-level margin or padding.

## Mandatory implementation loop

For every implementation or bug-fix task:

1. Read the request and write acceptance criteria.
2. Implement using the platform contract.
3. Add or update permanent regression tests. A bug fix must include a
   regression test that fails before the fix and passes after it.
4. Run deterministic verification: `pnpm lint`, `pnpm typecheck`, the affected
   app build, `pnpm lint:ui-policy`, and relevant tests.
5. Spawn a fresh verifier using the `verify` skill with the original request and
   acceptance criteria. The verifier tests actual behavior; it does not trust
   code inspection or the implementer’s report.
6. If verification fails, use the `fix` skill with the failure report, then
   rerun verification. Repeat until PASS.
7. Never report completion without a passing verification result.

The parent agent owns the implement → verify → fix → verify loop. Keep
implementation and verification independent so the implementer cannot mark its
own work complete.

## Test definition of done

Every feature leaves permanent coverage behind. Prefer Playwright for rendered
UI, navigation, interactions, themes, and responsive behavior. Maintain:

```text
tests/
  e2e/       navigation, goals, finance, settings, app-specific flows
  visual/    app-shell, themes, responsive, important page patterns
```

Visual coverage is desktop/mobile × light/dark. Platform components are tested
once at the platform level; apps test behavior and composition. Ask: “Could
this regress without the current tests detecting it?” If yes, verification FAILS.

## Verification commands

Use WSL for this checkout:

```bash
wsl.exe -d Ubuntu --cd /home/kev/code/nomos -- bash -lc 'source "$HOME/.nvm/nvm.sh"; <command>'
```

Run `pnpm lint`, `pnpm typecheck`, `pnpm build:all`, and affected test commands
as appropriate. Report changed files, checks run, and unavailable checks. Do
not ignore failures from the UI policy or visual suite.
