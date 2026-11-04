// ---------- build/web-audio/copies: every built copy of one template, an edit reaching each ----------
// The copies of one template, each at its own address in what's built: every chain of an
// effect, every voice of a patch. An edit made once reaches each:
//   - a value, at its address under each copy, where the copies have it;
//   - settings changed, by their addresses under each copy, in one change, so what's built is
//     built again once.
// Made through what's built, or through its owner where the owner keeps the values (a studio).
// The copies as they are when the edit is made: one added since is reached, one let go isn't.
import type { When } from '../../../base/automation/index.ts';
import { paramAt, type Plan, type ValuesByAddress } from '../../plan/format/index.ts';
import { addressOf, addressText, type Address } from '../../../base/util/index.ts';

// what an edit is made through: its plan, a value set by address, settings changed by address
export interface Editable {
  readonly plan: Plan;
  set(address: Address, value: number | string, when?: When): void;
  settings(changed: ValuesByAddress): void;
}

export class Copies {
  readonly #through: Editable;
  readonly #addresses: () => readonly Address[];

  // addresses: each copy's address now
  constructor(through: Editable, addresses: () => readonly Address[]) {
    this.#through = through;
    this.#addresses = addresses;
  }
  // A value set on every copy, at its address under each (level/gain), where the copies have it.
  set(under: Address, value: number | string, when: When = {}): void {
    for (const copy of this.#addresses()) {
      const address = [...copy, ...under];
      if (paramAt(this.#through.plan, address)) {
        this.#through.set(address, value, when);
      }
    }
  }
  // Settings changed on every copy, by their addresses under each (reverb/length), in one change.
  settings(changed: ValuesByAddress): void {
    const each = this.#addresses().flatMap((copy) =>
      Object.entries(changed).map(([text, value]) => [addressText([...copy, ...addressOf(text)]), value] as const),
    );
    this.#through.settings(Object.fromEntries(each));
  }
}
