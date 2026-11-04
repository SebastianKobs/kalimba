// ---------- build/web-audio/blocks/envelope: an envelope in Web Audio ----------
// A constant source, its level following the envelope's curve from its gate, an ARP's. Wired into
// the params it moves, its level adds to theirs, as CV into a VCA's.
//   1. Its gate opened at a time: its curve drawn from 0 there.
//   2. Closed, a gate's: its release from where it is then; sooner than it was told, from then.
//      A trigger's runs on.
//   3. A stage, its sustain or its amount changed as it sounds: its curve drawn again from
//      where it is then, a held level glided to; before its gate opens, kept for it.
import { continuedAs, fadedFrom, scheduled, type Automation } from '../../../../base/automation/index.ts';
import { SILENCE } from '../../../../base/params/index.ts';
import { envelopeCurve } from '../../../plan/blocks/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { automate } from '../automation.ts';
import { BuiltNode } from '../built-node.ts';
import { settingOf, valueOf, type Making } from '../making.ts';
import { toldParam } from '../param-units.ts';

// what its curve is drawn from: each stage's time, its sustain, its release and its amount
type Held = Record<(typeof STAGES)[number], number>;

const STAGES = ['delay', 'attack', 'hold', 'decay', 'sustain', 'release', 'amount'] as const;

export function envelope(node: Node, making: Making): BuiltNode {
  const made = making.kept(making.context.createConstantSource());
  made.offset.value = 0;
  const held = Object.fromEntries(STAGES.map((name) => [name, Number(valueOf(node, name))])) as Held;
  const curve = new EnvelopeCurveAsBuilt(made.offset, {
    held,
    trigger: settingOf(node, 'mode') === 'trigger',
    now: () => making.context.currentTime,
  });
  making.started(made);
  const params = Object.fromEntries(['gate', ...STAGES].map((name) => [name, curve.param(name)]));
  return new BuiltNode({
    input: made,
    output: made,
    params,
    readings: { faded: () => curve.faded() },
    kind: 'an envelope',
  });
}

// An envelope's curve as its level is told it: drawn from its gate, drawn again as it changes.
// What it has drawn kept as Web Audio holds it, to know where it is.
class EnvelopeCurveAsBuilt {
  readonly #level: AudioParam;
  readonly #held: Held;
  readonly #trigger: boolean;
  readonly #now: () => number;
  #gate = 0;
  #opened: number | undefined;
  #closed: number | undefined;
  #drawn: Automation[] = [];

  constructor(level: AudioParam, { held, trigger, now }: { held: Held; trigger: boolean; now: () => number }) {
    this.#level = level;
    this.#held = held;
    this.#trigger = trigger;
    this.#now = now;
  }
  // When it has faded for good, within the floor of silence of its amount, as each stage is done
  // at its time: from the start before its gate opens; never while it holds a level.
  faded(): number {
    if (this.#opened === undefined) {
      return -Infinity;
    }
    return fadedFrom(this.#drawn, SILENCE * Math.abs(this.#held.amount));
  }
  // its gate, or a stage, its sustain, its release or its amount, as a param is automated
  param(name: string): ReturnType<typeof toldParam> {
    if (name === 'gate') {
      return toldParam(
        () => this.#gate,
        (value, at) => this.#gated(value, at ?? this.#now()),
      );
    }
    const stage = name as keyof Held; // one of STAGES
    return toldParam(
      () => this.#held[stage],
      (value, at) => this.#changed(stage, value, at ?? this.#now()),
    );
  }

  // its gate opened or closed at a time
  #gated(value: number, at: number): void {
    this.#gate = value;
    if (value >= 0.5) {
      this.#opened = at;
      this.#closed = undefined;
      this.#draw([['cancel', at], ...this.#wanted()]);
      return;
    }
    if (this.#trigger || this.#opened === undefined || (this.#closed !== undefined && this.#closed <= at)) {
      return;
    }
    this.#closed = at;
    this.#draw(continuedAs(this.#drawn, this.#wanted(), at));
  }
  // a stage changed at a time: as it sounds, its curve drawn again from where it is then
  #changed(stage: keyof Held, value: number, at: number): void {
    this.#held[stage] = value;
    if (this.#opened === undefined) {
      return;
    }
    this.#draw(continuedAs(this.#drawn, this.#wanted(), at));
  }
  // its curve as its stages have it now, from its gate opening, released where it has closed
  #wanted(): Automation[] {
    const { release, amount, ...times } = this.#held;
    return envelopeCurve(times, amount, {
      opened: this.#opened!, // drawn only once its gate has opened
      closed: this.#closed,
      release,
    });
  }
  // events told its level, kept as Web Audio holds them
  #draw(events: Automation[]): void {
    this.#drawn = scheduled(this.#drawn, events);
    automate(this.#level, events, 0);
  }
}
