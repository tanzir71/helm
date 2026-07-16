---
name: write-tests
description: "Write unit tests for a file or function using the project's existing test framework. Trigger words: test, tests, unit test, coverage, spec, vitest, jest, pytest."
---

1. Identify the target from the user request or active file. Read it fully with `read_file` (or `explore_code` on the target symbol to also see its callers).
2. Detect the framework: `glob` for existing `*.test.*` / `*.spec.*` / `test_*.py` files and read ONE as the style reference (imports, describe/it vs test, assertion style, mocking pattern).
3. If no tests exist, check the manifest (package.json / pyproject.toml) for a test dependency. State which framework you chose and why in one line.
4. Write tests covering, in order: the happy path, one edge case per parameter (empty, zero, null), and error paths that throw or reject.
5. Place the file following the repo convention found in step 2. Propose it with `write_file`.
6. After the user accepts, run the test command from the manifest scripts via `run_command`. If tests fail, fix your tests — do NOT change the code under test unless the user confirms it has a real bug.
