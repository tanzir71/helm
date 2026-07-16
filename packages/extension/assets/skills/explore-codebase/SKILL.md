---
name: explore-codebase
description: 'Map how code works before answering questions or making any edit. Trigger words: how does, where is, explain, architecture, understand, trace, flow, explore, find the code.'
---

1. NEVER edit a file you have not read this session. If you were about to, stop and explore first.
2. If `explore_code` is available, ask it the user's question directly (or pass the symbol/file names you know). One call usually returns the relevant source, the call paths, and what depends on it. Stop when it answers.
3. Only without `explore_code`: `grep` for the symbol, `read_file` the defining file fully, then read ONE representative caller.
4. Before any edit, state in one line what you read and why the change is safe — who calls this code and what depends on it (from the blast-radius section of the explore output).
5. If the task involves a library API not already used in this repo, invoke the lookup-api-docs skill instead of guessing.
