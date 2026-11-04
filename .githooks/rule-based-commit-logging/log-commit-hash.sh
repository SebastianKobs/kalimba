#!/bin/sh
# After a labelled commit, fill its short hash into the log entry it added as `pending`,
# and commit that as "Log <hash> in <log>" (no label, so it isn't logged itself). See claude-rule.md.
# Which log each label goes in is set in labels.yml, next to this file.
# .githooks/post-commit runs it. Enable that once per clone: git config core.hooksPath .githooks

unset GIT_INDEX_FILE   # a partial commit leaves this pointing at a temporary index
here=$(cd "$(dirname "$0")" && pwd)
cd "$(git rev-parse --show-toplevel)" || exit 0
gd=$(git rev-parse --git-dir)
for f in rebase-merge rebase-apply CHERRY_PICK_HEAD REVERT_HEAD MERGE_HEAD; do
  [ -e "$gd/$f" ] && exit 0   # not while git is replaying commits
done

conf=$here/labels.yml
conf=${conf#"$PWD"/}   # shown from the repo root
if [ ! -f "$conf" ]; then
  echo "post-commit: $conf is missing, so no hash was filled in." >&2
  exit 0
fi
# one "LABEL path" per line, without comments, blank lines or quotes
map=$(sed -e 's/^#.*//' -e 's/[[:space:]]#.*//' -e "s/[\"']//g" "$conf" |
  sed -n 's/^\([A-Z][A-Z0-9_]*\):[[:space:]]*\([^[:space:]][^[:space:]]*\)[[:space:]]*$/\1 \2/p')
keys=$(printf '%s\n' "$map" | cut -d' ' -f1 | paste -s -d'|' -)
[ -n "$keys" ] || exit 0

subject=$(git log -1 --format=%s)
hash=$(git rev-parse --short HEAD)
labels=$(printf '%s\n' "$subject" | grep -oE "^(($keys): )+")
if [ -z "$labels" ]; then
  first=$(printf '%s\n' "$subject" | grep -oE '^[A-Z][A-Z0-9_]*: ')
  [ -n "$first" ] && echo "post-commit: $hash starts with ${first% }, which isn't in $conf, so it wasn't logged." >&2
  exit 0
fi

# each label's log, in the order of the labels, each log once
logs=$(for l in $(printf '%s' "$labels" | tr ': ' '\n\n'); do
  printf '%s\n' "$map" | awk -v l="$l" '$1 == l { print $2 }'
done | awk '!seen[$0]++')

filled=""
for log in $logs; do
  if ! git show "HEAD:$log" 2>/dev/null | grep -q '^- `pending` '; then
    echo "post-commit: $hash has no \`pending\` entry in $log. Add one and fill in $hash by hand (see $(dirname "$conf")/claude-rule.md)." >&2
    continue
  fi
  if ! git diff --quiet HEAD -- "$log"; then
    echo "post-commit: $log has uncommitted changes, so $hash wasn't filled in. Do it by hand." >&2
    continue
  fi
  sed "s/^- \`pending\` /- \`$hash\` /" "$log" > "$log.tmp" && mv "$log.tmp" "$log"
  filled="$filled $log"
done

[ -n "$filled" ] || exit 0
listed=$(printf '%s\n' $filled | paste -s -d, - | sed 's/,/, /g')
git commit -q -m "Log $hash in $listed" -- $filled && echo "post-commit: logged $hash in $listed"
exit 0
