import type { PracticeSong } from '../practice/practice-view';

// public-domain tunes only; anything else is pasted in by the player

const TWINKLE = `title: Twinkle, Twinkle, Little Star (with bass)
tempo: 100
// traditional, public domain. Kalimba numbers: melody an octave up, bass on the downbeats.
[1 1'] 1' [5 5'] 5' | [4 6'] 6' [1 5'] - | [4, 4'] 4' [1 3'] 3' | [5, 2'] 2' [1 1'] - |
[1 5'] 5' [4 4'] 4' | [1 3'] 3' [5, 2'] - | [1 5'] 5' [4 4'] 4' | [1 3'] 3' [5, 2'] - |
[1 1'] 1' [5 5'] 5' | [4 6'] 6' [1 5'] - | [4, 4'] 4' [1 3'] 3' | [5, 2'] 2' [1 1'] - |`;

const ODE_TO_JOY = `title: Ode to Joy
tempo: 100
// Beethoven, Symphony No. 9, public domain. Written in D major: the kalimba is in C, so it gets moved down.
F#4 F#4 G4 A4 | A4 G4 F#4 E4 | D4 D4 E4 F#4 | F#4. E4_ E4 - |
F#4 F#4 G4 A4 | A4 G4 F#4 E4 | D4 D4 E4 F#4 | E4. D4_ D4 - |
E4 E4 F#4 D4 | E4 F#4_ G4_ F#4 D4 | E4 F#4_ G4_ F#4 E4 | D4 E4 A3 - |
F#4 F#4 G4 A4 | A4 G4 F#4 E4 | D4 D4 E4 F#4 | E4. D4_ D4 - |`;

const FRERE_JACQUES = `title: Frère Jacques
tempo: 110
// traditional, public domain. Written in F major, with B flat.
F4 G4 A4 F4 | F4 G4 A4 F4 | A4 Bb4 C5 - | A4 Bb4 C5 - |
C5_ D5_ C5_ Bb4_ A4 F4 | C5_ D5_ C5_ Bb4_ A4 F4 | F4 C4 F4 - | F4 C4 F4 - |`;

export const SONGS: readonly PracticeSong[] = [
  { title: 'Twinkle, Twinkle, Little Star', text: TWINKLE },
  { title: 'Ode to Joy', text: ODE_TO_JOY },
  { title: 'Frère Jacques', text: FRERE_JACQUES },
];
