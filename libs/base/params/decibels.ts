// ---------- libs/base/params/decibels: a gain in dB and back, and the floor of silence ----------

// -80 dB: as near silence as an exponential ramp goes, and where a meter shows none
export const SILENCE = 1e-4;

export function gainOf(dB: number): number {
  return 10 ** (dB / 20);
}
export function dBOf(gain: number): number {
  return 20 * Math.log10(gain);
}
