# Architecture

Nomos is one pnpm workspace with three runtime boundaries:

- `platform/` contains the runnable `base` app, reusable packages, and infrastructure.
- `apps/` contains independently runnable products. Each app owns its routes, product composition, and domain logic.
- `platform/id` contains the local identity app and will eventually host the Nomos identity boundary at `id.nomos.codes`.

Dependency direction is one-way: apps may import platform packages; platform packages must not import an app.

The separate `simplysent/` repository is intentionally out of scope for this workspace.
