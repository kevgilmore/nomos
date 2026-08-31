# Nomos

Nomos is a lean pnpm workspace for independently deployable product apps built on shared platform capabilities.

```text
nomos/
├── platform/        # reusable packages and infrastructure
│   ├── api/
│   ├── ui/
│   ├── auth/
│   ├── data/
│   ├── ai/
│   └── infra/
├── apps/            # product applications
├── .agents/skills/  # repeatable agent workflows
├── .github/workflows/
└── docs/
```

`platform/base` is the runnable shared base application. The other `platform/*` directories are reusable packages or infrastructure. Product apps own their `app/` directory and import reusable functionality from `@nomos/*` packages.

## Commands

```bash
pnpm install
pnpm dev:fitness
pnpm create:app finance Finance
pnpm sync:apps
pnpm typecheck
pnpm build:all
pnpm nomos dev -d fitness
```

`nomos dev -d <app>` starts the development servers and exposes the selected
local app through its reserved ngrok domain. App/domain mappings live in
`platform/infra/ngrok.json`.

Read [docs/architecture](docs/architecture/README.md), [docs/platform](docs/platform/README.md), and [docs/apps](docs/apps/README.md) for the working conventions.

The separate `simplysent/` repository is intentionally not part of this refactor.
