# shellcheck shell=bash
#
# stale-sessions.sh — what piles up on this machine between agent runs, and the cleanup of it.
# Sourced by scripts/agent-dev-server.sh (which defines STATE_DIR, HOLDS_DIR, LOG, HOLD_MAX_MIN,
# alive, mtime, killtree). Sourcing starts nothing.
#
# WHY (2026-10-17). Arman: "Even at 4, I have my system crash at least 5 times per day because of
# poor management and stale sessions." Measured the same day (docs/perf/preview-capacity.md):
#   - HOLDS outlived their runners. A hold was a file with up to 180 minutes on it and no owner; any
#     one live hold blocks every idle recycle of the preview, so a finished run kept it growing to the
#     48 GB restart that drops every session at once. Seven holds were live at 21:55, two of them from
#     sessions silent for 25 and 37 minutes.
#   - BROWSERS outlived their runs. Agents start headless Playwright browsers from scratch scripts
#     (four `node daemon.js` launchers were still alive 7–10 hours after their sessions ended, one of
#     them clicking "Resume this preview" every 10 s so the walk cap could never free its slot).
#   - MEMORY was never measured machine-wide: the watchdog saw only the preview's own footprint.
#
# THE RULES, each logged by `cleanup_note` (to $STATE_DIR/cleanup.log and the preview log):
#   1. A hold records the process that took it (`owner=<pid> owner_start=<lstart>`). It ends when that
#      process is gone, or its pid now belongs to a different process, or its host made no signed-in
#      request for `ops.agent_walks.hold_idle_expire_minutes` (the walk cap touches the hold file on
#      each signed-in request and publishes the knob into $STATE_DIR/walk-knobs).
#   2. A Playwright-installed browser (binary under the Playwright browsers dir — automation only; a
#      person's own Chrome, the Claude browser pane and Claude-in-Chrome never live there) whose
#      launcher is gone (parent is launchd) for ORPHAN_GRACE_SEC, with no client attached to its
#      debugging port, is closed with its whole tree.
#   3. A detached launcher of such a browser — parent launchd, working directory a temp dir or this
#      checkout (agent scratch / walk scripts), older than HOLD_MAX_MIN (the longest a run may hold the
#      preview) — is closed with its browser.
#   Nothing else is ever touched: never the shared dev server, never a browser whose launcher is
#   alive, never a process outside these markers.

PW_BROWSERS_DIR="${MATRX_PLAYWRIGHT_BROWSERS_DIR:-${PLAYWRIGHT_BROWSERS_PATH:-$HOME/Library/Caches/ms-playwright}}"
# PLAYWRIGHT_BROWSERS_PATH=0 means "inside node_modules"; those browsers live under the checkout.
[[ "$PW_BROWSERS_DIR" == 0 ]] && PW_BROWSERS_DIR="$REPO_ROOT/node_modules/playwright-core/.local-browsers"
ORPHAN_GRACE_SEC="${MATRX_PREVIEW_ORPHAN_GRACE_SEC:-120}"
CLEANUP_LOG="$STATE_DIR/cleanup.log"
MEMORY_FILE="$STATE_DIR/memory"
WALKS_JSON="$STATE_DIR/walks.json"
WALK_KNOBS="$STATE_DIR/walk-knobs"
ORPHANS_SEEN="$STATE_DIR/orphans.seen"

# cleanup_note <what> — every cleanup is one dated line, in the cleanup log and the preview log.
cleanup_note() {
  mkdir -p "$STATE_DIR"
  printf '%s %s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$1" >>"$CLEANUP_LOG"
  [[ -n "${LOG:-}" && -f "$LOG" ]] && printf '[preview] CLEANUP: %s\n' "$1" >>"$LOG"
  local lines
  lines="$(wc -l <"$CLEANUP_LOG" 2>/dev/null | tr -d ' ')"
  if [[ "$lines" =~ ^[0-9]+$ ]] && (( lines > 4000 )); then
    tail -n 2000 "$CLEANUP_LOG" >"$CLEANUP_LOG.tmp" && mv -f "$CLEANUP_LOG.tmp" "$CLEANUP_LOG"
  fi
  return 0
}

