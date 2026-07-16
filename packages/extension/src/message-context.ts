import path from 'node:path';

export function workspaceRelativePath(
  workspaceRoot: string,
  candidatePath: string,
): string | undefined {
  const relative = path.relative(workspaceRoot, candidatePath);
  if (
    !relative ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  )
    return undefined;
  return relative;
}

export function fileContextReference(relativePath: string): string {
  return relativePath.includes(' ') ? `@file:"${relativePath}"` : `@file:${relativePath}`;
}

export function fileContextReferences(workspaceRoot: string, candidatePaths: string[]): string[] {
  return [
    ...new Set(
      candidatePaths.flatMap((candidatePath) => {
        const relativePath = workspaceRelativePath(workspaceRoot, candidatePath);
        return relativePath ? [fileContextReference(relativePath)] : [];
      }),
    ),
  ];
}
