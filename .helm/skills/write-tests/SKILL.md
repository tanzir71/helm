---
name: write-tests
description: Add unit tests, regression tests, Vitest tests, or test coverage for changed code.
compatibility: Best with native tool calling.
---

1. Use `read_file` to read the implementation and nearest existing tests.
2. List the observable behaviors and the failure case being prevented.
3. Use `edit_file` or `write_file` to add the smallest focused tests in the existing style.
4. Use `run_command` to run the narrow test target first, then the package test suite.
5. Report the exact commands and pass counts; do not claim unrun coverage.
