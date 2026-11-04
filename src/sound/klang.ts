import { paramAt } from '../../libs/modular-audio/plan/format/index.ts';
import { cardPlanner } from '../../libs/modular-audio/plan/instrument/index.ts';
import type { Instruments } from '../../libs/modular-audio/plan/instrument/index.ts';
import type { Preset } from '../../libs/modular-audio/plan/planner/index.ts';
import { KALIMBA, KALIMBA_PATCH, TINE_CARD } from './kalimba-card';

export type MacroName =
  | 'obertoene'
  | 'ungerade'
  | 'rauheit'
  | 'helligkeit'
  | 'anschlag'
  | 'koerper'
  | 'schwebung'
  | 'resonanz'
  | 'stimmung'
  | 'nachklang';
export type KlangValues = Readonly<Record<MacroName, number>>;

export interface Macro {
  readonly name: MacroName;
  readonly label: string;
  readonly hint: string;
  /** min, max, step */
  readonly range: readonly [number, number, number];
  readonly default: number;
  /** its value as the panel shows it */
  format(value: number): string;
}

const percent = (value: number) => `${Math.round(value * 100)} %`;
// Helligkeit's lowpass, from dark to wide open, evenly by octaves; it starts at 3500 Hz
const CUTOFF = [300, 20000] as const;
const cutoffOf = (helligkeit: number) => CUTOFF[0] * (CUTOFF[1] / CUTOFF[0]) ** helligkeit;
const helligkeitOf = (cutoff: number) => Math.log(cutoff / CUTOFF[0]) / Math.log(CUTOFF[1] / CUTOFF[0]);
const HELLIGKEIT_START = Math.round(helligkeitOf(3500) * 1000) / 1000; // on the slider's 0.001 steps

/** The Klang panel's macros: a few knobs that each mean something musically, over the voice card's many. */
export const MACROS: readonly Macro[] = [
  {
    name: 'obertoene',
    label: 'Obertöne',
    hint: 'Von rein zu metallisch: die Obertöne der Zunge und ihr heller, metallischer Klang.',
    range: [0, 2, 0.01],
    default: 1,
    format: percent,
  },
  {
    name: 'ungerade',
    label: 'Ungerade Obertöne',
    hint: 'Die ungeraden Harmonischen, 3. bis 9.: ein Hauch hohler, holziger Klang.',
    range: [0, 4, 0.01],
    default: 1,
    format: percent,
  },
  {
    name: 'rauheit',
    label: 'Rauheit',
    hint: 'Der Schmutz in den hohen Obertönen: ein leises Rauschen und leicht verstimmte Teiltöne, wie bei einer echten Kalimba.',
    range: [0, 3, 0.01],
    default: 1,
    format: percent,
  },
  {
    name: 'helligkeit',
    label: 'Helligkeit',
    hint: 'Ein Filter vor dem Ausgang: von dunkel und weich bis ganz offen.',
    range: [0, 1, 0.001],
    default: HELLIGKEIT_START,
    format: (v) => `${Math.round(cutoffOf(v))} Hz`,
  },
  {
    name: 'anschlag',
    label: 'Anschlag',
    hint: 'Das Klicken des Daumens, wenn er die Zunge loslässt: von weich bis knackig.',
    range: [0, 2, 0.01],
    default: 1,
    format: percent,
  },
  {
    name: 'koerper',
    label: 'Körper',
    hint: 'Das kurze Klopfen des Holzkastens beim Anschlag.',
    range: [0, 2, 0.01],
    default: 1,
    format: percent,
  },
  {
    name: 'schwebung',
    label: 'Schwebung',
    hint: 'Ein zweiter Ton knapp über der Zunge: wie schnell und wie tief der Klang schimmert.',
    range: [0, 1, 0.01],
    default: 0.5,
    format: percent,
  },
  {
    name: 'resonanz',
    label: 'Resonanz',
    hint: 'Wie stark die anderen Zungen leise mitklingen, wenn eine angezupft wird.',
    range: [0, 3, 0.01],
    default: 1,
    format: percent,
  },
  {
    name: 'stimmung',
    label: 'Stimmung',
    hint: 'Die ganze Kalimba höher oder tiefer, in Cent: 100 Cent sind ein Halbton.',
    range: [-50, 50, 1],
    default: 0,
    format: (v) => `${v > 0 ? '+' : ''}${v} Cent`,
  },
  {
    name: 'nachklang',
    label: 'Nachklang',
    hint: 'Wie lange die Zungen nachklingen, verglichen mit einer echten Kalimba.',
    range: [0.25, 2, 0.01],
    default: 1,
    format: (v) => `${v.toFixed(2)} ×`,
  },
];

