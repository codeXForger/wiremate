#!/usr/bin/env bash
# PostToolUse hook: format and lint the file Claude just edited.
# Exit 2 sends ESLint's report back to Claude so it fixes rule violations right away.
set -uo pipefail

file=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')
[[ -z "$file" || ! -f "$file" ]] && exit 0
[[ "$file" =~ \.(ts|tsx|mts|mjs)$ ]] || exit 0

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
case "$file" in
  "$root"/node_modules/* | "$root"/out/* | "$root"/coverage/*) exit 0 ;;
  "$root"/*) ;;
  *) exit 0 ;;
esac

cd "$root" || exit 0
npx --no-install prettier --write --log-level warn "$file" >/dev/null 2>&1

if ! report=$(npx --no-install eslint --max-warnings 0 "$file" 2>&1); then
  echo "ESLint found problems in ${file#"$root"/} (see docs/CODING_RULES.md). Fix them before moving on:" >&2
  echo "$report" >&2
  exit 2
fi
exit 0
