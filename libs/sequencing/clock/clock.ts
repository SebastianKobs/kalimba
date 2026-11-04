// ---------- clock/clock: the one clock, its timeline, its ticks and its parts ----------
import { AudioClock, type AudioContextLike } from './audio-clock.ts';
import { BeatGrid, type GridSettings } from './beat-grid.ts';
import { snap, type SnapOptions } from './quantizer.ts';
import { COMMON_TIME } from './ticks.ts';
import { Events } from '../../base/util/index.ts';

// what the clock reads live: its owner's settings, as loose as they are;
// quantize, the grid snap() uses unless told another (GRIDS)
export interface ClockSettings extends GridSettings {
  quantize: string;
}
// what each event hands its listeners
type ClockEvents = {
  tick: [t: number];
  step: [i: number, t: number];
  tempo: [beat: number];
};

const TICK = 0.025; // s between ticks
export const LOOKAHEAD = 0.12; // s: how far ahead the grid's 16ths are scheduled

// the one clock: its time (now(), songNow() in song time), its ticks (start(), onTick()), its beat grid (grid) and its 16ths (onStep()), its edge to Web Audio
// (audio, from useAudio()), where a time snaps to (snap()); in fake mode (useFake()) time moves only when advance() says
export class Clock {
  readonly grid: BeatGrid;
  readonly audio: AudioClock;
  readonly #settings: ClockSettings;
  readonly #events = new Events<ClockEvents>(); // its ticks and 16ths, to whoever listens
  #fake: number | null = null; // the time in fake mode, else null
  #ticking = false;
  #beatTold: number | null = null; // the beat the last tick found, none before the first

  constructor({
    settings = { bpm: 72, swing: 0, swingOn: '16ths', quantize: '1/16', meter: COMMON_TIME },
  }: { settings?: ClockSettings } = {}) {
    this.#settings = settings;
    this.grid = new BeatGrid(settings);
    this.audio = new AudioClock(() => this.now(), TICK);
  }
  now(): number {
    return this.#fake ?? performance.now() / 1000;
  }
  // the song time now: the clock's time with the grid's holds taken out, where the music is on the arrangement's timeline
  songNow(): number {
    return this.grid.songTime(this.now());
  }
  // a pointer event's timeStamp is on the same timeline, in ms
  fromEvent(ms: number): number {
    return ms / 1000;
  }
  // in fake mode, for a frame time of the caller's
  faking(): boolean {
    return this.#fake !== null;
  }
  // listener(t), every tick
  onTick(listener: (t: number) => void): () => void {
    return this.#events.on('tick', listener);
  }
  // listener(i, t), every 16th of the grid, ahead of time: i its number, t when it sounds, swung
  onStep(listener: (i: number, t: number) => void): () => void {
    return this.#events.on('step', listener);
  }
  // listener(beat), each time the beat's length changes, as a tick finds it; the first tick's beat
  // is where it starts, not told
  onTempo(listener: (beat: number) => void): () => void {
    return this.#events.on('tempo', listener);
  }
  // the ticks come from a worker: browsers slow a hidden tab's own timers to once a second or less, but not a worker's
  start(): void {
    if (this.#ticking || this.#fake !== null) {
      return;
    }
    this.#ticking = true;
    try {
      const worker = new Worker(
        URL.createObjectURL(
          new Blob([`setInterval(() => postMessage(0), ${TICK * 1000})`], { type: 'text/javascript' }),
        ),
      );
      worker.onmessage = () => this.#tick();
    } catch {
      setInterval(() => this.#tick(), TICK * 1000);
    }
  }
  // the caller hands over its audio context when the audio starts (AudioClock's use()): the grid starts with it, a moment later
  useAudio(context: AudioContextLike): void {
    this.audio.use(context);
    this.grid.start(this.now() + 0.05);
    this.audio.sync();
  }
  // where a tap at t lands on a grid, the settings' quantize unless told another (quantizer.ts): { at, on }, when it sounds and the time
  // of the step it belongs to
  snap(t: number, { grid = this.#settings.quantize, ...options }: SnapOptions = {}): { at: number; on: number } {
    return snap(t, this.grid, this.audio.soonest(), grid, options);
  }
  // only when it sounds
  quantize(t: number, options?: SnapOptions): number {
    return this.snap(t, options).at;
  }
  // fake mode, for tests: time moves only when advance() says, in ticks, so every tick and step of the time passed runs in order.
  // advance(seconds, { ticks: false }) lets the time pass with no tick, as when the browser's timer lags
  useFake(t0 = 0): void {
    this.#fake = t0;
  }
  advance(seconds: number, { ticks = true } = {}): void {
    if (this.#fake === null) {
      throw new Error('advance() moves fake time: useFake() first');
    }
    const end = this.#fake + seconds;
    if (!ticks) {
      this.#fake = end;
      return;
    }
    while (this.#fake < end - 1e-9) {
      this.#fake = Math.min(end, this.#fake + TICK);
      this.#tick();
    }
  }
  #tick(): void {
    this.audio.sync();
    this.#tellTempo();
    this.#events.emit('tick', this.now());
    this.#schedule();
  }
  // before the steps are scheduled, so the tempo's followers are set for the 16ths they play.
  // The first tick only records the beat: a tempo the clock starts with is no change
  #tellTempo(): void {
    const beat = this.grid.beatDuration();
    const was = this.#beatTold;
    this.#beatTold = beat;
    if (was !== null && beat !== was) {
      this.#events.emit('tempo', beat);
    }
  }
  // each tick: the 16ths due within the lookahead go to onStep's listeners. While the audio is suspended nothing is scheduled. If the
  // ticks lagged, the steps missed are skipped silently, and the grid keeps its place
  #schedule(): void {
    if (!this.grid.running || !this.audio.running()) {
      return;
    }
    const t0 = this.now();
    this.grid.schedule(t0 - 0.2, t0 + LOOKAHEAD, (i, t) => this.#events.emit('step', i, t));
  }
}
