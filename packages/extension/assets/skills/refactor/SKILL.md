---
name: refactor
description: 'Restructure code safely without changing behavior. Trigger words: refactor, clean up, extract, rename, simplify, split file, reorganize, tidy.'
---

1. Map the blast radius first: `explore_code` on every symbol you will move or rename (its callers list is the change checklist). Without the graph: `grep` ALL usages including tests and string references, and `read_file` each involved file.
2. Run the existing test suite via `run_command` to establish a green baseline. If it is red, report and stop; never refactor on a red baseline.
3. Refactor in mechanical steps, one `edit_file`/`write_file` proposal per step: (a) extract/move, (b) update all call sites from the step-1 list, (c) delete the old path. Never combine steps in one diff.
4. Behavior must not change: no new features, no bug fixes, no dependency changes bundled in. If you find a bug, report it and finish the refactor first.
5. Re-run the tests after each accepted step. All green = done; report what moved where in ≤ 4 lines.
