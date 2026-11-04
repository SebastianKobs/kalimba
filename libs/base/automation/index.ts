// ---------- automation: what a param is told as it plays, and its level at a time ----------
// Its parts:
//   - automation.ts: a param's automation as Web Audio's events, an event's time, a param restarted;
//   - level-at.ts: a param's level at a time as Web Audio plays it, alone or at rising times;
//   - timed-value.ts: a value at a time, when a value lands, and changes as automation;
//   - continued.ts: automation continued as another from a time, from where it plays.
export { eventTime, restartAt, scheduled, shiftedBy, type Automation } from './automation.ts';
export { SMOOTHING, continuedAs, cutAt } from './continued.ts';
export { Levels, fadedFrom, levelAt } from './level-at.ts';
export { automationOf, eventOf, timedAt, timedValue, type TimedValue, type When } from './timed-value.ts';
