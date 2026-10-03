---
name: verify
description: Independently verify a Nomos implementation against acceptance criteria using tests and browser evidence.
---

# Verify

Treat the implementation as untrusted. Re-read the original request and
acceptance criteria. Test actual behavior with the relevant Playwright tests or
browser workflow at desktop and mobile sizes in light and dark themes. Run
`pnpm lint`, `pnpm typecheck`, the affected build, `pnpm lint:ui-policy`, and
the relevant test suite.

Ask whether the feature could regress without the current tests detecting it.
Return exactly PASS or FAIL with evidence, failing commands, and a minimal
failure report suitable for the `fix` skill. Never infer PASS from code review.
