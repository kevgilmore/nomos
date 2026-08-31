# Firebase Hosting

Nomos uses classic Firebase Hosting for static frontend deployments:

- `home` → `nomos-home` → `apps/home/out`
- `fitness` → `nomos-fitness` → `apps/fitness/out`

Home is configured with Next.js static export. Firebase Hosting serves the
generated `out/` directory and does not run Next.js servers.

## One-time Firebase setup

Run from the repository root after authenticating:

```bash
firebase login
firebase hosting:sites:create nomos-home --project nomos-2aafe
firebase hosting:sites:create nomos-fitness --project nomos-2aafe
```

The site IDs must match the IDs in `.firebaserc`.

## Build and deploy

```bash
nomos deploy
```

The deploy command always sets `NEXT_PUBLIC_NOMOS_ENV=production`, builds Home,
Fitness, and ID, prepares the authenticated static assets, builds Functions,
checks Fitness HTML and client-navigation payloads, validates the Firebase
Hosting config, and then deploys all Hosting targets plus Functions.

## Fitness API routes

Fitness is statically exported for Firebase Hosting. Its Next.js route handlers
are temporarily excluded from that export and the equivalent server-only API
code is deployed through Firebase Functions by `nomos deploy`.

Do not put `HEVY_API_KEY` in frontend code or `NEXT_PUBLIC_*` variables.
