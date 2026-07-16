---
name: code-review
description: 'Review pending git changes for bugs, security issues, and style problems. Trigger words: review, code review, check my changes, look over, PR review, feedback on diff.'
---

1. Run `git diff HEAD --stat` via `run_command`, then `git diff HEAD` for the full diff. If empty, review the file the user names instead.
2. For each changed file, get context: `explore_code` on the changed symbols (who calls them — a safe-looking change can break callers), or `read_file` the surroundings when the graph is unavailable.
3. Report findings by severity, each as `severity file:line — issue — suggested fix`:
   - BLOCKER: bugs, data loss, injection, secrets in code, broken error paths.
   - WARN: missing edge cases, races, N+1 queries, dead code, missing tests for new logic.
   - NIT: naming, style, comments. Max 5 nits total.
4. End with a one-line verdict: "Safe to merge", "Merge after blockers", or "Needs rework".
5. Do not propose edits unless the user asks you to fix a specific finding.
