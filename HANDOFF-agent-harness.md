# HANDOFF: "Helm" — BYOK Coding Agent Harness (VS Code Extension)

> **Audience:** An autonomous coding agent (Codex) running in a loop.
> **Goal:** A fully working VS Code extension that is a beginner-friendly, BYOK alternative to Kilo Code / Claude Code, benchmarked against the **OpenAI Codex IDE extension**.
> **Working name:** `helm` (rename freely; keep it a single lowercase word).

---

## 0. LOOP PROTOCOL — READ THIS FIRST, EVERY ITERATION

You are running unattended. Follow this loop until every milestone acceptance box in §8 is checked:

1. **Orient.** Read `PROGRESS.md` at repo root (create it on first run from the milestone checklists in §8). Find the first unchecked item.
2. **Plan.** Write a 3–6 step micro-plan for that item into `PROGRESS.md` under `## Current`.
3. **Implement.** Small, working increments. Never leave the build broken at the end of an iteration.
4. **Verify.** Run the verification commands in §9. An item may only be checked if its acceptance criteria pass.
5. **Record.** Check the box, append one line to `## Log` in `PROGRESS.md` (`[date] M2.3 done — <what/how verified>`), commit with message `M<milestone>.<item>: <summary>`.
6. **Repeat.** Go to 1.

**Rules:**
- If blocked >2 attempts on an item, write the blocker to `PROGRESS.md ## Blockers`, pick the next unblocked item, return later.
- Never mark an item done on a failing build/test.
- Do not expand scope beyond §7. Non-goals are in §11.
- Prefer boring, well-documented dependencies. Every new dependency must be justified in one line in `PROGRESS.md ## Decisions`.
- When all boxes are checked: run the full §9 suite, package the `.vsix`, and write `RELEASE.md` with install + usage instructions.

---

## 1. PRODUCT VISION

**Problem.** Existing options force a trade-off:
- CLI agents (Claude Code, Codex CLI) have deep system access but intimidate beginners — raw terminal output, no visual affordances.
- Friendly CLIs (Gemini CLI, Warp) feel "graphical" even in a terminal because they format output warmly and **proactively suggest next actions**.
- IDE agents (Codex extension, Cline) are the sweet spot: visible chain-of-thought, send/stop buttons, diffs in the editor.

**Helm = the Codex IDE extension experience, but open, BYOK, and beginner-first.**

**Three UX pillars (non-negotiable):**
1. **Visible reasoning.** Stream the model's thinking/plan into a collapsible "Thinking…" section in the chat UI. User always has a prominent **Stop** button.
2. **Steer & queue.** Typing while the agent runs never blocks. Enter-key behavior mirrors Codex: message is **queued** by default with a visible queue chip; each queued chip and the composer offer a **"Steer"** action that injects the message into the live run's context at the next loop boundary (see §5.4).
3. **Always suggest next steps.** After every agent turn, render 2–4 clickable suggestion chips ("Run the tests", "Explain this change", "Undo"). This is the Gemini/Warp friendliness that CLIs lack.

**BYOK:** Anthropic, OpenAI, Google, OpenRouter, and Ollama (local), **plus first-class support for the leading open-weight coding models — Kimi (Moonshot), GLM (Z.ai), Qwen (Alibaba/DashScope), DeepSeek — via their official endpoints** (see §6.5). No proprietary backend, no telemetry by default, keys never leave the machine.

**Positioning note:** open-weight models are where BYOK matters most (10–30× cheaper per token than frontier closed models). Helm's differentiation is being the harness that runs these models *well* — most harnesses are tuned for Claude/GPT and degrade on open models. §6.5 is therefore a core feature, not an integration afterthought.

---

## 2. BENCHMARK: WHAT THE CODEX IDE EXTENSION DOES (parity targets)

Feature-parity checklist derived from OpenAI's docs (developers.openai.com/codex/ide):

