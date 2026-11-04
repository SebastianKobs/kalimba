# Sound log

One entry per labelled commit, starting with its short hash: date, label, decision or change, and why.

- `pending` 2026-11-04 SOUND: **Tine synthesis: sum of exponentially decaying sines: fundamental (0.7, decay 1.6 s × √(261.63 Hz / f), clamped to 0.6–3 s), 2nd harmonic (0.06, 0.4 × that decay), cantilever 2nd bending mode at 6.267× f (0.2, 60 ms); 2 ms attack ramp; modes above Nyquist dropped:** the inharmonic 6.267× mode gives the metallic "ting" of a clamped tine, low tines ring longer like real ones, and the ramp avoids a click; tests confirm the fundamental within 0.5% for F3, C4 and E6.
- `pending` 2026-11-04 SOUND: **Playback: one 7 s voice per tongue with a 0.5 s tail fade, re-plucking damps the ringing voice over 20 ms first; master gain 0.5 into a compressor (threshold -6 dB, ratio 12) as a limiter; all tines rendered on the first user gesture:** a finger on a ringing tine stops it before the new pluck; headroom and limiting keep chords from clipping; pre-rendering avoids latency on each tongue's first pluck.
