---
name: commit-message
description: Write a git commit message from staged changes, git diff, or a completed code change.
---

1. Run `run_command` with `git diff --cached --stat` and `git diff --cached`.
2. Identify one primary user-visible intent; do not list every edited file.
3. Return a subject in imperative mood, at most 72 characters.
4. Add a short body only when the reason or migration impact is not obvious.
