# Helm

Helm is a beginner-friendly, bring-your-own-key coding agent for Visual Studio Code and the
terminal. The extension keeps provider credentials in VS Code SecretStorage, streams model text
and reasoning into a native sidebar, and puts file changes and shell commands behind explicit
safety controls. The globally installable CLI exposes the same headless model harness for quick
terminal prompts.

## What it supports

- Anthropic, OpenAI, Google, OpenRouter, and local Ollama models
- Official Moonshot (Kimi), Z.ai (GLM), DeepSeek, and DashScope (Qwen) endpoints
- Chat, Agent, and Full Access modes with a command denylist in every mode
- Assist and Solo workflow tabs; Solo plans first, pauses for approval, then runs the plan as a goal
- Markdown responses, highlighted code, collapsible reasoning, live tool cards, diffs, and Undo
- Queued prompts, mid-run steering, Stop/Resume, persistent goals, and slash commands
- `@file`, `@folder`, `@problems`, and `@terminal` context plus active-editor context controlled in Settings
- Root and nested `AGENTS.md`, intent-routed `SKILL.md` workflows, and context compaction
- Open-model profiles, tool-call repair, loop detection, and a fixture-backed reliability eval

Helm has no account service, server, or telemetry. Model requests go from the extension host to
the provider you configure.

## Install the VS Code extension

1. Build a VSIX with `pnpm package`, or use a supplied `dist/helm-<version>.vsix`.
2. In VS Code, run **Extensions: Install from VSIX…** and reload the window.
3. Open a folder, select the Helm compass in the Activity Bar, then choose **Set up a provider**.
4. Pick a provider and model, paste its API key, and use **Test connection**.
5. Start in **Chat** for read-only exploration or **Agent** for approval-gated edits and commands.

## Install the CLI

The npm package installs the conflict-free `helm-ai` command (`helm` is already widely used by the
Kubernetes package manager):

```bash
npm install --global @tanziro/helm
helm-ai "Explain this project"
```

That first command works without configuration against a safe demo model. For a local model:

```bash
helm-ai --provider ollama --model qwen3-coder "Explain this project"
```

For hosted models, pass `--model` and set its normal key variable. Helm infers common providers:

```bash
OPENAI_API_KEY=... helm-ai --model gpt-5 "Suggest a refactor"
```

Run `helm-ai --help` for all flags and supported provider key variables. The current CLI is a
single-turn headless harness; workspace tools, approvals, diffs, and Undo remain extension-first.

Ollama does not require an API key. Its default server URL is `http://localhost:11434`; Helm
normalizes that to the server's OpenAI-compatible `/v1` endpoint for chat requests.

## Using Helm

While a run is active, Enter queues the next prompt by default and Tab steers the live run. Change
that behavior with `helm.enterBehavior`. Stop preserves queued work and presents Resume/Clear.

Use **Assist** for direct chat and agent work. Use **Solo** when you want to describe an outcome and
let Helm generate the plan automatically. Solo waits for **Approve & run**, pins the original task
as the session goal, executes each plan step, and reveals accepted workspace files in the editor as
it changes them. Solo uses Agent safety, so diffs and commands remain reviewable.

Context mentions are selected with a fuzzy popup:

```text
@file:src/index.ts explain this file
@folder:src find the best place for this feature
@problems fix the current diagnostics
@terminal explain the last command failure
```

Available slash commands are `/plan`, `/goal`, `/review`, `/init`, `/model`, `/status`,
`/compact`, `/clear`, and `/help`. A goal persists with the workspace session and is re-anchored
during long tool loops.

Skills require no command or manual selection. Before acting, Helm matches the meaning of the task
against active skill descriptions, loads each clearly relevant workflow with `use_skill`, and shows
that activation in the normal tool activity. It ignores unrelated skills and supports workspace or
global skill overrides from **Settings → Skills**.

### Safety modes

- **Chat** exposes only read/search/context tools.
- **Agent** proposes edits in VS Code diffs and asks before commands.
- **Full Access** skips routine approvals only after a per-workspace warning.

Dangerous command patterns remain blocked in every mode. Helm snapshots affected files before a
turn's first mutation and exposes Undo after accepted changes.

## Configuration

- `helm.enterBehavior`: `queue` (default) or `steer` while a run is active.
- `helm.utilityModel`: optional `provider/model-id` used for compaction and suggestions. If unset,
  Helm prefers DeepSeek V4 Flash when a DeepSeek key exists, then falls back to the session model.

## Development

Requirements: Node.js 20+ and pnpm 10.

```bash
pnpm install
pnpm verify
pnpm --filter ./packages/extension test:integration
pnpm package
pnpm package:cli
pnpm eval --model qwen3-coder
```

See [RELEASE.md](RELEASE.md) for installation and smoke-test steps and
[ARCHITECTURE.md](ARCHITECTURE.md) for contributor details.
