# base/automation

What a param is told as it plays, and its level at a time. Its words are Web Audio's: automation as an `AudioParam` schedules it. `levelAt()` works those curves out in plain code, what another engine's automation would have to match.

Depends on: `base/util`.

```ts
import { automationOf, levelAt, Levels } from './index.ts';
levelAt([['set', 0, 0], ['linear', 1, 2]], 1);              // 0.5: halfway up the ramp
const lane = automationOf([{ value: 0, t: 0 }, { value: 1, t: 1, glide: 0.5 }]);
const levels = new Levels(lane);                           // one walk for many rising times
levels.before(1);                                          // 0: coming up to the glide
levels.at(1.5);                                            // 1 − 1/e: a time constant into it
```

| Export | What it does |
|---|---|
| `Automation` | A param's automation as Web Audio's events: `['value', v]`, `['set' \| 'linear' \| 'exp', v, at]`, `['target', v, at, tc]`, `['cancel', at]`. Times are seconds from the start of whatever plays it (`automation.ts`). |
| `eventTime()`, `restartAt()`, `shiftedBy()`, `scheduled()` | An event's time; a param restarted at a level; automation moved later; automation as Web Audio holds it once told more, a cancel dropping what was planned after it (`automation.ts`). |
| `continuedAs()`, `cutAt()`, `SMOOTHING` | Automation continued as another from a time, as a knob turned while a param plays: nothing jumps there. `cutAt()` cuts a running ramp at the level it reached; `SMOOTHING` is 0.05 s, the glide to a held value (`continued.ts`). |
| `levelAt()` | A param's level at a time as Web Audio plays it: a set at once, a ramp from where the event before left it, a target approached by its time constant (`level-at.ts`). |
| `fadedFrom()` | When a param's level falls within a floor for good, or never: an envelope's, so a voice's owner knows it has rung out (`level-at.ts`). |
| `new Levels(automation)`: `at()`, `before()` | The same at rising times, the automation walked once, as a line is drawn. `before(t)` is the level coming up to a time, a jump there not yet made (`level-at.ts`). |
| `TimedValue`, `timedValue()` | One change: a value at a time, jumping there or gliding by a time constant. MIDI's controllers, a lane's points and the desk's changes are one (`timed-value.ts`). |
| `When`, `timedAt()` | When a value lands, for a caller that knows no clock: now, from a time of its own, or gliding there. `timedAt()` makes it a `TimedValue` at the caller's now (`timed-value.ts`). |
| `eventOf()`, `automationOf()` | A change as an automation event: a jump a `set`, a glide a `target`, a glide of 0 a jump. Changes in time order become automation, the first a `set` (`timed-value.ts`). |

Tests: `test/automation.test.js`, automation moved, continued and held as Web Audio does.
