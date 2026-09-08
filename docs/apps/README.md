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

Each product is a small Next.js app with thin `app/` routes, product composition, and its `app.manifest.json`. Reuse platform capabilities for data access, branding, and components. All new components belong in `platform/` by default; creating an app-local component requires explicit user permission and it must be specific to that app. See the root [AGENTS.md](../../AGENTS.md).

Create an app with:

```bash
pnpm create:app finance Finance
pnpm install
pnpm --filter @nomos/finance dev
```

The generator creates the app under `apps/<slug>`, uses the shared `@nomos/ui` shell rather than copying navbar/sidebar/AI-agent source, registers its manifest in the waffle menu for every app, and validates a production build before provisioning Firebase Hosting, `<slug>.nomos.codes`, and Cloudflare DNS.

For a nested Hustle app, use a slug such as `hustle-experimenter` unless a future workspace-specific grouping requires a custom generator rule.
