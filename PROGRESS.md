# Helm progress

## Current

M1.1 — secure Anthropic streaming chat.

1. Add provider profiles and a registry that creates all model clients behind one adapter.
2. Add the stream runner with abort, reasoning deltas, usage, and friendly errors.
3. Persist sessions and provider keys through VS Code `workspaceState` and `SecretStorage`.
4. Replace the hello screen with markdown chat, Thinking, Stop, and provider setup UI.
5. Add focused unit tests, then run `pnpm verify`.

## Milestones

### M0 — Scaffold

- [x] pnpm monorepo with `core`, `extension`, `webview`; strict TS; ESLint+Prettier; Vitest wired
- [x] Extension activates; sidebar webview says hello via typed protocol
- [x] CI script `pnpm verify` = lint + typecheck + test + build

### M1 — Chat with one provider (Anthropic)

- [ ] Key stored/read via SecretStorage; settings panel with masked field + Test connection
- [ ] Streaming chat: markdown rendering, code blocks with copy, Stop aborts mid-stream
- [ ] Reasoning deltas render in a collapsible Thinking block
- [ ] Session persists across webview reloads

### M2 — Multi-provider BYOK

- [ ] OpenAI, Google, OpenRouter, Ollama work through `ProviderRegistry`
- [ ] Moonshot, Z.ai, DeepSeek, and DashScope official endpoints work through the compatible adapter
- [ ] `ModelProfile` registry covers shipped models and generic fallback
- [ ] Profile-driven reasoning extraction and history handling are unit-tested
- [ ] Model picker, live lists, effort selector, and cost badges
- [ ] Provider errors are friendly and actionable
- [ ] Headless core example runs with any configured provider

### M3 — Context

- [ ] Mentions: file, folder, problems, terminal
- [ ] Active-file auto-context with toggle
- [ ] Root and nested AGENTS.md loading
- [ ] Token tracking and auto-compaction with UI notice

### M4 — Agent mode

- [ ] All tool schemas and host implementations
- [ ] Tool schemas are flat, enforced by test
- [ ] Tool-call repair, validation feedback, and loop breaker
- [ ] Chat, Agent, and Full Access enforcement
- [ ] Native diff Accept/Reject supports multiple files
- [ ] Terminal command execution and approval
- [ ] Checkpoints and Undo
- [ ] Two-file hello E2E passes

### M5 — Queue, steer, slash commands

- [ ] Queue strip supports enqueue, reorder, remove, FIFO drain
- [ ] Steer injects at a loop boundary and shows a marker
- [ ] Enter behavior setting and inverse Tab behavior
- [ ] Stop preserves the queue with Resume/Clear
- [ ] All slash commands and fuzzy popup
- [ ] Plan execution checklist and persistent goal banner
- [ ] Core SteerQueue tests

### M6 — Skills and suggestions

- [ ] Skill discovery, frontmatter, and progressive disclosure
- [ ] Two bundled open-model-friendly skills
- [ ] Suggestions after every turn with fallback
- [ ] Utility-model routing
- [ ] Friendly expandable tool cards
- [ ] Open-model prompt, re-anchor, and compaction behavior
- [ ] Fixture-backed reliability eval harness

### M7 — Polish and safety

- [ ] First-run onboarding
- [ ] Denylist and Full Access warning
- [ ] Status bar model, mode, tokens, and cost
- [ ] Actionable error UI
- [ ] VS Code light, dark, and high-contrast theming

### M8 — Ship

- [ ] Package and clean install smoke test
- [ ] Extension Electron integration suite
- [ ] Core coverage at least 70%; no `any` in protocol/tool schemas
- [ ] README, RELEASE, and ARCHITECTURE docs
- [ ] Full verification suite green

## Blockers

None.

## Decisions

- AI SDK stays on major v5 because the handoff fixes v5; use `stopWhen`/`stepCountIs`, not the removed `maxSteps` API.
- Use `@ai-sdk/openai-compatible` for Ollama and the four official open-weight endpoints, keeping all provider I/O behind `ModelProfile`.
- No task runner dependency: pnpm recursive scripts are sufficient for three packages.

## Log

- [2026-07-16] M0.1–M0.3 done — strict typecheck, three Vitest suites, Vite/esbuild production bundles, and `pnpm verify` all pass.
