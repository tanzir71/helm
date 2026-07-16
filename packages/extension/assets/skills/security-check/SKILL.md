---
name: security-check
description: 'Scan changed or specified code for common security vulnerabilities. Trigger words: security, vulnerability, audit, injection, XSS, secrets, unsafe, OWASP.'
---

1. Scope: pending git diff (`git diff HEAD` via `run_command`) or the files the user names. Read each with `read_file`.
2. `grep` the scope for these patterns and inspect every hit:
   - Injection: string-built SQL, `exec`/`eval`/`spawn` with interpolated input, `dangerouslySetInnerHTML`, `innerHTML =`.
   - Secrets: `api_key`, `secret`, `password`, `token` assigned string literals; private key headers.
   - Auth: routes/handlers missing the auth middleware used elsewhere in the repo (`explore_code` on the middleware shows which routes use it).
   - Unsafe defaults: `verify=False`, `rejectUnauthorized: false`, permissive CORS `*`, `chmod 777`.
3. For flagged dependencies, `web_search` "<package> <version> CVE" and report only confirmed advisories with their URL.
4. Report each finding: `severity file:line — vulnerability — concrete fix`. Severities: CRITICAL / HIGH / MEDIUM. No hypothetical findings — cite the exact line.
5. If nothing is found say so plainly and list what was checked. Do not pad.
6. Fix only when the user asks; propose the minimal safe change with `edit_file`.
