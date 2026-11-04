import type { Tongue } from '../layout';
import type { ArrangedNote, Arrangement } from '../music/arrange';

/** listen: the kalimba plays it; play-along: keeps time, scores the player; wait: stops at each step until played */
export type PracticeMode = 'listen' | 'play-along' | 'wait';

export interface PracticeOptions {
  /** beats shown before the first note, so it can be seen coming */
  readonly leadInBeats: number;
  /** how far off the beat a pluck still counts, in beats */
  readonly hitWindowBeats: number;
}

export interface Score {
  readonly hits: number;
  /** wrong plucks plus notes let pass */
  readonly misses: number;
  readonly total: number;
}

export type PluckResult = 'hit' | 'miss' | 'ignored';

const DEFAULTS: PracticeOptions = { leadInBeats: 4, hitWindowBeats: 0.3 };

/** Clock and scoring of one run through an arrangement. Time is in beats; the caller converts from seconds. */
export class PracticeSession {
  private now: number;
  private readonly options: PracticeOptions;
  private readonly pending: ArrangedNote[]; // in onset order
  private hits = 0;
  private misses = 0;

  constructor(
    readonly arrangement: Arrangement,
    readonly mode: PracticeMode,
    options: Partial<PracticeOptions> = {},
  ) {
    this.options = { ...DEFAULTS, ...options };
    this.now = -this.options.leadInBeats;
    this.pending = [...arrangement.notes].sort((a, b) => a.beat - b.beat);
  }

  get beat(): number {
    return this.now;
  }

  get score(): Score {
    return { hits: this.hits, misses: this.misses, total: this.arrangement.notes.length };
  }

  get finished(): boolean {
    if (this.mode === 'listen') return this.now >= this.arrangement.lengthBeats;
    return this.pending.length === 0;
  }

  /** Moves the clock on. Returns the notes that came due (for listen mode to play). */
  advance(beats: number): ArrangedNote[] {
    const target = this.now + beats;
    if (this.mode === 'wait') {
      const next = this.pending[0];
      this.now = next ? Math.min(target, Math.max(this.now, next.beat)) : target;
      return [];
    }
    this.now = target;
    if (this.mode === 'listen') return this.takeWhile((n) => n.beat <= this.now);
    this.misses += this.takeWhile((n) => n.beat < this.now - this.options.hitWindowBeats).length;
    return [];
  }

  pluck(tongue: Tongue): PluckResult {
    if (this.mode === 'listen') return 'ignored';
    const candidates = this.mode === 'wait' ? this.currentStep() : this.withinWindow();
    const note = candidates.find((n) => n.tongue === tongue);
    if (!note) {
      this.misses++;
      return 'miss';
    }
    this.resolve(note);
    this.hits++;
    if (this.mode === 'wait') this.now = Math.max(this.now, note.beat);
    return 'hit';
  }

  /** The tongues to play next. */
  targets(): Tongue[] {
    return this.currentStep().map((n) => n.tongue);
  }

  /** Notes not yet played or passed, for drawing. */
  upcoming(): readonly ArrangedNote[] {
    return this.pending;
  }

  private currentStep(): ArrangedNote[] {
    const first = this.pending[0];
    return first ? this.pending.filter((n) => n.beat === first.beat) : [];
  }

  private withinWindow(): ArrangedNote[] {
    return this.pending.filter((n) => Math.abs(n.beat - this.now) <= this.options.hitWindowBeats);
  }

  private takeWhile(due: (note: ArrangedNote) => boolean): ArrangedNote[] {
    const taken: ArrangedNote[] = [];
    while (this.pending.length > 0 && due(this.pending[0])) taken.push(this.pending.shift()!);
    return taken;
  }

  private resolve(note: ArrangedNote): void {
    this.pending.splice(this.pending.indexOf(note), 1);
  }
}
