// ---------- automation/automation: what a param is told as it plays, as Web Audio's events ----------
// Times are seconds from the start of whatever plays it.

// a param's automation, as Web Audio's:
//   - ['value', value]: as the node is made, before anything;
//   - ['set', value, at]: a jump there;
//   - ['linear' | 'exp', value, at]: a ramp, ending there at its time;
//   - ['target', value, at, tc]: approaching it from its time, by a time constant;
//   - ['cancel', at]: what was planned from then on gone.
export type Automation =
  | [kind: 'value', value: number]
  | [kind: 'set' | 'exp' | 'linear', value: number, at: number]
  | [kind: 'target', value: number, at: number, timeConstant: number]
  | [kind: 'cancel', at: number];

// When an event is:
//   - a value: as the node is made, before anything;
//   - a cancel, and the rest: at its time.
export function eventTime(event: Automation): number {
  if (event[0] === 'value') {
    return -Infinity;
  }
  if (event[0] === 'cancel') {
    return event[1];
  }
  return event[2];
}
// automation later by a time: each event but a value as the node is made, a cancel too
export function shiftedBy(automation: readonly Automation[], seconds: number): Automation[] {
  return automation.map((event): Automation => {
    if (event[0] === 'value') {
      return event;
    }
    if (event[0] === 'cancel') {
      return ['cancel', event[1] + seconds];
    }
    const [kind, value, at, ...rest] = event;
    return [kind, value, at + seconds, ...rest] as Automation;
  });
}
// Automation as Web Audio holds it, told more events:
//   - a cancel dropping what was planned from its time, as cancelScheduledValues() does;
//   - the rest in time order, one told later at the same time after.
export function scheduled(automation: readonly Automation[], told: readonly Automation[]): Automation[] {
  let events = [...automation];
  for (const event of told) {
    if (event[0] === 'cancel') {
      events = events.filter((kept) => eventTime(kept) < event[1]);
    } else {
      events = [...events, event].sort((one, other) => eventTime(one) - eventTime(other) || 0); // stable
    }
  }
  return events;
}
// a param restarted at a time: what was planned from then cancelled, set there to a level
export function restartAt(level: number, at: number): Automation[] {
  return [
    ['cancel', at],
    ['set', level, at],
  ];
}
