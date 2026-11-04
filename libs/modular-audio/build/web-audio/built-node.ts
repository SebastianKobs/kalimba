// ---------- libs/modular-audio/build/web-audio/built-node: a node built from a plan, in one shape ----------
// A plan's node is one of Web Audio's (BuiltNode.of()), or one the engine builds from
// several (a limiter, blocks/limiter.ts). Either way it has:
//   - input, output: where its sound comes in and goes out; a Web Audio node is both;
//   - inputs: a way in by an input's name, where its inputs go in apart (a select's two), none
//     for one it takes in nowhere (a select's other); else its input;
//   - its params by the plan's names; one built from several has them in the plan's units
//     (param-in-units.ts), so a sound can't be cabled into them;
//   - points a meter reads inside it, by name, and readings of what it says of itself
//     (a limiter's in, after its gain, and out; how much it takes away);
//   - node: the Web Audio node it is, which a plan sets, starts and stops; none for one
//     built from several, which stops with what plays into it.
import type { Automatable } from './param-units.ts';

// one of Web Audio's nodes, its props and params read by the plan's names
export type WebAudioNode = AudioNode & Scheduled & Record<string, unknown>;
// What a source has: started and stopped at its times.
// An oscillator; a buffer, its offset and duration after its time.
interface Scheduled {
  start?: (...times: number[]) => void;
  stop?: (when?: number) => void;
}

export class BuiltNode {
  readonly input: AudioNode;
  readonly output: AudioNode;
  readonly points: Readonly<Record<string, AudioNode>>;
  readonly readings: Readonly<Record<string, () => number>>;
  readonly node: WebAudioNode | null;
  readonly kind: string; // what it is, for an error's message
  readonly #params: Readonly<Record<string, unknown>>;
  readonly #inputs: Readonly<Record<string, AudioNode | null>>;
  readonly #cables: Readonly<Record<string, readonly AudioParam[]>>;

  // one of Web Audio's: its own way in and out, its params its own
  static of(made: AudioNode): BuiltNode {
    const node = webAudioNode(made);
    return new BuiltNode({ input: node, output: node, params: node, node, kind: `a ${node.constructor.name}` });
  }
  constructor({
    input,
    output,
    params,
    inputs = {},
    cables = {},
    points = {},
    readings = {},
    node = null,
    kind = 'a node made of several',
  }: {
    input: AudioNode;
    output: AudioNode;
    params: Readonly<Record<string, unknown>>;
    inputs?: Readonly<Record<string, AudioNode | null>>;
    cables?: Readonly<Record<string, readonly AudioParam[]>>;
    points?: Record<string, AudioNode>;
    readings?: Record<string, () => number>;
    node?: WebAudioNode | null;
    kind?: string;
  }) {
    this.input = input;
    this.output = output;
    this.#params = params;
    this.#inputs = inputs;
    this.#cables = cables;
    this.points = points;
    this.readings = readings;
    this.node = node;
    this.kind = kind;
  }
  // Where an input's sound goes in, by the input's name: its own way in, or the one way in
  // it has; nowhere for an input it takes in nowhere (a select's other).
  inputsOf(name: string): readonly AudioNode[] {
    const own = this.#inputs[name];
    if (own === null) {
      return [];
    }
    return [own ?? this.input];
  }
  // A param by the plan's name.
  // None where it has no such param: a panner made a gain, where the context can't pan.
  param(name: string): Automatable | undefined {
    const param = this.#params[name];
    return isParam(param) ? param : undefined;
  }
  // a param a sound can be cabled into: one of Web Audio's own
  cableable(name: string): AudioParam {
    const param = this.param(name);
    if (!this.node || !param) {
      throw new Error(`${name}: not a param a sound can be cabled into, on ${this.kind}`);
    }
    return param as AudioParam; // a Web Audio node's: its own
  }
  // The Web Audio params a sound cabled into a param goes into: those it names for the param,
  // several where one param moves several (a filter's two stages' cutoffs); else its own.
  cablesOf(name: string): readonly AudioParam[] {
    return this.#cables[name] ?? [this.cableable(name)];
  }
  // stopped at a time, or now: a source, one of Web Audio's
  stop(...at: [] | [number]): void {
    if (!this.node?.stop) {
      throw new Error(`${this.kind} stops with what plays into it`);
    }
    this.node.stop(...at);
  }
}
// A param read by name: one that can be automated.
// A Web Audio AudioParam, a stand-in's, or one in the plan's units.
function isParam(value: unknown): value is Automatable {
  return typeof value === 'object' && value !== null && 'setTargetAtTime' in value;
}
// one of Web Audio's nodes, its props and params read by the plan's names
export function webAudioNode(made: AudioNode): WebAudioNode {
  return made as WebAudioNode;
}
