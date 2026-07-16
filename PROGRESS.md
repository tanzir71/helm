# Helm progress

## Current

Release candidate audit — automated implementation is complete; external provider QA remains.

1. Run `pnpm verify` after the final audit edits.
2. Re-run the Electron mock-provider integration suite.
3. Rebuild and integrity-check `dist/helm-0.1.0.vsix`.
4. With a user-supplied key (or running Ollama), perform the real-provider, two-file diff, and
   queue/steer/stop spot checks from `RELEASE.md`.
5. Run one live open-weight eval and record its success rate below.

## Milestones

### M0 — Scaffold

- [x] pnpm monorepo with `core`, `extension`, `webview`; strict TS; ESLint+Prettier; Vitest wired
- [x] Extension activates; sidebar webview says hello via typed protocol
- [x] CI script `pnpm verify` = lint + typecheck + test + build

### M1 — Chat with one provider (Anthropic)

- [x] Key stored/read via SecretStorage; settings panel with masked field + Test connection
- [x] Streaming chat: markdown rendering, code blocks with copy, Stop aborts mid-stream
- [x] Reasoning deltas render in a collapsible Thinking block
- [x] Session persists across webview reloads

### M2 — Multi-provider BYOK

- [x] OpenAI, Google, OpenRouter, Ollama work through `ProviderRegistry`
- [x] Moonshot, Z.ai, DeepSeek, and DashScope official endpoints work through the compatible adapter
- [x] `ModelProfile` registry covers shipped models and generic fallback
- [x] Profile-driven reasoning extraction and history handling are unit-tested
- [x] Model picker, live lists, effort selector, and cost badges
- [x] Provider errors are friendly and actionable
- [x] Headless core example runs with any configured provider

### M3 — Context

- [x] Mentions: file, folder, problems, terminal
- [x] Active-file auto-context with toggle
- [x] Root and nested AGENTS.md loading
- [x] Token tracking and auto-compaction with UI notice

### M4 — Agent mode

- [x] All tool schemas and host implementations
- [x] Tool schemas are flat, enforced by test
- [x] Tool-call repair, validation feedback, and loop breaker
- [x] Chat, Agent, and Full Access enforcement
- [x] Native diff Accept/Reject supports multiple files
- [x] Terminal command execution and approval
- [x] Checkpoints, per-edit Undo, and per-turn restore
- [ ] Two-file hello E2E passes with a real provider and manual diff acceptance

### M5 — Queue, steer, slash commands

- [x] Queue strip supports enqueue, reorder, remove, FIFO drain
- [x] Steer injects at a loop boundary and shows a marker
- [x] Enter behavior setting and inverse Tab behavior
- [x] Stop preserves the queue with Resume/Clear
- [x] All slash commands and fuzzy popup
- [x] Plan execution checklist and persistent goal banner
- [x] Core SteerQueue tests

### M6 — Skills and suggestions

- [x] Skill discovery, frontmatter, and progressive disclosure
- [x] Two bundled open-model-friendly skills
- [x] Suggestions after every completed turn with fallback
- [x] Utility-model routing
- [x] Friendly expandable tool cards
- [x] Open-model prompt, re-anchor, reasoning cleanup, and compaction behavior
- [x] Fixture-backed reliability eval harness

### M7 — Polish and safety

- [x] First-run onboarding
- [x] Denylist and Full Access warning
- [x] Status bar model, mode, tokens, and cost
- [x] Actionable error UI
- [x] VS Code light, dark, and high-contrast theming

### M8 — Ship

- [x] Package and clean install smoke test
- [x] Extension Electron integration suite
- [x] Core coverage at least 70%; no `any` in protocol/tool schemas
- [x] README, RELEASE, and ARCHITECTURE docs
- [x] Full verification suite green

## Blockers

- Required manual release checks need a real provider key or a running Ollama server. No recognized
  provider key is present in this environment, and `localhost:11434` is not running. Pending:
  real-provider streaming, manual two-file diff acceptance, queue→steer→stop UI flow, and one live
  open-weight eval. Automated mock-provider and recorded-family equivalents pass.

## Decisions

- AI SDK stays on major v5 in `packages/core` because the handoff fixes v5; use
  `stopWhen`/`stepCountIs`, not the removed `maxSteps` API.
- The official AI Elements components currently require AI SDK v6, so v6 is isolated to the
  browser-only webview while the provider engine remains on v5.
- Use `@ai-sdk/openai-compatible` for Ollama and the four official open-weight endpoints; the
  community Ollama adapter is unnecessary and the server/chat URLs are normalized separately.
- Use Z.ai's OpenAI-compatible endpoint for GLM so all four open-weight providers share the tested
  flat native-function tool contract.
- Prefer `rg` for host search and fall back to capped VS Code filesystem scanning when unavailable.
- No task-runner dependency: pnpm recursive scripts are sufficient for three packages.

## Log

- [2026-07-16] M0 done — strict monorepo scaffold, typed hello protocol, three package builds, and
  `pnpm verify` established.
- [2026-07-16] M1 done — SecretStorage settings, persisted streaming chat, reasoning UI, Stop, and
  provider error translation implemented.
- [2026-07-16] M2 done — nine provider routes, live/static model lists, per-model profiles,
  reasoning effort, pricing, and headless mock chat verified.
- [2026-07-16] M3 done — fuzzy mentions, active-editor toggle, nested AGENTS.md, token thresholds,
  and utility-model compaction implemented.
- [2026-07-16] M4 implementation done — nine flat tools, native diffs, approval-gated integrated
  terminal, repair/loop controls, abortable approvals, and grouped checkpoints verified by tests;
  real-provider two-file acceptance remains pending.
- [2026-07-16] M5 done — FIFO queue, chip promotion to steer, boundary injection, Stop/Resume,
  configurable Enter/Tab behavior, slash commands, plan checklist, and goal persistence verified.
- [2026-07-16] M6 done — skills, utility suggestions, open-model prompt quirks, XML reasoning cleanup,
  and four recorded eval families integrated into unit tests.
- [2026-07-16] Fixture evals — Kimi 100%/5 repairs, GLM 100%/5, DeepSeek 100%/4, Qwen 100%/5;
  zero loop incidents across 40 tasks. These are recorded fixtures, not live-provider results.
- [2026-07-16] M7 done — onboarding, denylist, Full Access warning, durable status usage, actionable
  errors, and VS Code high-contrast styling implemented.
- [2026-07-16] M8 automated gates passed — Electron mock turn 1/1, clean VSIX install listed
  `helm-local.helm@0.1.0`, core 33/33 tests at 80.88% lines, and the full suite passed.
