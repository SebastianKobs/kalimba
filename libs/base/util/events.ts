// ---------- util/events: events by name to whoever listens ----------
import { entryOf } from './objects.ts';

// a small event emitter, the same for every module that sends events (the gesture tracker, the session view's clips): on(type, listener)
// returns a function that stops listening, and emit(type, ...args) calls each listener in the order they came. Arguments: each event's
// arguments, by its type
export class Events<Arguments extends Record<string, unknown[]>> {
  readonly #listeners = new Map<keyof Arguments, ((...args: never) => void)[]>(); // any listener: what it's called with, its event's

  // arrows, not methods: they're handed on alone (export const on = events.on)
  readonly on = <Type extends keyof Arguments>(
    type: Type,
    listener: (...args: Arguments[Type]) => void,
  ): (() => void) => {
    entryOf(this.#listeners, type, () => []).push(listener);
    return () => {
      const listeners = this.#listeners.get(type)!;
      const index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    };
  };

  readonly emit = <Type extends keyof Arguments>(type: Type, ...args: Arguments[Type]): void => {
    for (const listener of (this.#listeners.get(type) || []).slice()) {
      (listener as (...args: Arguments[Type]) => void)(...args);
    }
  }; // a copy: a listener may stop listening as it's called
}