export const DEFAULT_KLANG: KlangValues = Object.fromEntries(MACROS.map((m) => [m.name, m.default])) as KlangValues;

// the voice card's values as written, which the macros scale: kalimba.yaml stays the one source
const card = cardPlanner(KALIMBA).plan(TINE_CARD);
const written = (address: string) => paramAt(card, address.split('/'))!.value as number; // a value the card has

/** The kalimba's patch with the macros applied to its voice card. */
export function presetFor(values: KlangValues): Preset {
  const scaled = (addresses: readonly string[], factor: number) =>
    Object.fromEntries(addresses.map((address) => [address, written(address) * factor]));
  return {
    ...KALIMBA.patches[KALIMBA_PATCH]!, // the file has its patch
    values: {
      ...scaled(['2nd/level', 'ping/level', 'ting/level'], values.obertoene),
      ...scaled(['3rd/level', '5th/level', '7th/level', '9th/level'], values.obertoene * values.ungerade),
      // the dirt: the grit's noise, and how sharp the upper partials are; clean and exactly harmonic at 0
      ...scaled(['grit/level'], values.obertoene * values.rauheit),
      ...scaled(['7th/tune', '9th/tune'], values.rauheit),
      ...scaled(['knock/level'], values.koerper),
      // the click louder and a little longer together, as a harder thumb
      ...scaled(['click/level', 'click env/decay'], values.anschlag),
      // the twin as written at ½: off at 0, twice as fast and deep at 1
      ...scaled(['twin/level', 'twin/tune'], values.schwebung * 2),
      'tone/cutoff': cutoffOf(values.helligkeit),
    },
  };
}

/** The kalimba's file of instruments with the macros in its patch: what the player builds. */
export function instrumentsWith(values: KlangValues): Instruments {
  return { ...KALIMBA, patches: { ...KALIMBA.patches, [KALIMBA_PATCH]: presetFor(values) } };
}

// Resonanz at 100 %: the resonance bank's output as it sounded right by ear, the neighbours about 35 dB under the
// note (the slider's 93 % on its former 30 dB curve to a gain of 100), calibrated on the render (test/e2e/sound.spec.ts)
const RESONANCE_AT_100 = 100 * 10 ** ((-0.07 * 30) / 20);

/** Resonanz: the gain of the other tongues ringing along, scaled as the other sliders scale their levels. */
export function resonanceGain(values: KlangValues): number {
  return RESONANCE_AT_100 * values.resonanz;
}

/** Stimmung: every note's pitch moved, in semitones. */
export function pitchOffset(values: KlangValues): number {
  return values.stimmung / 100;
}

/** Nachklang: the factor on how long a tine rings. */
export function ringFactor(values: KlangValues): number {
  return values.nachklang;
}

// .2: the macros' scales changed (the user's ear made 100 %), so what was stored before would apply twice
export const KLANG_STORAGE_KEY = 'kalimba.klang.2';

/** Macro values read back from storage: each within its range, its default otherwise. */
export function parseStoredKlang(raw: string | null): KlangValues {
  let stored: unknown;
  try {
    stored = raw === null ? {} : JSON.parse(raw);
  } catch {
    return DEFAULT_KLANG;
  }
  const record = typeof stored === 'object' && stored !== null ? (stored as Record<string, unknown>) : {};
  const valid = (macro: Macro, value: unknown) =>
    typeof value === 'number' && value >= macro.range[0] && value <= macro.range[1];
  return Object.fromEntries(
    MACROS.map((m) => [m.name, valid(m, record[m.name]) ? (record[m.name] as number) : m.default]),
  ) as KlangValues;
}
