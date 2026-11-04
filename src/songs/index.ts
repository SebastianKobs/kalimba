import type { PracticeSong } from '../practice/practice-view';

// the built-in songs: the owner's choice, their responsibility (CLAUDE.md, Songs); anything else is pasted in by the player

// converted from Carlo Prato's MIDI (cprato.com): at each onset the tune and its bass, each to the next onset
const SWEDEN = `title: Sweden (C418)
tempo: 88
meter: 4/4
key: D
// aus der MIDI von Carlo Prato (cprato.com): Melodie und Bass
[B2 G3] - [F#3 A4] B4
[A2 F#4] - B2 D4_ E4_
[A3 F#4] - G3 F#3_ A3_
[A2 E4] - - -
[E3 G4] D5 B4 A4
[G2 F#4] - B2 D4_ E4_
[A3 F#4] - F#3 A4_ F#4_
[A2 E4] - - -
[E3 G4] - [F#3 A4] B4
[G2 D5] - B3 [D4 F#5]_ [E4 E5]_
[A3 C#5] - G3 [F#4 D5]_ C#5_
A4 - - -
[B3 G4] - [F#4 B4] A4
[A3 F#5] - B3 D5_ E5_
[A4 F#5] - G4 F#4_ A4_
[A3 E4] - - -`;

// from a MIDI arrangement the owner supplied: its two kalimba tracks, the lead and the part under it, through the first section (24 bars of 7/4)
const HAGGSTROM = `title: Haggstrom (C418)
tempo: 112
meter: 7/4
// aus einer MIDI-Fassung: die beiden Kalimba-Spuren, erster Teil; Melodie und Bass
[G4 C5] D4 C4 [G4 C5] D4 C4 A4
[G4 C5] D4 C4 [G4 C5] D4 C4 -
[G4 C5] D4 C4 [G4 C5] D4 C4 A4
[G4 C5] D4 C4 [G4 C5] D4 C4 -
[G4 C6] [D4 B5] [C4 G5] [G4 C6] [D4 B5] [C4 E5] A4
[G4 C6] [D4 B5] [C4 G5] [G4 C6] [D4 B5] [C4 C5] -
[G4 C6] [D4 B5] [C4 G5] [G4 C6] [D4 B5] [C4 E5] [A4 D6]
[G4 E6] [D4 G6] [C4 C6] [G4 E6] [D4 G6] [C4 C6] -
[E4 B5] [D4 A5] [A3 E5] [E4 B5] [D4 A5] [A3 G#5] F#4
[E4 B5] [D4 A5] [A3 E5] [E4 D5] [D4 C#5] [A3 A4] -
[E4 B5] [D4 C#6] [A3 A5] [E4 B5] [D4 C#6] [A3 E6] F#4
[E4 G#6] [D4 A6] [A3 E6] [E4 G#6] [D4 A6] [A3 A4] -
[E4 A5] [B3 G#5] [A3 E5] [A4 A5] [B3 G#5] [A3 C#5] F#4
[E4 A5] [B3 G#5] [A3 E5] [A4 A5] [B3 G#5] [A3 A4] -
[E4 A5] [B3 B5] [A3 E5] [A4 A5] [B3 B5] [A3 C#5] [F#4 C#6]
[E4 G#6] [B3 A6] [A3 E6] [A4 G#6] [B3 A6] [A3 A4] -
[G4 C6] [D4 B5] [C4 G5] [G4 C6] [D4 B5] [C4 G5] [A4 D5]
[G4 C6] [D4 B5] [C4 G5] [G4 F5] [D4 E5] [C4 C5] -
[G4 C6] [D4 B5] [C4 G5] [G4 C6] [D4 B5] [C4 E5] [E4 D5]
[G4 C6] [D4 B5] [C4 G5] [G4 F5] [D4 E5] [C4 C5] -
[E4 C6] [D4 B5] [C4 G5] [G4 C6] [D4 B5] [C4 E5] [E4 D5]
[E4 C6] [D4 B5] [C4 G5] [G4 F5] [D4 E5] [C4 C5] -
[G4 C7] [D4 A6] [C4 G6] [G4 E6] [D4 G6] [C4 A6] [E4 G6]
[E4 A6] [D4 G6] [C4 E6] [G4 G6] [D4 D6] [C4 C6] -`;

export const SONGS: readonly PracticeSong[] = [
  { title: 'Sweden', text: SWEDEN },
  { title: 'Haggstrom', text: HAGGSTROM },
];
