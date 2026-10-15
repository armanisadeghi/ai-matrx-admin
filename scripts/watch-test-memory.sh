#!/usr/bin/env bash
# Memory watcher for real-test runs. Read-only: prints one line per sample, WARNs on a threshold, NEVER kills anything.
#   bash scripts/watch-test-memory.sh [--interval 10] [--renderer-mb 2500] [--server-mb 25000] [--free-pct 15] [--port 3001] [--top 6]
# Start it BEFORE a run (e.g. `bash scripts/watch-test-memory.sh > "$(mktemp -d)/mem.log" &`), stop it (kill that PID) AFTER.
# Columns: renderer = largest Claude desktop renderer footprint (the in-app browser pane crashes when this climbs);
# rendSum = sum of the top renderers; claudeRss = every Claude.app process by RSS; server = dev server on --port (footprint);
# free = system free memory percentage.
set -u
INTERVAL=10 RENDERER_MB=2500 SERVER_MB=25000 FREE_PCT=15 PORT=3001 TOP=6
while [[ $# -gt 0 ]]; do
  case "$1" in
    --interval) INTERVAL="$2"; shift 2;;
    --renderer-mb) RENDERER_MB="$2"; shift 2;;
    --server-mb) SERVER_MB="$2"; shift 2;;
    --free-pct) FREE_PCT="$2"; shift 2;;
    --port) PORT="$2"; shift 2;;
    --top) TOP="$2"; shift 2;;
    -h|--help) sed -n '2,8p' "$0"; exit 0;;
    *) echo "unknown flag $1" >&2; exit 2;;
  esac
done

# Physical footprint in MB for one pid (what Activity Monitor shows); falls back to RSS.
fp_mb() {
  local out
  out="$(footprint -p "$1" -f bytes 2>/dev/null | awk '/Footprint:/{for(i=1;i<=NF;i++) if($i=="Footprint:"){print $(i+1); exit}}')"
  if [[ -n "$out" ]]; then echo $(( out / 1048576 )); return; fi
  out="$(ps -o rss= -p "$1" 2>/dev/null | tr -d ' ')"   # process may have exited: count it as 0
  echo $(( ${out:-0} / 1024 ))
}

echo "watch-test-memory: every ${INTERVAL}s; WARN if renderer>${RENDERER_MB}MB, server>${SERVER_MB}MB, free<${FREE_PCT}%. Read-only, kills nothing."
while true; do
  ts="$(date +%H:%M:%S)"
  # Claude desktop renderers: take the TOP largest by RSS, then read true footprint for those.
  rend_pids="$(ps -axo pid=,rss=,command= | awk '/Claude\.app\/.*Claude Helper \(Renderer\)/ && !/awk/ {print $2, $1}' | sort -rn | head -n "$TOP" | awk '{print $2}')"
  rmax=0 rsum=0 rpid=""
  for p in $rend_pids; do
    m="$(fp_mb "$p")"; rsum=$((rsum + m))
    if (( m > rmax )); then rmax=$m; rpid=$p; fi
  done
  claude_rss_mb=$(( $(ps -axo rss=,command= | awk '/Claude\.app\// && !/awk/ {s+=$1} END{print s+0}') / 1024 ))
  spid="$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1)"
  smb=0; [[ -n "$spid" ]] && smb="$(fp_mb "$spid")"
  free="$(memory_pressure 2>/dev/null | awk '/free percentage/{gsub("%","",$NF); print $NF}')"; free="${free:-?}"
  line="$ts renderer=${rmax}MB(pid ${rpid:--}) rendSum=${rsum}MB claudeRss=${claude_rss_mb}MB server=${smb}MB(pid ${spid:--}) free=${free}%"
  echo "$line"
  (( rmax > RENDERER_MB )) && echo "$ts WARN renderer ${rmax}MB > ${RENDERER_MB}MB: reload the test page or run the test reset NOW (pid ${rpid})"
  (( smb > SERVER_MB )) && echo "$ts WARN dev server ${smb}MB > ${SERVER_MB}MB: stop starting new runs; tell the owner (pid ${spid})"
  if [[ "$free" != "?" ]] && (( free < FREE_PCT )); then echo "$ts WARN system free memory ${free}% < ${FREE_PCT}%: pause runs"; fi
  sleep "$INTERVAL"
done
