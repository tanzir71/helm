# Helm refinement progress

## Current

R2 composer and transcript — finish the Codex-density interaction layer on top of the R1 reducer
and component foundation.

1. Centralize Enter/Tab behavior in core and cover all key/state combinations.
2. Add keyboard-complete model, mode, slash, and mention popovers.
3. Virtualize the transcript while preserving user-controlled scroll position.
4. Finish thinking duration/status behavior and code-block overflow protection.
5. Verify composer, transcript, queue, and suggestion interactions; record and commit R2.

## Milestones

### R1 — Foundation

- [x] `tokens.css` created; all colors/spacing/radius/type flow from it; zero hex literals in
  components (enforced by a lint grep script in `pnpm verify`)
- [x] Codicons bundled; every lucide icon and emoji replaced; `lucide-react` removed
- [x] `App.tsx` split per §2.2; single store reducer; all existing Electron tests (5/5) still green
- [x] Typed suggestions protocol; magic-string handling deleted

### R2 — Composer & transcript

- [ ] Composer container per §3.5: auto-grow textarea, toolbar pills, morphing send/stop, token
      meter
- [ ] Model + mode popovers with keyboard navigation
- [ ] Transcript per §3.2: no bubbles, user blocks, streaming status line, virtualized list, stable
      scroll
- [ ] Thinking block per §3.3 with duration + live last-line preview
- [ ] Queue strip + suggestions per §3.6/§3.7 (keyboard reorder, idle-only suggestions)

### R3 — Cards, settings, empty states

- [ ] Shared Card primitive; tool cards with consecutive-read grouping; approval card with keyboard
      shortcuts; diff card with counts + preview + Accept all
- [ ] Settings as in-panel view per §3.9
- [ ] Empty states per §3.8 (key-gated starters)
- [ ] All 10 bugs in §3.10 fixed, each with a regression test where automatable

### R4 — Web tools

- [ ] `web_search` with Tavily/Brave/Exa adapters + keyless DuckDuckGo fallback; recorded-fixture
      tests
- [ ] `web_fetch` with readability→markdown, 20k truncation, SSRF guard (unit-tested),
      untrusted-content wrapper
- [ ] Approval flow: fetch domain patterns persisted; search auto-allowed; Settings → Web section
- [ ] System-prompt section per §5.1.3; WebCard UI; external-browser link opening
- [ ] Eval fixture: recorded search→fetch→answer transcript passes

### R5 — Code graph

- [ ] `@colbymchenry/codegraph` embedded with Node ≥22.5 in-process path + CLI-spawn fallback
      (version gate unit-tested)
- [ ] `explore_code` single tool registered only when an index exists; system-prompt section per
      §5.2.3
- [ ] Index lifecycle: consent notice, `.gitignore` handling, auto-sync coexisting with checkpoints,
      re-index/delete in Settings
- [ ] Fixture-repo test: known callers returned; no-index behavior test
- [ ] Eval fixture: architecture question answered via one `explore_code` call, zero `read_file`
      calls

### R6 — Skills pack

- [ ] Eleven builtin skills created verbatim from §6.3; builtin source + precedence implemented
- [ ] Skill-validity unit test per §6.4 passing for all eleven (including tool-name and
      cross-reference checks)
- [ ] Skills manager UI + folder import + git-URL import + `/skills` command
- [ ] Eval harness run (`pnpm eval` fixtures) confirms the skill-list prompt change causes no
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

## Log

- [2026-07-16] Refinement ledger created from `HANDOFF-refinement-ui-skills.md`; R1 selected as the
  first prerequisite milestone.
- [2026-07-16] R1 foundation complete: token lint and Codicons pass, `App.tsx` is reducer-driven and
  split into panel components, typed suggestion regressions pass, `pnpm verify` is green, and the
  Electron integration suite remains 5/5.
