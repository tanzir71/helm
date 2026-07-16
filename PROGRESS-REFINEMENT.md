# Helm refinement progress

## Current

R7 quality gate — add keyboard traversal coverage, extend theme checks to the new components,
run every release gate, and prepare the required human screenshot/live-smoke checklist.

1. Add an Electron keyboard traversal test covering the complete panel interaction path.
2. Extend light, dark, and high-contrast token checks to Skills, Web, and Code Graph UI.
3. Run `pnpm verify`, the recorded eval, and the full Electron suite.
4. Record the §4 screenshot matrix and live web/code-graph smoke repro steps for human review.
5. Commit R7 and leave the human gate explicit until the visual/live review is confirmed.

## Milestones

### R1 — Foundation

- [x] `tokens.css` created; all colors/spacing/radius/type flow from it; zero hex literals in
      components (enforced by a lint grep script in `pnpm verify`)
- [x] Codicons bundled; every lucide icon and emoji replaced; `lucide-react` removed
- [x] `App.tsx` split per §2.2; single store reducer; all existing Electron tests (5/5) still green
- [x] Typed suggestions protocol; magic-string handling deleted

### R2 — Composer & transcript

- [x] Composer container per §3.5: auto-grow textarea, toolbar pills, morphing send/stop, token
      meter
- [x] Model + mode popovers with keyboard navigation
- [x] Transcript per §3.2: no bubbles, user blocks, streaming status line, virtualized list, stable
      scroll
- [x] Thinking block per §3.3 with duration + live last-line preview
- [x] Queue strip + suggestions per §3.6/§3.7 (keyboard reorder, idle-only suggestions)

### R3 — Cards, settings, empty states

- [x] Shared Card primitive; tool cards with consecutive-read grouping; approval card with keyboard
      shortcuts; diff card with counts + preview + Accept all
- [x] Settings as in-panel view per §3.9
- [x] Empty states per §3.8 (key-gated starters)
- [x] All 10 bugs in §3.10 fixed, each with a regression test where automatable

### R4 — Web tools

- [x] `web_search` with Tavily/Brave/Exa adapters + keyless DuckDuckGo fallback; recorded-fixture
      tests
- [x] `web_fetch` with readability→markdown, 20k truncation, SSRF guard (unit-tested),
      untrusted-content wrapper
- [x] Approval flow: fetch domain patterns persisted; search auto-allowed; Settings → Web section
- [x] System-prompt section per §5.1.3; WebCard UI; external-browser link opening
- [x] Eval fixture: recorded search→fetch→answer transcript passes

### R5 — Code graph

- [x] `@colbymchenry/codegraph` embedded with Node ≥22.5 in-process path + CLI-spawn fallback
      (version gate unit-tested)
- [x] `explore_code` single tool registered only when an index exists; system-prompt section per
      §5.2.3
- [x] Index lifecycle: consent notice, `.gitignore` handling, auto-sync coexisting with checkpoints,
      re-index/delete in Settings
- [x] Fixture-repo test: known callers returned; no-index behavior test
- [x] Eval fixture: architecture question answered via one `explore_code` call, zero `read_file`
      calls

### R6 — Skills pack

- [x] Eleven builtin skills created verbatim from §6.3; builtin source + precedence implemented
- [x] Skill-validity unit test per §6.4 passing for all eleven (including tool-name and
      cross-reference checks)
- [x] Skills manager UI + folder import + git-URL import + `/skills` command
- [x] Eval harness run (`pnpm eval` fixtures) confirms the skill-list prompt change causes no
      tool-call regression

### R7 — Quality gate

- [ ] Accessibility pass per §3.11 (keyboard traversal test in Electron suite)
- [ ] Light/dark/high-contrast verified via the existing theming test extended to new components
- [ ] `pnpm verify` green; core coverage still ≥ 70%; zero `any` introduced
- [ ] §4 screenshot checklist + a live smoke check of web_search/web_fetch/explore_code listed
      under `## Awaiting human review` with repro steps **[HUMAN-GATE]**

## Awaiting human review

None yet.

## Decisions

- Use React `useReducer` rather than adding Zustand; the protocol already defines the event
  boundary and no additional runtime state dependency is necessary.
- Keep React + Tailwind/shadcn and replace the provisional semantic stylesheet with component-owned
  utility classes over a single VS Code token layer.
- Pin `@ai-sdk/provider` 2.0.3 for `@openrouter/ai-sdk-provider` through pnpm package extensions;
  the provider package omits that runtime dependency and otherwise resolves the incompatible v3
  copy introduced by the webview workspace.
- Use the current official Tavily bearer POST, Brave subscription-token GET, and Exa API-key POST
  contracts behind a normalized search interface; keep DuckDuckGo HTML as the labeled keyless
  fallback.
- Persist typed `command:` and `domain:` approval patterns in workspace state so command prefixes
  and fetch-domain permissions cannot collide.
- Use CodeGraph 1.4.1's exact `ToolHandler` response in-process and `codegraph explore` stdout in
  the fallback. The current CLI intentionally removed the older handoff's `--json` flag.
- Copy the installed per-platform CodeGraph bundle into `dist/codegraph` only during packaging;
  this keeps development builds small while ensuring the VSIX carries the fallback Node runtime.
- Quote only the §6.3 frontmatter description scalars: the supplied text contains `: `, which is
  invalid in an unquoted YAML plain scalar. Parsed description values and all skill bodies remain
  verbatim.

## Log

- [2026-07-16] Refinement ledger created from `HANDOFF-refinement-ui-skills.md`; R1 selected as the
  first prerequisite milestone.
- [2026-07-16] R1 foundation complete: token lint and Codicons pass, `App.tsx` is reducer-driven and
  split into panel components, typed suggestion regressions pass, `pnpm verify` is green, and the
  Electron integration suite remains 5/5.
- [2026-07-16] R2 complete: composer key behavior has eight core cases, model/mode/command popovers
  are keyboard-operable, the transcript uses measured virtualization with user-controlled follow,
  thinking duration and local code overflow are covered, `pnpm verify` is green, and Electron stays
  5/5.
- [2026-07-16] R3 complete: shared tool/approval/diff cards, grouped reads, multi-file decisions,
  key-gated empty states, and the in-panel provider/default settings view are implemented. All ten
  audited regressions have focused coverage where automatable; `pnpm verify` is green and Electron
  remains 5/5.
- [2026-07-16] R4 complete: Tavily, Brave, Exa, and DuckDuckGo search adapters plus guarded readable
  web fetch are first-class tools; settings, approvals, untrusted-content handling, WebCard links,
  and the search→fetch→answer eval are green. Live DuckDuckGo search and TypeScript-doc fetch
  smoke checks passed, `pnpm verify` is green at 82.5% core coverage, and Electron remains 5/5.
- [2026-07-16] R5 complete: CodeGraph 1.4.1 is embedded behind one conditional `explore_code`
  capability with consent, lifecycle, auto-sync, Settings, and markdown card UI. The real ten-file
  fixture returned both known callers and source, the recorded architecture flow used one explore
  and zero reads, `pnpm verify` is green at 82.8% core coverage, Electron remains 5/5, and the
  packaged 51 MB VSIX includes the self-contained CodeGraph runtime.
- [2026-07-16] R6 complete: eleven packaged playbooks load with workspace > global > builtin
  precedence, per-workspace toggles, native folder import, confirmed shallow Git import, `/skills`,
  and a compact source-grouped manager. Builtin validity/import/card regressions pass, the recorded
  eval remains at 100% tool-call success, `pnpm verify` is green at 82.9% core coverage, and
  Electron remains 5/5.
