#!/bin/sh
# Copies the stim-garden libraries the kalimba builds its sound with into libs/, pinned to one commit,
# with the YAML loader they need (tools/yaml.js). Run it again to update; libs/PINNED says what's there.
# They are external, like a dependency: never edited here (a change is made in stim-garden and copied),
# their tests left out and not run here; stim-garden tests them.
#   STIM_GARDEN  a clone of stim-garden (default ~/git/stim-garden-idea)
#   COMMIT       the commit to copy (default the one pinned below)
set -eu
COMMIT="${COMMIT:-cd5a3134}"
REPO="${STIM_GARDEN:-$HOME/git/stim-garden-idea}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# the libraries the kalimba's sound reaches (worked out from their imports)
LIBS="base/automation base/params base/util midi/protocol music/music-theory
sequencing/clock sequencing/sequencer sequencing/midi-sequencer sequencing/timeline sequencing/clip-player
modular-audio/plan/format modular-audio/plan/blocks modular-audio/plan/planner modular-audio/plan/instrument modular-audio/plan/effects
modular-audio/build/contract modular-audio/build/web-audio modular-audio/build/web-audio-engine modular-audio/build/instrument"

FULL="$(git -C "$REPO" rev-parse --verify "$COMMIT^{commit}")"
for lib in $LIBS; do rm -rf "$ROOT/libs/$lib"; done
mkdir -p "$ROOT/libs"
paths=""
for lib in $LIBS; do paths="$paths mockup/src/libs/$lib"; done
# shellcheck disable=SC2086 # the paths are split on purpose
git -C "$REPO" archive "$FULL" $paths | tar -x --strip-components=3 --exclude='*/test' --exclude='*/test/*' -C "$ROOT/libs"
git -C "$REPO" archive "$FULL" tools/yaml.js | tar -x -C "$ROOT"
mkdir -p "$ROOT/types"
git -C "$REPO" archive "$FULL" mockup/types/yaml.d.ts | tar -x --strip-components=2 -C "$ROOT/types"
printf '%s\n' "$FULL" > "$ROOT/libs/PINNED"
echo "libs/ copied from stim-garden $FULL"
