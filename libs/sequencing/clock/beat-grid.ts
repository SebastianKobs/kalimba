// ---------- clock/beat-grid: the 16ths on the clock, and the next one to schedule ----------
// Phrases are kept straight, as places on the grid, and played with the swing as
// it is now

import { COMMON_TIME, STEP, type Meter, type Ticks } from './ticks.ts';
import { SongTime, type TimeMap } from './song-time.ts';
import { unwarp, warp, type SwingSettings } from './swing.ts';

// what the grid reads live: the tempo, the swing and what it swings, the time signature
export interface GridSettings extends SwingSettings {
  bpm: number;
  meter?: Meter;
}

const ROUNDING = 1e-9; // s: a 16th's time added up step by step and worked out at once may differ by as much

// the beat grid: 16ths at the settings' tempo, swung as they are now; it runs once the audio starts (start()), standing at its first 16th
// until then, the next 16th to schedule its straight time on the clock (nextStepTime) and its number (nextStepNumber). Held, its place,
// the song position, stays while the clock's time runs on, no 16th handed out, and released it goes on from there (hold(), release(), the
// transport's stop); its holds kept, so a time's song time, the time the music played, takes them out, and the position set to a song time
// (locate()) goes on from there (song-time.ts)
export class BeatGrid {
  readonly #settings: GridSettings;
  #nextStepTime = 0;
  #nextStepNumber = 0;
  #running = false;
  #held: number | null = null; // the place it's held at, while held
  #heldAt = 0; // and the time it was held at: a time before it lies where it did
  #holdFrom: number | null = null; // the time it's to be held from, the 16ths before it handed out first
  readonly #songTime = new SongTime(); // the holds the music went through, its locates, and where it stands while held
  // song time as a time map, for what plays along a timeline
  readonly song: TimeMap = {
    toTimeline: (t) => this.songTime(t),
    fromTimeline: (song) => this.timeOfSong(song),
  };

