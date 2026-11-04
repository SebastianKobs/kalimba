// ---------- util/search: in a list rising by its key, where a time falls, by halves; a value at a time between timed points ----------

// the first later than t: its index, past them all their length
// By halves: each look halves what's left to look in, so a long list is quick.
export function firstAfter<Item>(items: readonly Item[], t: number, keyOf: (item: NoInfer<Item>) => number): number {
  let low = 0;
  let high = items.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (keyOf(items[middle]!) > t) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }
  return low;
}
// the last at or before t; none before the first
export function lastAtOrBefore<Item>(
  items: readonly Item[],
  t: number,
  keyOf: (item: NoInfer<Item>) => number,
): Item | undefined {
  return items[firstAfter(items, t, keyOf) - 1];
}
// a value at a time between timed points, a line between each two, held before the first and after the last;
// walked from the first, so their times needn't rise strictly; a step in time counted at least 1 ms
export function valueBetween<Point>(
  points: readonly Point[],
  time: number,
  timeOf: (point: Point) => number,
  valueOf: (point: Point) => number,
): number {
  const first = points[0]!;
  if (time <= timeOf(first)) {
    return valueOf(first);
  }
  const last = points[points.length - 1]!;
  if (time >= timeOf(last)) {
    return valueOf(last);
  }
  let segment = 0;
  while (timeOf(points[segment + 1]!) < time) {
    segment++;
  }
  const from = points[segment]!;
  const to = points[segment + 1]!;
  return (
    valueOf(from) + ((valueOf(to) - valueOf(from)) * (time - timeOf(from))) / Math.max(1e-3, timeOf(to) - timeOf(from))
  );
}
