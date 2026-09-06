# Nomos

Nomos is a lean pnpm workspace for independently deployable product apps built on shared platform capabilities.

```text
cli/
├── platform/        # reusable packages, base app, and infrastructure
│   ├── api/
│   ├── ui/
│   ├── auth/
│   ├── data/
│   ├── ai/
│   ├── infra/
│   ├── base/
│   └── functions/
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

`nomos create-app <slug>` creates the app under `apps/`, validates its production
build, updates the shared waffle registry, creates the Firebase Hosting site and
custom-domain mapping, creates the Cloudflare CNAME/TXT records, and verifies
`http://<slug>.nomos.codes` and `https://<slug>.nomos.codes`. It requires Firebase
CLI login and `CLOUDFLARE_API_TOKEN` (with DNS edit access for `nomos.codes`).

`nomos dev -d <app>` starts the development servers and exposes the selected
local app through its reserved ngrok domain. App/domain mappings live in
`platform/infra/ngrok.json`.

Read [docs/architecture](docs/architecture/README.md), [docs/platform](docs/platform/README.md), and [docs/apps](docs/apps/README.md) for the working conventions.

The separate `simplysent/` repository is intentionally not part of this refactor.
