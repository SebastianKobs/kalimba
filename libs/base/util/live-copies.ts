// ---------- util/live-copies: values kept live by name, copies of their start, each set told ----------
import { Events } from './events.ts';
import { updateInPlace } from './objects.ts';

// Values kept live by name, as a synth keeps its patches and a desk its devices:
//   - each a copy of its start, changed only through set() and reset();
//   - set in place, all the way down, so what holds one, or a part of it, hears the change;
//   - read as copies (current(), start()), the live one only for who plays it (of());
//   - each set told to whoever listens (onSet()).
export class LiveCopies<Value extends object> {
  readonly #start: Record<string, Value>;
  readonly #live: Record<string, Value>;
  readonly #events = new Events<{ set: [name: string, value: Value] }>();

  // from: the values each starts from, by name, which a reset brings back
  constructor(from: Readonly<Record<string, Value>> = {}) {
    this.#start = structuredClone(from);
    this.#live = structuredClone(from);
  }
  // one more, as it's added: its start, and its live copy
  add(name: string, start: Value): void {
    this.#start[name] = structuredClone(start);
    this.#live[name] = structuredClone(start);
  }
  has(name: string): boolean {
    return Object.hasOwn(this.#live, name);
  }
  // the live one, by its name, for who plays it; none for a name it hasn't
  of(name: string): Value | undefined {
    return this.#live[name];
  }
  current(name: string): Value | undefined {
    return structuredClone(this.#live[name]);
  }
  start(name: string): Value | undefined {
    return structuredClone(this.#start[name]);
  }
  // set in place, and told; for a name it has
  set(name: string, value: Value): void {
    const live = updateInPlace(this.#live[name]!, value); // a name it has
    this.#events.emit('set', name, live);
  }
  reset(name: string): void {
    this.set(name, this.#start[name]!); // a name it has
  }
  onSet(listener: (name: string, value: Value) => void): () => void {
    return this.#events.on('set', listener);
  }
}
