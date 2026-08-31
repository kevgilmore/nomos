# Apps

```text
apps/
├── fitness/
├── finance/
├── hustle/
│   ├── experimenter/
│   ├── analytics/
│   ├── ads/
│   └── creative/
├── goals/
├── time/
└── films/
```

Each product is a small Next.js app. It owns `app/` routes, product-specific components, domain data access, branding, and its `app.manifest.json`.

Create an app with:

```bash
pnpm create:app finance Finance
pnpm install
pnpm --filter @nomos/finance dev
```

The generator creates only the minimal app shell and registers its manifest. It does not copy platform source. Add shared behavior by importing `@nomos/*` packages.

For a nested Hustle app, use a slug such as `hustle-experimenter` unless a future workspace-specific grouping requires a custom generator rule.
