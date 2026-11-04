// ---------- util/due: things due at a time, kept in their time order; an item put in time order among others ----------
import { firstAfter } from './search.ts';

// Things due at a time, each after those at the same time, so they're taken as they came.
export class DueQueue<Item> {
  readonly #items: Item[] = [];
  readonly #timeOf: (item: Item) => number;

  constructor(timeOf: (item: Item) => number) {
    this.#timeOf = timeOf;
  }
  get items(): readonly Item[] {
    return this.#items;
  }
  add(item: Item): void {
    placeInOrder(this.#items, item, this.#timeOf);
  }
  // those whose time has come, at or before now, taken out in their order
  takeDue(now: number): Item[] {
    return this.#items.splice(0, firstAfter(this.#items, now, this.#timeOf));
  }
  // those due before a time, not at it, taken out in their order
  takeBefore(time: number): Item[] {
    const first = this.#items.findIndex((item) => this.#timeOf(item) >= time);
    return this.#items.splice(0, first === -1 ? this.#items.length : first);
  }
}

// An item put among others kept in time order, after those at its time, so those at one time
// keep the order they came in.
export function placeInOrder<Item>(items: Item[], item: Item, timeOf: (item: NoInfer<Item>) => number): void {
  items.splice(firstAfter(items, timeOf(item), timeOf), 0, item);
}
