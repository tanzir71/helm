---
name: debug
description: 'Systematically find the root cause of an error, stack trace, or wrong behavior. Trigger words: debug, error, broken, stack trace, exception, not working, fails, crash.'
---

1. Restate the symptom in one line. If the user gave a stack trace, `read_file` the innermost frame that is in the user's own code (skip node_modules/site-packages).
2. Reproduce before fixing: find or construct the smallest command that shows the failure and run it with `run_command`. If you cannot reproduce, say so and list what you need.
3. Form ONE hypothesis. State it in one line. Verify by reading code (`explore_code` on the failing symbol shows its callers and callees in one shot) — not by guessing.
4. If the error mentions a library ("No module named", "unexpected argument"): `web_search` the exact error with the library version from the manifest before blaming your own code.
5. If wrong, state the disproof and form the next hypothesis. Never edit code while still hypothesizing.
6. When the root cause is confirmed, propose the minimal fix with `edit_file`. Explain the cause in ≤ 2 sentences. Re-run the reproduction from step 2 to prove it. Delete any temporary repro file.
