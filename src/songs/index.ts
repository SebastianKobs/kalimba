import type { PracticeSong } from '../practice/practice-view';

// the built-in songs: the owner's choice, their responsibility (CLAUDE.md, Songs); anything else is pasted in by the player

// converted from Carlo Prato's MIDI (cprato.com): at each onset the tune, its bass and one note between, each to the next onset
const SWEDEN = `title: Sweden (C418)
tempo: 88
meter: 4/4
key: D
// aus der MIDI von Carlo Prato (cprato.com): Melodie, Bass und ein Ton dazwischen
[B2 E3 G3] - [F#3 A4] B4
[A2 D4 F#4] - B2 D4_ E4_
[A3 C#4 F#4] - G3 F#3_ A3_
[A2 C#4 E4] - - -
[E3 E4 G4] D5 B4 A4
[G2 D4 F#4] - B2 D4_ E4_
[A3 C#4 F#4] - F#3 A4_ F#4_
[A2 C#4 E4] - - -
[E3 B3 G4] - [F#3 A4] B4
[G2 F#4 D5] - B3 [D4 F#5]_ [E4 E5]_
[A3 A4 C#5] - G3 [F#4 D5]_ C#5_
A4 - - -
[B3 E4 G4] - [F#4 B4] A4
[A3 D5 F#5] - B3 D5_ E5_
[A4 C#5 F#5] - G4 F#4_ A4_
[A3 C#4 E4] - - -`;

// from a MIDI arrangement the owner supplied: its two kalimba tracks, the lead and the part under it, through the first section (24 bars of 7/4); up to three notes at once
const HAGGSTROM = `title: Haggstrom (C418)
tempo: 112
meter: 7/4
// aus einer MIDI-Fassung: die beiden Kalimba-Spuren, erster Teil; Melodie, Bass und ein Ton dazwischen
[G4 C5] D4 C4 [G4 C5] D4 C4 A4
[G4 C5] D4 C4 [G4 C5] D4 C4 -
[G4 C5] D4 C4 [G4 C5] D4 C4 A4
[G4 C5] D4 C4 [G4 C5] D4 C4 -
[G4 C5 C6] [D4 B5] [C4 G5] [G4 C5 C6] [D4 G5 B5] [C4 E5] A4
[G4 C5 C6] [D4 B5] [C4 G5] [G4 C5 C6] [D4 B5] [C4 C5] -
[G4 E5 C6] [D4 G5 B5] [C4 F#5 G5] [G4 E5 C6] [D4 G5 B5] [C4 E5] [A4 D6]
[G4 C6 E6] [D4 B5 G6] [C4 G5 C6] [G4 C6 E6] [D4 B5 G6] [C4 C5 C6] -
[E4 A4 B5] [D4 A5] [A3 E5] [E4 A4 B5] [D4 A5] [A3 G#5] F#4
[E4 A4 B5] [D4 A5] [A3 E5] [E4 A4 D5] [D4 C#5] [A3 A4] -
[E4 A5 B5] [D4 A5 C#6] [A3 E5 A5] [E4 A5 B5] [D4 A5 C#6] [A3 G#5 E6] F#4
[E4 B5 G#6] [D4 A5 A6] [A3 E5 E6] [E4 D5 G#6] [D4 C#5 A6] [A3 A4] -
[E4 A4 A5] [B3 G#5] [A3 E5] [A4 A5] [B3 E5 G#5] [A3 C#5] F#4
[E4 C#5 A5] [B3 G#5] [A3 E5] [A4 C#5 A5] [B3 G#5] [A3 A4] -
[E4 E5 A5] [B3 G#5 B5] [A3 D5 E5] [A4 A5] [B3 G#5 B5] [A3 C#5] [F#4 C#6]
[E4 A5 G#6] [B3 G#5 A6] [A3 E5 E6] [A4 C#5 G#6] [B3 G#5 A6] [A3 A4] -
[G4 E5 C6] [D4 B5] [C4 G5] [G4 E5 C6] [D4 B5] [C4 G5] [A4 D5]
[G4 E5 C6] [D4 B5] [C4 G5] [G4 E5 F5] [D4 E5] [C4 C5] -
[G4 E5 C6] [D4 B5] [C4 G5] [G4 E5 C6] [D4 B5] [C4 E5] [E4 A4 D5]
[G4 E5 C6] [D4 B5] [C4 G5] [G4 E5 F5] [D4 E5] [C4 C5] -
[E4 G4 C6] [D4 B5] [C4 G5] [G4 E5 C6] [D4 B5] [C4 E5] [E4 A4 D5]
[E4 G4 C6] [D4 B5] [C4 G5] [G4 E5 F5] [D4 E5] [C4 C5] -
[G4 G5 C7] [D4 A6] [C4 G6] [G4 C5 E6] [D4 B5 G6] [C4 A6] [E4 A4 G6]
[E4 C6 A6] [D4 B5 G6] [C4 G5 E6] [G4 C6 G6] [D4 B5 D6] [C4 C5 C6] -`;

