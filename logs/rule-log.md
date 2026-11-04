# Rule log

One entry per labelled commit, starting with its short hash: date, label, decision or change, and why.

- `1d1b3e1` 2026-11-04 RULE: **Rule-based commit logging installed in `.githooks/` with labels DESIGN, SOUND, RULE, TECHNICAL, each logging to `logs/`; log entries carry the date; `CLAUDE.md` imports the rule and documents commands, the card's layout and the structure:** the same commit hook as the other projects, so every labelled decision ends up in a log with its commit hash.
- `0abf2c9` 2026-11-04 RULE: **Built-in songs are the owner's choice and responsibility, copyrighted ones included; Claude still doesn't write out copyrighted melodies itself, only converts or stores what the owner supplies:** the owner replaced the public-domain songs with Sweden (C418), converted from a fan MIDI they downloaded, and takes on the copyright question for the repo and the deployed page.
