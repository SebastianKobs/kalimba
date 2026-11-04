// ---------- util/objects: a key toggled, a map's entry made when asked, a chain followed through a map, a list kept up to a cap, an object updated, frozen or compared ----------

// a map as entryOf() asks it: a Map, or a WeakMap
interface Keyed<Key, Value> {
  has(key: Key): boolean;
  get(key: Key): Value | undefined;
  set(key: Key, value: Value): unknown;
}

// a key toggled in a set, or put in (on) or taken out (!on) as asked
export function toggleIn<Key>(set: Set<Key>, key: Key, on = !set.has(key)): void {
  if (on) {
    set.add(key);
  } else {
    set.delete(key);
  }
}
// a map's entry for a key, made by make() the first time it's asked for
export function entryOf<Key, Value>(map: Keyed<Key, Value>, key: Key, make: () => Value): Value {
  if (!map.has(key)) {
    map.set(key, make());
  }
  return map.get(key)!; // made just above, if it wasn't there
}
// The keys a chain leads through, from the first, each item naming the next (next()):
//   - keys: in order, until one with no next or one not in the map, which is the last;
//   - again: the key met a second time, where it loops; undefined where it doesn't.
export function chainFrom<Item>(
  first: string | undefined,
  byKey: ReadonlyMap<string, Item>,
  next: (item: Item) => string | undefined,
): { keys: string[]; again: string | undefined } {
  const keys: string[] = [];
  let key = first;
  while (key !== undefined) {
    if (keys.includes(key)) {
      return { keys, again: key };
    }
    keys.push(key);
    const item = byKey.get(key);
    key = item === undefined ? undefined : next(item);
  }
  return { keys, again: undefined };
}
// target given from's values in place, all the way down: each object or array in it that stays one is kept, so whatever holds a part of it
// sees the change (a chain planned again from the module it holds); nothing is shared with from. Returns target
export function updateInPlace<T extends object>(target: T, from: T): T {
  const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object';
  if (Array.isArray(target)) {
    target.length = (from as unknown[]).length; // the same shape, as T says
  } else {
    for (const k of Object.keys(target)) {
      if (!Object.hasOwn(from, k)) {
        delete (target as Record<string, unknown>)[k];
      }
    }
  }
  for (const [k, v] of Object.entries(from)) {
    const was = (target as Record<string, unknown>)[k];
    (target as Record<string, unknown>)[k] =
      isObject(v) && isObject(was) && Array.isArray(v) === Array.isArray(was) ?
        updateInPlace(was, v)
      : structuredClone(v);
  }
  return target;
}
// data frozen all the way down, so a write throws (every module is strict); a module's namespace can't be frozen, and needn't be: nobody
// can write its exports. Returns data
export function frozen<T extends object>(data: T): T {
  for (const v of Object.values(data)) {
    if (v !== null && typeof v === 'object' && !Object.isFrozen(v)) {
      frozen(v);
    }
  }
  return (data as { [Symbol.toStringTag]?: unknown })[Symbol.toStringTag] === 'Module' ? data : Object.freeze(data);
}
// Data the same as other data, as plain data compares: a number, a string or a null by value, an
// array item by item in order, an object key by key in any order.
export function sameData(one: unknown, other: unknown): boolean {
  if (one === null || other === null || typeof one !== 'object' || typeof other !== 'object') {
    return one === other;
  }
  if (Array.isArray(one) !== Array.isArray(other)) {
    return false;
  }
  const keys = Object.keys(one);
  if (keys.length !== Object.keys(other).length) {
    return false;
  }
  const record = (data: object): Record<string, unknown> => data as Record<string, unknown>;
  return keys.every((key) => Object.hasOwn(other, key) && sameData(record(one)[key], record(other)[key]));
}
// keeps an event in a record, up to its cap; the event, or null once it's full
export function keep<Item>(record: Item[], ev: Item, cap = Infinity): Item | null {
  if (record.length >= cap) {
    return null;
  }
  record.push(ev);
  return ev;
}
