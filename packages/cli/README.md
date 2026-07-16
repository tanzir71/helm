# Helm CLI

Helm CLI runs the Helm bring-your-own-key agent harness from any terminal.

## Install

```bash
npm install --global @tanziro/helm
```

The package installs `helm-ai`; that name avoids conflicting with the Kubernetes `helm` command.

## Usage

Run the built-in no-key demo:

```bash
helm-ai "Explain this project"
```

Use the same minimal workflow commands in any project:

```bash
helm-ai plan "Add authentication"
helm-ai goal "Ship the first public release"
helm-ai solo "Implement the approved change"
```

- `plan` produces a numbered plan without editing files or running commands.
- `goal` shows or saves an objective for the current working directory. Run
  `helm-ai goal clear` to remove it.
- `solo` plans first, asks for approval, then runs every approved step against the goal. Use
  `--yes` for an intentional non-interactive approval.

Regular prompts automatically inherit the saved workspace goal. Use `--goal "..."` or
`HELM_GOAL` for a one-run override. Goals live under `~/.helm` by default; `HELM_HOME` changes that
location.

Use a local Ollama model:

```bash
helm-ai --provider ollama --model qwen3-coder "Explain this project"
```

Use a hosted model. Helm detects the provider from common model names and reads its standard key
variable:

```bash
OPENAI_API_KEY=... helm-ai --model gpt-5 "Suggest a refactor"
```

| Option or variable              | Purpose                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| `--plan`, `--solo`              | Flag aliases for the workflow commands                                                |
| `--goal`, `HELM_GOAL`           | Override the saved goal for one run                                                   |
| `--yes`                         | Approve a Solo plan without an interactive prompt                                     |
| `--provider`, `HELM_PROVIDER`   | Anthropic, OpenAI, Google, OpenRouter, Ollama, Moonshot, Z.ai, DeepSeek, or DashScope |
| `--model`, `HELM_MODEL`         | Provider model ID                                                                     |
| `--base-url`, `HELM_BASE_URL`   | Custom OpenAI-compatible endpoint                                                     |
| `--reasoning`, `HELM_REASONING` | `low`, `medium`, or `high` reasoning effort                                           |
| `HELM_API_KEY`                  | Provider key override                                                                 |

Run `helm-ai --help` to see provider-specific key variables and examples.

The CLI is a headless harness. Workspace file tools, shell execution, native diffs, checkpoints,
and Undo remain part of the VS Code extension.

## Development and test

```bash
pnpm install
pnpm --filter @tanziro/helm test
pnpm --filter @tanziro/helm typecheck
pnpm --filter @tanziro/helm build
```
