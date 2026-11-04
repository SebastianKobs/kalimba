import { NoteRotation, type Message } from '../../libs/midi/protocol/index.ts';
import type { Tongue } from '../layout';
import { decayTimeFor } from './kalimba-card';

/**
 * Plucks as MIDI 2.0 messages for the kalimba's instrument: each a note on at the tongue's pitch, its decay time,
 * its note off once it has rung. A tongue plucked again while it rings has its earlier note let go first: damped.
 */
/** How the Klang panel sets every pluck: Stimmung's pitch offset in semitones, Nachklang's factor on the ring. */
export interface PluckShape {
  readonly pitchOffset: number;
  readonly ringFactor: number;
}
const AS_WRITTEN: PluckShape = { pitchOffset: 0, ringFactor: 1 };

/** How far a pluck's click may stray from its velocity, either way, in dB: a thumb never quite as hard twice. */
export const CLICK_SPREAD_DB = 2;

// a draw in [0, 1) as a factor on the click: 0.5 as the pluck, 0 and 1 the spread's ends
function clickSpread(draw: number): number {
  return 10 ** (((draw * 2 - 1) * CLICK_SPREAD_DB) / 20);
}

export class Plucks {
  readonly #rotation = new NoteRotation();
  readonly #shape: () => PluckShape;
  readonly #draw: () => number;
  // per tongue place: its sounding note's index and when it has rung
  readonly #ringing = new Map<number, { index: number; until: number }>();

  // shape: read at each pluck, so a change in the panel holds from the next; draw: in [0, 1), one per pluck for its click
  constructor(shape: () => PluckShape = () => AS_WRITTEN, draw: () => number = () => 0.5) {
    this.#shape = shape;
    this.#draw = draw;
  }

  pluck(tongue: Tongue, t: number, velocity: number): Message[] {
    return this.#note(tongue.index, tongue.midi, tongue.frequency, t, velocity);
  }

  #note(place: number, pitch: number, frequency: number, t: number, velocity: number): Message[] {
    const messages: Message[] = [];
    const earlier = this.#ringing.get(place);
    if (earlier && earlier.until > t) messages.push({ type: 'note off', index: earlier.index, t });
    const index = this.#rotation.noteOn();
    this.#rotation.noteOff(index); // its note off is sent now, with it
    const { pitchOffset, ringFactor } = this.#shape();
    const decay = decayTimeFor(frequency) * ringFactor;
    messages.push(
      { type: 'note on', index, pitch: pitch + pitchOffset, velocity, t },
      { type: 'per-note controller', index, controller: 'decay time', value: decay, t },
      { type: 'per-note controller', index, controller: 'brightness', value: velocity * clickSpread(this.#draw()), t }, // the click's strength
      { type: 'note off', index, t: t + decay },
    );
    this.#ringing.set(place, { index, until: t + decay });
    return messages;
  }
}

// a bar's first beat G6, the others B5; the accent louder
const CLICK = { accent: { pitch: 91, velocity: 1 }, plain: { pitch: 83, velocity: 0.5 } };
const CLICK_SECONDS = 0.06;

/** The metronome's click as a note for the click patch. */
export function clickMessages(accent: boolean, t: number, index: number): Message[] {
  const { pitch, velocity } = accent ? CLICK.accent : CLICK.plain;
  return [
    { type: 'note on', index, pitch, velocity, t },
    { type: 'note off', index, t: t + CLICK_SECONDS },
  ];
}
