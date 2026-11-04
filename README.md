# Kalimba 21

A 21-tongue kalimba in C major, playable in the browser, with a practice mode that drops a song's notes onto the tongues.
Its sound is synthesized live, no samples. The interface is in German.

**Demo:** https://sebastiankobs.github.io/kalimba/

## What it does

- **Play it** by clicking, tapping or sweeping across the tongues, or with the keyboard (Y to Minus low, A to Ä high on a German layout).
- **Practise a song**: its notes fall onto the tongues. *Anhören* plays it for you, *Mitspielen* keeps time while you play, *Warten* waits for each note.
- **Bring your own songs**: paste a kalimba tab (numbers or letters, chords, holds and rests) into *Liedtext bearbeiten*, name it, import it.
- **Fit any song**: it's transposed onto the tongues, or the kalimba is retuned to the song's key (*Umstimmen*), which names its scale.
- **Shape the sound** under the bonnet (*Klang*): overtones, brightness, the thumb's click, the body, the shimmer, the other tongues ringing along, the room.
- **On a phone too**: it fits from 320 px, iPhones included.

## Develop

Needs Node 22 (or 20.19+). [just](https://github.com/casey/just) is optional.

| Command | What it does |
|---|---|
| `npm install` | the dependencies |
| `just dev` or `npm run dev` | the dev server |
| `npm test` | the unit tests (Vitest) |
| `npm run test:e2e` | the end-to-end tests (Playwright): the sound rendered and measured in Firefox, the phone layout again in WebKit |
| `npm run build` | typecheck, then the production build into `dist/` |

The WebKit tests need its system libraries, once per machine:
`sudo env "PATH=$PATH" ./node_modules/.bin/playwright install-deps webkit`.

`CLAUDE.md` maps the code file by file; `logs/` record why things are as they are, a line per decision.

## Deploy

- **GitHub Pages**: every push to `main` runs the unit tests and publishes the demo (`.github/workflows/pages.yml`).
- **Your own server**: `just deploy` builds a small Docker image and starts it behind Traefik over ssh (`deploy/README.md`).

## Libraries

`libs/` holds the sound and sequencing libraries of stim-garden, a modular synthesizer by the same author, copied at a pinned commit by
`npm run update-libs`. They aren't edited here.

## Licence

The code is under the GNU General Public License v3 (`LICENSE`).

The built-in songs (Sweden, Haggstrom, Minecraft and Wet Hands) are kalimba arrangements of music by C418 from Minecraft, converted from
MIDI files. That music belongs to its rights holders and isn't covered by this licence.
