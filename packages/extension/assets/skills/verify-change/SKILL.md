---
name: verify-change
description: 'Prove a change works before reporting it done. Trigger words: done, finished, verify, confirm, check it works, complete, ready, ship it, final.'
---

1. Never report success on code you have not executed. Generation is not completion.
2. Re-read the ORIGINAL request and write every explicit requirement as a checklist. Silently dropped clauses are a dominant failure mode — each item needs evidence, not assertion.
3. Run whichever exist, in order, via `run_command`: the repo's test command, lint, typecheck, build (from manifest scripts). All must pass.
4. For behavior changes, produce one end-to-end proof: the previously failing repro now passing, a request against the new endpoint, or the CLI run with real output. Include the actual (trimmed) output.
5. If any step fails: fix and re-verify. Do not summarize failures away or downgrade a requirement to a suggestion.
6. Final report: the checklist with pass/fail per requirement plus the exact verification commands you ran.
