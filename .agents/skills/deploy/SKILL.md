---
name: deploy
description: Build, deploy, and verify Nomos production Hosting and Functions.
---

# Nomos deployment

Run deployment from WSL in `/home/kev/code/nomos` so the repository, Node
runtime, and Firebase tooling use the same environment:

```bash
source "$HOME/.nvm/nvm.sh"
pnpm nomos deploy
```

Before publishing:

1. Run `pnpm typecheck` and `pnpm lint:ui-policy`.
2. Run the relevant Playwright suite.
3. Confirm `platform/functions/.env` contains `NOMOS_PREVIEW_ORIGIN` matching
   the currently configured preview origin in `platform/infra/ngrok.json`.
   Firebase parameter prompts are not available during automated deploys.
4. Run `pnpm nomos deploy`; it performs the production builds, static export
   checks, Hosting validation, Functions builds, and Firebase deployment.
5. If a build warning is introduced by the change, fix it before publishing.
   Existing warnings must be recorded and must not be mistaken for a passing
   verification of application behavior.
6. After deployment, verify each changed custom domain with an HTTP request and
   confirm the response is from the deployed app, not a Firebase error page.

For static product apps, verify the root URL resolves to the first navigation
route. Firebase must have an explicit 302 root redirect because an exported
Next.js `redirect()` is only a client-side fallback when served as static HTML.

Never report success from a completed build alone. Report deployment success
only after Firebase reports a successful deploy and the changed public URL(s)
respond successfully. If deployment fails, preserve the diagnostic output,
fix the underlying issue, rerun the affected checks, and retry deployment.

The production environment must set `NEXT_PUBLIC_NOMOS_ENV=production`. Never
put credentials or privileged API keys in frontend or `NEXT_PUBLIC_*` values.
