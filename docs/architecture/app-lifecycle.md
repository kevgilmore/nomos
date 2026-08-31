# App lifecycle

## Create

1. Run `pnpm create:app <slug> <Display Name>`.
2. Customize the generated `app-config.ts`, routes, navigation, and manifest.
3. Add only the platform packages the app needs.
4. Add deployment identity in `platform/infra` and the app's environment configuration.
5. Provision DNS and infrastructure through the reviewed infrastructure workflow.
6. Deploy with the shared Skaffold/deployment configuration.

The app generator is at `.agents/skills/new-app`. Its script is deliberately small and deterministic; infrastructure changes should remain explicit and reviewable.

## Update

- Shared behavior: change one `platform/*` package, then typecheck/build all affected apps.
- Product behavior: change only the relevant `apps/<name>` directory.
- Deployment behavior: change `platform/infra`, review the environment impact, then deploy.
- App discovery: edit `app.manifest.json` and run `pnpm sync:apps`.

The old copied-base model is not used. New apps do not receive future platform changes by copying files; they receive them through workspace package imports.
