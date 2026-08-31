---
name: dev
description: Start the Nomos base app and all runnable product apps locally for development.
---

# Nomos local development

Run this skill from the Nomos repository root. It starts `platform/base` and every runnable Next app under `apps/`, assigns local ports, and keeps all processes attached to one terminal.

```bash
node .agents/skills/dev/scripts/dev.mjs
```

Stop all apps with `Ctrl+C`. Start only selected apps with `--app fitness` or `--app base`; pass `--port 3000` to choose the first port. Apps bind to `127.0.0.1` to avoid broad network binding. The launcher reports a clickable `http://localhost:<port>` URL for every app it starts.

When reporting completion, list every started app and URL separately:

```text
- Base: http://localhost:3000
- Fitness: http://localhost:3001
```

Use the `stop` skill to stop the tracked servers later.

Do not start deployment, DNS, Firebase, or production infrastructure as part of local development.

The launcher runs each app’s local Next binary directly, so it does not invoke pnpm while servers are starting. If dependencies are missing, install once with `pnpm install` in a normal terminal. If the runtime reports `EPERM` while binding to `127.0.0.1`, the Codex sandbox is blocking local sockets; run `pnpm dev:all` from a normal local terminal.
