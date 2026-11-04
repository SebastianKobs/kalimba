// ---------- build/web-audio/automation: a param told its automation, from a time ----------
// Each event as Web Audio schedules it, its time from t: a value as it's made, a jump, a ramp
// either way, a glide by its time constant, a cancel.
import type { Automation } from '../../../base/automation/index.ts';
import type { Automatable } from './param-units.ts';

export function automate(param: Automatable, events: readonly Automation[], t: number): void {
  for (const [kind, value, at, timeConstant] of events) {
    if (kind === 'value') {
      param.value = value;
    } else if (kind === 'set') {
      param.setValueAtTime(value, t + at);
    } else if (kind === 'exp') {
      param.exponentialRampToValueAtTime(value, t + at);
    } else if (kind === 'linear') {
      param.linearRampToValueAtTime(value, t + at);
    } else if (kind === 'target') {
      param.setTargetAtTime(value, t + at, timeConstant);
    } else if (kind === 'cancel') {
      param.cancelScheduledValues(t + value);
    }
  }
}
