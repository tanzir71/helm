import { useEffect, useState } from 'react';

import type { HostToWebviewMessage } from '@helm/core';

import { vscode } from './vscode';

export function App(): React.JSX.Element {
  const [version, setVersion] = useState<string>();

  useEffect(() => {
    const receive = (event: MessageEvent<HostToWebviewMessage>) => {
      if (event.data.type === 'hello') setVersion(event.data.version);
    };
    window.addEventListener('message', receive);
    vscode.postMessage({ type: 'webviewReady' });
    return () => window.removeEventListener('message', receive);
  }, []);

  return (
    <main className="shell">
      <div className="mark" aria-hidden="true">
        ⎈
      </div>
      <h1>Helm</h1>
      <p>{version ? `Ready · v${version}` : 'Connecting…'}</p>
      <button type="button" onClick={() => vscode.postMessage({ type: 'openSettings' })}>
        Set up a provider
      </button>
    </main>
  );
}