# proc_start <pid> — the process's start time as one token ("" when it is gone). A pid plus its start
# time names one process; a pid alone can be reused.
proc_start() { ps -o lstart= -p "$1" 2>/dev/null | tr -s ' ' '_' | sed 's/^_//; s/_$//'; }

# Is this process a pass-through on the way to the real runner (a shell, a package runner, the
# preview scripts themselves)? <comm-basename> <args>
transient_process() {
  case "$1" in
    sh | bash | zsh | dash | fish | ksh | tcsh | csh | -sh | -bash | -zsh) return 0 ;;
    env | timeout | gtimeout | nohup | sudo | xargs | script | time | caffeinate | pnpm | npm | npx | corepack) return 0 ;;
    node)
      [[ "$2" =~ (pnpm\.c?js|/pnpm[[:space:]]|/pnpm$|npm-cli\.js|npx-cli\.js|/npx[[:space:]]|preview-ready\.mjs|agent-dev-server) ]] && return 0
      return 1
      ;;
  esac
  return 1
}

# hold_owner — the pid of the process this hold belongs to: the nearest ancestor of this script that
# is not a shell or a package runner (a Claude Code / Codex session, or a runner script). Empty when
# none is found before launchd. MATRX_PREVIEW_HOLD_OWNER_PID names it explicitly.
hold_owner() {
  if [[ -n "${MATRX_PREVIEW_HOLD_OWNER_PID:-}" ]]; then
    alive "$MATRX_PREVIEW_HOLD_OWNER_PID" && printf '%s\n' "$MATRX_PREVIEW_HOLD_OWNER_PID"
    return 0
  fi
  local p="$PPID" row ppid comm args hops=0
  while [[ "$p" =~ ^[0-9]+$ ]] && (( p > 1 && hops < 32 )); do
    row="$(ps -o ppid=,comm= -p "$p" 2>/dev/null)" || return 0
    [[ -n "$row" ]] || return 0
    read -r ppid comm <<<"$row"
    args="$(ps -ww -o args= -p "$p" 2>/dev/null)"
    if ! transient_process "$(basename "${comm%% *}")" "$args"; then
      printf '%s\n' "$p"
      return 0
    fi
    p="$ppid"
    hops=$(( hops + 1 ))
  done
  return 0
}

# walk_knob <key> — a knob value the walk cap published (it reads platform.feature_knob); "" if none.
walk_knob() { sed -n "s/^$1=//p" "$WALK_KNOBS" 2>/dev/null | head -1; }

# prune_holds — rule 1. Removes and logs every hold whose runner is gone or whose host went quiet.
prune_holds() {
  local f line label owner start now idle_min age
  [[ -d "$HOLDS_DIR" ]] || return 0
  now="$(date +%s)"
  idle_min="$(walk_knob hold_idle_expire_minutes)"
  for f in "$HOLDS_DIR"/*; do
    [[ -f "$f" ]] || continue
    label="$(basename "$f")"
    line="$(head -1 "$f" 2>/dev/null)"
    owner="$(sed -n 's/.*owner=\([0-9][0-9]*\).*/\1/p' <<<"$line")"
    start="$(sed -n 's/.*owner_start=\([^ ]*\).*/\1/p' <<<"$line")"
    if [[ -n "$owner" ]]; then
      if ! alive "$owner"; then
        rm -f "$f"
        cleanup_note "hold $label ended: the process that took it (pid $owner) is gone"
        continue
      fi
      if [[ -n "$start" && "$(proc_start "$owner")" != "$start" ]]; then
        rm -f "$f"
        cleanup_note "hold $label ended: pid $owner that took it has exited (the pid now belongs to another process)"
        continue
      fi
    fi
    if [[ "$idle_min" =~ ^[0-9]+$ ]] && (( idle_min > 0 )); then
      age=$(( now - $(mtime "$f") ))
      if (( age >= idle_min * 60 )); then
        rm -f "$f"
        cleanup_note "hold $label ended: its host made no signed-in request for $(( age / 60 )) min (limit ${idle_min} min, ops.agent_walks.hold_idle_expire_minutes)"
        continue
      fi
    fi
  done
  return 0
}

