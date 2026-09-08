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
