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

After scaffolding, update the app manifest and identity, then run typecheck/build. Deployment, DNS, and Skaffold changes belong in `platform/infra` and require explicit review for the target environment.

Do not create `platform/apps`, `platform/packages`, or another platform directory. Do not copy an existing product as a template.
