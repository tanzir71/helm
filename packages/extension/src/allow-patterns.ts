export function commandAllowPattern(command: string): string {
  return `command:${command.trim().split(/\s+/u).slice(0, 2).join(' ')}`;
}

export function domainAllowPattern(domain: string): string {
  return `domain:${domain.toLowerCase()}`;
}

export function allowedDomains(patterns: Iterable<string>): string[] {
  return [...patterns]
    .filter((pattern) => pattern.startsWith('domain:'))
    .map((pattern) => pattern.slice('domain:'.length))
    .sort();
}

export function isCommandAllowed(patterns: Iterable<string>, command: string): boolean {
  return [...patterns].some(
    (pattern) =>
      pattern.startsWith('command:') && command.startsWith(pattern.slice('command:'.length)),
  );
}

export function isDomainAllowed(patterns: Iterable<string>, domain: string): boolean {
  return allowedDomains(patterns).some(
    (allowed) => domain === allowed || domain.endsWith(`.${allowed}`),
  );
}
