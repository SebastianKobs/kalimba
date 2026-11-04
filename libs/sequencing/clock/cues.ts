// ---------- clock/cues: items held until a tick brings their time, then handed on ----------
// With a lead, each is handed on that far ahead of its time, as the clock hands its 16ths out ahead.
// The ticks are the owner's: the clock's, or a frame's.
import { DueQueue } from '../../base/util/index.ts';

export class Cues<Item> {
  readonly #held: DueQueue<Item>; // in their time's order, those at one time as they came
  readonly #timeOf: (item: Item) => number;
  readonly #handOn: (item: Item) => void;
  readonly #lead: number;

  // timeOf: an item's time; handOn: where it goes once its time has come; lead: how far ahead, s
  constructor({
    timeOf,
    handOn,
    lead = 0,
  }: {
    timeOf: (item: Item) => number;
    handOn: (item: Item) => void;
    lead?: number;
  }) {
    this.#held = new DueQueue(timeOf);
    this.#timeOf = timeOf;
    this.#handOn = handOn;
    this.#lead = lead;
  }
  // an item held until a tick brings its time, even one whose time has come
  hold(item: Item): void {
    this.#held.add(item);
  }
  // an item cued now: handed on at once if its time has come, else held
  cue(item: Item, now: number): void {
    if (this.#timeOf(item) <= now + this.#lead) {
      this.#handOn(item);
      return;
    }
    this.hold(item);
  }
  // a tick: those held whose time has come by now, handed on in their order
  tick(now: number): void {
    for (const item of this.#held.takeDue(now + this.#lead)) {
      this.#handOn(item);
    }
  }
}
