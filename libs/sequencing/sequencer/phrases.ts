// ---------- libs/sequencing/sequencer/phrases: phrases of events sent as each 16th comes, so a hold pauses them ----------
// A phrase kept by its places on the grid, each event sent as its 16th comes, as a performer at a
// controller plays in real time, not the whole phrase as it starts.
// A hold or Stop hands out no 16th, so a phrase waits with the music,
// and what's recorded has its events where they'd have been, in song time
import { STEP, type BeatGrid } from '../clock/index.ts';
import { DueQueue } from '../../base/util/index.ts';

// an event of a phrase: where it lies on the grid, in ticks (STEP a 16th),
// and the event as it comes due, worked out then (event())
export interface DueEvent<Event> {
  start: number;
  event: () => Event;
}
// a phrase waiting: where its events go, its region, and its events still to send, in the order they come
interface Waiting<To, Event> {
  to: To;
  region: number;
  events: DueQueue<DueEvent<Event>>;
}

// the phrases waiting (play()), each 16th's events sent as it comes (step()),
// whether a clip's still has events to send (playing()), a clip's forgotten (forget()),
// all cleared (clear())
export class Phrases<To extends { clip?: unknown }, Event> {
  readonly #region: () => number;
  readonly #send: (to: To, events: readonly Event[], region: number) => void;
  readonly #grid: Pick<BeatGrid, 'nextStepNumber'>;
  #waiting: Waiting<To, Event>[] = [];

  constructor({
    region,
    send,
    grid,
  }: {
    region: () => number;
    send: (to: To, events: readonly Event[], region: number) => void;
    grid: Pick<BeatGrid, 'nextStepNumber'>;
  }) {
    this.#region = region;
    this.#send = send;
    this.#grid = grid;
  }
  // a phrase to its clip on its track, a region of its own, its events sent as their 16ths come;
  // those on a 16th the grid has handed out already sent at once,
  // as a phrase begun between the 16ths, on the next one, within the grid's lookahead
  play(to: To, events: readonly DueEvent<Event>[]): void {
    const queue = new DueQueue<DueEvent<Event>>((due) => due.start);
    for (const due of events) {
      queue.add(due);
    }
    const phrase: Waiting<To, Event> = { to, region: this.#region(), events: queue };
    this.#sendBefore(phrase, this.#grid.nextStepNumber * STEP);
    if (phrase.events.items.length) {
      this.#waiting.push(phrase);
    }
  }
  // a 16th as it comes, the clock's: each phrase's events in it sent, in one send;
  // those of a 16th skipped as the ticks lagged left out, as the grid skips it
  step(i: number): void {
    for (const phrase of this.#waiting) {
      phrase.events.takeBefore(i * STEP); // a 16th skipped as the ticks lagged: its events left out
      this.#sendBefore(phrase, (i + 1) * STEP);
    }
    this.#waiting = this.#waiting.filter((phrase) => phrase.events.items.length);
  }
  // whether a clip's phrase still has events to send
  playing(clip: unknown): boolean {
    return this.#waiting.some((phrase) => phrase.to.clip === clip);
  }
  // a clip's phrases forgotten: nothing more sent, what was sent ringing out
  forget(clip: unknown): void {
    this.#waiting = this.#waiting.filter((phrase) => phrase.to.clip !== clip);
  }
  clear(): void {
    this.#waiting = [];
  }
  // a phrase's events before a place sent, in one send, and the rest kept
  #sendBefore(phrase: Waiting<To, Event>, before: number): void {
    const due = phrase.events.takeBefore(before);
    if (due.length) {
      this.#send(
        phrase.to,
        due.map((item) => item.event()),
        phrase.region,
      );
    }
  }
}
