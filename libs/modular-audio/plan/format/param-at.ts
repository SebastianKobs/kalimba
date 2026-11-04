// ---------- plan/format/param-at: a node, a param or a setting found by its address; settings changed by it ----------
// Walked down from the plan's top by the address's names: each a child by its name, or a
// pool's child by the pool's name, a copy under it by its number (my tap/3). Its last name a
// param or a macro, or a setting.
// None where nothing's there.
// Settings changed by address: a new plan, the old as it was. A pool's child's by the pool's
// name: every copy's, as they're built from it. A copy's, or a setting not there, refused.
import { type ValuesByAddress } from './address.ts';
import { addressOf, type Address } from '../../../base/util/index.ts';
import type { Macro } from './macro.ts';
import { isComposite, type Node } from './node.ts';
import type { Param, Setting } from './param.ts';
import type { Plan } from './plan.ts';
import { copyOf, isCopyNumber, poolNamed } from './pool.ts';

// The node an address's names lead to; the plan's top for none.
export function nodeAt(plan: Plan, names: Address): Node | undefined {
  return nodeIn(plan.node, names);
}
// A param by its address: a node's own, or a composite's macro.
export function paramAt(plan: Plan, address: Address): Param | undefined {
  return paramIn(plan.node, address);
}
// A setting by its address.
export function settingAt(plan: Plan, address: Address): Setting | undefined {
  const node = nodeAt(plan, address.slice(0, -1));
  const name = address.at(-1);
  if (!node || name === undefined) {
    return undefined;
  }
  return named(node.settings, name);
}
// A param by its address within a node: its own, or a composite's macro.
export function paramIn(node: Node, address: Address): Param | undefined {
  const found = nodeIn(node, address.slice(0, -1));
  const name = address.at(-1);
  if (!found || name === undefined) {
    return undefined;
  }
  return named(found.params, name) ?? named(found.macros ?? [], name);
}
// A composite's macro by its address within a node; none for a block's param.
export function macroIn(node: Node, address: Address): Macro | undefined {
  const found = nodeIn(node, address.slice(0, -1));
  const name = address.at(-1);
  if (!found || name === undefined || !isComposite(found)) {
    return undefined;
  }
  return named(found.macros, name);
}

// A node down its names from a node, each in turn:
//   - a child by its name;
//   - a pool's child by the pool's name; under it, a copy by its number, as it's built from the
//     pool's child, or a part of the pool's child by its name.
export function nodeIn(node: Node, [name, ...rest]: Address): Node | undefined {
  if (name === undefined) {
    return node;
  }
  if (!isComposite(node)) {
    return undefined;
  }
  const child = node.children.find((each) => each.name === name);
  if (child) {
    return nodeIn(child, rest);
  }
  const pool = poolNamed(node, name);
  if (!pool) {
    return undefined;
  }
  const [copy, ...inCopy] = rest;
  if (copy !== undefined && isCopyNumber(copy)) {
    return nodeIn(copyOf(pool, Number(copy)).node, inCopy);
  }
  return nodeIn(pool.child, rest);
}
// a param or a setting by its spec's name
function named<Item extends Param>(items: readonly Item[], name: string): Item | undefined {
  return items.find((item) => item.spec.name === name);
}
// A plan with settings changed, each at its address.
export function withSettings(plan: Plan, settings: ValuesByAddress): Plan {
  let node = plan.node;
  for (const [text, value] of Object.entries(settings)) {
    node = settingChanged(node, addressOf(text), value, text);
  }
  return { ...plan, node };
}

// A node with one setting changed, down its address: its own where the address names it,
// else a child's, or a pool's child's by the pool's name; a copy's refused, its settings its pool's.
function settingChanged(node: Node, [name, ...rest]: Address, value: number | string, whole: string): Node {
  if (name === undefined) {
    throw new Error(`${whole}: no setting`);
  }
  if (!rest.length) {
    if (!node.settings.some((setting) => setting.spec.name === name)) {
      throw new Error(`${whole}: no setting`);
    }
    const settings = node.settings.map((setting) => (setting.spec.name === name ? { ...setting, value } : setting));
    const own = { ...node, settings };
    const to = node.settings.find((setting) => setting.spec.name === name)!.to; // found above
    return to ? settingChanged(own, to, value, whole) : own; // the child's it stands for
  }
  if (!isComposite(node)) {
    throw new Error(`${whole}: no setting`);
  }
  const child = node.children.find((each) => each.name === name);
  if (child) {
    const children = node.children.map((each) => (each === child ? settingChanged(each, rest, value, whole) : each));
    return { ...node, children };
  }
  const pool = poolNamed(node, name);
  if (!pool) {
    throw new Error(`${whole}: no setting`);
  }
  if (rest[0] !== undefined && isCopyNumber(rest[0])) {
    throw new Error(`${whole}: a copy's settings are its pool's`);
  }
  const pools = node.pools.map((each) =>
    each === pool ? { ...each, child: settingChanged(each.child, rest, value, whole) } : each,
  );
  return { ...node, pools };
}
