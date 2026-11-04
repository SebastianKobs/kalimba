# Rule-based commit logging

Every labelled commit gets an entry in a log, beginning with the commit's hash. This folder holds all of it, and `CLAUDE.md` imports this file.

| File | What it's for |
|---|---|
| `README.md` | For people: how it works and how to set it up |
| `claude-rule.md` | The rule: how commits are labelled and logged |
| `labels.yml` | The labels: which log each goes in, and in its comment what it's for |
| `log-commit-hash.sh` | Fills a commit's hash into its log entries. `.githooks/post-commit` runs it |

## Labels

- **When committing, suggest the labels that fit,** and let the user confirm or change them. A commit can carry several, one after another at the start: `DESIGN: TECHNICAL: a settings page and its build step`.
- The labels, which log each goes in, and what each is for:

@labels.yml

- Commits with no label (fixes to the docs' wording, hash follow-ups) aren't logged.
- **A new label, or a new log, needs a line in `labels.yml`.**

## Hard rule: log every labelled commit with its hash

- Every commit whose message starts with a label gets an entry in that label's log that begins with the commit's short hash, e.g. `` `43c6d00` ``. A commit with labels for several logs goes in each of them, once per log.
- A commit can't contain its own hash, so write the entry in the commit with `` `pending` `` in place of the hash, e.g. ``- `pending` DESIGN: **…**``. After the commit, `log-commit-hash.sh` fills in the hash and commits it as `Log <hash> in <log>`. That commit has no label, so it isn't logged itself.
  - It warns when a labelled commit has no `pending` entry in a log, or starts with a label that isn't in `labels.yml`. It skips a log that has uncommitted changes, and does nothing during a rebase, merge or cherry-pick.
- When a commit also carries an existing log entry (like a design change logged while building), mark that entry `pending` rather than adding a second one.

## Setup

Enable the hook once per clone: `git config core.hooksPath .githooks`. `.githooks/post-commit` only runs `log-commit-hash.sh`.
