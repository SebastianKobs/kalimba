# base/util

Small helpers every library shares: maths, searches in time, events and a bus, map and object helpers, seeded draws, data read for its shape and addresses. At the bottom of the libraries.

Depends on: nothing.

```ts
import { approach, Events, entryOf, seeded, valueBetween } from './index.ts';

approach(0, 1, 0.1, 0.1); // 1 − 1/e: one time constant of the way to 1
const random = seeded(7); // the same draws for the same seed
const events = new Events<{ beat: [number] }>();
const stop = events.on('beat', (i) => console.log(i));
events.emit('beat', 4); // each listener, in the order they came
entryOf(new Map<string, number[]>(), 'tap', () => []); // made the first time it's asked for
valueBetween([{ t: 0, v: 0 }, { t: 2, v: 4 }], 1, (p) => p.t, (p) => p.v); // 2: a line between the two
```

| Export | What it does |
|---|---|
| `clamp()`, `clamp01()`, `modulo()` | A value held between two edges, the higher winning where they cross; between 0 and 1; modulo a size, never below 0 (`maths.ts`). |
| `approach()`, `SETTLED` | A value approaching its target by a time constant, as Web Audio's `setTargetAtTime()`: each moment the same share of the way left. `SETTLED` is 5, the time constants after which it counts as there, within 1 % (`maths.ts`). |
| `stepToward()` | A value a frame's step toward its target, a straight share of the way, all of it once `elapsed` reaches `time` (`maths.ts`). |
| `easeOut()`, `smoothstep()` | 0 to 1 eased out, cubic; 0 up to the low edge, 1 from the high one, eased between, as GLSL's (`maths.ts`). |
| `wrapAngle()`, `wrapToTile()` | An angle's difference into −π to π; a place into −size/2 to size/2, a thing tiled round a view (`maths.ts`). |
| `firstAfter()`, `lastAtOrBefore()` | In a list rising by its key, found by halves: the first later than a time, its index, or the list's length past them all; the last at or before it, none before the first (`search.ts`). |
| `valueBetween()` | A value at a time between timed points, a line between each two, held before the first and after the last (`search.ts`). |
| `Seconds` | Time as the sound counts it: a clock time, or a length, in seconds (`seconds.ts`). |
| `new DueQueue(timeOf)`: `add()`, `takeDue()`, `takeBefore()`, `items` | Things due at a time, each after those at the same time. `takeDue(now)` takes those due by now, `takeBefore(time)` those before a time, in their order (`due.ts`). |
| `placeInOrder()` | An item put in time order among others, after those at its time (`due.ts`). |
| `new Events<Arguments>()`: `on()`, `emit()` | Events by name: `on(type, listener)` gives a function that stops it. Each listener is called in the order they came, and one may stop as it's called (`events.ts`). |
| `new Bus<Sent>()` | Messages as values, each to whoever listens to its type, as MIDI's messages are. Its messages are a union of each library's (`bus.ts`). |
| `entryOf()`, `toggleIn()` | A map's entry made the first time it's asked for, in a `Map` or a `WeakMap`; a key toggled in a set, or put in or taken out as asked (`objects.ts`). |
| `chainFrom()`, `keep()` | The keys a chain leads through, each item naming the next, and where it loops; an event kept in a list up to its cap, or null once it's full (`objects.ts`). |
| `updateInPlace()`, `frozen()`, `sameData()` | An object given another's values in place, all the way down, so what holds a part of it sees the change; data frozen all the way down, a write throwing; data the same as other data (`objects.ts`). |
| `fromData()`, `Shape` | Data read from a file, YAML's or JSON's, and checked for its shape: a word, a number, a switch, a choice, a list, a map, an object's fields. Every problem is said under the file's name (`from-data.ts`). |
| `seeded()`, `seedOf()` | A generator from a seed, mulberry32, the same seed the same numbers in [0, 1); a seed from a text, FNV-1a (`random.ts`). |
| `pickFrom()`, `pickWeighted()`, `slice()` | An item from a list, each as likely or as likely as its weight, none from an empty list; a slice of a record of `count` events, `[start, length]`, a random length drawn first (`random.ts`). |
| `keptDraws()`, `new Draws({ seed })`: `random()`, `play()`, `reseed()` | Draws kept as they're drawn, so a thing made again draws the same, then fresh ones. A source of draws seeded as it's made, with a seed of its own drawn from it, seeded again from the start (`random.ts`). |
| `new LiveCopies(from)`: `add()`, `has()`, `of()`, `current()`, `start()`, `set()`, `reset()`, `onSet()` | Values kept live by name, as a synth keeps its patches: each a copy of its start, set in place, each set told (`live-copies.ts`). |
| `Address`, `addressText()`, `addressOf()`, `under()`, `isUnder()` | Where something is, its names on the way down, written with slashes, `desk/channel 3/utility/level`, and back. A parent's name put in front; whether one is under another, as text (`address.ts`). |

Tests: `test/maths.test.js`, the maths; `test/search.test.js`, the searches, a value between timed points and due things; `test/events.test.js`, events and the bus; `test/objects.test.js`, the objects' helpers, a chain of keys and a list kept up to its cap; `test/random.test.js`, the seeded draws and a slice of a record; `test/live-copies.test.js`, live copies; `test/address.test.js`, addresses; `test/from-data.test.js`, data read for its shape. `test/near.js` holds `near()`, a number near another, for every library's tests.
