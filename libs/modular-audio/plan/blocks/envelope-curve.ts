// ---------- plan/blocks/envelope-curve: how an envelope moves, as automation ----------
// As an ARP's, a capacitor charged and discharged, every stage an RC curve. Stage by stage, on
// numbers its caller resolved:
//   1. its stages from its gate opening: from 0, after its delay up to its amount over its attack,
//      held over its hold, down to its sustain over its decay, held until its gate closes;
//   2. its release from its gate closing: from where it is then, down to 0 over its release.
// Each stage done at its time:
//   - its attack charging toward 1.3 times its peak, cut there by a comparator at its time;
//   - its decay and its release approaching where they go, within the floor of silence of it at
//     their time, as an analog's, never set there, so one drawn again from where it is never jumps.
// A stage with no time is set at once; with no delay and no attack it starts at its top.
import { cutAt, eventTime, shiftedBy, type Automation } from '../../../base/automation/index.ts';
import { SILENCE } from '../../../base/params/index.ts';

// its stages' times, in seconds, and its sustain, a share of its top
export interface EnvelopeTimes {
  readonly delay: number;
  readonly attack: number;
  readonly hold: number;
  readonly decay: number;
  readonly sustain: number;
}

// how far past its peak the attack charges, a share of it, as the CEM3310 is documented
const OVERSHOOT = 1.3;
// time constants an attack takes to charge from 0 to its peak, toward OVERSHOOT
export const CHARGED = Math.log(OVERSHOOT / (OVERSHOOT - 1));
// time constants a decay or a release takes to come within the floor of silence of where it goes
export const DONE = Math.log(1 / SILENCE);

// Its stages from its gate opening, until its sustain; amount: its top, in its target's units.
// One that runs on (continuous) starts as its node is made, its first a value, not set at a time.
export function envelopeStages(
  { delay, attack, hold, decay, sustain }: EnvelopeTimes,
  amount: number,
  continuous: boolean,
): Automation[] {
  const rises = delay > 0 || attack > 0;
  const first = rises ? 0 : amount;
  const automation: Automation[] = [continuous ? ['value', first] : ['set', first, 0]];
  if (rises) {
    automation.push(...charged(amount, { start: delay, length: attack }));
  }
  if (decay > 0 || sustain !== 1) {
    const level = amount * sustain + 0; // + 0: an amount below 0 with no sustain, 0, not -0
    automation.push(...settled(level, { start: delay + attack + hold, length: decay }));
  }
  return automation;
}
// Its release from its gate closing: from where its stages have it then, down to 0 over its
// release; and when it has faded.
export function envelopeRelease(
  release: number,
  { from, stages }: { from: number; stages: Automation[] },
): { automation: Automation[]; faded: number } {
  return {
    automation: [cutAt(stages, from), ...settled(0, { start: from, length: release })],
    faded: from + release,
  };
}
// Its whole curve from its gate opening at a time: its stages from then; released where its
// gate has closed, from where they have it then. Times from the start, as a builder's.
export function envelopeCurve(
  times: EnvelopeTimes,
  amount: number,
  { opened, closed, release }: { opened: number; closed?: number | undefined; release: number },
): Automation[] {
  const stages = shiftedBy(envelopeStages(times, amount, false), opened);
  if (closed === undefined) {
    return stages;
  }
  const before = stages.filter((event) => eventTime(event) <= closed);
  return [...before, ...envelopeRelease(release, { from: closed, stages }).automation];
}

// an attack: charging toward OVERSHOOT times its peak from its start, cut at its peak at its end;
// with no time, at its peak at its start
function charged(peak: number, { start, length }: { start: number; length: number }): Automation[] {
  if (length === 0) {
    return [['set', peak, start]];
  }
  return [
    ['target', OVERSHOOT * peak, start, length / CHARGED],
    ['set', peak, start + length],
  ];
}
// a decay or a release: approaching its level from its start, within the floor of silence of it
// at its end; with no time, set there at its start
function settled(level: number, { start, length }: { start: number; length: number }): Automation[] {
  if (length === 0) {
    return [['set', level, start]];
  }
  return [['target', level, start, length / DONE]];
}
