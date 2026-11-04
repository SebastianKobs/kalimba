// ---------- util/bus: messages as values, each to whoever listens to its type ----------
import { Events } from './events.ts';

// A message: a value with its type, as MIDI's messages are.
interface BusMessage {
  readonly type: string;
}
// each message's listener's arguments, by its type: the message itself
type Arguments<Sent extends BusMessage> = { [Type in Sent['type']]: [message: Extract<Sent, { type: Type }>] };

// A bus of messages as values: send(message) hands the very value sent to each listener of its
// type, in the order they came, so a kind asked to be recorded could be kept as it is.
// on(type, listener) returns a function that stops listening.
// Sent: every message it carries, a union of each library's.
export class Bus<Sent extends BusMessage> {
  readonly #events = new Events<Arguments<Sent>>();

  // arrows, not methods: they're handed on alone (the views get send())
  readonly send = (message: Sent): void => {
    const type: Sent['type'] = message.type;
    this.#events.emit(type, ...([message] as Arguments<Sent>[typeof type]));
  };

  readonly on = <Type extends Sent['type']>(
    type: Type,
    listener: (message: Extract<Sent, { type: Type }>) => void,
  ): (() => void) => this.#events.on(type, listener);
}
