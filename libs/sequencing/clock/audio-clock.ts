// ---------- clock/audio-clock: the edge to Web Audio, which keeps its own time ----------
// The offset is clock time minus the audio context's time. The context's time doesn't run smoothly as the page sees it: it jumps a chunk
// at a time (32 ms in Firefox, more with some drivers and Bluetooth), each time the audio has rendered one. What the page sees is the start
// of the next chunk the audio will render, the soonest a sound can start. So the offset is the largest seen over the last second, the
// context's time just before it jumps: a clock time maps to where the audio is, never ahead of it, and nothing is scheduled later than it
// could be. Right after it's found, it's taken at once; after that it follows by at most 1 ms a second, so the grid stays even. Right as
// the audio starts, its time can run out of step with the clock for a moment (headless Firefox renders about 0.7 s ahead); the largest
// offset takes that up within a quarter of a second. While the audio doesn't run, a suspend's or as it starts, its time stands still
// while the clock's runs on: a clock time maps to where it stands, so what's sent then sounds as it runs again, not as late as it stood
import { clamp } from '../../base/util/index.ts';

// what it needs of an audio context: a browser's, or the tests' stand-in
export interface AudioContextLike {
  currentTime: number;
  state: string;
  baseLatency?: number;
  outputLatency?: number;
  addEventListener?(type: 'statechange', listener: () => void): void;
}

// the audio context's time on the clock's, from when the context is handed over (use()); sync() measures the offset, once a tick
export class AudioClock {
  readonly #now: () => number;
  readonly #tick: number;
  #context: AudioContextLike | null = null;
  #offset = 0;
  #anchoredAt: number | null = null;
  readonly #recent: number[] = [];

  // now: the clock's time; tick: s between the syncs, how far the offset may follow in one
  constructor(now: () => number, tick: number) {
    this.#now = now;
    this.#tick = tick;
  }
  // its audio context handed over, running or not
  started(): boolean {
    return this.#context !== null;
  }
  running(): boolean {
    return !!this.#context && this.#context.state === 'running';
  }
  // the offset is taken at once, from the context's time as it is: a new context is often still starting (suspended, its time at 0), and
  // the press that started it plays its note now, so that note goes to the start of the audio's time, as soon as it runs. Once it runs,
  // the offset is found properly
  use(context: AudioContextLike): void {
    this.#context = context;
    this.#anchoredAt = null;
    this.#offset = this.#now() - context.currentTime;
    if (context.addEventListener) {
      context.addEventListener('statechange', () => {
        this.#anchoredAt = null;
        this.#offset = this.#now() - context.currentTime;
      });
    } // running, or resumed after a suspend: taken at once, from where it stood, and found again
  }
  sync(): void {
    if (!this.#context || !this.running()) {
      return;
    }
    const t = this.#now();
    const measured = t - this.#context.currentTime;
    if (this.#anchoredAt === null) {
      this.#anchoredAt = t;
      this.#recent.length = 0;
      this.#offset = measured;
    }
    this.#recent.push(measured);
    if (this.#recent.length > 40) {
      this.#recent.shift();
    }
    const best = Math.max(...this.#recent);
    this.#offset =
      t - this.#anchoredAt < 1 ?
        best
      : this.#offset + clamp(best - this.#offset, -0.001 * this.#tick, 0.001 * this.#tick);
  }
  // its offset found: after the audio's first second
  settled(): boolean {
    return this.running() && this.#anchoredAt !== null && this.#now() - this.#anchoredAt >= 1;
  }
  // a clock time in the audio context's time
  toContext(t: number): number {
    return t - this.#offsetNow();
  }
  // and back
  fromContext(contextTime: number): number {
    return contextTime + this.#offsetNow();
  }
  // the offset as found, or while the audio doesn't run, from where its time stands
  #offsetNow(): number {
    if (!this.#context || this.running()) {
      return this.#offset;
    }
    return this.#now() - this.#context.currentTime;
  }
  // the context's own now, for changes that start at once, also while it's suspended
  contextNow(): number {
    return this.#context ? this.#context.currentTime : 0;
  }
  // the clock time of the audio's next chunk: the soonest a sound can start
  soonest(): number {
    return this.#context ? Math.max(this.#now(), this.contextNow() + this.#offsetNow()) : this.#now();
  }
  // s from a sound being computed to being heard
  latency(): number {
    return this.#context ? (this.#context.baseLatency || 0) + (this.#context.outputLatency || 0) : 0;
  }
}
