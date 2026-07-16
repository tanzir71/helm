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
| `--provider`, `HELM_PROVIDER`   | Anthropic, OpenAI, Google, OpenRouter, Ollama, Moonshot, Z.ai, DeepSeek, or DashScope |
| `--model`, `HELM_MODEL`         | Provider model ID                                                                     |
| `--base-url`, `HELM_BASE_URL`   | Custom OpenAI-compatible endpoint                                                     |
| `--reasoning`, `HELM_REASONING` | `low`, `medium`, or `high` reasoning effort                                           |
| `HELM_API_KEY`                  | Provider key override                                                                 |

Run `helm-ai --help` to see provider-specific key variables and examples.

## Development and test

```bash
pnpm install
pnpm --filter @tanziro/helm test
pnpm --filter @tanziro/helm typecheck
pnpm --filter @tanziro/helm build
```