# write_memory_snapshot [preview-kb] — the machine's memory now, for the walk cap's burst slots and for
# preview:status. "Available" is free + inactive + speculative + purgeable pages (what can be handed
# out without the compressor or swap); pressure is the kernel's own level (1 normal, 2 warn, 4 critical).
write_memory_snapshot() {
  local preview_kb="${1:-}" vm total pressure swap tmp
  vm="$(vm_stat 2>/dev/null)" || return 0
  [[ -n "$vm" ]] || return 0
  total="$(sysctl -n hw.memsize 2>/dev/null)"
  pressure="$(sysctl -n kern.memorystatus_vm_pressure_level 2>/dev/null)"
  swap="$(sysctl -n vm.swapusage 2>/dev/null)"
  mkdir -p "$STATE_DIR"
  tmp="$MEMORY_FILE.$$"
  awk -v total="${total:-0}" -v pressure="${pressure:-0}" -v swap="$swap" -v preview_kb="$preview_kb" -v epoch="$(date +%s)" '
    /page size of/ { for (i = 1; i <= NF; i++) if ($i == "of") page = $(i + 1) }
    /^Pages free:/        { v = $3; gsub(/\./, "", v); free = v }
    /^Pages inactive:/    { v = $3; gsub(/\./, "", v); inactive = v }
    /^Pages speculative:/ { v = $3; gsub(/\./, "", v); spec = v }
    /^Pages purgeable:/   { v = $3; gsub(/\./, "", v); purg = v }
    END {
      if (!page) exit 1
      g = 1073741824
      printf "epoch=%d\n", epoch
      printf "available_gb=%.1f\n", (free + inactive + spec + purg) * page / g
      printf "free_gb=%.1f\n", free * page / g
      if (total > 0) printf "total_gb=%.1f\n", total / g
      printf "pressure=%d\n", pressure
      if (match(swap, /used = [0-9.]+[KMG]/)) {
        s = substr(swap, RSTART + 7, RLENGTH - 7); unit = substr(s, length(s)); n = substr(s, 1, length(s) - 1) + 0
        printf "swap_used_gb=%.1f\n", (unit == "G" ? n : unit == "M" ? n / 1024 : n / 1048576)
      }
      if (preview_kb ~ /^[0-9]+$/) printf "preview_gb=%.1f\n", preview_kb / 1048576
    }' <<<"$vm" >"$tmp" 2>/dev/null && mv -f "$tmp" "$MEMORY_FILE"
  rm -f "$tmp"
  return 0
}

memory_value() { sed -n "s/^$1=//p" "$MEMORY_FILE" 2>/dev/null | head -1; }

# The browser's own debugging port has a client attached (a CDP user that outlived the launcher).
debug_port_in_use() { # <args>
  local port
  port="$(sed -n 's/.*--remote-debugging-port=\([0-9][0-9]*\).*/\1/p' <<<"$1")"
  [[ "$port" =~ ^[0-9]+$ ]] && (( port > 0 )) || return 1
  lsof -nP -iTCP:"$port" -sTCP:ESTABLISHED -t >/dev/null 2>&1
}

