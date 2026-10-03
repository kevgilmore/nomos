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

Agents compose UI; they do not redesign it per page. Use `platform/ui`,
`platform/layout`, and `platform/patterns`. If a needed primitive or pattern is
missing, add it to the platform first.

- Use `@nomos/ui` controls and patterns: `Page`, `PageHeader`, `PageSection`,
  `PageGrid`, `ListPage`, `DetailPage`, `FormPage`, `DashboardPage`,
  `SettingsPage`, `MetricCard`, tables, dialogs, toasts, and the shared shell.
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