| Codex feature | Helm equivalent | Milestone |
|---|---|---|
| Sidebar chat panel with streaming responses | Webview panel (React) | M1 |
| Chat / Agent / Agent (Full Access) approval modes | Same three modes | M4 |
| Model switcher + reasoning-effort selector | Model picker per provider; effort selector where supported | M2 |
| `@file` context references + auto-context from open editor | `@file`, `@folder`, active selection auto-attached | M3 |
| Slash commands (`/plan`, `/goal`, `/review`, `/init`, `/status`, `/model`) | Same set, §5.5 | M5 |
| Enter = send/steer, Tab = queue while agent runs | Queue by default + explicit Steer button (safer for beginners) | M5 |
| Diffs reviewed in editor before apply | Native VS Code diff view + Accept/Reject | M4 |
| AGENTS.md project instructions | Read `AGENTS.md` at workspace root into system prompt | M3 |
| Skills | Agent Skills open standard (agentskills.io), §6.4 | M6 |

---

## 3. TECH STACK (fixed — do not relitigate)

- **Language:** TypeScript strict, Node 20+.
- **Repo layout:** pnpm monorepo
  - `packages/core` — provider-agnostic agent engine (no VS Code imports; unit-testable in Node).
  - `packages/extension` — VS Code extension host code.
  - `packages/webview` — React 18 + Vite chat UI, communicates with the host only via `postMessage`.
- **LLM layer:** **Vercel AI SDK v5** (`ai` package) as the single provider abstraction:
  - `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, `@openrouter/ai-sdk-provider`, `ollama-ai-provider` (or `@ai-sdk/openai-compatible` pointed at `http://localhost:11434/v1` if the community Ollama provider is unmaintained — verify at build time and record the decision).
  - **Open-weight official endpoints** via `@ai-sdk/openai-compatible` with per-model quirk adapters (§6.5): Moonshot (`api.moonshot.ai`), Z.ai (`api.z.ai`), DeepSeek (`api.deepseek.com`), Alibaba DashScope international endpoint for Qwen. Verify exact base URLs against each provider's current docs at build time.
  - Use `streamText` with `tools`, multi-step (`stopWhen`/`maxSteps`), and reasoning-token surfacing where the provider supports it.
  - **All provider I/O flows through the `ModelProfile` adapter layer (§6.5.1) — no raw provider calls from the agent loop.**
- **Key storage:** VS Code `SecretStorage` API only. Never settings.json, never plaintext on disk.
- **Testing:** Vitest for `core`; `@vscode/test-electron` smoke test for the extension; Playwright optional for webview.
- **Packaging:** `vsce package` → `.vsix`.

