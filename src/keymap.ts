import { KALIMBA_21, type Tongue } from './layout';

// physical key positions (KeyboardEvent.code), so QWERTZ and QWERTY play the same
const KEYS_LOW_TO_HIGH = [
  'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash',
  'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote',
];

const byPitch = [...KALIMBA_21].sort((a, b) => a.midi - b.midi);
const tongueByKey = new Map(KEYS_LOW_TO_HIGH.map((code, i) => [code, byPitch[i]]));
const keyByTongue = new Map(KEYS_LOW_TO_HIGH.map((code, i) => [byPitch[i], code]));

export function tongueForKey(code: string): Tongue | undefined {
  return tongueByKey.get(code);
}

export function keyForTongue(tongue: Tongue): string {
  return keyByTongue.get(tongue)!;
}
