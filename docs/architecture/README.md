# Architecture

Nomos is one pnpm workspace with three runtime boundaries:

- `platform/` contains the runnable `base` app, reusable packages, and infrastructure.
- `apps/` contains independently runnable products. Each app owns its routes, product composition, and domain logic.
- `platform/id` contains the local identity app and will eventually host the Nomos identity boundary at `id.nomos.codes`.

Dependency direction is one-way: apps may import platform packages; platform packages must not import an app.

## Runtime responsibilities

`@nomos/ui` owns the shared shell, primitives, page patterns, tokens, themes,
safe areas, and responsive behavior. `@nomos/auth` owns identity/session
contracts. `@nomos/data` owns shared data access and the durable offline
mutation queue. `@nomos/api` owns typed API result contracts. `@nomos/ai`
owns shared AI clients and contracts. Product packages add domain behavior but
must use these platform boundaries.

The normal data lifecycle is:

```text
cached state -> immediate render -> background revalidation
user action -> optimistic local update -> durable queue -> retry -> reconcile
```

Network availability is not a prerequisite for a non-critical screen to become
usable. Authentication and authorization remain server-enforced; offline
behavior must never be used to bypass access control.

The separate `simplysent/` repository is intentionally out of scope for this workspace.
