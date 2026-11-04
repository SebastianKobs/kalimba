# Rule-based commit logging

Commits whose message starts with a label, such as `DESIGN:` or `TECHNICAL:`, get an entry in a log file. The entry starts with the commit's short hash. The label decides which log it goes in. The rule is written for [Claude Code](https://claude.com/claude-code), Anthropic's coding assistant, which writes the entries. A git hook fills in the hashes.

## Files

In a project, `post-commit` goes in `.githooks/`, and the rest, apart from `test.sh`, in `.githooks/rule-based-commit-logging/`. See [Install in a project](#install-in-a-project).

| File | What it's for |
|---|---|
| `labels.yml` | Each label and its log, with a comment saying what the label is for |
| `claude-rule.md` | The rule Claude follows: suggest labels, write log entries, mark them `pending` |
| `log-commit-hash.sh` | Fills a commit's hash into its log entries. `post-commit` runs it |
| `post-commit` | The git hook. It only runs `log-commit-hash.sh` |
| `test.sh` | Tests the hook in throwaway repos. Projects don't need it |

## How it works

1. Claude makes a change and suggests labels for it. You confirm or change them.
2. Claude adds an entry to each log those labels go in, with `` `pending` `` in place of the hash, since a commit can't contain its own hash. Then it commits, for example `TECHNICAL: add a lint step`:
   ```
   - `pending` TECHNICAL: **What changed and why.**
   ```
3. The `post-commit` hook reads the labels and looks up their logs in `labels.yml`. Each log's `pending` becomes the short hash, and the hook commits that as, for example, `Log 3f9a1c2 in technical-log.md`. That commit has no label, so it isn't logged itself.

The hook only warns, and never blocks a commit. It warns when:
- a labelled commit has no `pending` entry;
- a label isn't in `labels.yml`, such as a typo;
- a log has uncommitted changes, which it then leaves alone.

It does nothing during a rebase, merge or cherry-pick.

## Install in a project

1. **Check out the files:** clone this repo into a temporary folder, and `git archive` writes the files from there into the project, without a `.git` folder and with the scripts executable:
   ```
   PROJECT_PATH_TO_INSTALL_TO=<path to the project>
   src=$(mktemp -d)
   git clone -q --depth 1 https://atlas.ewerk.de/ewerk-ki-themen/skripte-und-tools/rule-based-commit-logging.git "$src"
   mkdir -p "$PROJECT_PATH_TO_INSTALL_TO/.githooks/rule-based-commit-logging"
   git -C "$src" archive HEAD post-commit | tar -x -C "$PROJECT_PATH_TO_INSTALL_TO/.githooks"
   git -C "$src" archive HEAD README.md claude-rule.md labels.yml log-commit-hash.sh | tar -x -C "$PROJECT_PATH_TO_INSTALL_TO/.githooks/rule-based-commit-logging"
   rm -rf "$src"
   ```
   For another version, add `--branch <tag>` to the clone. `git archive --remote` would save the clone, but it doesn't work over HTTPS.

   Git only runs hooks that sit right in the hooks folder, named after the hook, so `post-commit` goes one level up. If the project already has a `post-commit`, add the last line of this one to the end of it.
2. **Set your labels and logs** in `labels.yml` (see below), and create each log.
3. **Let Claude read the rule:** Claude Code reads `CLAUDE.md` in the repo root at the start of every session, and `@path` lines in it pull in other files. Add this line to it:
   ```
   @.githooks/rule-based-commit-logging/claude-rule.md
   ```
   `claude-rule.md` in turn pulls in `labels.yml`, so Claude knows the labels.
4. **Enable the hook:**
   ```
   git config core.hooksPath .githooks
   ```
   Git doesn't do this when cloning, so every clone has to run it once. Hooks in `.git/hooks` stop running, so move any the project uses into `.githooks/`.
5. Commit `.githooks/`, `CLAUDE.md` and the logs.

To update, run the same lines again, without `labels.yml`.

People can follow the same rule by hand: write the entry with `pending`, commit with a label, and the hook does the rest.

## Changing labels or logs

Edit `labels.yml`. Each line is `LABEL: path/to/log`, with the path from the repo root:

```yaml
TECHNICAL: technical-log.md  # tooling, setup and housekeeping, and fixes to existing behaviour
```

- A commit with several labels goes in each of their logs, once per log.
- **Keep the lines flat:** no nesting, and no spaces in paths. The hook reads the file with `sed`, not a YAML parser.
- A log must exist before its first entry. Entries are Markdown list items that start with `` - `pending` ``.

## Testing

```
sh test.sh
```

It installs the hook in throwaway repos and tries it: a commit with one label, with labels for two logs, and with none; each of the warnings above; a partial commit; a rebase; and a missing `labels.yml`. It needs only `sh` and `git`, and exits with an error if a check fails.
