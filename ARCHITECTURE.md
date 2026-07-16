# Helm architecture

Helm is a pnpm monorepo with a headless agent engine, a trusted VS Code extension host, and an
untrusted webview UI. The host owns every privileged operation.

```text
packages/webview  <── typed postMessage protocol ──>  packages/extension
       │                                                   │
       │ browser-safe types/profiles                       │ provider calls, files,
       └──────────────── packages/core ────────────────────┘ terminal, secrets, state
```

## `packages/core`

Core has no VS Code dependency. `ProviderRegistry` creates native AI SDK clients for Anthropic,
OpenAI, Google, and OpenRouter, plus OpenAI-compatible clients for Ollama and the four open-weight
endpoints. Every request is paired with a `ModelProfile` that controls temperature, context size,
reasoning history, tool limits, prompt style, and cost estimation.

`AgentRunner` builds the compact system prompt, exposes mode-appropriate tools, streams text and
reasoning, repairs malformed tool JSON, injects queued steering at step boundaries, re-anchors long
runs, and reports usage. File and command execution are represented by the `ToolHost` interface,
which keeps the engine headless and testable.

Other core modules own queue semantics, context thresholds/compaction, `AGENTS.md` and `SKILL.md`
loading, slash commands, heuristic suggestions, and the open-model eval harness. `browser.ts`
exports only code that can safely be bundled into the webview.

## `packages/extension`

The extension host is the trust boundary. `SessionManager` owns provider selection, SecretStorage,
workspaceState persistence, utility-model routing, automatic context, queue draining, and all
host↔webview events. `ExtensionToolHost` confines paths to the open workspace, manages approvals,
opens native diffs, snapshots checkpoints, captures terminal output, and enforces the command
denylist.

The host is bundled with esbuild. The webview production output is copied under
`packages/extension/dist/webview` and loaded with a nonce-based Content Security Policy.

## `packages/webview`

The React webview renders official AI Elements message, conversation, reasoning, and tool
components using VS Code theme variables. It cannot read secrets, files, or terminals directly;
all actions are discriminated-union protocol messages. The UI owns transient presentation state
such as popups and open cards, while durable chat/settings state comes from the host.

## Safety invariants

1. Paths are resolved under the first workspace root before file access.
2. Chat mode cannot invoke mutation or command tools.
3. Agent mode requires approval for writes and commands; Full Access is explicitly opted into per
   workspace.
4. The destructive-command denylist is evaluated in every mode.
5. Provider keys stay in SecretStorage and are never sent to the webview.
6. Proposed file edits are applied only after a diff decision and are checkpointed for Undo.

## Testing

Vitest covers core and pure host logic with at least 70% core line coverage. The Electron suite
launches an isolated VS Code build, activates the packaged shape of the extension, and completes a
streamed chat turn through a deterministic mock provider. Eval fixtures replay Kimi, GLM,
DeepSeek, and Qwen tool-call behavior without live keys; a live eval remains a manual release check.