# A launcher started from agent scratch (a temp dir) or from this checkout's walk scripts.
scratch_cwd() { # <pid>
  local cwd tmp="${TMPDIR:-/tmp}"
  cwd="$(lsof -a -p "$1" -d cwd -Fn 2>/dev/null | awk '/^n/{print substr($0,2); exit}')"
  [[ -n "$cwd" ]] || return 1
  tmp="${tmp%/}"
  case "$cwd" in
    "$tmp"/* | /private"$tmp"/* | /tmp/* | /private/tmp/* | /private/var/folders/* | /var/folders/* | "$REPO_ROOT" | "$REPO_ROOT"/*) return 0 ;;
  esac
  return 1
}

# etime ("MM:SS", "HH:MM:SS", "D-HH:MM:SS") -> seconds.
etime_seconds() {
  awk -v s="$1" 'BEGIN { d = 0; if (index(s, "-")) { split(s, p, "-"); d = p[1] + 0; s = p[2] }
    n = split(s, t, ":"); sec = (n == 3) ? t[1] * 3600 + t[2] * 60 + t[3] : (n == 2) ? t[1] * 60 + t[2] : 0
    print d * 86400 + sec }'
}

close_tree() { # close_tree <pid> — TERM the tree, KILL what is left after 3 s
  local pid="$1"
  killtree "$pid" TERM
  for _ in 1 2 3 4 5 6; do
    alive "$pid" || return 0
    sleep 0.5
  done
  killtree "$pid" KILL
  return 0
}

# sweep_orphan_browsers [--dry-run] [launcher-max-age-sec] — rules 2 and 3. Prints one line per
# browser it closed (or, with --dry-run, would close); logs each real close.
sweep_orphan_browsers() {
  local dry=0
  [[ "${1:-}" == --dry-run ]] && { dry=1; shift; }
  local launcher_max="${1:-$(( HOLD_MAX_MIN * 60 ))}"
  local now table seen_next pid ppid etime args start first lppid letime largs why
  now="$(date +%s)"
  table="$(ps -Aww -o pid=,ppid=,etime=,args= 2>/dev/null)"
  seen_next="$ORPHANS_SEEN.$$"
  : >"$seen_next"
  while read -r pid ppid etime args; do
    [[ "$pid" =~ ^[0-9]+$ ]] || continue
    [[ "$args" == "$PW_BROWSERS_DIR"/* ]] || continue
    [[ "$args" == *" --type="* ]] && continue # a renderer/helper: it goes with its root
    why=""
    if (( ppid == 1 )); then
      start="$(proc_start "$pid")"
      first="$(awk -v p="$pid" -v s="$start" '$1 == p && $2 == s { print $3; exit }' "$ORPHANS_SEEN" 2>/dev/null)"
      [[ "$first" =~ ^[0-9]+$ ]] || first="$now"
      if (( now - first < ORPHAN_GRACE_SEC )); then
        printf '%s %s %s\n' "$pid" "$start" "$first" >>"$seen_next"
        continue
      fi
      if debug_port_in_use "$args"; then
        printf '%s %s %s\n' "$pid" "$start" "$first" >>"$seen_next"
        continue
      fi
      why="Playwright browser pid $pid: its launcher is gone (orphaned $(( (now - first) / 60 )) min, up $etime)"
      if (( dry )); then
        printf '%s\n' "$why"
      else
        close_tree "$pid"
        cleanup_note "closed $why"
        printf '%s\n' "$why"
      fi
      continue
    fi
    # Rule 3: the launcher itself is detached from every session and older than the longest hold.
    read -r lppid letime largs <<<"$(awk -v p="$ppid" '$1 == p { $1 = ""; print; exit }' <<<"$table")"
    [[ "$lppid" == 1 ]] || continue
    [[ "$largs" == "$PW_BROWSERS_DIR"/* ]] && continue
    (( $(etime_seconds "$letime") >= launcher_max )) || continue
    scratch_cwd "$ppid" || continue
    why="detached Playwright launcher pid $ppid (${largs:0:80}, up $letime, no session) and its browser pid $pid"
    if (( dry )); then
      printf '%s\n' "$why"
    else
      close_tree "$ppid"
      alive "$pid" && close_tree "$pid"
      cleanup_note "closed $why"
      printf '%s\n' "$why"
    fi
  done <<<"$table"
  mv -f "$seen_next" "$ORPHANS_SEEN" 2>/dev/null || rm -f "$seen_next"
  return 0
}
