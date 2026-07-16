---
name: commit-message
description: 'Write a conventional commit message from staged or pending changes. Trigger words: commit, commit message, stage, conventional commit, git message.'
---

1. Run `git diff --staged --stat` with `run_command`. If empty, run `git diff --stat` and tell the user nothing is staged; ask whether to stage all.
2. Run `git diff --staged` (or `git diff`) to read the actual changes. For diffs over ~400 lines, read the stat summary plus the 3 largest files only.
3. Write the message:
   - Format: `type(scope): summary` — type is one of feat, fix, refactor, docs, test, chore, perf.
   - Summary ≤ 72 chars, imperative mood ("add", not "added").
   - Body: 1–3 bullet lines explaining WHY, only if the diff is non-trivial.
4. Show the message in a code block. Do NOT run `git commit` unless the user explicitly asks.
5. If the user asks to commit: `git commit -m "<summary>" -m "<body>"` via `run_command`.
