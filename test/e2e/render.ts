// The kalimba rendered offline, for the end-to-end tests: plucks, clicks or raw messages, as the live player
// sends them, through the same sound (src/sound/kalimba-sound.ts), into an OfflineAudioContext.
import type { Message } from '../../libs/midi/protocol/index.ts';
import { KALIMBA_21, retune } from '../../src/layout';
import { KalimbaSound } from '../../src/sound/kalimba-sound';
import { masterInto } from '../../src/sound/master';
import { DEFAULT_KLANG, type KlangValues } from '../../src/sound/klang';
import type { ArrangedNote } from '../../src/music/arrange';
import { SongPlayer, type ScheduledSound } from '../../src/practice/song-player';

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
  /** through the player's master: its level into the limiter, as it reaches the speaker */
  readonly master?: boolean;
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
  const into = ask.master ? masterInto(context, context.destination) : context.destination;
  const sound = new KalimbaSound({ context, into, random: seeded(ask.seed ?? 1), klang, tongues });
  for (const { note, t, velocity } of ask.plucks ?? []) {
    sound.pluck(tongues.find((tongue) => tongue.note === note)!, t, velocity ?? 1);
  }
  for (const { accent, t } of ask.clicks ?? []) sound.click(accent, t);
  if (ask.messages) sound.receive(ask.messages);
  const rendered = await context.startRendering();
  return Array.from(rendered.getChannelData(0));
}

export interface LiveSongAsk {
  readonly notes: readonly { readonly note: string; readonly beat: number }[];
  readonly bpm: number;
  readonly seconds: number;
  /** each frame's main-thread work, as the highway's drawing, in ms */
  readonly busyMs: number;
}
export interface LiveSong {
  /** each note's time on the audio's clock, as the song player asked for it */
  readonly plucks: number[];
  /** what came out: the audio's time of its first sample, its samples */
  readonly start: number;
  readonly samples: number[];
  readonly sampleRate: number;
}

// a song played live, as the app's autoplay plays it: on a real-time context, through the song player, the page busy each frame;
// what reaches the speakers recorded (muted in the tests)
async function liveSong(ask: LiveSongAsk): Promise<LiveSong> {
  const context = new AudioContext({ latencyHint: 'interactive' });
  await context.resume();
  const level = context.createGain();
  const tapped = await audioThreadTap(context);
  level.connect(tapped.node);
  level.connect(context.destination);
  const tongues = KALIMBA_21;
  const sound = new KalimbaSound({ context, into: level, random: Math.random, klang: { ...DEFAULT_KLANG, hall: 0, resonanz: 0 }, tongues });
  const plucks: number[] = [];
  const scheduled: ScheduledSound = {
    context: () => context,
    pluckAt: (tongue, t, velocity) => {
      plucks.push(t);
      sound.pluck(tongue, t, velocity);
    },
    clickAt: () => {},
  };
  const notes: ArrangedNote[] = ask.notes.map(({ note, beat }) => ({
    beat,
    beats: 1,
    tongue: tongues.find((tongue) => tongue.note === note)!,
    fit: 'exact',
    source: { start: 0, end: 0 },
  }));
  let busy = true;
  const frame = () => {
    const end = performance.now() + ask.busyMs;
    while (performance.now() < end); // the highway's drawing
    if (busy) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  new SongPlayer(scheduled).play({ notes, bpm: ask.bpm, meter: { beatsPerBar: 4, beatUnit: 4 }, leadInBeats: 4, click: false });
  await new Promise((resolve) => setTimeout(resolve, ask.seconds * 1000));
  busy = false;
  const { start, samples } = tapped.recording();
  await context.close();
  return { plucks, start, samples, sampleRate: context.sampleRate };
}

// a recorder on the audio thread: each block of 128 samples sent with its frame, so a busy page loses or shifts nothing
// (a ScriptProcessor runs on the page's thread, a buffer late, and drops buffers while the page is busy)
async function audioThreadTap(context: AudioContext) {
  const processor = `registerProcessor('tap', class extends AudioWorkletProcessor {
    process(inputs) { const x = inputs[0][0]; if (x) this.port.postMessage({ frame: currentFrame, x: x.slice() }); return true; }
  });`;
  await context.audioWorklet.addModule(URL.createObjectURL(new Blob([processor], { type: 'text/javascript' })));
  const node = new AudioWorkletNode(context, 'tap');
  node.connect(context.destination); // pulled by the graph; it writes nothing out
  const blocks: { frame: number; x: Float32Array }[] = [];
  node.port.onmessage = (e: MessageEvent<{ frame: number; x: Float32Array }>) => blocks.push(e.data);
  return {
    node,
    recording() {
      // from the context's start: silent where nothing reached it (a block with no sound has no channel)
      const samples = new Array<number>(blocks.at(-1)!.frame + 128).fill(0);
      for (const { frame, x } of blocks) x.forEach((v, i) => (samples[frame + i] = v));
      return { start: 0, samples };
    },
  };
}

declare global {
  interface Window {
    renderKalimba: typeof renderKalimba;
    liveSong: typeof liveSong;
  }
}
window.renderKalimba = renderKalimba;
window.liveSong = liveSong;
