// ---------- plan/effects/content: the effects, each a template read from YAML ----------
// Utility, Filter, Limiter, Delay, Tape delay and Reverb, a YAML file each, its comments the reasons.
// The Tape delay built on the Delay (extends), merged by the planner.
// Each read as it loads, its shape checked, every failure said, naming its file.
// Handed to the planner with the effects' form (index.ts); an owner's or a desk's presets on them.
import { templateOf, type WrittenTemplate } from '../planner/index.ts';
import { frozen } from '../../../base/util/index.ts';
import delay from './delay.yaml';
import filter from './filter.yaml';
import limiter from './limiter.yaml';
import reverb from './reverb.yaml';
import tapeDelay from './tape-delay.yaml';
import utility from './utility.yaml';

// the effects, in the order a device view lists them
export const EFFECT_TEMPLATES: readonly WrittenTemplate[] = frozen([
  templateOf(utility, 'libs/modular-audio/plan/effects/utility.yaml'),
  templateOf(filter, 'libs/modular-audio/plan/effects/filter.yaml'),
  templateOf(limiter, 'libs/modular-audio/plan/effects/limiter.yaml'),
  templateOf(delay, 'libs/modular-audio/plan/effects/delay.yaml'),
  templateOf(tapeDelay, 'libs/modular-audio/plan/effects/tape-delay.yaml'),
  templateOf(reverb, 'libs/modular-audio/plan/effects/reverb.yaml'),
]);
