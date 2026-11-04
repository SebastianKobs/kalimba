# Design log

One entry per labelled commit, starting with its short hash: date, label, decision or change, and why.

- `1d1b3e1` 2026-11-04 DESIGN: **Layout from the hand-drawn card `kalimba.jpg` (rotated 90° clockwise): 21 tongues `D6 B5 G5 E5 C5 A4 F4 D4 B3 G3 [F3] A3 C4 E4 G4 B4 D5 F5 A5 C6 E6`, each labelled like the card with letter, octave dots and cipher digit (1 = C … 7 = B), drawn hanging from a bridge with length ∝ 1/√f:** the card is the instrument's description; a tine's frequency rises with 1/L², so the drawn lengths follow pitch like the real tongues.
- `1d1b3e1` 2026-11-04 DESIGN: **Input: pointer down plucks a tongue, dragging across tongues strums each once, multi-touch plays chords; computer keys in pitch order, F3–A4 on `Z`…`/` and B4–E6 on `A`…`'`, by `KeyboardEvent.code`; key repeat and Ctrl/Meta/Alt chords ignored:** pitch order on two rows fits 21 keys exactly (10 + 11); physical codes make QWERTZ and QWERTY play the same; browser shortcuts keep working.
