# App lifecycle

## Create

1. Run `pnpm create:app <slug> <Display Name>`.
2. Customize the generated `app-config.ts`, routes, navigation, and manifest.
3. Add only the platform packages the app needs.
4. The generator adds the Firebase Hosting target, custom domain, and Cloudflare CNAME/TXT records, then verifies the new HTTP and HTTPS endpoints. It requires Firebase CLI login plus Cloudflare DNS edit credentials.
5. Deploy with the shared Hosting workflow after the generated production build passes.

The app generator is at `.agents/skills/new-app`. Shared UI remains in `platform/ui`; the generated app contains only app-owned routes/configuration and theme tokens.

## Update

- Shared behavior: change one `platform/*` package, then typecheck/build all affected apps.
- Product behavior: change only the relevant `apps/<name>` directory.
- Deployment behavior: change `platform/infra`, review the environment impact, then deploy.
- App discovery: edit `app.manifest.json` and run `pnpm sync:apps`.

The old copied-base model is not used. New apps do not receive future platform changes by copying files; they receive them through workspace package imports.
