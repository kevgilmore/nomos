# Nomos

Nomos (`nomos.codes`) is a private suite of personal tools that brings data,
services, and AI together in connected, purpose-built apps. Its core purpose is
to be a reusable platform on which new apps are extremely easy to build.
Product areas include fitness, finance, goals, time, hustle/projects, films,
learning, admin/chores, food, and places; this list is direction, not a request
to scaffold every app.

## Required permission

- Do not create any new directory at the repository root without explicit user
  permission. Use existing directories. This also applies to generators and
  tools that would create a new root directory as a side effect.
- All new components belong in `platform/` by default. Creating a component in
  an app folder requires explicit user permission, and the component must be
  specific to that app. App specificity alone is not permission.
- Before creating an app-local component, identify its proposed path and why
  it cannot appropriately live in the platform, then obtain permission.
  Extracted or inline feature components are subject to the same rule.
- Existing app-local components do not grant permission to create more.
  Framework-required route and layout entry points may compose platform
  components; keep those entry points thin.

## Architecture

- Keep app folders as light as possible. Put reusable capabilities, components,
  integrations, and infrastructure in the platform/core layer.
- Use the existing `platform/*` packages for that layer; "core" does not imply
  that a new `platform/core` package or directory must be created.
- Apps import platform packages through `@nomos/*`. Platform packages must not
  import apps. Pass app-specific data and behavior through explicit contracts.
- Prefer extending an existing platform capability over duplicating it in an
  app. Keep domain-specific platform components separate from generic primitives.
- `platform/base` is the runnable shared base app; `platform/id` is the identity
  app. Existing packages include `ui`, `auth`, `api`, `data`, `db`, and `ai`.
- Shared capabilities cover UI, theme, app shell, authentication, API clients,
  configuration, logging, storage, AI, PWA support, testing, infrastructure,
  and the module template. These are responsibilities, not instructions to
  create a separate package for each or claims that all already exist.
- Reuse shared colours, typography, spacing, responsive behavior, navigation,
  and authentication. Consult the repository UI/design skills for UI work.
- Keep Simplysent in its separate repository; do not create it in this workspace.

## Modules and infrastructure

- Use the `new-app` skill and `pnpm create:app <slug> [Display Name]` for new
  modules. Do not copy another product as a template.
- Provisioning should reuse the shared app template, theme, components, auth,
  subdomain, and infrastructure rather than require bespoke app setup.
- Use a shared module contract with name, slug, icon, and description. Preserve
  existing runtime fields such as `href` when evolving the current contract.
- Drive the waffle menu, dashboard, and module navigation from manifests and
  shared configuration; do not hard-code separate module lists.
- The current registry is generated from `apps/*/app.manifest.json` by
  `pnpm sync:apps`. Do not hand-edit `platform/data/src/apps.generated.ts`.
- Firebase Hosting is the established deployment target for frontend apps; use the repository CLI command nomos deploy for production deployments. Before deploying or choosing an infrastructure tool, read the relevant docs under docs/platform and inspect firebase.json and .firebaserc. Do not substitute a generic hosting platform or tool based only on what is available in the session.
- Firebase Hosting serves the static frontend targets; GCP provides backend APIs, databases, and storage.
  databases, and storage. Keep reusable infrastructure and Cloudflare DNS
  configuration in `platform/infra`; use reusable Terraform modules where
  applicable. Follow the existing target's deployment workflow.
- Keep credentials and privileged backend clients server-side. Do not include
  secrets in browser bundles, manifests, or committed configuration.
- Each app's `productionHref` is the user-facing URL. After creating a Hosting
  target, run `pnpm configure:dns <app-slug>` and verify
  `https://<app-slug>.nomos.codes/`; `*.web.app` is only a Firebase backing URL
  and is not a substitute for the custom domain.
- Product subdomains must use DNS-only CNAME records to their Firebase Hosting
  site (`<slug>.nomos.codes CNAME nomos-<slug>.web.app`). Never use the shared
  `199.36.158.100` A record for product subdomains.
- Treat a new custom domain as ready only when Firebase reports
  `dnsStatus: DNS_MATCH` and `certStatus: CERT_ACTIVE`, and the real
  `https://<slug>.nomos.codes` URL serves the app. `DOMAIN_ACTIVE` alone is
  insufficient while certificate provisioning is still in progress.

## Development and validation

- This is a pnpm workspace covering `apps/*` and `platform/*`. Use the pnpm
  version declared in root `package.json` and Node.js 22+.
- For this WSL checkout, run project development commands inside Ubuntu/Bash.
  See `README.md` for setup; preserve existing environment files.
- When working from the ChatGPT/Codex desktop app, its command runner may be a
  Windows shell even though this checkout is in WSL. Run repository commands
  through WSL explicitly so Node, pnpm, filesystem links, and workspace paths
  use the Linux environment:
  `wsl.exe -d Ubuntu --cd /home/kev/code/nomos -- bash -lc 'source "$HOME/.nvm/nvm.sh"; <command>'`.
- If Linux Node/pnpm are not installed, install Node 22+ with nvm inside WSL,
  then enable the workspace version with `corepack prepare pnpm@11.24.0
  --activate`. Do not run pnpm against the `\\wsl.localhost` UNC path from a
  Windows shell; it can select the wrong working directory or fail while
  cleaning `node_modules`.
- Use the `dev` and `stop` skills for starting and stopping local servers.
- Available root checks: `pnpm lint`, `pnpm typecheck`, `pnpm build:all`.
  `pnpm build` currently builds fitness only, not the whole workspace.
- For focused changes, run the affected package's available checks with
  `pnpm --filter <package-name> <script>`. Validate affected consumers when
  changing shared platform code. Use existing relevant tests and verify UI
  changes in the browser when possible.
- Report what changed, checks performed, and any checks that could not run.
- Keep architecture guidance in `docs/architecture`, shared capability guidance
  in `docs/platform`, and product guidance in `docs/apps` consistent with changes.
