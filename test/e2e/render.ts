// The kalimba rendered offline, for the end-to-end tests: plucks, clicks or raw messages, as the live player
// sends them, through the same sound (src/sound/kalimba-sound.ts), into an OfflineAudioContext.
import type { Message } from '../../libs/midi/protocol/index.ts';
import { KALIMBA_21, retune } from '../../src/layout';
import { KalimbaSound } from '../../src/sound/kalimba-sound';
import { DEFAULT_KLANG, type KlangValues } from '../../src/sound/klang';

export interface RenderAsk {
  readonly seconds: number;
  readonly sampleRate?: number;
  /** the noise's draws: the same seed, the same click */
  readonly seed?: number;
  readonly plucks?: readonly { readonly note: string; readonly t: number; readonly velocity?: number }[];
  readonly clicks?: readonly { readonly accent: boolean; readonly t: number }[];
  /** messages straight into the kalimba's instrument */
  readonly messages?: readonly Message[];
  /** the Klang panel's macros, over their defaults */
  readonly klang?: Partial<KlangValues>;
  /** half steps per tongue, as the Umstimmen mode retunes them */
  readonly tuning?: readonly number[];
}

// mulberry32: a seeded draw in [0, 1)
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function renderKalimba(ask: RenderAsk): Promise<number[]> {
  const sampleRate = ask.sampleRate ?? 48000;
  const context = new OfflineAudioContext(1, Math.round(ask.seconds * sampleRate), sampleRate);
  const klang: KlangValues = { ...DEFAULT_KLANG, ...ask.klang };
  const tongues = retune(KALIMBA_21, ask.tuning ?? KALIMBA_21.map(() => 0));
  const sound = new KalimbaSound({ context, into: context.destination, random: seeded(ask.seed ?? 1), klang, tongues });
  for (const { note, t, velocity } of ask.plucks ?? []) {
    sound.pluck(tongues.find((tongue) => tongue.note === note)!, t, velocity ?? 1);
  }
  for (const { accent, t } of ask.clicks ?? []) sound.click(accent, t);
  if (ask.messages) sound.receive(ask.messages);
  const rendered = await context.startRendering();
  return Array.from(rendered.getChannelData(0));
}

declare global {
  interface Window {
    renderKalimba: typeof renderKalimba;
  }
}
window.renderKalimba = renderKalimba;