// from a MIDI the owner supplied (MIDIfind.com): one track, up to three notes at each onset; in B major
const MINECRAFT = `title: Minecraft (C418)
tempo: 120
meter: 4/4
// aus einer MIDI-Fassung (MIDIfind.com): Melodie, Bass und ein Ton dazwischen
[F#3 A#3] - G#3 D#3 -
[A#2 F#3] - -
[F#3 A#3] - G#3 D#3 -
C#3 - -
[F#3 A#3] - G#3 D#3 -
[A#2 F#3] - -
[F#3 A#3] - G#3 D#3 -
C#3 - -
[F#3 A#3] - G#3 D#3
F#3 C#3 - A#2
[F#3 A#3] - C#3 D#3 -
[A#2 F#3] - [C#3 G#3]
[F#3 A#3] - G#3 [D#3 A#3] -
C#4 - -
[F#3 A#3] - [G#3 C#4] D#4 -
[G#3 C#4] A#3 G#3
[F#3 A#3] - G#3 [D#3 A#3] -
F#3 - -
C#3 - - D#3 -
[A#2 F#3] - -
[C#3 G#3] - A#3 F#3 -
C#3 - -
[A2 C#3] - - -
[G2 B2] - - -
[A2 D3 F#3] - - -
[A2 C#3] - - -
[A2 C#3 E3] - - -
E3 - G3 -
F#3 - E3 -
B2 - - -`;

// from a MIDI the owner supplied (MIDIfind.com): one track, its arpeggios kept, up to three notes at each onset; A major, G natural besides
const WET_HANDS = `title: Wet Hands (C418)
tempo: 72
meter: 4/4
// aus einer MIDI-Fassung (MIDIfind.com): Melodie, Bass und ein Ton dazwischen
A2_ E3_ A3_ B3_ C#4_ B3_ A3_ E3_
D3_ A3_ C#4_ E4_ C#4_ A3.
A2_ E3_ A3_ B3_ C#4_ B3_ A3_ E3_
D3_ A3_ C#4_ E4_ C#4_ A3.
[A2 G#4]_ E3_ A3_ E3_ A2_ E3_ A4_ A3_
[D3 F#4]_ A3_ C#4_ A3_ D3_ A3_ E4_ F#4_
[A2 G#4]_ E3_ A3_ E3_ A2_ E3_ B3_ C#4_
D3_ A3_ C#4_ A3_ D3_ A3_ C#4_ E4_
[G2 G4]_ D3_ G3_ F#4_ D4_ G3_ A3_ B3_
G2_ D3_ A3_ D3_ [D3 A3 B3] -
[G2 D4 G4]_ D3_ F#4_ G3_ D4_ G3_ A3_ B3_
G2_ D3_ A3_ D3_ G2_ D3_ [G2 C#4]
[A2 E3]_ A3_ B3_ C#4_ E4_ C#4_ B3_ A3_
A2_ E3_ A3_ B3_ C#4_ B3_ A3_ E3_
[B2 D4]_ F#3_ B3_ C#4_ A3_ F#3_ E4_ F#4_
B2_ D4_ F#3_ B3_ F#3_ B3_ B3_ C#4_
[G2 D4]_ D3_ C#4_ D4_ G2_ F#4_ D3_ D4_
[A2 E3 C#4] - - B3
E2_ B2_ E3_ G#3_ B3_ G#3_ E3_ B2_
E2_ B2_ E3_ G#3_ B3_ G#3_ B2
[G2 G4]_ F#4_ E4_ D4_ [D3 E4]_ D4_ E4_ F#4_
A2_ E4_ E3_ A3_ A4_ C#4_ A3_ E3_
[E2 G#4]_ [B2 E4]_ [E3 B3]_ [B2 G#3]_ [E2 E3] -
[E2 B3]_ [B2 G#3]_ [B2 E3]_ B2_ [E2 B2 E3] -
E2_ E3_ G#3_ E4_ B3_ G#3.
E2_ E3_ G#3_ E4_ B3_ G#3_`;

export const SONGS: readonly PracticeSong[] = [
  { title: 'Sweden', text: SWEDEN },
  { title: 'Haggstrom', text: HAGGSTROM },
  { title: 'Minecraft', text: MINECRAFT },
  { title: 'Wet Hands', text: WET_HANDS },
];
