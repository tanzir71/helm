import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { CodeGraphService } from '../src/codegraph-service.js';

const fixtureFiles: Record<string, string> = {
  'user.ts': `export interface User { name: string; }
export function formatUser(user: User): string {
  return user.name.trim();
}
`,
  'profile.ts': `import { formatUser, type User } from './user.js';
export function profileTitle(user: User): string {
  return formatUser(user);
}
`,
  'email.ts': `import { formatUser, type User } from './user.js';
export function emailGreeting(user: User): string {
  return \`Hello \${formatUser(user)}\`;
}
`,
  'account.ts': 'export const accountEnabled = true;\n',
  'avatar.ts': 'export function avatarUrl(id: string): string { return `/avatar/${id}`; }\n',
  'clock.ts': 'export const now = (): number => Date.now();\n',
  'config.ts': 'export const config = { locale: "en" };\n',
  'logger.ts': 'export function log(message: string): void { console.log(message); }\n',
  'roles.ts': 'export type Role = "admin" | "member";\n',
  'status.ts': 'export const status = "ready";\n',
};

describe('CodeGraph fixture', () => {
  it('returns both known callers and their verbatim source from a ten-file repository', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'helm-codegraph-fixture-'));
    const service = new CodeGraphService(root);
    try {
      await Promise.all(
        Object.entries(fixtureFiles).map(([file, content]) =>
          writeFile(path.join(root, file), content, 'utf8'),
        ),
      );
      await service.initialize(false);
      const result = await service.explore('what calls formatUser');

      expect(result).toContain('profile.ts');
      expect(result).toContain('email.ts');
      expect(result).toContain('return formatUser(user);');
      expect(result).toContain('formatUser(user)');
    } finally {
      service.dispose();
      await rm(root, { force: true, recursive: true });
    }
  }, 60_000);
});
