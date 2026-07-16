# Helm refinement progress

## Current

The first human screenshot review failed on missing icons, narrow composer overlap, clipped model
and mode popovers, and loose empty-state spacing. R7.2 repairs those failures and adds a rendered
240 px regression audit. The remaining work is a fresh human screenshot and live in-extension
capability review below.

1. Review the freshly opened Extension Development Host at normal and 240 px sidebar widths.
2. Confirm icons render, composer controls do not overlap, both pickers remain visible, and the
   empty-state spacing looks native.
3. Complete the full screenshot-parity checklist and the three live capability checks below.
4. Record any remaining failure with a screenshot/repro; otherwise confirm the human gate.

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

- [x] Accessibility pass per §3.11 (keyboard traversal test in Electron suite)
- [x] Light/dark/high-contrast verified via the existing theming test extended to new components
- [x] `pnpm verify` green; core coverage still ≥ 70%; zero `any` introduced
- [ ] §4 screenshot checklist + a live smoke check of web_search/web_fetch/explore_code listed
      under `## Awaiting human review` with repro steps **[HUMAN-GATE]**

## Awaiting human review

### Screenshot parity **[HUMAN-GATE]**

Failed review recorded 2026-07-16: the supplied screenshots showed every Codicon as an empty box,
model/mode controls overlapping in the narrow composer, the model popover extending beyond the
left webview edge, inconsistent 24 px toolbar control sizing, and excessive empty-state indentation.
The repair is automated and packaged, but these visual items intentionally remain unchecked until
the reviewer confirms the new rendered build.

Repro:

1. In the open Extension Development Host, run **Developer: Reload Window**, then open the Helm
   activity-bar view.
2. Put Helm beside Codex at a normal sidebar width (~320 px), then repeat at ~240 px.
3. Run **Preferences: Color Theme** with Default Light Modern, Default Dark Modern, and Default High
   Contrast. Capture the idle view, a running turn, an expanded tool card, and Settings → Skills in
   each theme.
4. Seed or restore a 30-turn session, scroll upward while a mock/live answer streams, and confirm
   the transcript neither yanks the scroll position nor gains panel-level horizontal scrolling.

- [ ] At rest, only the header, transcript, and composer are visible—no decorative chrome.
- [ ] All icons are Codicons, no emoji or off-theme color appears, and focus rings remain visible.
- [ ] Composer container, pills, auto-grow, and send/stop transition look native to VS Code/Codex.
- [ ] A 30-turn session reads as a calm grouped activity log and scrolls without visible jank.
- [ ] Light, dark, and high-contrast themes all look intentional.
- [ ] Long prose, skill descriptions, paths, errors, and code stay contained; prose wraps and code
      scrolls locally without cropping the extension.

### Live capability smoke **[HUMAN-GATE]**

1. **`web_search`:** Settings → Web → choose DuckDuckGo (free) → Save. Ask “Search the official VS
   Code docs for the webview guide.” Confirm a globe card shows titled results and opens a result in
   the external browser.
2. **`web_fetch`:** ask “Fetch and summarize
   `https://code.visualstudio.com/api/extension-guides/webview`.” Approve the domain. Confirm the
   fetch card names the page, output is readable markdown, and the raw result begins with the
   untrusted-content warning.
3. **`explore_code`:** Settings → Code graph → Index workspace (leave “Add `.codegraph/` to
   `.gitignore`” checked), then ask “What calls `resolveEnterAction`, and what is its blast radius?”
   Confirm exactly one code-graph card returns source/callers without a series of file-read cards.

- [ ] `web_search` passes in the live extension.
- [ ] `web_fetch` approval, extraction, and external-link behavior pass in the live extension.
- [ ] `explore_code` indexing and one-call architecture answer pass in the live extension.

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
- [2026-07-16] R7 automated gate complete: the Electron webview audit traverses every visible main
  and Settings control, found and fixed suppressed focus outlines, and resolves distinct Skills/Web/
  Code Graph palettes in light, dark, and high-contrast themes. Electron is 7/7, the recorded eval
  remains at 100% tool-call success, `pnpm verify` is green at 82.94% core coverage, and no `any` was
  introduced. A live DuckDuckGo query returned three official-doc results and guarded fetch returned
  20,236 characters with the untrusted-content wrapper; final visual and in-extension smoke checks
  remain under the human gate above.
- [2026-07-16] R7.1 completion audit closed the remaining automatable parity gaps: explicit and
  automatic context now render as wrapping chips, Settings ordering/feedback and code-graph status
  match the spec, web/tool cards expose useful wrapped summaries, and separated diff hunks count
  accurately. `pnpm verify` passes with 74 core, 30 webview, and 14 extension tests at 83.04% core
  coverage; Electron is 7/7, recorded eval tool-call success is 100%, and the packaged 50.6 MB VSIX
  contains all eleven skills plus the bundled CodeGraph runtime. The human gate remains unchecked.
- [2026-07-16] R7.2 repaired the failed screenshot review: Vite now emits webview-relative assets so
  Codicons load under the VS Code webview origin; composer controls share a consistent 24 px row;
  model/mode popovers clamp to the visible panel; and the starter state uses tighter native spacing.
  The rendered 240 px audit now checks the font face, five non-overlapping controls, and both picker
  bounds. `pnpm verify` passes with 74 core, 31 webview, and 14 extension tests at 83.04% core
  coverage; Electron is 8/8, recorded eval tool-call success is 100%, and the 50.6 MB VSIX contains
  a relative Codicon URL, all eleven skills, and the CodeGraph runtime. The human gate remains
  unchecked pending re-review.
