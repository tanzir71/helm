---
name: write-docs
description: 'Write or update a README, docstrings, or usage documentation for existing code. Trigger words: readme, docs, document, docstring, usage guide, API docs, comment this.'
---

1. Read the code to document with `read_file`. For a README: also read the manifest (package.json / pyproject.toml / Cargo.toml) for the real name, scripts, and entry points — never invent install or run commands.
2. Verify every command you write down by running it with `run_command` where safe (`--help`, `--version`, build/test scripts). Do not document a command you could not verify.
3. README structure, exactly this order: one-sentence purpose, install, minimal usage example, configuration table (only options that exist in code), development/test commands. No badges, no roadmap, no emoji.
4. Docstrings: document parameters, return value, thrown errors, and one example. Match the existing docstring style found in the repo; if none, use the language's default (JSDoc / Google-style).
5. Propose with `write_file`/`edit_file`. Keep total README length under 150 lines.
