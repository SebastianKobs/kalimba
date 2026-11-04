// ---------- build/web-audio-engine/power: the audio's power, started, paused and resumed ----------
// Start: on the first touch, as browsers ask.
//   1. The engine made in the browser's audio, handed in: iOS's audio session set first, the
//      audio context on the clock's time.
//   2. What's built built in it by the Web Audio builder, into the output after it, faded in.
//   3. The clock's beat grid on the audio's time.
//   4. Told to whoever listens: a background struck then.
// Once started, a start turns it back on; none while paused.
// Pause: a transport's stop. The output fades out, and the audio context is suspended once
// it's quiet.
// Resume: faded in again, never at full volume: from where the fade got to if the context
// hadn't stopped yet, else from silence, the context resumed; started if it hadn't.
// Wake: back on after the browser stopped the sound (a phone locking, say), never started by it.
import type { Clock } from '../../../sequencing/clock/index.ts';
import type { Plan } from '../../plan/format/index.ts';
import { Events } from '../../../base/util/index.ts';
import { Output, WebAudioBuilder, type WebAudioBuilt } from '../web-audio/index.ts';
import { ClockedContext, type ClockedContextOptions } from './context.ts';

// The browser's audio, as the page hands it in: its AudioContext class, and iOS's audio
// session where there is one.
export interface BrowserAudio {
  readonly AudioContext: ClockedContextOptions['AudioContext'];
  readonly audioSession?: { type: string } | undefined;
}
// What the power is made with:
//   - browser(): the browser's audio, read at the first start;
//   - build(): what's built, by the function handed it, as a desk builds itself;
//   - beat(): a beat's length now, for synced times; clock: put on the audio's time.
export interface AudioPowerMaking {
  readonly browser: () => BrowserAudio;
  readonly build: (make: (plan: Plan) => WebAudioBuilt) => void;
  readonly beat: () => number;
  readonly clock: Pick<Clock, 'useAudio' | 'audio'>;
}
// The engine as its users ask for it, as they need it: none until the audio starts.
export type EngineOnceStarted = () => ClockedContext | null;

export const STOP_AFTER = 400; // ms before a pause suspends the context: the fade out has gone quiet

export class AudioPower {
  readonly #making: AudioPowerMaking;
  readonly #events = new Events<{ start: [] }>();
  #engine: ClockedContext | null = null; // made at the first start
  #output: Output | null = null; // after what's built, faded in as the audio starts
  #paused = false; // a transport's stop
  // suspends the context once the output has faded
  #pausing: ReturnType<typeof setTimeout> | undefined;

  constructor(making: AudioPowerMaking) {
    this.#making = making;
  }
  // whether the audio has started: it starts on the first touch
  get started(): boolean {
    return this.#engine !== null;
  }
  get paused(): boolean {
    return this.#paused;
  }
  get engine(): ClockedContext | null {
    return this.#engine;
  }
  // the output after what's built, faded in as the audio starts, never at full volume
  get output(): Output | null {
    return this.#output;
  }
  // The audio started, once, then told; back on once started. Neither while paused.
  start(): void {
    if (this.#paused) {
      return;
    }
    if (this.#engine) {
      this.#on();
      return;
    }
    const engine = this.build();
    // the beat grid on the audio's time from now, before a background's notes
    this.#making.clock.useAudio(engine.audioContext);
    this.#events.emit('start');
  }
  // The engine made and what's built built in it, into the output, with no clock on it and
  // nothing told, as a desk's offline render asks.
  build(): ClockedContext {
    const engine = this.#makeEngine();
    const context = engine.audioContext;
    this.#engine = engine;
    this.#output = new Output(context);
    const builder = new WebAudioBuilder({ context, beat: this.#making.beat });
    const into = this.#output.node;
    this.#making.build((plan) => builder.build(plan, { into }));
    return engine;
  }
  pause(): void {
    this.#paused = true;
    this.#off();
  }
  // going on: the sound faded in from where it stopped; started if it hadn't, as a touch
  resume(): void {
    this.#paused = false;
    this.start();
  }
  // back on after the browser stopped the sound; never started by it
  wake(): void {
    this.#on();
  }
  // the audio's start, once
  onStart(listener: () => void): void {
    this.#events.on('start', listener);
  }

  // The engine: the audio context on the clock's time, iOS's audio session set first.
  #makeEngine(): ClockedContext {
    const { AudioContext, audioSession } = this.#making.browser();
    playThroughSilentSwitch(audioSession);
    const clock = this.#making.clock;
    return new ClockedContext({ AudioContext, toContext: (t) => clock.audio.toContext(t) });
  }
  // Faded out, then suspended once quiet. Nothing while the context isn't running.
  #off(): void {
    const context = this.#engine?.audioContext;
    if (context?.state !== 'running') {
      return;
    }
    this.#output!.fadeOut(); // made with the engine
    this.#pausing = setTimeout(() => {
      this.#pausing = undefined;
      void context.suspend(); // fire and forget: nothing waits for it
    }, STOP_AFTER);
  }
  // Faded in: from where it got to if not yet suspended, else from silence, resumed.
  #on(): void {
    if (!this.#engine) {
      return;
    }
    if (this.#pausing) {
      clearTimeout(this.#pausing);
      this.#pausing = undefined;
      this.#output!.fadeIn(); // made with the engine
      return;
    }
    const context = this.#engine.audioContext;
    if (context.state === 'running') {
      return;
    }
    this.#output!.fadeIn({ fromSilence: true });
    void context.resume(); // fire and forget, as suspend()
  }
}

// iOS's audio session, where there is one, set for playback, which ignores the silent switch.
// The app's choice, not Web Audio's; a deviation from the design document, which asks for the
// switch to be heeded by default.
function playThroughSilentSwitch(session: { type: string } | undefined): void {
  try {
    if (session) {
      session.type = 'playback';
    }
  } catch {} // a session that won't take it: the platform's default
}
