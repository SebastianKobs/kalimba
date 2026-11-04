import { KALIMBA_21, type Tongue } from './layout';

// physical key positions (KeyboardEvent.code), so QWERTZ and QWERTY play the same
const KEYS_LOW_TO_HIGH = [
  'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash',
  'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote',
];

// keys follow the tongues' places in pitch order of the standard tuning, so retuning never moves a key
const byPitch = [...KALIMBA_21].sort((a, b) => a.midi - b.midi);
const indexByKey = new Map(KEYS_LOW_TO_HIGH.map((code, i) => [code, byPitch[i].index]));
const keyByIndex = new Map(KEYS_LOW_TO_HIGH.map((code, i) => [byPitch[i].index, code]));

export function tongueForKey(code: string, tongues: readonly Tongue[] = KALIMBA_21): Tongue | undefined {
  const index = indexByKey.get(code);
  return index === undefined ? undefined : tongues[index];
}

export function keyForTongue(tongue: Tongue): string {
  return keyByIndex.get(tongue.index)!;
}
