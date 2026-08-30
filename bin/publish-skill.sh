#!/usr/bin/env bash
# Publish SKILL.md to ClawHub as the @oyagev/mailgi skill.
#
# ClawHub wants a *folder* whose name matches the skill's `name:` frontmatter.
# We can't just point it at the repo root: SKILL.md lives there because it is a
# live product surface served at https://www.mailgi.xyz/SKILL.md, and moving it
# would break every agent that fetches that URL (see website-brief 2.2).
#
# So the folder is assembled here at publish time instead of being committed.
# There is exactly one SKILL.md in git — the canonical one at the repo root —
# and nothing to drift out of sync.
#
# Usage:
#   bin/publish-skill.sh --dry-run     # stage and preview, publish nothing
#   bin/publish-skill.sh --changelog "what changed"   # publish
#
# Any extra flags are passed straight through to `clawhub skill publish`.
#
# First time on a new machine:
#   npm i -g clawhub && clawhub login

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAGE="$ROOT/.skill-build"
SLUG="mailgi"

cd "$ROOT"

if [ ! -f SKILL.md ]; then
  echo "error: SKILL.md not found at repo root" >&2
  exit 1
fi

# `name:` in the frontmatter has to match the folder name, and `version:` is
# what ClawHub publishes as. Read both rather than hardcoding, so the canonical
# file stays the single source of truth.
NAME=$(sed -n 's/^name:[[:space:]]*//p' SKILL.md | head -1)
VERSION=$(sed -n 's/^version:[[:space:]]*//p' SKILL.md | head -1)

if [ -z "$NAME" ] || [ -z "$VERSION" ]; then
  echo "error: SKILL.md is missing 'name:' or 'version:' in its YAML frontmatter." >&2
  echo "       ClawHub requires both. See docs.openclaw.ai/clawhub/skill-format" >&2
  exit 1
fi

if ! printf '%s' "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "error: version '$VERSION' is not semver (x.y.z)." >&2
  exit 1
fi

rm -rf "$STAGE"
mkdir -p "$STAGE/$NAME"
cp SKILL.md "$STAGE/$NAME/SKILL.md"

echo "staged $NAME v$VERSION  ($(wc -c < SKILL.md | tr -d ' ') bytes)"

if [ "${1:-}" = "--dry-run" ]; then
  echo
  echo "would run:"
  echo "  clawhub skill publish $STAGE/$NAME --slug $SLUG --version $VERSION"
  echo
  echo "staged tree:"
  find "$STAGE" -type f | sed "s|$ROOT/||"
  exit 0
fi

# Checked here rather than up top so --dry-run works without the CLI installed.
if ! command -v clawhub >/dev/null 2>&1; then
  echo "error: clawhub CLI not found. Install it with:  npm i -g clawhub" >&2
  exit 1
fi

# Provenance: ties the published version back to an exact commit. Skipped if
# the tree is dirty, so what ships is always something that exists in git.
SRC_ARGS=()
if git rev-parse --git-dir >/dev/null 2>&1; then
  if [ -z "$(git status --porcelain SKILL.md)" ]; then
    SRC_ARGS=(
      --source-repo "Mailgi/mailgi-web"
      --source-commit "$(git rev-parse HEAD)"
      --source-ref "$(git rev-parse --abbrev-ref HEAD)"
      --source-path "SKILL.md"
    )
  else
    echo "warning: SKILL.md has uncommitted changes — publishing without provenance." >&2
  fi
fi

clawhub skill publish "$STAGE/$NAME" \
  --slug "$SLUG" \
  --name "Mailgi — Free Email for Agents" \
  --version "$VERSION" \
  --categories "productivity" \
  --topics "email,agents,api,inbox,smtp" \
  "${SRC_ARGS[@]}" \
  "${@}"

echo "published $SLUG v$VERSION"
echo "verify: https://clawhub.ai/oyagev/skills/$SLUG"
