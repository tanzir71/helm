---
name: implement-feature
description: 'Implement a described feature end to end with a plan, edits, and verification. Trigger words: implement, add feature, build, create endpoint, add support for, new command.'
---

1. Explore before planning: `explore_code` for the area the feature touches and for ONE similar existing feature to copy conventions from (without the graph: `grep` + `read_file`). Name your convention reference in one line.
2. If the feature uses a library API not already used in this repo, verify it first via the lookup-api-docs skill.
3. Produce a numbered plan (3–7 steps, each ≤ 1 sentence) and WAIT for user confirmation before editing.
4. Execute one plan step per turn: propose edits with `edit_file`/`write_file`, keeping each diff reviewable (< ~120 lines).
5. Follow repo conventions exactly: error handling style, naming, imports, test placement. When the repo and your preference differ, the repo wins.
6. Finish with the verify-change skill: requirement checklist, tests, lint, and one end-to-end proof. Then summarize files touched and one suggested follow-up.
