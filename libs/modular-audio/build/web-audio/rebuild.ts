// ---------- build/web-audio/rebuild: what's built built again, the old ringing out ----------
// The new built beside the old, its inputs moved over, the old let go once it has rung out (RING_OUT),
// so a delay's repeats and a reverb's tail aren't cut off. Where the old makes sound of its own, an
// oscillator running, it fades out as the new fades in (CROSSFADE), a fade put between each and where it goes.
import type { Destination } from './wiring.ts';

export const CROSSFADE = 0.1; // s: a rebuilt sound fades in, and the old one out, over this
export const RING_OUT = 8000; // ms: what's built again rings out, its structure changed, before it's let go

// A build's outputs led into where they go through a fade, from one level to another over the crossfade,
// from now: the fade made by the hand that keeps it.
export function fadedThrough(
  outputs: readonly AudioNode[],
  { into, levels: [from, to], fade, now }: { into: AudioNode; levels: [number, number]; fade: GainNode; now: number },
): void {
  fadedBy(fade, [from, to], now);
  fade.connect(into);
  for (const output of outputs) {
    output.disconnect(into);
    output.connect(fade);
  }
}
// a fade from one level to another over the crossfade, from now
export function fadedBy(fade: GainNode, [from, to]: [number, number], now: number): void {
  fade.gain.setValueAtTime(from, now);
  fade.gain.linearRampToValueAtTime(to, now + CROSSFADE);
}
// a sound no longer led into where it went: a node's input or a param, as Web Audio unwires each
export function disconnectFrom(source: AudioNode, destination: Destination): void {
  if ('connect' in destination) {
    source.disconnect(destination);
  } else {
    source.disconnect(destination);
  }
}
