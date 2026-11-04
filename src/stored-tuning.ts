export const TUNING_STORAGE_KEY = 'kalimba.tuning';

/** A tuning read back from storage: one -1, 0 or 1 per tongue, or undefined for anything else. */
export function parseStoredTuning(raw: string | null, tongueCount: number): number[] | undefined {
  if (raw === null) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!Array.isArray(value) || value.length !== tongueCount) return undefined;
  return value.every((v) => v === -1 || v === 0 || v === 1) ? (value as number[]) : undefined;
}
