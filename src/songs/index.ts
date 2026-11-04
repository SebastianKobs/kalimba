import type { PracticeSong } from '../practice/practice-view';

// public-domain tunes only; anything else is pasted in by the player

const TWINKLE = `title: Morgen kommt der Weihnachtsmann (mit Bass)
tempo: 100
// traditionell, gemeinfrei (Melodie von „Twinkle, Twinkle, Little Star“). Kalimba-Zahlen: Melodie eine Oktave höher, Bass auf den Hauptschlägen.
[1 1'] 1' [5 5'] 5' | [4 6'] 6' [1 5'] - | [4, 4'] 4' [1 3'] 3' | [5, 2'] 2' [1 1'] - |
[1 5'] 5' [4 4'] 4' | [1 3'] 3' [5, 2'] - | [1 5'] 5' [4 4'] 4' | [1 3'] 3' [5, 2'] - |
[1 1'] 1' [5 5'] 5' | [4 6'] 6' [1 5'] - | [4, 4'] 4' [1 3'] 3' | [5, 2'] 2' [1 1'] - |`;

const ODE_TO_JOY = `title: Ode an die Freude
tempo: 100
// Beethoven, 9. Sinfonie, gemeinfrei. In D-Dur notiert: die Kalimba steht in C, also wird es tiefer gelegt.
F#4 F#4 G4 A4 | A4 G4 F#4 E4 | D4 D4 E4 F#4 | F#4. E4_ E4 - |
F#4 F#4 G4 A4 | A4 G4 F#4 E4 | D4 D4 E4 F#4 | E4. D4_ D4 - |
E4 E4 F#4 D4 | E4 F#4_ G4_ F#4 D4 | E4 F#4_ G4_ F#4 E4 | D4 E4 A3 - |
F#4 F#4 G4 A4 | A4 G4 F#4 E4 | D4 D4 E4 F#4 | E4. D4_ D4 - |`;

const FRERE_JACQUES = `title: Bruder Jakob
tempo: 110
// traditionell, gemeinfrei. In F-Dur notiert, mit Bb.
F4 G4 A4 F4 | F4 G4 A4 F4 | A4 Bb4 C5 - | A4 Bb4 C5 - |
C5_ D5_ C5_ Bb4_ A4 F4 | C5_ D5_ C5_ Bb4_ A4 F4 | F4 C4 F4 - | F4 C4 F4 - |`;

export const SONGS: readonly PracticeSong[] = [
  { title: 'Morgen kommt der Weihnachtsmann', text: TWINKLE },
  { title: 'Ode an die Freude', text: ODE_TO_JOY },
  { title: 'Bruder Jakob', text: FRERE_JACQUES },
];
