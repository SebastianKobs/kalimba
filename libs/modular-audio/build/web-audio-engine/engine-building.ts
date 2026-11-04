// ---------- build/web-audio-engine/engine-building: building in the engine's context ----------
// What an instrument is made with at its first note, once the audio runs:
//   - the Web Audio builder in the engine's audio context, into where it's told;
//   - the time now the context's, a clock's time put on it;
//   - the noise's buffers made with the first builder, shared by every one in that context;
//   - its own draws, where it's kept apart from the others.
import type { EngineOnceStarted } from './power.ts';
import { Buffers, WebAudioBuilder } from '../web-audio/index.ts';

// a builder in a context, into where it's told; the time now, a clock's time on it
export interface BuildingIn {
  readonly builder: WebAudioBuilder;
  readonly into: AudioNode;
  readonly now: () => number;
  readonly at: (t: number) => number;
}
// What building in a context of its own is handed: its context, where its sound goes, a clock's
// time on it, a beat's length now, the buffers, its own draws.
interface InContext {
  readonly context: BaseAudioContext;
  readonly into: AudioNode;
  readonly at: (t: number) => number;
  readonly beat: () => number;
  readonly buffers: Buffers;
  readonly draws?: (() => number) | undefined;
}

export class EngineBuilding {
  readonly #engine: EngineOnceStarted;
  readonly #beat: () => number;
  #buffers: Buffers | null = null; // made with the first builder, in the engine's context

  // engine: none until the audio starts; beat: a beat's length now, for synced rates
  constructor({ engine, beat }: { engine: EngineOnceStarted; beat: () => number }) {
    this.#engine = engine;
    this.#beat = beat;
  }
  // A builder into where it's told, its own draws where it has them.
  // Asked once the audio runs: an instrument is made at its first note.
  into(into: AudioNode, draws?: () => number): BuildingIn {
    const engine = this.#engine()!;
    const context = engine.audioContext;
    this.#buffers ??= new Buffers(context, Math.random);
    const at = (t: number): number => engine.at(t);
    return buildingIn({ context, into, at, beat: this.#beat, buffers: this.#buffers, draws });
  }
}

// Building in a context of its own, as an offline render asks.
export function buildingIn({ context, into, at, beat, buffers, draws }: InContext): BuildingIn {
  return {
    builder: new WebAudioBuilder({ context, beat, buffers, ...(draws && { draws }) }),
    into,
    now: () => context.currentTime,
    at,
  };
}