  constructor(settings: GridSettings) {
    this.#settings = settings;
  }
  get nextStepTime(): number {
    return this.#nextStepTime;
  }
  get nextStepNumber(): number {
    return this.#nextStepNumber;
  }
  get running(): boolean {
    return this.#running;
  }
  get held(): boolean {
    return this.#held !== null;
  }
  // the time it was held at, while held; none while it runs
  get heldAt(): number | null {
    return this.#held === null ? null : this.#heldAt;
  }
  meter(): Meter {
    return this.#settings.meter ?? COMMON_TIME; // the master's time signature, [beats, unit]: a pattern's, unless it has its own
  }
  // one 16th
  stepDuration(): number {
    return 60 / this.#settings.bpm / 4;
  }
  // 16ths to a beat, the meter's unit: 4 in 4/4, 2 in 6/8
  stepsPerBeat(): number {
    return 16 / this.meter()[1];
  }
  beatDuration(): number {
    return this.stepsPerBeat() * this.stepDuration();
  }
  // 16ths to a bar: 16 in 4/4, 12 in 6/8
  stepsPerBar(): number {
    return this.meter()[0] * this.stepsPerBeat();
  }
  // so many ticks at the tempo, in seconds, and back
  secondsOf(ticks: Ticks): number {
    return (ticks / STEP) * this.stepDuration();
  }
  ticksIn(seconds: number): Ticks {
    return (seconds / this.stepDuration()) * STEP;
  }
  // where a time near now lies on the grid, in whole ticks: where it sounds swung, or straight as if nothing swung
  ticksAt(t: number, { straight = false }: { straight?: boolean } = {}): Ticks {
    const place = straight ? this.straightAt(t) : this.stepAt(t);
    return Math.round(place * STEP);
  }
  // and back: when a place in ticks sounds, swung or straight
  timeOfTicks(ticks: Ticks, { straight = false }: { straight?: boolean } = {}): number {
    if (straight) {
      return this.straightTime(ticks / STEP);
    }
    return this.timeAt(ticks / STEP);
  }
  // the next line of so many 16ths at or after a time, swung as it is now: the next beat, the next bar
  nextLine(t: number, steps: number): number {
    const lines = Math.ceil(this.stepAt(t) / steps - 1e-9); // a time on a line comes back a hair past it
    return this.timeAt(lines * steps);
  }
  // how late a 16th of the grid sounds
  swingAt(i: number): number {
    return (warp(i, this.#settings) - i) * this.stepDuration();
  }
  // where a time near now lies on the grid if nothing swung, in 16ths; while held, from the time it was held at, the place it's held at;
  // not started yet, its first 16th, where the music will start, whatever the time: not counted from the page's load
  straightAt(t: number): number {
    if (!this.#running) {
      return this.#nextStepNumber;
    }
    if (this.#held !== null && t >= this.#heldAt) {
      return this.#held;
    }
    return this.#nextStepNumber + (t - this.#nextStepTime) / this.stepDuration();
  }
  // where a time near now lies on the straight grid: the place that sounds then, swung
  stepAt(t: number): number {
    return unwarp(this.straightAt(t), this.#settings);
  }
  // when a place on the grid sounds, swung as it is now
  timeAt(place: number): number {
    return this.#nextStepTime + (warp(place, this.#settings) - this.#nextStepNumber) * this.stepDuration();
  }
  // when a place on the grid sounds if nothing swung: what was played straight
  straightTime(place: number): number {
    return this.#nextStepTime + (place - this.#nextStepNumber) * this.stepDuration();
  }
  // held at a time: its place kept while the clock's time runs on, no 16th handed out; the place the first 16th not handed out yet, those
  // before it scheduled ahead and played, so nothing jumps as it goes on; past it, where the ticks lagged, the place then
  hold(t: number): void {
    if (this.#held !== null) {
      return;
    }
    this.#held = Math.max(this.#nextStepNumber, this.straightAt(t));
    this.#heldAt = t;
    this.#songTime.stand(this.#running ? Math.max(t, this.straightTime(this.#held)) : t);
  }
  // held from a time on, the beat the arrangement plays back from: the 16ths before it handed out, none from it, its place held there,
  // so what played goes on up to it; held already, held as it is
  holdFrom(t: number): void {
    if (this.#held === null) {
      this.#holdFrom = t;
    }
  }
  // released at a time: going on from the place it was held at, its next 16th at once; one to be held from a time no longer; the hold
  // kept for song time
  release(t: number): void {
    this.#holdFrom = null;
    const held = this.#held;
    if (held === null) {
      return;
    }
    this.#held = null;
    this.#songTime.goOn(t);
    this.#nextStepTime = t + (this.#nextStepNumber - held) * this.stepDuration();
  }
  // the song position set to a song time at a clock time, the arrangement's playhead put there: running, it goes on from there; held, it
  // stands there (song-time.ts); a time before keeps the song time it had
  locate(song: number, t: number): void {
    this.#songTime.locate(song, t);
  }
  // a clock time's song time (song-time.ts)
  songTime(t: number): number {
    return this.#songTime.songTime(t);
  }
  // a clock time with the holds taken out and no locate counted (song-time.ts)
  playedTime(t: number): number {
    return this.#songTime.playedTime(t);
  }
  // and back
  timeOfSong(song: number): number {
    return this.#songTime.timeOfSong(song);
  }
  // the grid starts with the audio, its first 16th at `at`
  start(at: number): void {
    this.#songTime.clear();
    this.#nextStepTime = at;
    this.#nextStepNumber = 0;
    this.#running = true;
  }
  // the 16ths due before dueBefore, each handed to due(i, t) with its swung time; those before missedBefore skipped silently, when the
  // ticks lagged, so the grid keeps its place
  schedule(missedBefore: number, dueBefore: number, due: (i: number, t: number) => void): void {
    if (this.#held !== null) {
      return; // held: the music no longer listening
    }
    const holdFrom = this.#holdFrom === null ? null : this.#holdFrom - ROUNDING;
    if (holdFrom !== null && holdFrom <= dueBefore) {
      dueBefore = holdFrom; // the 16ths before it, then held there
    }
    while (this.#nextStepTime < missedBefore) {
      this.#nextStepTime += this.stepDuration();
      this.#nextStepNumber++;
    }
    while (this.#nextStepTime < dueBefore) {
      due(this.#nextStepNumber, this.#nextStepTime + this.swingAt(this.#nextStepNumber));
      this.#nextStepTime += this.stepDuration();
      this.#nextStepNumber++;
    }
    if (holdFrom !== null && this.#nextStepTime >= holdFrom) {
      this.#held = this.#nextStepNumber;
      this.#heldAt = this.#nextStepTime;
      this.#songTime.stand(this.#nextStepTime);
      this.#holdFrom = null;
    }
  }
}
