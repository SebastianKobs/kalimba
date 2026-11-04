// ---------- util/maths: a value clamped, eased, approaching a target or stepped toward it; an angle or a place wrapped ----------

// time constants after which an approach counts as settled: e^-5, within 1 % of the way
export const SETTLED = 5;

export function clamp01(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}
// between low and high, else the edge it passed; high wins where they cross
export function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}
// a value modulo a size, never below 0: -1 the last of size steps
export function modulo(value: number, size: number): number {
  return ((value % size) + size) % size;
}
// a value approaching its target by a time constant, as Web Audio's setTargetAtTime:
// each moment the same fraction of the way left
export function approach(from: number, target: number, elapsed: number, timeConstant: number): number {
  return target + (from - target) * Math.exp(-elapsed / timeConstant);
}
// a value a frame's step toward its target: elapsed / time of the way, all of it once that's 1;
// a straight share of the step, unlike approach()
export function stepToward(value: number, target: number, elapsed: number, time: number): number {
  return value + (target - value) * Math.min(1, elapsed / time);
}
export function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a)); // angle difference into -pi..pi
}
export function easeOut(v: number): number {
  return 1 - Math.pow(1 - clamp01(v), 3);
}
// 0 up to the low edge, 1 from the high one, eased between, as GLSL's
export function smoothstep(low: number, high: number, value: number): number {
  const position = clamp01((value - low) / (high - low));
  return position * position * (3 - 2 * position);
}
export function wrapToTile(v: number, T: number): number {
  // into -T/2..T/2: a thing tiled round the view, so a floor never ends
  return v - T * Math.round(v / T);
}
