---
name: new-app
description: Create a new Nomos product app and prepare its workspace registration; use for app scaffolding, not for product feature work.
---

# New Nomos app

Use the repository generator from the Nomos root:

```bash
pnpm create:app <slug> [Display Name]
pnpm install
```

The generated app belongs under `apps/<slug>`. Keep it lean: routes and product code live in the app; reusable code comes from `@nomos/api`, `@nomos/ui`, `@nomos/auth`, `@nomos/data`, and `@nomos/ai`.

The generator creates `apps/<slug>`, wires the app to the shared `@nomos/ui` shell (top navbar, left navigation, and AI agent), registers the app in the generated waffle-menu registry, adds its Firebase Hosting target and `<slug>.nomos.codes` identity, runs typecheck/build, provisions Firebase custom-domain and Cloudflare DNS records, and verifies both HTTP and HTTPS responses. It requires Firebase CLI credentials and Cloudflare DNS edit credentials; a failed infrastructure or verification step fails the command instead of reporting a partial success.

Do not create `platform/apps`, `platform/packages`, or another platform directory. Do not copy an existing product as a template.
