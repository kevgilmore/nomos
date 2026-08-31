---
name: stop
description: Stop Nomos local development servers started by the dev skill.
---

# Stop Nomos development

Run this skill from the Nomos repository root:

```bash
node .agents/skills/stop/scripts/stop.mjs
```

It stops the process groups recorded by `.agents/skills/dev`, and can recover detached Nomos Next servers by their repository path and development port when the tracker was removed or interrupted. It does not kill unrelated Node processes. If no Nomos development servers exist, it reports that nothing was stopped.
