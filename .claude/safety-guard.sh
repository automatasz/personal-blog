#!/usr/bin/env bash
# PreToolUse safety hook - blocks dangerous bash commands
set -euo pipefail

cmd=$(jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

if [[ -z "$cmd" ]]; then
  exit 0
fi

normalized=$(echo "$cmd" | tr -s '[:space:]' ' ')

block() {
  echo "{\"continue\": false, \"stopReason\": \"Blocked: $1\"}"
  exit 2
}

# --- rm -rf on root/home/system paths ---
if echo "$normalized" | grep -qE '\brm\s+.*-r.*\s+/(\s|$)'; then
  block "rm -rf targeting / is forbidden"
fi
if echo "$normalized" | grep -qE '\brm\s+.*-r.*\s+~(\s|/|$)'; then
  block "rm -rf targeting ~ is forbidden"
fi
if echo "$normalized" | grep -qE '\brm\s+.*-r.*\s+/etc(\s|$)'; then
  block "rm -rf targeting /etc is forbidden"
fi
if echo "$normalized" | grep -qE '\brm\s+.*-r.*\s+/boot(\s|$)'; then
  block "rm -rf targeting /boot is forbidden"
fi

# --- git push --force to main/master ---
if echo "$normalized" | grep -qE '\bgit\s+push\s+.*(-f|--force)'; then
  if echo "$normalized" | grep -qE '(-f|--force).*(main|master)\b|(main|master)\b.*(-f|--force)'; then
    block "git push --force to main/master is forbidden. Use a feature branch instead."
  fi
fi

# --- git reset --hard ---
if echo "$normalized" | grep -qE '\bgit\s+reset\s+--hard\b'; then
  block "git reset --hard is blocked. Consider git stash or a new commit instead."
fi

# --- git clean -f ---
if echo "$normalized" | grep -qE '\bgit\s+clean\s+.*-f'; then
  block "git clean -f is blocked. Review untracked files manually first."
fi

# --- checkout . (discard all local changes) ---
if echo "$normalized" | grep -qE '\bgit\s+checkout\s+\.'; then
  block "git checkout . discards all local changes. Use git restore for specific files."
fi

# --- SQL DROP ---
if echo "$normalized" | grep -qiE '\bdrop\s+(table|database|schema)\b'; then
  block "DROP TABLE/DATABASE/SCHEMA is blocked via this hook. Run manually if intentional."
fi

# --- drizzle-kit push ---
if echo "$normalized" | grep -qE '\bdrizzle-kit\s+push\b'; then
  block "drizzle-kit push is blocked. Use drizzle-kit migrate instead."
fi

# --- Fork bomb ---
if echo "$normalized" | grep -qE ':\(\)\s*\{'; then
  block "Fork bomb pattern detected."
fi

# --- dd writing to block devices ---
if echo "$normalized" | grep -qE '\bdd\s+.*of=/dev/sd'; then
  block "dd writing to /dev/sd* is blocked."
fi

# --- chmod 777 on system paths ---
if echo "$normalized" | grep -qE '\bchmod\s+.*777\s+/(etc|usr|bin|sbin|boot|var|lib)(\s|$)'; then
  block "chmod 777 on system paths is blocked."
fi

exit 0
