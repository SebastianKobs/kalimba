# Kalimba 21

This project is a kalimba with 21 tongues in C major. You play it in the browser.
A practice mode drops the notes of a song onto the tongues.
The browser makes the sound live. The sound uses no recordings (samples).
The interface is in German.

**Demo:** https://sebastiankobs.github.io/kalimba/

## What it does

- **Play the kalimba.** Click a tongue, tap it, or move across the tongues.
  You can also use the keyboard. On a German keyboard, the keys Y to Minus play the low tongues. The keys A to Ä play the high tongues.
- **Practise a song.** The notes of the song fall onto the tongues. There are 3 modes:
  - *Anhören*: the kalimba plays the song for you.
  - *Mitspielen*: the kalimba keeps the time, and you play the notes.
  - *Warten*: the kalimba waits for each note that you play.
- **Add your own songs.** A kalimba tab is a text that shows the notes as numbers or letters. Copy a tab into *Liedtext bearbeiten*. Give the song a name. Click *Importieren*.
  A tab can contain chords, held notes and rests.
- **Fit a song to the tongues.** The app moves the song to a different key (transposes it). Or the app changes the tuning of the tongues to the key of the song (*Umstimmen*).
  After *Umstimmen*, the kalimba shows the name of its scale.
- **Change the sound.** Open the lid of the kalimba (*Klang*). There, you change the overtones, the brightness, the click of the thumb, the body, the shimmer, the tongues that ring along, and the room.
- **Play on a phone.** The page fits a screen of 320 px or more. This includes iPhones.

## Develop

You need Node 22 or Node 20.19 or higher. The tool [just](https://github.com/casey/just) is optional.

| Command | What it does |
|---|---|
| `npm install` | Installs the dependencies. |
| `just dev` or `npm run dev` | Starts the development server. |
| `npm test` | Runs the unit tests (Vitest). |
| `npm run test:e2e` | Runs the end-to-end tests (Playwright). Firefox makes the sound, and the tests measure it. WebKit checks the layout on a phone. |
| `npm run build` | Checks the types. Then it writes the production build into `dist/`. |

The WebKit tests need system libraries. Install them one time on each computer:

```
sudo env "PATH=$PATH" ./node_modules/.bin/playwright install-deps webkit
```

`CLAUDE.md` describes each file of the code.
The files in `logs/` record each decision and its reason, one line for each decision.

## Deploy

- **GitHub Pages:** Each push to `main` runs the unit tests. Then it publishes the demo. The file `.github/workflows/pages.yml` does this.
- **Your own server:** `just deploy` builds a small Docker image. It copies the image to the server over ssh. It starts the image there, behind Traefik. `deploy/README.md` gives the steps.

## Libraries

The folder `libs/` contains the sound and sequencing libraries of stim-garden.
stim-garden is a modular synthesizer by the same author.
`npm run update-libs` copies the libraries from one fixed commit of stim-garden. Do not change them here.

## Licence

The code has the GNU General Public License v3 (`LICENSE`).

The built-in songs are Sweden, Haggstrom, Minecraft and Wet Hands. They are kalimba arrangements of music by C418 from Minecraft.
The arrangements come from MIDI files.
This music belongs to its rights holders. The licence of this project does not apply to it.
