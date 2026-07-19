#!/usr/bin/env bash
# SessionStart hook — cross-device sync guard.
# On every session start (startup/resume/clear), fetch the remote and, if this
# branch is behind its upstream, warn to `git pull` first. Point is to catch code
# pushed from another device (e.g. the iPad Claude Code app) before working on the
# MacBook, so the two never diverge. Silent when already up to date. Best-effort:
# never blocks or errors the session.
#
# Registered BOTH globally (~/.claude/settings.json) and per-project
# (.claude/settings.json, committed for other devices). The session-dedup guard
# below makes the double registration harmless — it runs at most once per session.

# --- once-per-session dedup (hook JSON on stdin carries session_id) ---
input="$(cat 2>/dev/null)"
if command -v jq >/dev/null 2>&1; then
  sid="$(printf '%s' "$input" | jq -r '.session_id // empty' 2>/dev/null || true)"
  if [ -n "$sid" ]; then
    marker="${TMPDIR:-/tmp}/claude-sync-check-${sid}"
    [ -e "$marker" ] && exit 0
    : > "$marker" 2>/dev/null || true
  fi
fi

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

# Refresh remote-tracking refs (guarded by gtimeout if present so a slow network
# can't hang startup; plain fetch otherwise — fast on most repos).
if command -v gtimeout >/dev/null 2>&1; then
  gtimeout 20 git fetch --quiet 2>/dev/null || true
else
  git fetch --quiet 2>/dev/null || true
fi

upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null)" || exit 0
[ -n "$upstream" ] || exit 0
behind="$(git rev-list --count 'HEAD..@{u}' 2>/dev/null || echo 0)"
[ "${behind:-0}" -gt 0 ] || exit 0

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
msg="⚠️ SYNC: branch '${branch}' is ${behind} commit(s) behind ${upstream} — likely work pushed from another device (e.g. the iPad Claude Code app). Run 'git pull --ff-only' to sync BEFORE editing, so the two devices don't diverge."

if command -v jq >/dev/null 2>&1; then
  jq -cn --arg m "$msg" '{systemMessage:$m, hookSpecificOutput:{hookEventName:"SessionStart", additionalContext:$m}}'
else
  printf '%s\n' "$msg"
fi
