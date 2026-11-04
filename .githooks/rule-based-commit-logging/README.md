# Rule-based commit logging

A commit message can start with a label, for example `DESIGN:` or `TECHNICAL:`. Each commit with a label gets an entry in a log file.
The entry starts with the short hash of the commit. The label sets the log that gets the entry.
[Claude Code](https://claude.com/claude-code), the coding assistant of Anthropic, follows the rule and writes the entries. A git hook writes the hashes into the entries.

## Files

In a project, put `post-commit` into `.githooks/`. Put the other files, except `test.sh`, into `.githooks/rule-based-commit-logging/`. See [Install in a project](#install-in-a-project).

| File | What it's for |
|---|---|
| `labels.yml` | Each label and its log. A comment tells what the label is for. |
| `claude-rule.md` | The rule for Claude: suggest labels, write log entries, mark the entries `pending`. |
| `log-commit-hash.sh` | Writes the hash of a commit into its log entries. `post-commit` runs it. |
| `post-commit` | The git hook. It only runs `log-commit-hash.sh`. |
| `test.sh` | Tests the hook in temporary repositories. Projects do not need it. |

## How it works

1. Claude makes a change and suggests labels for it. You accept the labels or change them.
2. Claude adds an entry to the log of each label. A commit cannot contain its own hash. Thus, the entry contains `` `pending` `` in place of the hash:
   ```
   - `pending` TECHNICAL: **What changed and why.**
   ```
3. Claude makes the commit, for example `TECHNICAL: add a lint step`.
4. The `post-commit` hook reads the labels. It finds their logs in `labels.yml`.
5. In each log, the hook replaces `pending` with the short hash. Then it makes a commit, for example `Log 3f9a1c2 in technical-log.md`. This commit has no label. Thus, the hook does not log it.

The hook only gives warnings. It never stops a commit. It gives a warning in these conditions:

- A commit with a label has no `pending` entry.
- A label is not in `labels.yml`, for example because of a typing error.
- A log has changes that are not committed. In this condition, the hook does not change the log.

The hook does nothing during a rebase, a merge or a cherry-pick.

## Install in a project

1. **Get the files.** Clone this repository into a temporary folder. Then `git archive` writes the files into the project. The files do not include a `.git` folder, and the scripts are executable:
   ```
   PROJECT_PATH_TO_INSTALL_TO=<path to the project>
   src=$(mktemp -d)
   git clone -q --depth 1 https://atlas.ewerk.de/ewerk-ki-themen/skripte-und-tools/rule-based-commit-logging.git "$src"
   mkdir -p "$PROJECT_PATH_TO_INSTALL_TO/.githooks/rule-based-commit-logging"
   git -C "$src" archive HEAD post-commit | tar -x -C "$PROJECT_PATH_TO_INSTALL_TO/.githooks"
   git -C "$src" archive HEAD README.md claude-rule.md labels.yml log-commit-hash.sh | tar -x -C "$PROJECT_PATH_TO_INSTALL_TO/.githooks/rule-based-commit-logging"
   rm -rf "$src"
   ```
   For a different version, add `--branch <tag>` to the clone command. `git archive --remote` does not need a clone, but it does not work over HTTPS.

   Git runs a hook only if the hook is directly in the hooks folder and has the name of the hook. Thus, `post-commit` goes one level higher. If the project has a `post-commit` already, add the last line of this `post-commit` to the end of it.
2. **Set your labels and logs** in `labels.yml`. See [Change labels or logs](#change-labels-or-logs). Make each log file.
3. **Let Claude read the rule.** At the start of each session, Claude Code reads `CLAUDE.md` in the root of the repository. A line `@path` in this file adds the contents of another file. Add this line to `CLAUDE.md`:
   ```
   @.githooks/rule-based-commit-logging/claude-rule.md
   ```
   `claude-rule.md` adds `labels.yml` in the same way. Thus, Claude knows the labels.
4. **Turn on the hook:**
   ```
   git config core.hooksPath .githooks
   ```
   Git does not do this when it clones a repository. Thus, each clone must run this command one time. After this command, the hooks in `.git/hooks` do not run. Move the hooks of the project into `.githooks/`.
5. Commit `.githooks/`, `CLAUDE.md` and the logs.

To update, run the same commands again, but without `labels.yml`.

People can also follow the rule by hand. Write the entry with `pending`. Then make a commit with a label. The hook does the remaining work.

## Change labels or logs

Change `labels.yml`. Each line is `LABEL: path/to/log`. The path starts at the root of the repository:

```yaml
TECHNICAL: technical-log.md  # tooling, setup and housekeeping, and fixes to existing behaviour
```

- A commit with more than one label goes into the log of each label, one time for each log.
- **Keep the lines flat.** Do not nest them. Do not use spaces in paths. The hook reads the file with `sed`, not with a YAML parser.
- Make a log file before its first entry. An entry is a Markdown list item that starts with `` - `pending` ``.

## Test the hook

```
sh test.sh
```

The script installs the hook in temporary repositories. Then it tests these conditions:

- A commit with one label.
- A commit with labels for two logs.
- A commit without a label.
- Each warning of the hook.
- A commit of only some changes.
- A rebase.
- A missing `labels.yml`.

The script needs only `sh` and `git`. If a check fails, the script stops with an error.
