# Helm release guide

## Build the release artifact

From the repository root, with Node.js 20+ and pnpm 10 installed:

```bash
pnpm install --frozen-lockfile
pnpm verify
pnpm --filter ./packages/extension test:integration
pnpm package
```

The package command writes `dist/helm-0.1.0.vsix`. The extension host and webview are bundled, so
the installed extension does not need this repository or its `node_modules` directory.

## Install from VSIX

1. Open a clean VS Code profile.
2. Run **Extensions: Install from VSIX…** from the Command Palette.
3. Select `dist/helm-0.1.0.vsix` and reload VS Code.
4. Open a folder and select Helm in the Activity Bar.
5. Confirm onboarding renders, a provider key can be saved, and **Test connection** succeeds.

## Manual release smoke test

Use any real provider key and keep Agent mode selected.

1. Ask Helm to explain the open project; confirm text streams and Stop interrupts cleanly.
2. Ask: “add a `hello()` function to `utils.ts` and call it in `index.ts`.” Accept both native
   diffs, run the relevant test, then use Undo and confirm the files are restored.
3. Start a multi-step task, queue a second prompt, steer the live run, press Stop, and confirm the
   queued prompt remains available through Resume/Clear.
4. Restart the webview and confirm the session, provider/model, mode, and pinned goal persist.
5. Run the open-model eval with an available key and record its success/repair rates in
   `PROGRESS.md`.

For example, DeepSeek live evaluation uses ten isolated tool-call tasks and does not touch files or
run commands because the evaluator supplies a stub host:

```bash
HELM_API_KEY=<key> pnpm eval --model deepseek-v4-flash --live
```

Use `--provider <id>` or `HELM_PROVIDER` for model names whose provider cannot be inferred, and
`HELM_BASE_URL` for a custom or local compatible endpoint. Without `--live`, the same command
replays the checked-in family fixture used in CI.

## Release policy

- Never add API keys, generated provider transcripts, or workspace checkpoints to the package.
- Marketplace publication is intentionally outside this repository's automated release process.
- No account, backend service, or telemetry is required by the extension.
