// ---------- clock/swing: a place on the grid swung late, and back ----------
// swing bends time within each 8th, counted in 16ths: the second 16th comes late, by a third of a 16th at swing 1 (a triplet swing), and
// anything between the grid follows smoothly. With "swing on" 8ths it bends each beat instead, as jazz swings: the second 8th comes late,
// by a third of an 8th at 1, and the 16ths in between follow.

// what swing reads live: how late, and what it swings
export interface SwingSettings {
  swing: number;
  swingOn: string;
}

// where a straight place sounds, swung
export function warp(place: number, settings: SwingSettings): number {
  const late = settings.swing / 3;
  const half = swingHalf(settings);
  const pairStart = 2 * half * Math.floor(place / (2 * half));
  const into = place - pairStart;
  return pairStart + (into < half ? into * (1 + late) : half * (1 + late) + (into - half) * (1 - late));
}

// and back
export function unwarp(place: number, settings: SwingSettings): number {
  const late = settings.swing / 3;
  const half = swingHalf(settings);
  const pairStart = 2 * half * Math.floor(place / (2 * half));
  const into = place - pairStart;
  return pairStart + (into < half * (1 + late) ? into / (1 + late) : half + (into - half * (1 + late)) / (1 - late));
}

// in 16ths: half of what swings
function swingHalf(settings: SwingSettings): number {
  return settings.swingOn === '8ths' ? 2 : 1;
}
