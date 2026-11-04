// ---------- libs/base/params/strip: a channel strip's own params, as a plugin declares them ----------
// Each with its name, its range and its taper.
// So a knob, a lane and a controller's CC each turn a position into a value the same way.
// A gain is a share, shown in dB, its range in dB.
//   - volume, and each send: by the fader law, unity two thirds up, +6 dB at the top,
//     as Ableton's faders and sends;
//   - pan: left -1 to right 1, centred at 0, in a line;
//   - mute and solo: switches, off 0 or on 1.
// Each starts as a strip does: at unity, centred, unmuted, unsoloed, its sends at 0.
import { frozen } from '../util/index.ts';
import { FADER_GAIN, PAN, SWITCH } from './standard-specs.ts';
import type { ParamSpec } from './spec.ts';

// a channel's own params, by name, as a strip's
export const STRIP_PARAMS = frozen({
  volume: { ...FADER_GAIN, name: 'volume', default: 1 },
  pan: { ...PAN, default: 0 },
  mute: { ...SWITCH, name: 'mute', default: 0 },
  solo: { ...SWITCH, name: 'solo', default: 0 },
} as const) satisfies Readonly<Record<string, ParamSpec>>;
// a send to a return, each by the return's name
export const SEND_PARAM = frozen({ ...FADER_GAIN, name: 'send', default: 0 } as const) satisfies ParamSpec;
