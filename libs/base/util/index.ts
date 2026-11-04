// ---------- util: small helpers shared by every package ----------
// Its parts:
//   - maths (maths.ts);
//   - time as the sound counts it, a clock time or a length (seconds.ts);
//   - where a time falls in a list rising by its key (search.ts), and things due at a time, an item put in time order among others (due.ts);
//   - events (events.ts), and messages as values on a bus (bus.ts);
//   - a set's key toggled, a map's entry made when first asked for, a chain of keys followed through a map, a list kept up to a cap, an object
//     updated in place, data compared (objects.ts);
//   - a seeded generator, a seed from a text, an item picked from a list or by its weight, draws kept to draw again, a seeded source of draws, a slice of a record
//     (random.ts);
//   - values kept live by name, copies of their start, each set told (live-copies.ts);
//   - an address, a path of names, and as text (address.ts).
export {
  approach,
  clamp,
  clamp01,
  modulo,
  SETTLED,
  stepToward,
  wrapAngle,
  easeOut,
  smoothstep,
  wrapToTile,
} from './maths.ts';
export { type Seconds } from './seconds.ts';
export { firstAfter, lastAtOrBefore, valueBetween } from './search.ts';
export { DueQueue, placeInOrder } from './due.ts';
export { Events } from './events.ts';
export { Bus } from './bus.ts';
export { chainFrom, entryOf, frozen, keep, sameData, toggleIn, updateInPlace } from './objects.ts';
export { fromData, type Shape } from './from-data.ts';
export { Draws, keptDraws, pickFrom, pickWeighted, seeded, seedOf, slice } from './random.ts';
export { LiveCopies } from './live-copies.ts';
export { addressOf, addressText, isUnder, under, type Address } from './address.ts';