**Reference implementations to study (read code, don't fork):**
- `github.com/cline/cline` — VS Code extension host↔webview architecture, tool approval flow, diff application.
- `github.com/sst/opencode` — clean agent-loop and provider design (MIT).
- `github.com/openai/codex` — steer/queue semantics, slash commands, AGENTS.md handling.
- `github.com/anthropics/skills` + `agentskills.io` — SKILL.md format.

---

## 4. ARCHITECTURE

```
┌─────────────────────────── VS Code ───────────────────────────┐
│  ┌────────────── extension host (packages/extension) ───────┐ │
│  │ SessionManager ── AgentRunner (from core)                │ │
│  │ ToolHost: fs read/write, editor diffs, terminal exec     │ │
│  │ SecretStorage (API keys)   Settings   AGENTS.md loader   │ │
│  └──────────────▲───────────────────────────▲───────────────┘ │
│                 │ typed postMessage protocol │                 │
│  ┌──────────────┴──────────────┐   ┌────────┴──────────────┐  │
│  │ webview UI (packages/webview)│   │ VS Code APIs          │  │
│  │ chat, thinking, queue, chips │   │ diff view, terminal,  │  │
│  │ composer, settings           │   │ workspace fs          │  │
│  └─────────────────────────────┘   └───────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
          packages/core: AgentLoop • ProviderRegistry • ToolSchema
          • ContextManager • SteerQueue • SkillLoader (pure Node)
```

**Hard boundary:** `packages/core` must run headless (`node examples/cli-run.ts "fix the failing test"`). This keeps the engine testable and leaves the door open for a future CLI/TUI shell.

### 4.1 Message protocol (host ↔ webview)
Define once in `packages/core/src/protocol.ts`, discriminated unions, e.g.:
`userMessage`, `queueMessage`, `steerMessage`, `stopRun`, `approveTool`, `rejectTool`, `applyDiff`, `runStateChanged`, `assistantDelta`, `reasoningDelta`, `toolCallStarted/Finished`, `diffProposed`, `suggestions`, `queueUpdated`, `error`, `tokenUsage`.

---

## 5. FEATURE SPECIFICATIONS

### 5.1 Agent loop (core)
- Standard tool-use loop: system prompt + history → `streamText` with tools → execute tool calls → append results → continue until model stops, step cap hit (default 50, configurable), or user stops.
- Every await point checks: (a) abort signal (Stop), (b) SteerQueue (see 5.4).
- **Context management:** track token usage per provider limits; at 80% capacity, auto-compact (summarize oldest turns into a single summary message). Show a small "compacted" notice in UI.
- **System prompt** assembled from: base harness prompt + `AGENTS.md` (workspace root, if present) + active skill instructions + mode (Chat/Agent/Full Access).

### 5.2 Tools (core schemas; host implementations)
| Tool | Behavior |
|---|---|
| `read_file` | path + optional range; returns numbered lines |
| `list_dir` / `glob` | workspace-scoped |
| `grep` | ripgrep if available, JS fallback |
| `write_file` | **never writes directly in Agent mode** — emits `diffProposed`; applied only on user Accept (auto-applied in Full Access) |
| `edit_file` | exact string replace, same diff gate |
| `run_command` | executes in VS Code integrated terminal via shell integration API; captures output; approval-gated per mode; denylist (`rm -rf /`, fork bombs) even in Full Access |
| `fetch_url` | plain GET, size-capped, off by default in Chat mode |

### 5.3 Approval modes
- **Chat:** read-only tools only. Edits rendered as suggestions, never applied.
- **Agent (default):** reads free; every write/command shows an inline approval card (Accept / Reject / "Always allow this command pattern this session").
- **Full Access:** auto-approve everything except the denylist. Requires explicit opt-in with a warning dialog per workspace.

### 5.4 Queue & steer (the differentiating feature — get this exactly right)
Codex semantics for reference: while a task runs, Enter *steers* (interrupts with the new message) and Tab *queues*. Beginners find surprise interrupts hostile, so Helm inverts the default:

- Agent running + user hits Enter → message appended to a **visible queue strip** above the composer (chips with text preview, ✕ to remove, drag to reorder).
- Each chip and the composer show a **"Steer ⚡"** action. Steering:
  1. Does **not** kill the run. It sets a flag consumed at the next loop boundary (after the in-flight tool call/stream step completes).
  2. Injects the message as a user turn with prefix: `[User steering instruction — takes priority over prior instructions]`.
  3. UI marks the moment in the transcript ("⚡ Steered").
- Queued (non-steer) messages drain FIFO: when a run completes, the next queued message starts a new turn automatically.
- **Stop** aborts the stream, kills pending tool executions, leaves the queue intact, and offers "Resume with queue" or "Clear queue".
- Power-user setting `helm.enterBehavior`: `queue` (default) | `steer` — full Codex parity when set to `steer` (then Tab queues).

### 5.5 Slash commands
Typing `/` in the composer opens a fuzzy-filterable popup (mirror Codex UX). MVP set:

| Command | Action |
|---|---|
| `/plan` | Forces a planning turn: model must produce a numbered plan and **wait**; UI renders it with "Execute plan" / "Revise" buttons. Executing pins the plan into context and tracks step completion as a checklist in the transcript. |
| `/goal <text>` | Sets a persistent session goal, pinned into the system prompt and shown as a banner; agent self-checks against it each turn. |
| `/review` | Reviews the workspace's pending git diff (staged+unstaged); outputs findings by severity with file:line links. |
| `/init` | Generates `AGENTS.md` by scanning the repo (stack, commands, conventions). |
| `/model` | Opens provider/model picker. |
| `/status` | Session card: provider/model, mode, token usage + estimated cost, queue length, active skills. |
| `/compact` | Manual context compaction. |
| `/clear` | New session (confirm first). |
| `/help` | Lists commands. |

Slash commands typed while a run is active are queued like any message and parsed when they run (Codex parity).

### 5.6 Beginner-friendly output layer
- Tool calls render as friendly cards ("📖 Read `src/auth.ts`", "🔧 Ran `npm test` — 3 passed ✅"), expandable to raw detail. Never dump raw JSON/stack traces by default.
- **Suggestion chips** after every completed turn: the final `streamText` step also requests a structured `suggestions: string[]` (2–4 items, ≤6 words each) via `generateObject` or a cheap trailing call with the same provider; clicking a chip sends it as a message. On failure, fall back to static heuristics (tests were run → "Show failing tests"; diff applied → "Run the app", "Undo change").
- Errors are translated: "Your Anthropic key was rejected (401). Fix it in Settings → API Keys." with a button that opens the panel.
- First-run welcome walks through key setup and offers three starter prompts.

### 5.7 BYOK settings UI
- Dedicated settings webview (not raw settings.json): per-provider key fields (masked, "Test connection" button), model dropdown populated from live provider `/models` where available (OpenRouter, Ollama) or a maintained static list (`core/src/models.ts`) for Anthropic/OpenAI/Google.
- Ollama: base-URL field (default `http://localhost:11434`), auto-detect running server, list local models.
- Per-session model override via `/model` without touching defaults.
- Show running token count and estimated cost in the status bar (static per-token price table; mark estimates as approximate).

---

## 6. CONTEXT & EXTENSIBILITY

### 6.1 `@` mentions
`@file`, `@folder` (tree + key files), `@problems` (VS Code diagnostics), `@terminal` (last terminal output). Fuzzy path picker on `@`.

### 6.2 Auto-context
Active file name + selection are attached (Codex "auto-context" parity), toggleable via a paperclip indicator in the composer.

### 6.3 AGENTS.md
Load workspace-root `AGENTS.md` into the system prompt; support nested ones in subdirs (nearest wins) — match the agents.md convention.

### 6.4 Skills (Agent Skills open standard — agentskills.io)
- Discover skills in `.helm/skills/**/SKILL.md` (workspace) and `~/.helm/skills/**` (global).
- Parse YAML frontmatter (`name`, `description`); inject the name+description list into the system prompt; load a skill's full body into context only when the model requests it via a `use_skill` tool (progressive disclosure).
- Ship 2 example skills in the repo (e.g., `commit-message`, `write-tests`) to prove the loader.
- This gives instant compatibility with the existing open-source skill ecosystem (anthropics/skills etc.).

### 6.5 Open-weight model optimization layer (Kimi / GLM / Qwen / DeepSeek) — CORE FEATURE

These four families are the leading open-weight coding models (mid-2026: Kimi K2.6 & K2.7-Code, GLM-5.x, DeepSeek V4 Pro/Flash, Qwen3-Coder / Qwen3.6). They have closed most of the gap to frontier models on agentic coding but each has harness-level quirks. Harnesses tuned only for Claude/GPT silently degrade on them; Helm must not.

#### 6.5.1 `ModelProfile` quirks registry (`core/src/model-profiles.ts`)
Every model resolves to a profile; the agent loop consults it at every request/response boundary:

```ts
interface ModelProfile {
  id: string; family: 'kimi'|'glm'|'qwen'|'deepseek'|'claude'|'gpt'|'gemini'|'generic';
  contextWindow: number;
  temperature: { default: number; note?: string };   // Kimi: 0.6 recommended
  reasoning: { field: 'reasoning_content'|'anthropic-thinking'|'none';
               stripFromHistory: boolean;            // DeepSeek: must NOT send reasoning back
               preserveBetweenToolCalls: boolean };  // Kimi thinking models: must preserve
  toolCalling: { parallel: boolean; maxToolsAdvised: number;
                 repairStrategy: 'reask'|'json-fix'|'none';
                 xmlLeakage: boolean };              // Qwen: tool XML can leak into thinking
  caching: 'automatic'|'anthropic-explicit'|'none';  // DeepSeek: automatic prefix cache
  promptStyle: 'explicit-directive'|'standard';      // Kimi K2.7: needs explicit directives
  costPerMTok: { in: number; out: number; cachedIn?: number };
}
```
Profiles ship for: `kimi-k2.6`, `kimi-k2.7-code`, `glm-5.x`, `deepseek-v4-pro`, `deepseek-v4-flash`, `qwen3-coder`, `qwen3.6`, plus the closed-model families and a `generic` fallback (used for unknown OpenRouter/Ollama models). Populate exact numbers from provider docs at build time; cite the source URL in a comment per entry.

#### 6.5.2 Known quirks to handle (verify each against current docs during implementation)
| Model family | Quirk | Harness behavior |
|---|---|---|
| Kimi (Moonshot) | Recommended temp 0.6; their Anthropic-compat endpoint internally maps `real_temp = request × 0.6` | Set per-profile default temps; never send one global temperature |
| Kimi thinking modes | Reasoning must be preserved across tool-call turns within a run | `preserveBetweenToolCalls: true` — don't strip mid-run |
| Kimi K2.7-Code | Weaker implicit instruction-following in harness loops (documented Cline failures without explicit directives) | `promptStyle: 'explicit-directive'` → system prompt uses numbered MUST-rules, restates the tool contract, no subtle/implied instructions |
| DeepSeek | OpenAI-compat responses carry `reasoning_content`; sending it back in history is an API error | Extract for the "Thinking…" UI, strip before next request |
| DeepSeek | Automatic prefix/context caching, dramatically cheaper cached input | Keep prompts prefix-stable: static system prompt first, append-only history, session-scoped context (mentions, goal) appended at the END, never prepended |
| Qwen3-Coder | Custom XML-ish tool-call format on some serving stacks; tool calls can leak inside thinking blocks | Prefer native function calling via official API; enable `xmlLeakage` scan that promotes tool-call blocks out of reasoning text |
| GLM (Z.ai) | Ships OpenAI- and Anthropic-compatible endpoints; strong long-horizon coding | Standard adapter; verify which endpoint gives better tool-call fidelity and record in `## Decisions` |
| All four | Occasional malformed tool-call JSON under long contexts | Repair pipeline (6.5.3) |

#### 6.5.3 Tool-call robustness pipeline (applies to every model, critical for open weights)
1. **Schema simplicity by design:** every tool takes flat, mostly-string parameters; no nested objects/unions in tool schemas (already true of §5.2 — enforce with a unit test that fails on nested schemas). Keep total tools ≤ 12; `maxToolsAdvised` from the profile trims optional tools (e.g., `fetch_url`) for weaker models.
2. **Repair, don't fail:** on malformed tool JSON → (a) attempt mechanical fix (trailing commas, unquoted keys, single quotes); (b) if still invalid, send the parse error back as the tool result with `Fix your tool call and retry` — one retry, then surface a friendly error. Log repair events to the session debug view.
3. **Argument validation** with zod before execution; validation errors go back to the model as tool results (self-correction), not as harness crashes.
4. **Loop-breaker:** detect ≥3 identical consecutive tool calls (common open-model failure) → inject a steering system note ("You are repeating the same call; change approach or ask the user") and, on the 5th, pause the run with a user prompt.

#### 6.5.4 Prompting for open-weight models
- **One compact, explicit system prompt** (~1–2K tokens): numbered rules, exact tool-usage contract, output format. No personality prose. Frontier models tolerate bloat; open models drift.
- **Re-anchor long runs:** every 10 agent steps, inject a one-line system reminder of the pinned `/goal` and plan step in progress (open models lose thread on long horizons faster).
- **Plan-first bias:** for `promptStyle: 'explicit-directive'` profiles, `/plan`-style decomposition is auto-suggested for multi-file tasks — smaller scoped steps are where these models match frontier quality.
- **Compaction tuned per family:** compact at 70% (not 80%) for open models; quality degrades before the context limit is reached.

#### 6.5.5 Cost-tiered routing (BYOK-friendly, all optional)
- **Suggestion chips + compaction summaries** run on a cheap "utility model" (default: DeepSeek V4 Flash if a DeepSeek key exists, else the session model). Setting: `helm.utilityModel`.
- Show per-family cost advantage in the model picker (e.g., "≈20× cheaper than Claude" badge, from profile pricing) — this is the reason beginners bring these keys.

#### 6.5.6 Model reliability eval harness (`packages/core/evals/`)
Small built-in eval so quirk handling is measurable, not vibes:
- 10 canned single-turn tool-call tasks (read file, edit, grep, multi-step plan) run against any configured model via `pnpm eval --model <id>`; reports tool-call success rate, repair rate, loop incidents.
- Run in CI with a mock provider replaying recorded real transcripts from each family (fixtures checked in), so quirk regressions are caught without live keys.

#### 6.5.7 Skills authoring rules for open models (applies to §6.4 bundled skills)
- SKILL.md bodies: imperative numbered steps, exact tool names in backticks, one example invocation per step where ambiguous. No open-ended "use your judgment" phrasing.
- Keep each skill body ≤ 500 tokens; if longer, split into `SKILL.md` + referenced files loaded on demand (progressive disclosure matters more for open models — instruction-following degrades with context stuffing).
- Frontmatter `description` must contain concrete trigger keywords (open models match skills lexically more than semantically).
- Add optional frontmatter `compatibility:` note where a skill needs a thinking-capable model; the loader surfaces a UI hint if the active profile lacks it.

### 6.6 Checkpoints / undo
Before the first file mutation of each turn, snapshot affected files (shadow git or `.helm/checkpoints`). Every applied diff gets an **Undo** affordance; "Restore checkpoint" per turn. This is the beginner safety net — do not cut it.

---

## 7. SCOPE SUMMARY (MVP = all of M0–M8)

In: everything above. Out: see §11.

---

## 8. MILESTONES & ACCEPTANCE CRITERIA (copy into PROGRESS.md)

### M0 — Scaffold
- [ ] pnpm monorepo with `core`, `extension`, `webview`; strict TS; ESLint+Prettier; Vitest wired
- [ ] Extension activates; sidebar webview says hello via typed protocol
- [ ] CI script `pnpm verify` = lint + typecheck + test + build (used in §9)

### M1 — Chat with one provider (Anthropic)
- [ ] Key stored/read via SecretStorage; settings panel with masked field + Test connection
- [ ] Streaming chat: markdown rendering, code blocks with copy, **Stop** aborts mid-stream
- [ ] Reasoning/thinking deltas render in a collapsible "Thinking…" block when provider supplies them
- [ ] Session persists across webview reloads (serialize to `workspaceState`)

### M2 — Multi-provider BYOK (incl. open-weight endpoints)
- [ ] OpenAI, Google, OpenRouter, Ollama all working through the same `ProviderRegistry`
- [ ] Moonshot (Kimi), Z.ai (GLM), DeepSeek, DashScope (Qwen) official endpoints via openai-compatible adapter
- [ ] `ModelProfile` registry implemented (§6.5.1) with entries for all shipped models + generic fallback; per-profile temperature defaults applied
- [ ] Reasoning extraction per profile: `reasoning_content` shown in Thinking UI, stripped/preserved per `stripFromHistory`/`preserveBetweenToolCalls` (unit-tested with DeepSeek + Kimi fixtures)
- [ ] Model picker; OpenRouter + Ollama model lists fetched live; reasoning-effort selector where supported; cost badges from profiles
- [ ] Provider errors surfaced as friendly actionable messages
- [ ] `packages/core` headless example runs a chat turn with any configured provider (no VS Code)

### M3 — Context
- [ ] `@file`/`@folder`/`@problems`/`@terminal` mentions with fuzzy picker
- [ ] Active-file auto-context with toggle
- [ ] AGENTS.md loaded (root + nested)
- [ ] Token tracking + auto-compaction at 80% with UI notice

### M4 — Agent mode: tools, diffs, terminal
- [ ] All §5.2 tools implemented with schemas in core, execution in host
- [ ] Tool schemas flat (no nested objects/unions) — enforced by a failing unit test
- [ ] Tool-call robustness pipeline (§6.5.3): JSON repair, zod validation with self-correction feedback, repeat-call loop-breaker — unit-tested with malformed-call fixtures
- [ ] Chat/Agent/Full Access modes enforced exactly per §5.3
- [ ] Proposed edits open in native diff view; Accept applies, Reject discards; works for multi-file changes
- [ ] `run_command` via terminal shell integration, output captured back into context, approval card in Agent mode
- [ ] Checkpoints + Undo per §6.6
- [ ] E2E: "add a hello() function to utils.ts and call it in index.ts" produces two accepted diffs and a passing manual verification

### M5 — Queue, steer, slash commands
- [ ] Queue strip: enqueue while running, reorder, remove; FIFO auto-drain
- [ ] Steer injects at next loop boundary without killing the run; transcript marker shown
- [ ] `helm.enterBehavior` setting (`queue`|`steer`) with Tab as the inverse
- [ ] Stop leaves queue intact with Resume/Clear choice
- [ ] All §5.5 slash commands implemented; `/` popup with fuzzy filter
- [ ] `/plan` produces plan → Execute → tracked checklist; `/goal` banner persists and is in system prompt
- [ ] Unit tests in core for SteerQueue semantics (queued-while-running, steer-mid-tool-call, stop-with-queue)

### M6 — Skills + suggestions
- [ ] SKILL.md discovery, frontmatter parse, progressive-disclosure `use_skill` tool
- [ ] 2 bundled example skills work end-to-end, authored per §6.5.7 rules (imperative, ≤500 tokens, trigger keywords, optional `compatibility:` hint)
- [ ] Suggestion chips after every turn (model-generated with heuristic fallback); clicking sends
- [ ] Utility-model routing for chips/compaction (`helm.utilityModel`, §6.5.5)
- [ ] Friendly tool-call cards with expandable raw detail
- [ ] Open-model prompting behaviors live: explicit-directive system prompt variant, 10-step goal re-anchor, 70% compaction threshold for open families (§6.5.4)
- [ ] Eval harness (§6.5.6): `pnpm eval --model <id>` + CI run against recorded fixtures for all 4 open families

### M7 — Polish & safety
- [ ] First-run onboarding flow
- [ ] Command denylist enforced in all modes; Full Access opt-in warning per workspace
- [ ] Status bar: model, mode, tokens, est. cost
- [ ] All error paths produce actionable UI (no silent failures, no raw stack traces)
- [ ] Webview theming respects VS Code light/dark/high-contrast

### M8 — Ship
- [ ] `vsce package` produces installable `.vsix`; install-from-vsix smoke test passes in clean VS Code
- [ ] `@vscode/test-electron` suite: activate, send message (mock provider), receive stream
- [ ] Core coverage ≥70% lines; zero `any` in protocol/tool schemas
- [ ] `README.md` (user) + `RELEASE.md` (install/usage) + `ARCHITECTURE.md` (contributor) written
- [ ] Full §9 suite green

---

## 9. VERIFICATION (run before checking any box)

```bash
pnpm verify              # lint + typecheck + unit tests + build, all packages
pnpm --filter core test  # engine tests incl. SteerQueue + tool schema tests
pnpm --filter extension test:integration   # vscode-test-electron smoke
pnpm package             # vsce package → dist/helm-<version>.vsix
node packages/core/examples/cli-run.ts "say hi"   # headless engine check (mock provider ok in CI)
pnpm eval --model <id>   # tool-call reliability eval (fixtures in CI; live model manually)
```

Manual spot-checks required at M4/M5/M8: real provider key (any one), the M4 E2E scenario, and the queue→steer→stop flow. At M6, run `pnpm eval` live against at least one open-weight model (whichever key is available — DeepSeek is cheapest) and record the success rate in `PROGRESS.md ## Log`.

---

## 10. DESIGN DECISIONS ALREADY MADE (do not reopen)

1. VS Code extension, not CLI. Core stays headless for a future CLI shell, but no CLI work in MVP.
2. Vercel AI SDK for provider abstraction — one integration surface for 5 providers beats bespoke clients.
3. Queue-by-default Enter (beginner-safe), Codex-parity available via setting.
4. Agent Skills open standard for extensibility — ecosystem compatibility for free.
5. Approval-gated writes with checkpoints — trust is the product; autonomy is opt-in.
6. No account system, no server, no telemetry by default.
7. Open-weight models (Kimi/GLM/Qwen/DeepSeek) are first-class targets, not "OpenAI-compatible afterthoughts": ModelProfile quirks registry, tool-call repair pipeline, and the eval harness exist primarily for them.

## 11. NON-GOALS (MVP)
- MCP client support (post-MVP; design ToolHost so tools are pluggable)
- Cloud/background task delegation, multi-agent orchestration, subagents
- JetBrains or other editors; browser control; image generation
- Marketplace publication (packaging yes; publishing is a human decision)
- Prompt-level cost optimization, caching strategies beyond provider defaults

## 12. REFERENCES
- Codex IDE extension docs: https://developers.openai.com/codex/ide (+ /ide/features, /ide/slash-commands)
- Codex steer/queue + slash commands: https://developers.openai.com/codex/guides/slash-commands
- Cline (architecture reference): https://github.com/cline/cline
- OpenCode (agent loop reference, MIT): https://github.com/sst/opencode
- Codex open source: https://github.com/openai/codex
- Agent Skills standard: https://agentskills.io • https://github.com/anthropics/skills
- Vercel AI SDK providers: https://ai-sdk.dev/docs/foundations/providers-and-models
- OpenRouter AI SDK provider: https://github.com/OpenRouterTeam/ai-sdk-provider
- AGENTS.md convention: https://developers.openai.com/codex/guides/agents-md
- Kimi tool-call guidance (format, temp mapping): https://github.com/MoonshotAI/Kimi-K2/blob/main/docs/tool_call_guidance.md • https://platform.moonshot.ai
- DeepSeek API docs (reasoning_content, Anthropic-format base URL, caching): https://api-docs.deepseek.com
- Qwen3-Coder tool parser reference: https://huggingface.co/Qwen/Qwen3-Coder-480B-A35B-Instruct (qwen3coder_tool_parser.py) • vLLM reasoning outputs: https://docs.vllm.ai/en/latest/features/reasoning_outputs/
- Z.ai GLM docs: https://docs.z.ai
- Open-weight coding model landscape (mid-2026): https://kilo.ai/open-source-models

---
*End of handoff. Begin at §0.*
