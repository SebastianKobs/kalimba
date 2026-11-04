// ---------- plan/instrument/preset: a preset changed, and edited as a message asks ----------
// A patch is a preset on an architecture: its values and settings by address (the planner's
// Preset). Changed on a playing instrument:
//   - each value that differs set by its address, glided there;
//   - each setting that differs, what's built built again with it.
// A value or a setting a preset lets go of goes back to its architecture's start.
// Edited as messages on a bus ask (PresetMessage): a value or a setting set, or the patch
// reset to where it started; not recorded unless a kind asks to be.
import { paramAt, settingAt, type Plan, type ValuesByAddress } from '../format/index.ts';
import { addressOf, addressText, type Address } from '../../../base/util/index.ts';
import type { Preset } from '../planner/index.ts';

// what a preset's change sets: its values and its settings, by address
export interface Changes {
  readonly values: ValuesByAddress;
  readonly settings: ValuesByAddress;
}
// What's asked of a bank's patch, by its name:
//   - preset edited: a value or a setting set by its address, as a device's knob sets it;
//   - preset reset: back to where it started.
export type PresetMessage =
  | {
      readonly type: 'preset edited';
      readonly patch: string;
      readonly of: 'values' | 'settings';
      readonly address: Address;
      readonly value: number | string;
    }
  | { readonly type: 'preset reset'; readonly patch: string };

// A preset's change, from one to another on the same architecture.
// architecture: the architecture planned with no preset, its own starting values.
export function changesFrom(before: Preset, after: Preset, architecture: Plan): Changes {
  if (after.kind !== before.kind) {
    throw new Error(`another architecture, ${after.kind} for ${before.kind}: another instrument`);
  }
  return {
    values: differing(before.values, after.values, (address) => paramAt(architecture, address)?.value),
    settings: differing(before.settings, after.settings, (address) => settingAt(architecture, address)?.value),
  };
}

// each value by address that differs after, one let go its start's
function differing(
  before: ValuesByAddress = {},
  after: ValuesByAddress = {},
  startOf: (address: Address) => number | string | undefined,
): Record<string, number | string> {
  const changed: Record<string, number | string> = {};
  for (const text of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const start = startOf(addressOf(text));
    const now = after[text] ?? start;
    if (now !== undefined && now !== (before[text] ?? start)) {
      changed[text] = now;
    }
  }
  return changed;
}

// A preset edited as its message asks: the value or the setting at its address, the rest as it
// was; a new preset, the one handed in left alone.
export function edited(
  preset: Preset,
  { of, address, value }: Extract<PresetMessage, { type: 'preset edited' }>,
): Preset {
  return { ...preset, [of]: { ...preset[of], [addressText(address)]: value } };
}
