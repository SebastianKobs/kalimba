// The kalimba rendered offline, for the end-to-end tests: plucks, clicks or raw messages, as the live player
// sends them, through the same instruments (src/sound/instruments.ts), into an OfflineAudioContext.
import type { Message } from '../../libs/midi/protocol/index.ts';
import { KALIMBA_21 } from '../../src/layout';
import { kalimbaInstruments } from '../../src/sound/instruments';
import { clickMessages, Plucks } from '../../src/sound/plucks';
import { DEFAULT_KLANG, instrumentsWith, pitchOffset, ringFactor, type KlangValues } from '../../src/sound/klang';

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
  const { kalimba, click } = kalimbaInstruments(context, context.destination, seeded(ask.seed ?? 1), instrumentsWith(klang));
  const plucks = new Plucks(() => ({ pitchOffset: pitchOffset(klang), ringFactor: ringFactor(klang) }));
  for (const { note, t, velocity } of ask.plucks ?? []) {
    kalimba.receive(plucks.pluck(KALIMBA_21.find((tongue) => tongue.note === note)!, t, velocity ?? 1));
  }
  (ask.clicks ?? []).forEach(({ accent, t }, i) => click.receive(clickMessages(accent, t, i)));
  if (ask.messages) kalimba.receive(ask.messages);
  const rendered = await context.startRendering();
  return Array.from(rendered.getChannelData(0));
}

declare global {
  interface Window {
    renderKalimba: typeof renderKalimba;
  }
}
window.renderKalimba = renderKalimba;
