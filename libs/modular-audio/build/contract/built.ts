// ---------- build/contract/built: what every builder hands back ----------
// The thing built from a plan, the desk in the room or the synth on the table, as its front panel:
// its controls and its slots by address, its parts inside, out of reach.
//   - set(): a param set by its address, now, at a time, or gliding there from now; a choice as
//     its param's choices have it;
//   - automate(): a param told its automation, its events' times from a time;
//   - preset(): a preset's values set together, at one time; a setting it changes, a rebuild;
//   - tempo(): a new beat, each synced time following it;
//   - add(), letGo(): a pool's copy added by its own address, its pool's name and its number
//     (my tap/3), its sources started at a time, now unless given, its outputs into a destination
//     of its own where one is given; let go once it has rung out, as its owner says: an
//     instrument's voice, a desk's channel;
//   - stopBy(): a copy's sources stopped by the time it's silent, as its owner works it out;
//   - rebuild(): built again from a plan, a setting or its structure changed, the old ringing out;
//   - faded(): when what a block makes has faded for good, by its address: an envelope's, so its
//     owner knows when a voice has rung out;
//   - placeholders: what it couldn't build, by address: a block's sound passed straight through,
//     a source silent; said, so it's seen, not only heard missing;
//   - dispose(): taken apart, its sound stopped.
import type { Automation, When } from '../../../base/automation/index.ts';
import type { Plan, ValuesByAddress } from '../../plan/format/index.ts';
import type { Address } from '../../../base/util/index.ts';

// what's built
export interface Built {
  set(address: Address, value: number | string, when?: When): void;
  automate(address: Address, automation: readonly Automation[], from?: number): void;
  preset(values: ValuesByAddress, settings?: ValuesByAddress, when?: When): void;
  tempo(beat: number, when?: When): void;
  // into: where the copy's own outputs go, of the builder's kind, in place of its pool's wires to the composite's outputs
  add(copy: Address, at?: number, into?: unknown): void;
  stopBy(copy: Address, at: number): void;
  letGo(copy: Address): void;
  rebuild(plan: Plan): void;
  faded(address: Address): number;
  readonly placeholders: readonly Address[];
  dispose(): void;
}
