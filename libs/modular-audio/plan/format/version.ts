// ---------- plan/format/version: a stored plan's version ----------
// Each stored plan holds the version of the format it was written in,
// so one written for an older tool is told apart.

// this format's version
export const VERSION = 1;

// A stored plan's version, read as it's loaded.
// Refused, naming what it found: none, one that isn't a whole number, one newer than this format.
export function versionOf(stored: unknown): number {
  const version = typeof stored === 'object' && stored !== null ? (stored as { version?: unknown }).version : undefined;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new Error(`a stored plan's version: found ${JSON.stringify(version) ?? 'none'}`);
  }
  if (version > VERSION) {
    throw new Error(`a stored plan's version: ${version} is newer than this format's, ${VERSION}`);
  }
  return version;
}
