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

Put a component in `platform/ui` only when it is domain-neutral. Fitness-specific components stay in `apps/fitness`.
