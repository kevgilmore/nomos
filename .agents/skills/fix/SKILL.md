---
name: fix
description: Fix a failed Nomos verification using the verifier evidence and preserve regression coverage.
---

# Fix

Start from the verifier’s failure report. Reproduce the failure, make the
smallest platform-compliant fix, and add or strengthen a permanent regression
test. Re-run the failing test first, then deterministic checks. Hand updated
evidence to the parent agent for a fresh verification pass.
