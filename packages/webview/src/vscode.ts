import type { WebviewToHostMessage } from '@helm/core';

interface VsCodeApi {
  postMessage(message: WebviewToHostMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare const acquireVsCodeApi: undefined | (() => VsCodeApi);

const fallback: VsCodeApi = {
  postMessage: () => undefined,
  getState: () => undefined,
  setState: () => undefined,
};

export const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : fallback;
