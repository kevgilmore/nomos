# Nomos instructions for Claude Code

Nomos is a platform workspace. Read and follow the repository policy in
`@AGENTS.md` before changing code.

Claude Code should also read the relevant workflow under `.agents/skills/`
before implementation, verification, fixing, creating an app, or deploying.
Those skills are repository procedures, not Claude-specific features.

Use WSL for repository commands:

```bash
wsl.exe -d Ubuntu --cd /home/kev/code/nomos -- bash -lc 'source "$HOME/.nvm/nvm.sh"; <command>'
```

For every implementation task, leave permanent tests, run the deterministic
checks in `AGENTS.md`, and independently verify actual behavior before
reporting completion. Never bypass the platform UI, offline data, import, or
deployment boundaries to make a task appear complete.
