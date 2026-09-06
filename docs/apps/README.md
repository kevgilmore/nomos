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

The generator creates the app under `apps/<slug>`, uses the shared `@nomos/ui` shell rather than copying navbar/sidebar/AI-agent source, registers its manifest in the waffle menu for every app, and validates a production build before provisioning Firebase Hosting, `<slug>.nomos.codes`, and Cloudflare DNS.

For a nested Hustle app, use a slug such as `hustle-experimenter` unless a future workspace-specific grouping requires a custom generator rule.
