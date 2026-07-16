export function isDeniedCommand(command: string): boolean {
  return [
    /(^|\s)rm\s+-[^\n]*r[^\n]*f[^\n]*\s+\/(?:\s|$)/iu,
    /:\(\)\s*\{\s*:\|:\s*&\s*\};\s*:/u,
    /(^|\s)(?:mkfs|fdisk|shutdown|reboot)(?:\s|$)/iu,
    />\s*\/dev\/(?:sd|disk)/iu,
  ].some((pattern) => pattern.test(command));
}
