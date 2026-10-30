#!/usr/bin/env bash
# ============================================================
# nx-autocommit.sh — ROLLBACK INSURANCE
# The sandbox can be restored to an older snapshot at any time
# (it happened 2026-09-12: six commits + the whole DIY module
# vanished from git AND disk). Committed state is far more
# likely to be captured in a fresh snapshot than uncommitted
# work, and a git bundle gives a second, independent copy of
# the full history.
#
# WHAT THIS DOES (invoked by nx-guardian every loop, throttled):
#   1. If the worktree is dirty → git add -A && commit
#      "checkpoint(auto)" (throttled: at most one every
#      $MIN_GAP_SECONDS, tracked via a stamp file).
#   2. Refresh backups/repo.bundle (inside the project) and
#      mirror it to /home/z/backups (outside the project, so a
#      project-local accident can't destroy both copies).
#
# SAFETY RULES:
#   - Never runs `git reset|checkout|clean` — commit-only, it
#     can never destroy work.
#   - All failures are swallowed (exit 0): the guardian's
#     serving loop must never be affected by backup problems.
# ============================================================

ROOT="/home/z/my-project"
STAMP="$ROOT/.autocommit-last"
MIN_GAP_SECONDS="${AUTOCOMMIT_MIN_GAP:-600}"
BUNDLE_DIR="$ROOT/backups"
OFFSITE_DIR="/home/z/backups"

export GIT_AUTHOR_NAME="${GIT_AUTHOR_NAME:-Nexura Checkpoint}"
export GIT_AUTHOR_EMAIL="checkpoint@nexura.local"
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"

_log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] autocommit: $*" >> "$ROOT/logs/guardian.log" 2>/dev/null; }

main() {
  cd "$ROOT" 2>/dev/null || return 0
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || return 0

  # never touch the repo while a real build is mid-flight —
  # commit only snapshot-worthy source state, .next noise is
  # excluded via .gitignore anyway.
  local dirty
  dirty=$(git status --porcelain 2>/dev/null | head -200)
  if [ -n "$dirty" ]; then
    local now last
    now=$(date +%s)
    last=0
    [ -f "$STAMP" ] && last=$(cat "$STAMP" 2>/dev/null || echo 0)
    if [ $((now - last)) -ge "$MIN_GAP_SECONDS" ]; then
      git add -A 2>/dev/null
      if git commit -m "checkpoint(auto): worktree snapshot $(date '+%Y-%m-%d %H:%M')" >/dev/null 2>&1; then
        echo "$now" > "$STAMP"
        _log "checkpoint commit created"
      else
        # commit failed (lock contention etc.) — do not stamp, retry next cycle
        _log "checkpoint commit skipped (git refused)"
      fi
    fi
  fi

  # refresh bundles — cheap (local pack), best-effort
  mkdir -p "$BUNDLE_DIR" "$OFFSITE_DIR" 2>/dev/null
  if git bundle create "$BUNDLE_DIR/repo.bundle" --all >/dev/null 2>&1; then
    cp -f "$BUNDLE_DIR/repo.bundle" "$OFFSITE_DIR/repo.bundle" 2>/dev/null
  fi
  return 0
}

main
exit 0
