#!/usr/bin/env python3
"""sync-main — make this checkout identical to GitHub's main, with all local work on top.

Run it from the repo root:   python3 scripts/sync-main.py
Options:                       --no-push   do everything locally, push nothing (for testing)
GO-time switches (both off unless their file exists; see "GO-time switches" below):
    python3 scripts/sync-main.py --pause "<reason>" [--minutes N] [--by NAME]   (default 90, max 480)
    python3 scripts/sync-main.py --resume
    python3 scripts/sync-main.py --status        pause state + old-path refusal + commit hold state
    python3 scripts/sync-main.py --hold-status   the commit hold and every held path
    python3 scripts/sync-main.py --hold-now      set aside, right now, every edit on a held path
                                                 (the same step a sweep runs first; it also runs
                                                 while paused — GO uses it before its wip commit)
    python3 scripts/sync-main.py --pause-active  exit 3 + the SYNC PAUSED line while a pause is in
                                                 force, else exit 0 silently. Every OTHER path that
                                                 pushes or releases from this checkout asks this
                                                 (scripts/release.sh, scripts/matrx/ship.ts,
                                                 scripts/git-purge-next-dirs.sh --push)
Replay a past sync (for re-testing how conflicts get resolved; commits locally, never pushes):
    python3 scripts/sync-main.py --replay <sync merge commit> <path> [<path> ...]

WHAT IT DOES (Arman's sequence, 2026-09-24)
  1. git add -A  +  git commit -m "local work not committed by agents who made them", the body
     naming the Claude/Codex sessions that edited each file (scripts/find-file-sessions.py) —
     EXCEPT a file the installed @ai-matrx packages cannot build yet (SWEEP HOLD, see
     sweep_holds()): it stays uncommitted on disk, named in the output, and goes out on the first
     sync whose packages serve what it uses
  2. git fetch + git merge origin/main          (this is `git pull --no-rebase`), run through a
     merge driver that never writes a conflict marker into the shared working tree
     (merge_without_markers(); a conflicted file keeps LOCAL's bytes until it is decided)
     clean  -> go to 4
  3. for every file git stops on:
     a. FAKE conflict: one side already contains the other (an agent pushed an early copy of the
        file, then kept editing it here) -> keep the fuller version, silently. ONLY when the kept
        version provably holds every line the other side added (or that line moved to another
        file the same side changed). Anything less is held.
     b. .md/.txt file, or a clash made only of comments -> keep BOTH versions between marker
        lines, list it in _conflicts/README.md.
     c. REAL conflict (or binary, or deleted on one side) -> GitHub's version goes live, our
        version is saved as _conflicts/<stamp>/<path>.held, listed in _conflicts/README.md,
        with FACTS: when each side last changed it, its commit message, which side is newer, and
        exactly which lines each side has that the other lacks. Facts only; never a decision.
  4. every @ai-matrx package to npm latest: in each folder whose package.json defines
     "sync:matrx-packages" (repo root and one level down, e.g. desktop/), run it IN A SCRATCH COPY
     of that folder (never in this checkout's node_modules), and adopt + commit the changed
     package.json / lockfile with one forward install here. Our packages are not external: a release on stale ones
     breaks (Arman, 2026-09-26). Once per sync; a failed update is announced, never silent.
     First it waits (max 6 min) for aidream's npm publish runs already in flight
     (wait_for_publish_train()); an update that adds a build failure and fixes none is NOT
     committed (update_breaks_build()); files held in step 1 are re-swept after an update.
  5. commit the merge. THE LOCKFILE GUARD (guard_lockfiles()): every tracked pnpm-lock.yaml /
     package-lock.json in HEAD must parse with unique keys; identical duplicate blocks a merge
     left behind are dropped and committed; anything unrepairable is never pushed (the one stop).
  6. git push. If someone pushed in the meantime, start again at 1.

Nothing is ever lost: every local byte is inside the step-1 commit, forever.
Leftover check: scripts/check-conflict-markers.py.
"""
import datetime
import glob
import json
import atexit
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time

REMOTE, BRANCH = "origin", "main"
LOCAL_MSG = "local work not committed by agents who made them"
HELD_MARK = "matrx-auto-git-conflict-file-work-delete-this-when-resolved"
DOCS_MARK = "matrx-auto-git-docs-resolution-needed-delete-this-when-resolved"
LOG_REL = "_conflicts/README.md"
HOLD_ROOT = "_conflicts"
MAX_ATTEMPTS = 5

DOC_EXTS = {".md", ".mdx", ".rst"}   # prose only; .txt (requirements.txt...) is code: comments-only rule
# comment style per extension: (line prefixes that make a line a comment, how to write one line)
SLASH = (("//", "/*", "*", "*/", "{/*"), lambda s: "// " + s)
HASH = (("#",), lambda s: "# " + s)
DASH = (("--",), lambda s: "-- " + s)
HTML = (("<!--",), lambda s: "<!-- " + s + " -->")
STYLE = {}
for e in ".ts .tsx .js .jsx .mjs .cjs .css .scss .go .rs .java .c .h .cpp .swift .kt .dart".split():
    STYLE[e] = SLASH
for e in ".py .sh .bash .zsh .yaml .yml .toml .rb .env .ini .cfg .txt .rst".split():
    STYLE[e] = HASH
STYLE[".sql"] = DASH
for e in ".md .mdx .html .xml .svg".split():
    STYLE[e] = HTML
for name in ("Makefile", "Dockerfile"):
    STYLE[name] = HASH


def say(msg):
    print(msg, flush=True)


def die(msg):
    print("SYNC STOPPED: " + msg, file=sys.stderr, flush=True)
    print("Nothing was pushed.", file=sys.stderr, flush=True)
    sys.exit(1)


RELEASE_SCREAM = os.path.expanduser("~/code/matrx-ship/scripts/release-scream.py")


def release_scream(check, detail, title=None):
    """On the release path (MATRX_RELEASE_PATH=1) mail the ship-all lanes through release-scream; never fails."""
    if os.environ.get("MATRX_RELEASE_PATH") != "1" or not os.path.isfile(RELEASE_SCREAM):
        return
    cmd = ["python3", RELEASE_SCREAM, "--repo", "matrx-frontend", "--where", "sync-main", "--check", check, "--detail", detail]
    try:
        if title and "--title" in subprocess.run(["python3", RELEASE_SCREAM, "--help"], capture_output=True,
                                                 text=True, timeout=30).stdout:
            cmd += ["--title", title]
        subprocess.run(cmd, timeout=60)
    except (OSError, subprocess.TimeoutExpired):
        pass


INDEX_LOCK_WAIT_S = 900  # a `git commit` holds index.lock for its WHOLE pre-commit hook; in this
# checkout that hook (node guards + matrx-ship lint-guard) was measured holding it 4.5+ min
# (2026-10-18 17:58). 10 s of retries lost that race twice the same evening ("git add -A failed:
# index.lock: File exists", nothing pushed). Wait out a LIVE holder as long as the single-flight
# wait (15 min); stop early only when the lock is stale (no git process alive, lock untouched 30 s).
INDEX_LOCK_STALE_S = 30


def _index_lock_is_stale(err):
    m = re.search(r"Unable to create '([^']+index\.lock)'", err)
    if not m:
        return False
    try:
        age = time.time() - os.path.getmtime(m.group(1))
    except OSError:
        return False  # gone already: the next try will take it
    if age < INDEX_LOCK_STALE_S:
        return False
    # Alive = a git process whose cwd is inside THIS repository (git machine-wide is always busy).
    root = os.path.realpath(os.path.dirname(os.path.dirname(m.group(1))))
    pids = subprocess.run(["pgrep", "-x", "git"], capture_output=True, text=True).stdout.split()
    for pid in pids:
        cwd = subprocess.run(["lsof", "-a", "-p", pid, "-d", "cwd", "-Fn"], capture_output=True, text=True).stdout
        for line in cwd.splitlines():
            if line.startswith("n") and (os.path.realpath(line[1:]) + "/").startswith(root + "/"):
                return False
    return True


def git(*args, check=True, raw=False, stdin=None):
    """Run git. Waits (up to INDEX_LOCK_WAIT_S) while another git process holds index.lock."""
    start = time.time()
    announced = False
    while True:
        r = subprocess.run(["git", *args], capture_output=True, input=stdin)
        err = r.stderr.decode("utf-8", "replace")
        waited = time.time() - start
        if r.returncode != 0 and "index.lock" in err and waited < INDEX_LOCK_WAIT_S:
            if waited >= 10 and _index_lock_is_stale(err):
                err += ("\nsync: index.lock is STALE (no git process alive, untouched %ds) -- a git "
                        "process died holding it. Remove .git/index.lock and run again.\n" % INDEX_LOCK_STALE_S)
                break
            if not announced and waited >= 10:
                announced = True
                print("sync: another git process holds index.lock (a commit's pre-commit hook can take "
                      "minutes); waiting up to %ds (git %s)" % (INDEX_LOCK_WAIT_S, args[0] if args else ""),
                      file=sys.stderr, flush=True)
            time.sleep(0.25 if waited < 10 else 2.0)
            continue
        break
    out = r.stdout if raw else r.stdout.decode("utf-8", "replace")
    if check and r.returncode != 0:
        die("git %s failed:\n%s%s" % (" ".join(args), r.stdout.decode("utf-8", "replace"), err))
    return r.returncode, out, err


# ── single flight ───────────────────────────────────────────────────────────────────────────
# One sync per checkout at a time (2026-10-18 00:41-01:02 PT: four syncs ran at once in aidream,
# each stole the others' ref updates -- "GitHub moved while syncing" x5, then "cannot lock ref
# 'refs/heads/main'" / "cannot lock ref 'HEAD'" -- and nobody's push landed for 150+ commits).
# The lock is flock(2) on <git-common-dir>/sync-main.lock: the kernel drops it the instant the
# holder exits or dies, so a crashed sync can never wedge the next one. A caller that finds it
# held WAITS (printing who holds it), then runs its own full sync -- its files may still need
# sweeping -- or exits 0 at once if the holder already pushed everything it had.
# A sync-main started BY the holder (its env carries LOCK_ENV naming the same file) never waits
# on its own parent.
LOCK_NAME = "sync-main.lock"
LOCK_ENV = "MATRX_SYNC_MAIN_LOCK_HELD"
LOCK_WAIT_ENV = "MATRX_SYNC_MAIN_LOCK_WAIT_S"   # a value (seconds), for tests and slow machines
LOCK_WAIT_S = 15 * 60
LOCK_POLL_S = 1.0
LOCK_NOTE_EVERY_S = 60
_LOCK_FD = None


def _lock_holder(fd):
    try:
        os.lseek(fd, 0, os.SEEK_SET)
        info = json.loads(os.read(fd, 4096).decode("utf-8", "replace") or "{}")
    except (OSError, ValueError):
        return "an unnamed process"
    since = info.get("started") or "?"
    return "pid %s, %s, since %s" % (info.get("pid", "?"), info.get("session") or "no session id",
                                      since)


def acquire_sync_lock():
    """Take this checkout's sync lock, waiting (bounded) for another holder. Returns True when we
    had to wait (the caller may then find there is nothing left to do)."""
    global _LOCK_FD
    import fcntl
    _, common, _ = git("rev-parse", "--git-common-dir")
    path = os.path.realpath(os.path.join(os.getcwd(), common.strip(), LOCK_NAME))
    if os.environ.get(LOCK_ENV) == path:
        say("sync lock: held by the sync that started this one; not waiting on it.")
        return False
    fd = os.open(path, os.O_RDWR | os.O_CREAT, 0o644)
    try:
        wait_s = float(os.environ.get(LOCK_WAIT_ENV) or LOCK_WAIT_S)
    except ValueError:
        wait_s = LOCK_WAIT_S
    t0 = time.time()
    waited = False
    next_note = 0.0
    while True:
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            break
        except BlockingIOError:
            pass
        now = time.time() - t0
        if now >= wait_s:
            holder = _lock_holder(fd)
            os.close(fd)
            die("another sync-main has held this checkout for over %d min (%s). Waited %d s and "
                "gave up so this caller is never stuck. If that process is gone, its lock is "
                "already free -- just run this again; if it is alive, it is still syncing "
                "(`ps -p <pid>`)." % (wait_s // 60, holder, now))
        if now >= next_note:
            say("SYNC WAITING: another sync-main is running in this checkout (%s); waiting for it "
                "to finish (up to %d min) instead of racing it." % (_lock_holder(fd), wait_s // 60))
            next_note = now + LOCK_NOTE_EVERY_S
        waited = True
        time.sleep(LOCK_POLL_S)
    session = ""
    for var, label in (("CLAUDE_CODE_SESSION_ID", "Claude session"),
                       ("CODEX_THREAD_ID", "Codex session")):
        if os.environ.get(var):
            session = "%s %s" % (label, os.environ[var])
            break
    os.ftruncate(fd, 0)
    os.lseek(fd, 0, os.SEEK_SET)
    os.write(fd, json.dumps({"pid": os.getpid(), "session": session,
                             "started": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                             "argv": sys.argv[1:]}).encode())
    os.environ[LOCK_ENV] = path   # inherited by every child: a nested sync-main never self-waits
    _LOCK_FD = fd                 # kept open for the life of the process == the lock's lifetime
    if waited:
        say("sync lock: the other sync finished after %d s; this one goes now." % (time.time() - t0))
    return waited


def nothing_left_after_wait():
    """After waiting on another sync: True when it already pushed everything this caller has
    (no uncommitted file, HEAD == GitHub's main), so this caller can stop at once."""
    _, dirty, _ = git("status", "--porcelain", check=False)
    if dirty.strip():
        return False
    if git("fetch", "-q", REMOTE, BRANCH, check=False)[0] != 0:
        return False
    _, head, _ = git("rev-parse", "HEAD")
    rc, remote, _ = git("rev-parse", "%s/%s" % (REMOTE, BRANCH), check=False)
    return rc == 0 and head.strip() == remote.strip()


def style_for(path):
    base = os.path.basename(path)
    return STYLE.get(base) or STYLE.get(os.path.splitext(base)[1].lower())


# ── run context: which commits are "local" and "github" ──────────────────────────────────────
CTX = {"ours": "HEAD", "theirs": "MERGE_HEAD", "mb": None}
MTIMES = {}  # path -> local edit time, recorded BEFORE the step-1 commit erases it


def record_mtimes():
    _, out, _ = git("status", "--porcelain", "-z", "--untracked-files=all")
    recs = out.split("\0")
    i = 0
    while i < len(recs):
        rec = recs[i]
        i += 1
        if len(rec) < 4:
            continue
        code, path = rec[:2], rec[3:]
        if "R" in code or "C" in code:
            i += 1  # -z puts the original name in the next record
        if path not in MTIMES and os.path.isfile(path):
            MTIMES[path] = os.path.getmtime(path)


# ── who made the swept files ────────────────────────────────────────────────────────────────
# The step-1 commit carries the sessions that edited each file, so a break can be traced to its
# author (2026-09-29: a broken file picker could not be). Evidence = scripts/find-file-sessions.py
# (Claude Code + Codex transcripts on this Mac). Best effort only: a failure writes "authors
# unknown" and the sweep goes on. The subject line never changes (the conflict facts match it).
AUTHORS_MAX_FILES = 400     # files looked up per sweep; the rest are counted, not searched
AUTHORS_TIMEOUT = 45        # seconds; the sweep never waits longer than this for the lookup
AUTHORS_DAYS = 3
AUTHORS_MAX_SESSIONS = 12
AUTHORS_MAX_NAMES = 6


def find_sessions_tool():
    here = os.getcwd()
    for p in (os.path.join(here, "scripts", "find-file-sessions.py"),
              os.path.join(os.path.dirname(here), "scripts", "find-file-sessions.py"),
              os.path.join(os.path.dirname(here), "matrx-ship", "scripts", "find-file-sessions.py")):
        if os.path.isfile(p):
            return p
    return None


def lookup_authors(files):
    """({path: [session rows]}, None) or (None, why it failed). Never raises, never waits > AUTHORS_TIMEOUT."""
    try:
        tool = find_sessions_tool()
        if not tool:
            return None, "find-file-sessions.py not found"
        absmap = {}
        for f in files[:AUTHORS_MAX_FILES]:
            ap = os.path.abspath(f)
            if os.path.isdir(os.path.dirname(ap)):
                absmap[ap] = f
        if not absmap:
            return {}, None
        r = subprocess.run([sys.executable, tool, "--json", "--days", str(AUTHORS_DAYS), *absmap],
                           capture_output=True, text=True, timeout=AUTHORS_TIMEOUT)
        if r.returncode != 0:
            return None, "lookup exited %d" % r.returncode
        data = json.loads(r.stdout)
        return {absmap[ap]: rows for ap, rows in data.items() if ap in absmap}, None
    except subprocess.TimeoutExpired:
        return None, "lookup timed out after %ds" % AUTHORS_TIMEOUT
    except Exception as e:  # noqa: BLE001 — the sweep must never stop on this
        return None, "lookup failed: %s" % str(e)[:80]


def _names(paths, limit):
    paths = sorted(paths)
    shown = ", ".join(paths[:limit])
    return shown + (", +%d more" % (len(paths) - limit) if len(paths) > limit else "")


def authors_body(files, found, why=None):
    """The commit-message body: one line per session with its files and last edit time."""
    if found is None:
        return "authors unknown (%s)" % (why or "lookup unavailable")
    sessions, attributed = {}, set()
    for f in files:
        for row in found.get(f) or []:
            if row.get("kind") != "edited":
                continue
            key = (row.get("tool", "?"), row.get("session", "?"))
            s = sessions.setdefault(key, {"title": "", "last": "", "files": set()})
            s["title"] = s["title"] or " ".join((row.get("title") or "").split())[:60]
            s["last"] = max(s["last"], row.get("last") or "")
            s["files"].add(f)
            attributed.add(f)
    lines = ["Sessions that edited the swept files (from local Claude/Codex transcripts, last %d days):"
             % AUTHORS_DAYS]
    ordered = sorted(sessions.items(), key=lambda kv: kv[1]["last"], reverse=True)
    for (tool, sid), s in ordered[:AUTHORS_MAX_SESSIONS]:
        lines.append('- %s %s "%s" last edit %s: %s' % (
            tool, sid, s["title"] or "untitled", s["last"] or "?", _names(s["files"], AUTHORS_MAX_NAMES)))
    if len(ordered) > AUTHORS_MAX_SESSIONS:
        lines.append("- +%d more sessions" % (len(ordered) - AUTHORS_MAX_SESSIONS))
    rest = [f for f in files if f not in attributed]
    if rest:
        lines.append("- unknown (no session found): %d files: %s" % (len(rest), _names(rest, AUTHORS_MAX_NAMES)))
    if not sessions:
        lines[0] = "authors unknown (no Claude/Codex session edited these files in the last %d days)" % AUTHORS_DAYS
    return "\n".join(lines)


def sweep_message_body(files):
    try:
        found, why = lookup_authors(files)
        return authors_body(files, found, why)
    except Exception as e:  # noqa: BLE001
        return "authors unknown (%s)" % str(e)[:80]


# ── GO-time switches: both do nothing unless their file exists ─────────────────────────────
# Built for planned tree moves (common-docs projects/chat-package-move/REGISTER.md R8): a sweep
# firing mid-move would commit a half-moved tree, and after the move a peer with stale context
# writes a file at an OLD path and the sweep would ship it, recreating the old tree.
#
# PAUSE  .matrx/sync-paused (gitignored; written by --pause, removed by --resume). While it is
#        live every sweep exits at once with SYNC PAUSED and PAUSED_EXIT, touching nothing, and
#        ./ship.sh skips its release. It always expires: at its `until:` line, never later than
#        PAUSE_MAX_MIN after the file was written, and PAUSE_DEFAULT_MIN after it was written when
#        `until:` is unreadable. An expired pause is removed and announced; the sweep runs.
# OLD-PATH REFUSAL  .matrx/moved-paths.txt (tracked; one `old -> new` per line, a directory
#        ends in `/`; `R100<TAB>old<TAB>new` lines from `git diff --name-status -M` also work).
#        A NEW file (untracked, or staged as added) at a listed old path is never committed
#        there: it is moved, bytes intact, to _conflicts/<stamp>-old-path-refused/<path>.held
#        with the path it belongs at, listed in _conflicts/README.md, and the sweep goes on.
#        A file still tracked at HEAD is never refused (it was not moved).
PAUSE_REL = ".matrx/sync-paused"
PAUSE_DEFAULT_MIN = 90
PAUSE_MAX_MIN = 480
PAUSED_EXIT = 3      # ship.sh reads it; 75 already means "release slot busy" to ship-all
MOVED_REL = ".matrx/moved-paths.txt"
REFUSED_DIR = "old-path-refused"


def _now():
    return datetime.datetime.now().astimezone()


def _iso(t):
    return t.replace(microsecond=0).isoformat()


def read_pause():
    """None when not paused. Otherwise {by, reason, since, until, note}. An expired pause file is
    removed (announced) and reads as None, so a forgotten pause can never freeze the repo."""
    if not os.path.lexists(PAUSE_REL):
        return None
    info = {}
    # A pause marker that is not a readable regular file (a directory, a dangling link, no read
    # permission) has no trustworthy write time, so it could never expire. It is IGNORED, loudly:
    # a pause that cannot end is worse than a sweep that runs.
    try:
        if not os.path.isfile(PAUSE_REL):
            raise OSError("not a regular file")
        with open(PAUSE_REL, encoding="utf-8", errors="replace") as f:
            for line in f:
                k, sep, v = line.partition(":")
                if sep:
                    info[k.strip().lower()] = v.strip()
        # A future-dated mtime would stretch the cap; never trust a write time later than now.
        written = min(datetime.datetime.fromtimestamp(os.path.getmtime(PAUSE_REL)).astimezone(), _now())
    except (OSError, OverflowError, ValueError) as e:
        say("SYNC PAUSE MARKER IGNORED: %s is unreadable (%s) — syncing normally. Remove it, then "
            "pause again with: python3 scripts/sync-main.py --pause \"<reason>\"" % (PAUSE_REL, e))
        return None
    cap = written + datetime.timedelta(minutes=PAUSE_MAX_MIN)
    note = ""
    try:
        until = datetime.datetime.fromisoformat(info.get("until", "")).astimezone()
    except (ValueError, OverflowError, OSError):
        until = written + datetime.timedelta(minutes=PAUSE_DEFAULT_MIN)
        note = "its until: line is unreadable, so it ends %d min after the file was written" % PAUSE_DEFAULT_MIN
    if until > cap:
        until = cap
        note = "capped at %d min after the file was written" % PAUSE_MAX_MIN
    if _now() >= until:
        try:
            os.remove(PAUSE_REL)
        except OSError:
            pass
        say("SYNC PAUSE EXPIRED at %s (by %s: %s) — removed %s; syncing normally."
            % (_iso(until), info.get("by", "?"), info.get("reason", "?"), PAUSE_REL))
        return None
    return {"by": info.get("by", "?"), "reason": info.get("reason", "?"),
            "since": info.get("since", "?"), "until": until, "note": note}


def pause_line(p):
    left = max(1, int((p["until"] - _now()).total_seconds() // 60) + 1)
    return "SYNC PAUSED by %s until %s (%d min left)%s: %s" % (
        p["by"], _iso(p["until"]), left, " [%s]" % p["note"] if p["note"] else "", p["reason"])


def stop_paused(p, where="Nothing was committed, merged or pushed."):
    print(pause_line(p), file=sys.stderr, flush=True)
    print(where + " Resume: python3 scripts/sync-main.py --resume", file=sys.stderr, flush=True)
    sys.exit(PAUSED_EXIT)


def other_sweeps():
    """Other sync-main sweeps running right now ('pid command' lines), so a pauser knows to wait."""
    r = subprocess.run(["pgrep", "-lf", "sync-main.py"], capture_output=True, text=True)
    out = []
    for line in r.stdout.splitlines():
        pid, _, cmd = line.strip().partition(" ")
        if pid != str(os.getpid()) and not re.search(r"--(pause|resume|status|hold-status|hold-now)\b", cmd):
            out.append(line.strip())
    return out


def pause_cmd(argv):
    """--pause "<reason>" [--minutes N] [--by NAME]"""
    def opt(name, default):
        if name in argv:
            i = argv.index(name)
            if i + 1 >= len(argv):
                die("%s needs a value." % name)
            return argv[i + 1]
        return default
    i = argv.index("--pause")
    reason = argv[i + 1].strip() if i + 1 < len(argv) and not argv[i + 1].startswith("--") else ""
    if not reason:
        die('usage: python3 scripts/sync-main.py --pause "<reason>" [--minutes N] [--by NAME]')
    try:
        minutes = int(opt("--minutes", PAUSE_DEFAULT_MIN))
    except ValueError:
        die("--minutes takes a whole number.")
    if not 1 <= minutes <= PAUSE_MAX_MIN:
        die("--minutes must be 1..%d; a pause always expires." % PAUSE_MAX_MIN)
    by = opt("--by", "%s@%s" % (os.environ.get("USER", "?"), os.uname().nodename.split(".")[0]))
    now = _now()
    os.makedirs(os.path.dirname(PAUSE_REL), exist_ok=True)
    with open(PAUSE_REL, "w") as f:
        f.write("by: %s\nreason: %s\nsince: %s\nuntil: %s\n" % (
            by, " ".join(reason.split()), _iso(now), _iso(now + datetime.timedelta(minutes=minutes))))
    say(pause_line(read_pause()))
    say("Every sweep of this checkout now exits without touching anything; ./ship.sh skips its release.")
    running = other_sweeps()
    if running:
        say("A sweep STARTED BEFORE the pause is still running; wait for it to finish:\n  "
            + "\n  ".join(running))


def pause_active_cmd():
    """--pause-active: the ONE answer to "is a valid, unexpired pause in force?" for every other
    path that pushes or releases from this checkout. Same reader as the sweep (expiry, cap and
    unreadable-marker rules included); paused -> the SYNC PAUSED line on stderr, PAUSED_EXIT."""
    p = read_pause()
    if p:
        stop_paused(p, "Refused: nothing was committed, merged, pushed or released.")


def resume_cmd():
    p = read_pause()
    if os.path.lexists(PAUSE_REL):
        os.remove(PAUSE_REL)
    say("sync resumed%s; the next sweep runs normally." % (
        " (was: %s)" % pause_line(p) if p else " (it was not paused)"))


def load_moved():
    """[(old, new)] from MOVED_REL, longest old path first; None when the file is absent."""
    if not os.path.isfile(MOVED_REL):
        return None
    entries = []
    with open(MOVED_REL, encoding="utf-8", errors="replace") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if " -> " in line:
                old, new = (x.strip() for x in line.split(" -> ", 1))
            elif "\t" in line:
                parts = [x.strip() for x in raw.rstrip("\n").split("\t")]
                if len(parts) == 3 and parts[0].startswith("R"):
                    old, new = parts[1], parts[2]
                elif len(parts) == 2:
                    old, new = parts
                else:
                    continue
            else:
                old, new = line, ""
            if old:
                entries.append((old, new))
    entries.sort(key=lambda e: -len(e[0]))
    return entries


def moved_target(path, entries):
    """(old entry, where the file belongs) when `path` is a moved path, else None."""
    for old, new in entries:
        if old.endswith("/"):
            if path.startswith(old):
                return old, (new.rstrip("/") + "/" + path[len(old):]) if new else "(not listed)"
        elif path == old:
            return old, new or "(not listed)"
    return None


def moved_status():
    entries = load_moved()
    if entries is None:
        return "old-path refusal: off (no %s)" % MOVED_REL
    return "old-path refusal: ON — %d moved path(s) in %s" % (len(entries), MOVED_REL)


def status_cmd():
    p = read_pause()
    say(pause_line(p) if p else "sync: not paused (no %s)" % PAUSE_REL)
    say(moved_status())
    h = read_hold()
    say(hold_line(h) if h else "commit hold: off (no live %s)" % HOLD_REL)


def refuse_old_paths(stamp):
    """Move every NEW file at a moved path aside before the sweep commits. Returns held tuples
    (path, held_path, summary) in update_log's shape."""
    entries = load_moved()
    if not entries:
        return []
    _, untracked, _ = git("ls-files", "--others", "--exclude-standard", "-z")
    _, added, _ = git("diff", "--cached", "--name-only", "--no-renames", "--diff-filter=A", "-z")
    staged = set(x for x in added.split("\0") if x)
    candidates = sorted(set(x for x in untracked.split("\0") if x) | staged)
    refused = []
    for path in candidates:
        if path == MOVED_REL or path.startswith(HOLD_ROOT + "/"):
            continue
        hit = moved_target(path, entries)
        if not hit or blob_at("HEAD", path):
            continue
        old, new = hit
        held = held_copy_path(os.path.join(HOLD_ROOT, "%s-%s" % (stamp, REFUSED_DIR)), path, ".held")
        header = ("%s\n\n"
                  "OLD PATH REFUSED, written by scripts/sync-main.py\n"
                  "File:        %s\n"
                  "Belongs at:  %s\n"
                  "Why:         %s was moved (entry '%s' in %s). A file saved at the old path would\n"
                  "             recreate it, so the sweep moved it here instead of committing it there.\n"
                  "Done with it: the work is in the new path, this .held file is deleted, and its line in\n"
                  "%s is deleted.\n"
                  "---------------- THE REFUSED FILE BELOW ----------------\n"
                  % (HELD_MARK, path, new, old, old, MOVED_REL, LOG_REL)).encode()
        if os.path.islink(path):
            data, binary = ("(a symlink to %s)\n" % os.readlink(path)).encode(), False
        else:
            with open(path, "rb") as f:
                data = f.read()
            binary = is_binary(data)
        if binary:
            safe_write(held, data, path)
            safe_write(held + "-note.txt", header.replace(
                b"THE REFUSED FILE BELOW", b"THE REFUSED FILE IS NEXT TO THIS NOTE"), path)
        else:
            safe_write(held, header + data, path)
        if path in staged:
            git("rm", "-q", "--cached", "--", path)
        os.remove(path)
        try:
            os.removedirs(os.path.dirname(path))   # only the now-empty old folders
        except OSError:
            pass
        say("OLD PATH REFUSED: %s recreates a moved path; it belongs at %s. Moved aside to %s"
            % (path, new, held))
        refused.append((path, held, "recreated moved path %s; belongs at %s" % (path, new)))
    return refused


# COMMIT HOLD  .matrx/held-paths.txt (gitignored; written by the move owner, e.g. from the move
#        manifest): an `until: <ISO time>` line, an optional `reason: <text>` line (default "the
#        chat package move"), then one path per line, a directory ending in `/`. While it is live,
#        every sweep, BEFORE staging, copies each CHANGED, NEW or DELETED file under a held path to
#        _conflicts/<stamp>-held-for-move/<path>.held (bytes intact, read back and compared), and
#        only then puts the working tree back to HEAD for that path (a new file is removed), so the
#        edit is never committed at a path that is about to move and never lost. Everything else
#        is committed normally. The sweep commits with --no-verify, so a git hook could not do this.
#        Expiry: at `until:`, never later than HOLD_MAX_MIN after the file was written; a file with
#        no readable `until:` (or not a readable file) is IGNORED, loudly. An expired file is
#        renamed to .matrx/held-paths.txt.expired (kept, announced).
HOLD_REL = ".matrx/held-paths.txt"
HOLD_MAX_MIN = 240
HOLD_DEFAULT_REASON = "the chat package move"
HELD_FOR_MOVE_DIR = "held-for-move"


def read_hold():
    """None when no hold is in force. Otherwise {until, reason, entries, note}."""
    if not os.path.lexists(HOLD_REL):
        return None
    info, entries = {}, []
    try:
        if not os.path.isfile(HOLD_REL):
            raise OSError("not a regular file")
        with open(HOLD_REL, encoding="utf-8", errors="replace") as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#"):
                    continue
                m = re.match(r"(until|reason|by|since)\s*:\s*(.*)$", line, re.I)
                if m:
                    info[m.group(1).lower()] = m.group(2).strip()
                else:
                    entries.append(line)
        written = min(datetime.datetime.fromtimestamp(os.path.getmtime(HOLD_REL)).astimezone(), _now())
    except (OSError, OverflowError, ValueError) as e:
        say("COMMIT HOLD IGNORED: %s is unreadable (%s) — nothing is held; syncing normally." % (HOLD_REL, e))
        return None
    try:
        until = datetime.datetime.fromisoformat(info.get("until", "")).astimezone()
    except (ValueError, OverflowError, OSError):
        say("COMMIT HOLD IGNORED: %s has no readable `until: <ISO time>` line — nothing is held; "
            "syncing normally. Add the line to hold (max %d min)." % (HOLD_REL, HOLD_MAX_MIN))
        return None
    note = ""
    cap = written + datetime.timedelta(minutes=HOLD_MAX_MIN)
    if until > cap:
        until, note = cap, "capped at %d min after the file was written" % HOLD_MAX_MIN
    if _now() >= until:
        try:
            os.replace(HOLD_REL, HOLD_REL + ".expired")
        except OSError:
            pass
        say("COMMIT HOLD EXPIRED at %s (%s) — %s renamed to %s.expired; nothing is held; syncing normally."
            % (_iso(until), info.get("reason") or HOLD_DEFAULT_REASON, HOLD_REL, HOLD_REL))
        return None
    entries.sort(key=lambda e: -len(e))
    return {"until": until, "reason": info.get("reason") or HOLD_DEFAULT_REASON,
            "entries": entries, "note": note}


def held_entry(path, entries):
    for e in entries:
        if (e.endswith("/") and path.startswith(e)) or path == e:
            return e
    return None


def hold_line(h):
    left = max(1, int((h["until"] - _now()).total_seconds() // 60) + 1)
    return "COMMIT HOLD for %s until %s (%d min left)%s: %d held path(s) in %s" % (
        h["reason"], _iso(h["until"]), left, " [%s]" % h["note"] if h["note"] else "",
        len(h["entries"]), HOLD_REL)


def hold_status_cmd():
    h = read_hold()
    if not h:
        say("commit hold: off (no live %s)" % HOLD_REL)
        return
    say(hold_line(h))
    for e in h["entries"]:
        say("  " + e)


def hold_now_cmd():
    """--hold-now: the sweep's hold step on its own, so a paused GO can set peers' edits on held
    paths aside before it commits anything. Exit 2 when no hold is in force (nothing would be held,
    and a caller relying on it must know)."""
    h = read_hold()
    if not h:
        say("commit hold: off (no live %s) — nothing set aside" % HOLD_REL)
        sys.exit(2)
    stamp = datetime.datetime.now().strftime("%Y-%m-%d-%H%M%S")
    hh = hold_changed_paths(stamp)
    if hh:
        update_log(stamp, [], hh)
    say("%s — set aside %d file(s) now" % (hold_line(h), len(hh)))
    for path, held_path, _ in hh:
        say("  %s -> %s" % (path, held_path))


def hold_changed_paths(stamp):
    """Set aside every changed/new/deleted file under a held path before the sweep stages.
    Returns held tuples (path, held_path, summary) in update_log's shape."""
    h = read_hold()
    if not h or not h["entries"]:
        return []
    _, out, _ = git("status", "--porcelain", "-z", "--untracked-files=all", "--no-renames")
    recs = [r for r in out.split("\0") if len(r) > 3]
    held_items = []
    for rec in recs:
        code, path = rec[:2], rec[3:]
        if path.startswith(HOLD_ROOT + "/") or path.startswith(HOLD_REL):
            continue
        if not held_entry(path, h["entries"]):
            continue
        head_blob = blob_at("HEAD", path)
        in_head = bool(head_blob)
        base = os.path.join(HOLD_ROOT, "%s-%s" % (stamp, HELD_FOR_MOVE_DIR))
        if os.path.islink(path):
            data, binary, what = ("(a symlink to %s)\n" % os.readlink(path)).encode(), False, "changed"
            tree_blob = None
        elif os.path.isfile(path):
            with open(path, "rb") as f:
                data = f.read()
            binary, what = is_binary(data), ("changed" if in_head else "new")
            _, tree_blob, _ = git("hash-object", "--", path)
            tree_blob = tree_blob.strip()
        else:
            data, binary, what = b"(this file was DELETED locally; re-apply the deletion after GO)\n", False, "deleted"
            tree_blob = None
        # A STAGED version that differs from both HEAD and the working tree (staged A, then
        # edited to B; or staged, then deleted from the tree) is a second piece of work: kept too.
        rc, idx_blob, _ = git("rev-parse", "-q", "--verify", ":%s" % path, check=False)
        idx_blob = idx_blob.strip() if rc == 0 else None
        copies = [(".held", data, binary, "THE HELD FILE (the working tree's version)")]
        if idx_blob and idx_blob != head_blob and idx_blob != tree_blob:
            staged = content(idx_blob)
            copies.append((".staged.held", staged, is_binary(staged), "THE STAGED VERSION (git's index)"))
        written = []
        for suffix, body, is_bin, label in copies:
            held = held_copy_path(base, path, suffix)
            header = ("%s\n\n"
                      "HELD FOR THE MOVE, written by scripts/sync-main.py\n"
                      "File:        %s (%s locally, git status '%s')\n"
                      "Copy:        %s\n"
                      "Why:         held for %s; re-apply after GO. Its path is listed in %s, so the\n"
                      "             sweep did not commit this edit there; the working tree was put back to HEAD.\n"
                      "Done with it: the edit is re-applied at the file's new home, this .held file is deleted,\n"
                      "and its line in %s is deleted.\n"
                      "---------------- THE HELD FILE BELOW ----------------\n"
                      % (HELD_MARK, path, what, code, label, h["reason"], HOLD_REL, LOG_REL)).encode()
            if is_bin:
                want = {held: body, held + "-note.txt": header.replace(
                    b"THE HELD FILE BELOW", b"THE HELD FILE IS NEXT TO THIS NOTE")}
            else:
                want = {held: header + body}
            for p, b in want.items():
                safe_write(p, b, path)
            written.append((held, suffix))
        # Only now, with every copy verified on disk, put the working tree back.
        if in_head:
            git("checkout", "-q", "HEAD", "--", path)
        else:
            git("rm", "-q", "--cached", "--ignore-unmatch", "--", path)
            if os.path.lexists(path):
                os.remove(path)
            try:
                os.removedirs(os.path.dirname(path))
            except OSError:
                pass
        for held, suffix in written:
            kind = "staged version " if suffix == ".staged.held" else ""
            say("HELD: %s %sheld for %s; re-apply after GO -> %s" % (path, kind, h["reason"], held))
            held_items.append((path, held, "%s %sheld for %s; re-apply after GO" % (path, kind, h["reason"])))
    return held_items


HELD_NAME_MAX = 200     # bytes per path component; filesystems refuse 255+
HELD_PATH_MAX = 900     # bytes for the whole relative path; macOS refuses 1024+


def held_copy_path(base, path, suffix):
    """A fresh, writable path for one held copy under `base`. Never reuses a name (a later attempt
    in the same sweep gets .2, .3, ...), and a path too long for the filesystem becomes
    _long/<hash><suffix>. Every copy is recorded in <base>/INDEX.txt (copy -> original path)."""
    cand = os.path.join(base, path + suffix)
    too_long = (len(cand.encode()) > HELD_PATH_MAX
                or any(len(c.encode()) > HELD_NAME_MAX for c in cand.split(os.sep)))
    if too_long:
        import hashlib
        stem = os.path.join(base, "_long", hashlib.sha256(path.encode()).hexdigest()[:24])
    else:
        stem = os.path.join(base, path)
    n, held = 1, stem + suffix
    while os.path.lexists(held) or os.path.lexists(held + "-note.txt"):
        n += 1
        held = "%s.%d%s" % (stem, n, suffix)
    os.makedirs(os.path.dirname(held), exist_ok=True)
    with open(os.path.join(base, "INDEX.txt"), "a", encoding="utf-8") as f:
        f.write("%s\t%s\n" % (os.path.relpath(held, base), path))
    return held


def safe_write(p, b, path):
    """Write, fsync, read back. Any failure stops the sweep before anything is restored or
    committed (the original file is still in place)."""
    try:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "wb") as f:
            f.write(b)
            f.flush()
            os.fsync(f.fileno())
        with open(p, "rb") as f:
            ok = f.read() == b
    except OSError as e:
        ok, why = False, str(e)
    else:
        why = "read-back differs"
    if not ok:
        die("could not safely write %s (%s); %s was left untouched and nothing was committed."
            % (p, why, path))


# ── live forcing-function plants ────────────────────────────────────────────────────────────
# plant.py (skill forcing-function-tests) puts a mutation on disk for the length of one test run.
# While it does, it keeps two records, each "<pid>\n<absolute planted path>\n":
#   <git common dir>/matrx-live-plants/<pid>                        (the marker; any TMPDIR)
#   ${PLANT_STATE_DIR:-<tmp>/plant-mutation-state}/locks/<sha1>/pid  (its per-repo lock)
# A record whose pid is dead is no plant (plant.py's own stale-lock rule). Step 1 never commits a
# file with a live plant; it goes in the next sync. 2026-10-02: two sweeps pushed live mutations.
PLANT_MARKER_DIR = "matrx-live-plants"


def _pid_alive(pid):
    if pid <= 0:  # 0 and negatives signal a process group, never one plant's own process
        return False
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


def live_plants(top, common_dir):
    """[(repo-relative path, pid)] for every live plant the sweep's `git add` must exclude.

    Never returned: a gitignored path (`git add -A` never stages it, and an exclude pathspec on it
    makes `git add` fail and stop the whole sync), the checkout root, or a path inside a submodule.
    """
    import glob
    state = os.environ.get("PLANT_STATE_DIR") or os.path.join(tempfile.gettempdir(),
                                                                "plant-mutation-state")
    records = glob.glob(os.path.join(common_dir, PLANT_MARKER_DIR, "*"))
    records += glob.glob(os.path.join(state, "locks", "*", "pid"))
    top = os.path.realpath(top)
    found = {}
    gitlinks = None
    for rec in records:
        try:
            with open(rec) as f:
                pid, path = f.read().split("\n")[:2]
            pid = int(pid)
        except (OSError, ValueError):
            continue
        if not path.strip() or not _pid_alive(pid):
            continue
        rel = os.path.relpath(os.path.realpath(path.strip()), top)
        if rel == ".." or rel.startswith(".." + os.sep) or os.path.isabs(rel):
            continue
        if rel == ".":
            say("PLANT RECORD IGNORED %s: it names the checkout root, not one file." % rec)
            continue
        if gitlinks is None:
            _, out, _ = git("-C", top, "ls-files", "-s", "-z", check=False)
            gitlinks = [e.split("\t", 1)[1] for e in out.split("\0")
                        if e.startswith("160000 ") and "\t" in e]
        if any(rel == g or rel.startswith(g + "/") for g in gitlinks):
            continue
        if git("-C", top, "check-ignore", "-q", "--", rel, check=False)[0] == 0:
            continue
        found[rel] = pid
    return sorted(found.items())


# ── step 1 ──────────────────────────────────────────────────────────────────────────────────
# SWEEP HOLD (2026-10-07). The sweep used to commit every uncommitted file, so the consumer half
# of a cross-repo change (written against @ai-matrx source while the package's npm publish was
# still in flight) went to main with the OLD package locked: 12 failed Vercel builds in 36 hours
# and one green build that crashed manage.aimatrx.com ("v.currentScope is not a function"). Before
# staging, scripts/check-sweep-resolves.mjs asks the TypeScript checker, against the packages
# actually installed, which uncommitted files would break the build (a module or name that does
# not resolve, a member an @ai-matrx type lacks, a file that does not parse, a committed importer
# left dangling) and closes that set over their importers. Those files stay uncommitted on disk,
# untouched; the next sync takes them once the package is served. If the check cannot run, stop
# before committing: otherwise known broken imports can reach a production build.
SWEEP_CHECK = os.path.join("scripts", "check-sweep-resolves.mjs")
SWEEP_CHECK_TIMEOUT = 900   # seconds; large concurrent sweeps can exceed five minutes.
# The checker type-checks every swept file (plus the committed files importing them) in one
# program; its heap grows with the size of the sweep. At node's default ~4.4 GB ceiling a large
# sweep aborted with "FatalProcessOutOfMemory" (ship-all 2026-10-17_23-13-53, node 26.7) and
# the sync paused. The machine has the memory; the default cap was the only limit.
SWEEP_CHECK_HEAP_MB = 16384


def sweep_holds():
    """[(path, [reason])] the sweep must not commit yet; an unavailable check stops the sync."""
    if not os.path.isfile(SWEEP_CHECK):
        say("SYNC PAUSED — sweep checker is missing (%s); release skipped." % SWEEP_CHECK)
        sys.exit(PAUSED_EXIT)
    try:
        r = subprocess.run(["node", "--max-old-space-size=%d" % SWEEP_CHECK_HEAP_MB, SWEEP_CHECK, "--json"],
                           capture_output=True, text=True, timeout=SWEEP_CHECK_TIMEOUT)
        if r.returncode != 0:
            # A native abort prints its reason FIRST and then a 60-frame stack; the tail alone
            # showed only stack frames, never "FATAL ERROR: … heap out of memory".
            text = (r.stderr or r.stdout).strip()
            fatal = [l.strip() for l in text.splitlines() if "FATAL ERROR" in l][:2]
            raise RuntimeError(("\n".join(fatal) + "\n" if fatal else "") + (text[-600:] or "exit %d" % r.returncode))
        data = json.loads(r.stdout.strip().splitlines()[-1])
        holds = data.get("hold")
        if (type(data.get("checked", 0)) is not int
                or type(data.get("deletions", 0)) is not int
                or not isinstance(holds, list) or any(
            not isinstance(h, dict) or not isinstance(h.get("path"), str) or not h["path"]
            or not isinstance(h.get("reasons", []), list)
            or any(not isinstance(reason, str) for reason in h.get("reasons", []))
            for h in holds
        )):
            raise ValueError("malformed sweep result")
    except (OSError, ValueError, IndexError, AttributeError, TypeError, RuntimeError,
            subprocess.TimeoutExpired) as e:
        say("SYNC PAUSED — sweep checker could not run (%s); release skipped: %s"
            % (SWEEP_CHECK, e))
        sys.exit(PAUSED_EXIT)
    if data.get("checked") or data.get("deletions"):
        say("sweep check: %d changed file(s), %d deletion(s) against the installed packages, %d held (%ss)"
            % (data.get("checked", 0), data.get("deletions", 0), len(holds), data.get("seconds")))
    return [(h["path"], h.get("reasons") or []) for h in holds]


SWEEP_HELD = []   # what the last commit_all held back (main() re-sweeps once after a package update)


def repair_skill_copies():
    """LAW 15 (2026-10-18): the sweep below commits with --no-verify, so no hook ever sees what it
    carries. First this repo's synced skill copies are rewritten from common-docs HEAD (stale copies,
    hand edits and leftovers repaired), so none of those rides a release. Never fails the sync."""
    top = git("rev-parse", "--show-toplevel")[1].strip()
    tools = os.path.join(os.path.dirname(top), "common-docs", "meta", "scripts")
    if not os.path.isfile(os.path.join(tools, "sync_skills.py")):
        return
    name = os.path.basename(top)
    runs = [["sync_skills.py", "--repair", "--repo", name]]
    if name == "common-docs":
        # The canonical side: stamp each home's rules into its skills, and refresh the workspace
        # root copies (the root is no repo, so nothing else writes them).
        runs = [["one_home.py", "--write"], ["sync_skills.py", "--repair", "--root"]]
    for args in runs:
        try:
            subprocess.run([sys.executable, os.path.join(tools, args[0]), *args[1:]],
                           cwd=top, timeout=180, check=False)
        except Exception as exc:  # noqa: BLE001 — a repair failure never stops the sync
            say(f"LAW 15 REPAIR SKIPPED ({' '.join(args)}): {exc}")


MARKER_GREP = r"^(<<<<<<<|>>>>>>>)( |$)"
# A lone `=======` line is a conflict marker too (half a block: `=======` ... `>>>>>>> origin/main`
# with no opening line still breaks the build), but in prose it is a heading underline. It is judged
# only in files where a bare `=======` line is never legitimate.
MID_MARKER_GREP = r"^=======( |$)"
MID_MARKER_EXTS = {".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json", ".py",
                   ".css", ".scss", ".sql", ".sh", ".yaml", ".yml", ".toml", ".go", ".rs"}


def staged_marker_files(paths=None):
    """Staged paths whose INDEX content has a git conflict-marker line: `<<<<<<< ` / `>>>>>>> `
    anywhere, and a bare `=======` in code (MID_MARKER_EXTS). No commit sync-main makes may carry
    one: matrx-frontend 4d1b83b210 and a6342f47b3 (2026-10-22) shipped AssessmentCreate.tsx and
    runHistory.ts with git's markers and releases v0.4.3443 / v0.4.3444 failed to build. Held copies
    under _conflicts/ are exempt (they are the saved LOCAL side, markers and all)."""
    if paths is None:
        _, out, _ = git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z", check=False)
        paths = [p for p in out.split("\0") if p]
    paths = [p for p in paths if not p.startswith(HOLD_ROOT + "/") and not p.endswith(".held")]
    code = [p for p in paths if os.path.splitext(p)[1].lower() in MID_MARKER_EXTS]
    bad = []
    for pattern, group in ((MARKER_GREP, paths), (MID_MARKER_GREP, code)):
        for i in range(0, len(group), 500):
            _, out, _ = git("grep", "--cached", "-z", "-lIE", pattern, "--",
                            *[":(literal)" + p for p in group[i:i + 500]], check=False)
            bad += [p for p in out.split("\0") if p and p not in bad]
    return bad


PARSE_CHECK = os.path.join("scripts", "check-parse.mjs")
PARSE_LINE = re.compile(r"^  (\S.*?):(\d+):(\d+)  (.*)$")


def staged_parse_failures():
    """[(path, why)] staged code files (.ts/.tsx/.js/.mjs/...) whose INDEX content does not parse,
    by `scripts/check-parse.mjs --staged` (2026-10-22, Arman: guards run when the code is written,
    never at release). check-sweep-resolves.mjs already holds a TypeScript-program file that does
    not parse; this covers every code file, .js/.mjs included. A checker that cannot run holds
    nothing and says so: it never stops the sync."""
    if not os.path.isfile(PARSE_CHECK):
        return []
    try:
        r = subprocess.run(["node", PARSE_CHECK, "--staged"], capture_output=True, text=True,
                           timeout=300, env={**os.environ, "MATRX_RELEASE_PATH": "0"})
    except (OSError, subprocess.TimeoutExpired) as e:
        say("sweep parse check could not run (%s); nothing held for parse errors." % e)
        return []
    if r.returncode == 0:
        return []
    out = []
    for line in r.stderr.splitlines():
        m = PARSE_LINE.match(line)
        if m and m.group(1) not in [p for p, _ in out]:
            out.append((m.group(1), "line %s: %s" % (m.group(2), m.group(4))))
    if not out:
        say("sweep parse check exited %d without naming a file; nothing held:\n%s"
            % (r.returncode, (r.stderr or r.stdout)[-400:]))
    return out


def _blob_has_marker(path, sha):
    if not sha:
        return False
    data = content(sha)
    if is_binary(data):
        return False
    pats = [MARKER_GREP] + ([MID_MARKER_GREP] if os.path.splitext(path)[1].lower() in MID_MARKER_EXTS else [])
    return any(re.search(pt.encode(), data, re.M) for pt in pats)


def hold_marked_merge_files(stamp):
    """Last check before a merge commit: no file this merge stages may carry a conflict marker it
    did not get from a parent. Each one found is held like any conflict -- GitHub's version goes
    live, the marked-up bytes go to _conflicts/<stamp>/<path>.held -- so the commit never carries
    a marker. A marker that GitHub's own version already has is not ours to undo: it is announced
    (the release build fails until someone fixes it) and left alone. Returns the held entries."""
    _, out, _ = git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z", "HEAD", check=False)
    held = []
    for path in staged_marker_files([p for p in out.split("\0") if p]):
        theirs = blob_at("MERGE_HEAD", path)
        if _blob_has_marker(path, theirs) or _blob_has_marker(path, blob_at("HEAD", path)):
            say("CONFLICT MARKERS ALREADY ON A PARENT: %s carries git conflict markers in a version "
                "already committed; the release build fails until the file is fixed." % path)
            continue
        _, marked, _ = git("cat-file", "blob", ":%s" % path, raw=True)
        dest = held_copy_path(os.path.join(HOLD_ROOT, stamp), path, ".held")
        with open(dest, "wb") as f:
            f.write(("%s\n\nHELD CONFLICT, written by scripts/sync-main.py\nFile:      %s\nWhy held:  "
                     "the merge staged it with git conflict markers (a marker breaks the build)\n"
                     "GITHUB's version is live. The marked-up version is below.\n"
                     "---------------- MARKED-UP VERSION BELOW ----------------\n"
                     % (HELD_MARK, path)).encode() + marked)
        live = theirs or blob_at("HEAD", path)
        _, staged, _ = git("ls-files", "-s", "--", path, check=False)
        if live:
            write_live(path, content(live), (staged.split() or ["100644"])[0])
        else:
            git("rm", "-q", "--cached", "--ignore-unmatch", "--", path)
        say("MERGE HELD %s: it was staged with git conflict markers; GitHub's version is live, the "
            "marked-up copy is %s." % (path, dest))
        held.append((path, dest, "staged with conflict markers during the merge; the live file is "
                                 "GitHub's version"))
    if held:
        update_log(stamp, [], held)
        git("add", "--", HOLD_ROOT)
    return held


def commit_all():
    repair_skill_copies()
    _, common, _ = git("rev-parse", "--git-common-dir")
    planted = live_plants(os.getcwd(), os.path.abspath(common.strip()))
    held = sweep_holds()
    SWEEP_HELD[:] = held
    excluded = [p for p, _ in planted] + [p for p, _ in held]
    git("add", "-A", "--", ".", *[":(exclude,literal)" + p for p in excluded])
    for p, pid in planted:
        git("restore", "--staged", "--", ":(literal)" + p, check=False)
        say("SWEEP SKIPPED %s: a forcing-function plant (pid %d) is live in it; the next sync "
            "commits it." % (p, pid))
    for p in staged_marker_files():
        git("restore", "--staged", "--", ":(literal)" + p, check=False)
        say("SWEEP SKIPPED %s: it holds git conflict markers (<<<<<<< / ======= / >>>>>>>); a marker breaks "
            "the build. Resolve the file; the next sync commits it." % p)
    for p, why in staged_parse_failures():
        git("restore", "--staged", "--", ":(literal)" + p, check=False)
        say("SWEEP SKIPPED %s: it does not parse (%s); Turbopack refuses it and every release build "
            "fails. Fix the file; the next sync commits it." % (p, why))
    for p, reasons in held:
        git("restore", "--staged", "--", ":(literal)" + p, check=False)
        say("SWEEP HELD %s — it would break the build, so it stays uncommitted on disk and the "
            "next sync retries it:\n        %s" % (p, "\n        ".join(reasons[:4])))
    rc, _, _ = git("diff", "--cached", "--quiet", check=False)
    if rc == 0:
        return 0
    _, names, _ = git("diff", "--cached", "--name-only", "-z")
    files = [x for x in names.split("\0") if x]
    body = sweep_message_body(files)
    rc, out, err = git("commit", "--no-verify", "-q", "-m", LOCAL_MSG, "-m", body, check=False)
    # Other sessions commit to this shared checkout every few seconds. A commit that read HEAD
    # and then lost the race ends "cannot lock ref 'HEAD': is at X but expected Y" with nothing
    # written; retrying re-reads HEAD. Without this retry that single lost race stopped the whole
    # sync after ~25 minutes of sweep work and no release shipped (ship-all 2026-10-21_09-41-09).
    for _attempt in range(8):
        if rc == 0 or "cannot lock ref" not in (out + err):
            break
        time.sleep(0.5 + 0.5 * _attempt)
        rc, out, err = git("commit", "--no-verify", "-q", "-m", LOCAL_MSG, "-m", body, check=False)
    if rc != 0:
        # The shared checkout has concurrent writers. sweep_message_body() reads transcripts for
        # seconds; in that window another session's `git commit --only <its paths>` can commit
        # exactly the files we staged (it rewrites the index too). Our commit then finds nothing
        # to commit and exits 1 -- the work is safe in HEAD, so that is not a failure
        # (ship-all 2026-10-03_14-13-08). Anything still staged means a real failure: stop.
        if git("diff", "--cached", "--quiet", check=False)[0] == 0:
            say("SWEEP: another session committed the staged files while this sync was writing "
                "the sweep message; nothing left to commit, continuing.")
            return 0
        die("git commit failed:\n%s%s" % (out, err))
    return len(files)


# ── blob helpers ────────────────────────────────────────────────────────────────────────────
_EMPTY = None


def empty_blob():
    global _EMPTY
    if _EMPTY is None:
        _, out, _ = git("hash-object", "-w", "-t", "blob", "--stdin", stdin=b"")
        _EMPTY = out.strip()
    return _EMPTY


def blob_at(commit, path):
    rc, out, _ = git("rev-parse", "-q", "--verify", "%s:%s" % (commit, path), check=False)
    return out.strip() if rc == 0 else None


def content(sha):
    _, out, _ = git("cat-file", "blob", sha, raw=True)
    return out


def is_binary(data):
    if b"\0" in data[:8000]:
        return True
    try:
        data.decode("utf-8")
        return False
    except UnicodeDecodeError:
        return True


def distance(a, b):
    a, b = a or empty_blob(), b or empty_blob()
    if a == b:
        return 0
    _, out, _ = git("diff", "--numstat", a, b, check=False)
    n = 0
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) >= 2:
            n += (1 if parts[0] == "-" else int(parts[0])) + (1 if parts[1] == "-" else int(parts[1]))
    return n


def versions(tip, base, path):
    """Blob of `path` at every commit in base..tip that touched it (newest first), then at base."""
    _, out, _ = git("log", "--format=%H", "%s..%s" % (base, tip), "--", path, check=False)
    shas = [blob_at(c, path) for c in out.split()]
    shas.append(blob_at(base, path))
    seen, result = set(), []
    for s in shas:
        if s not in seen:
            seen.add(s)
            result.append(s)
    return result


def closest(candidates, target):
    best, bestd = None, None
    for c in candidates:  # newest first; ties keep the newer one
        d = distance(c, target)
        if bestd is None or d < bestd:
            best, bestd = c, d
    return best


def merge3(ours, base, theirs):
    """git merge-file on three blobs. Returns (clean, bytes)."""
    with tempfile.TemporaryDirectory() as d:
        paths = []
        for name, sha in (("local", ours), ("base", base), ("github", theirs)):
            p = os.path.join(d, name)
            with open(p, "wb") as f:
                f.write(content(sha or empty_blob()))
            paths.append(p)
        args = ["merge-file", "-p", "-L", "local", "-L", "base", "-L", "github"] + paths
        rc, out, _ = git(*args, check=False, raw=True)
        return rc == 0, out


# ── step 3: one conflicted file ─────────────────────────────────────────────────────────────
def substantial(line):
    t = line.strip()
    return len(t) >= 12 and any(ch.isalnum() for ch in t)


_DIFFS = {}


def side_changes(base, side):
    """(added, removed): substantial lines `side` really added / deleted relative to `base`.
    A line that appears on both lists only changed indentation or moved within the file, so it is
    dropped from both — it is neither new code nor deleted code."""
    key = (base, side)
    if key not in _DIFFS:
        _, out, _ = git("diff", "-U0", "--no-color", base or empty_blob(), side or empty_blob(), check=False)
        add = [l[1:].strip() for l in out.splitlines()
               if l.startswith("+") and not l.startswith("+++") and substantial(l[1:])]
        rem = [l[1:].strip() for l in out.splitlines()
               if l.startswith("-") and not l.startswith("---") and substantial(l[1:])]
        both = set(add) & set(rem)
        _DIFFS[key] = ([x for x in add if x not in both], [x for x in rem if x not in both])
    return _DIFFS[key]


def added_lines(base, side):
    return side_changes(base, side)[0]


_CHANGED = {}


def changed_files(ref):
    """Files `ref` changed since the merge base (where moved code could have gone)."""
    if ref not in _CHANGED:
        _, out, _ = git("diff", "--name-only", "-z", CTX["mb"], ref, check=False)
        _CHANGED[ref] = [f for f in out.split("\0") if f]
    return _CHANGED[ref]


def has_line(ref, path, line):
    """True when `path` at `ref` has `line` as a whole line (surrounding whitespace ignored)."""
    blob = blob_at(ref, path)
    return bool(blob) and line in (l.strip() for l in content(blob).decode("utf-8", "replace").splitlines())


def moved_to(line, path, refs=None):
    """Other files, changed since the merge base in one of `refs` (default: both sides), that
    have `line` as a WHOLE line in that ref but did NOT have it at the merge base — i.e. the line
    arrived there. A line a file always had (a version string shared by every manifest) and a
    longer line that merely contains it never count."""
    hits = []
    for ref in refs or (CTX["ours"], CTX["theirs"]):
        files = [f for f in changed_files(ref) if f != path]
        if not files:
            continue
        # -z: exact names, never C-quoted (a quoted name would never match again below)
        _, out, _ = git("grep", "-z", "-l", "-F", "-e", line, ref, "--", *files[:2000], check=False)
        found = [h.split(":", 1)[1] if ":" in h else h for h in out.split("\0") if h]
        for name in found:
            if name not in hits and has_line(ref, name, line) and not has_line(CTX["mb"], name, line):
                hits.append(name)
    return hits


def containment(path, holder_bytes, base, side, holder_refs):
    """How many substantial lines `side` added (vs base) are present in `holder_bytes`.
    Returns (added_count, missing_list, moved_file). Missing lines count as MOVED only when every
    one of them is found together in ONE other file that the HOLDER's side changed — that is what
    a real move looks like (content-splitter-v2.ts -> content-splitter-core.ts). `holder_refs` are
    the commits whose tree the holder comes from: finding the missing lines in the OTHER side's
    files proves nothing (2026-09-24: GitHub's `"version": "1.4.196"` in its own tauri.conf.json
    was read as "moved", and a stale LOCAL 1.4.186 won in six version files). Scattered
    look-alikes in unrelated files never count."""
    added = added_lines(base, side)
    have = set(l.strip() for l in holder_bytes.decode("utf-8", "replace").splitlines())
    missing = [a for a in added if a not in have]
    # A "move" of one line is indistinguishable from a coincidence (a version string, a common
    # call), so a lone missing line is always reported missing.
    if len(missing) < 2 or len(missing) > 300:
        return len(added), missing, None
    common = None
    for m in missing:
        where = set(moved_to(m, path, holder_refs))
        common = where if common is None else common & where
        if not common:
            return len(added), missing, None
    return len(added), [], sorted(common)[0]


def also_found_in(lines, path):
    found = []
    for m in lines[:15]:
        for f in moved_to(m, path):
            if f not in found:
                found.append(f)
    return found


def removed_lines(base, side):
    return side_changes(base, side)[1]


def resolve_fake(path, ours, theirs, mb):
    """Return resolved bytes when one version provably covers both sides, else None. Also returns
    the best base for later steps.

    A candidate (ours as-is, GitHub's as-is, or a clean three-way merge from a newer base) is
    accepted ONLY when, measured against the true merge base:
      - every substantial line EITHER side added is in it (or moved to another changed file), and
      - no substantial line EITHER side deliberately deleted is back in it (unless the other side
        added that same line itself).
    Anything less is not a fake conflict and goes on to the docs rule or gets held."""
    base_blob = blob_at(mb, path)
    added = {"o": set(added_lines(base_blob, ours)), "t": set(added_lines(base_blob, theirs))}
    removed = {"o": set(removed_lines(base_blob, ours)), "t": set(removed_lines(base_blob, theirs))}

    def acceptable(result):
        have = set(l.strip() for l in result.decode("utf-8", "replace").splitlines())
        for side, blob in (("o", ours), ("t", theirs)):
            # A line one side added may be missing only if the OTHER side moved it elsewhere.
            refs = (CTX["theirs"],) if side == "o" else (CTX["ours"],)
            _, missing, _ = containment(path, result, base_blob, blob, refs)
            if missing:
                return False
            other = "t" if side == "o" else "o"
            if any(l in have and l not in added[other] for l in removed[side]):
                return False          # the result would undo a deliberate deletion
        return True

    b1 = closest(versions(CTX["theirs"], mb, path), ours)
    b2 = closest(versions(CTX["ours"], mb, path), theirs)
    candidates = [content(ours), content(theirs)]
    for base in (b1, b2):
        ok, out = merge3(ours, base, theirs)
        if ok:
            candidates.append(out)
    for c in candidates:
        if acceptable(c):
            return c, b1
    return None, b1


# ── facts for a human or agent (never a decision) ───────────────────────────────────────────
def fmt_time(t):
    return datetime.datetime.fromtimestamp(t).strftime("%Y-%m-%d %H:%M")


def fmt_gap(sec):
    sec = int(abs(sec))
    d, h, m = sec // 86400, sec % 86400 // 3600, sec % 3600 // 60
    return ("%dd %dh" % (d, h)) if d else ("%dh %dm" % (h, m)) if h else ("%dm" % m)


def side_history(ref, path):
    """[(sha, time, subject)] for every commit on ref's side that changed path, newest first."""
    _, out, _ = git("log", "--format=%H%x1f%ct%x1f%s", "%s..%s" % (CTX["mb"], ref), "--", path,
                    check=False)
    return [(r[0], int(r[1]), r[2]) for r in (x.split("\x1f") for x in out.splitlines()) if len(r) == 3]


def nlines(blob):
    return len(content(blob).splitlines()) if blob else 0


def quote(path):
    return "'" + path.replace("'", "'\\''") + "'"


def facts(path, ours, theirs):
    """Plain, exact facts about one conflicted file. Returns (block for the .held file, one-line
    summary for the to-do list). Facts only; the reasoning is the reader's job."""
    mb = CTX["mb"]
    base_blob = blob_at(mb, path)
    _, mbt, _ = git("log", "-1", "--format=%ct", mb)
    L = ["FACTS (computed by sync-main from git)", "",
         "THE TWO VERSIONS",
         "  LOCAL  = the version that was on this Mac. It is saved below, in this .held file.",
         "  GITHUB = the version from GitHub. It is LIVE in the repo right now, at %s" % path,
         "  Both grew from the same COMMON version: commit %s, %s." % (mb[:10], fmt_time(int(mbt))), ""]

    L.append("WHEN EACH SIDE CHANGED THIS FILE (newest first)")
    latest = {}
    for name, ref in (("LOCAL", CTX["ours"]), ("GITHUB", CTX["theirs"])):
        L.append("  %s:" % name)
        rows = side_history(ref, path)
        if name == "LOCAL" and path in MTIMES:
            L.append("    %s  (uncommitted edit; the time the file was last saved on this Mac)" % fmt_time(MTIMES[path]))
            latest[name] = MTIMES[path]
        for sha, t, subj in rows:
            if subj == LOCAL_MSG:
                L.append("    %s  %s  collected by the sync; the edit itself happened at or before this time"
                         % (fmt_time(t), sha[:10]))
            else:
                L.append('    %s  %s  "%s"' % (fmt_time(t), sha[:10], subj))
        if not rows and name not in latest:
            L.append("    (no change on this side)")
        if name not in latest:
            real = [r for r in rows if r[2] != LOCAL_MSG]
            if real:
                latest[name] = real[0][1]
    if "LOCAL" in latest and "GITHUB" in latest:
        gap = latest["LOCAL"] - latest["GITHUB"]
        if gap > 0:
            L.append("  LOCAL's latest change is %s AFTER GITHUB's latest change." % fmt_gap(gap))
        elif gap < 0:
            L.append("  GITHUB's latest change is %s AFTER LOCAL's latest change." % fmt_gap(gap))
        else:
            L.append("  Both sides' latest changes have the same time.")
    else:
        L.append("  Which side changed it last is UNKNOWN (the local edit was never committed and its "
                 "save time was not recorded).")
    L += ["", "SIZE: common version %d lines, LOCAL %d lines, GITHUB %d lines"
          % (nlines(base_blob), nlines(ours), nlines(theirs)), ""]

    L.append("WHAT EACH SIDE DID, compared with the common version")
    for name, blob in (("LOCAL", ours), ("GITHUB", theirs)):
        if not blob:
            L.append("  %s deleted the whole file." % name)
            continue
        L.append("  %s added %d lines and removed %d lines." % (
            name, len(added_lines(base_blob, blob)), len(removed_lines(base_blob, blob))))
    L.append("")

    L.append("CODE ONE SIDE HAS THAT THE OTHER DOES NOT")
    summary = []
    for name, blob in (("LOCAL", ours), ("GITHUB", theirs)):
        if not blob:
            summary.append("%s deleted the file" % name)
    for holder, hname, side, sname in ((ours, "LOCAL", theirs, "GITHUB"), (theirs, "GITHUB", ours, "LOCAL")):
        if not holder or not side:
            continue
        refs = (CTX["ours"],) if hname == "LOCAL" else (CTX["theirs"],)
        n, missing, moved = containment(path, content(holder), base_blob, side, refs)
        if n == 0:
            L.append("  %s added no lines of its own." % sname)
            continue
        line = "  %s has %d of the %d lines %s added" % (hname, n - len(missing), n, sname)
        if moved:
            line += "; the rest were MOVED, all together, into %s" % moved
        L.append(line + ".")
        summary.append("%s lacks %d of %s's %d new lines%s" % (
            hname, len(missing), sname, n, " (moved to %s)" % moved if moved else ""))
        if missing:
            L.append("    Lines %s added that %s does NOT have:" % (sname, hname))
            L += ["      | " + m[:140] for m in missing[:15]]
            if len(missing) > 15:
                L.append("      | ... and %d more" % (len(missing) - 15))
            elsewhere = also_found_in(missing, path)
            if elsewhere:
                L.append("    (some of those lines also appear in other changed files, which may be a "
                         "coincidence: %s)" % ", ".join(elsewhere[:4]))
        have = set(l.strip() for l in content(holder).decode("utf-8", "replace").splitlines())
        undone = [r for r in removed_lines(base_blob, side) if r in have]
        if undone:
            L.append("    Lines %s deliberately REMOVED that %s still has: %d" % (sname, hname, len(undone)))
            L += ["      | " + m[:140] for m in undone[:10]]
    lt = "LOCAL latest %s" % (fmt_time(latest["LOCAL"]) if "LOCAL" in latest else "unknown")
    gt = "GITHUB latest %s" % (fmt_time(latest["GITHUB"]) if "GITHUB" in latest else "unknown")
    L += ["", "COMPARE THEM (the labels are correct; '-' lines are GITHUB, '+' lines are LOCAL):",
          "  diff -u --label 'GITHUB (live)' --label 'LOCAL (held)' <(git show %s:%s) <(git show %s:%s)"
          % (CTX["theirs"][:12], quote(path), CTX["ours"][:12], quote(path)), "",
          "RECOVER EITHER VERSION FOREVER (works even after this .held file is deleted):",
          "  LOCAL : git show %s:%s" % (CTX["ours"][:12], quote(path)),
          "  GITHUB: git show %s:%s" % (CTX["theirs"][:12], quote(path)), ""]
    one_line = "%s; %s; %s; recover: git show %s:%s / %s:%s" % (
        lt, gt, "; ".join(summary) or "no line differences", CTX["ours"][:10], quote(path),
        CTX["theirs"][:10], quote(path))
    return "\n".join(L) + "\n", one_line


HUNK = re.compile(rb"^<<<<<<< local\n(.*?)^=======\n(.*?)^>>>>>>> github\n", re.S | re.M)


def resolve_docs(path, ours, base, theirs, when=""):
    """Keep both sides of every clash when the file is a doc, or every clash is comments only."""
    style = style_for(path)
    if style is None:
        return None
    ok, merged = merge3(ours, base, theirs)
    if ok:
        # A clean merge here already FAILED resolve_fake's lossless check (same base), so taking it
        # would silently drop lines. Never: it is held instead. (2026-09-24, matrx-local lockfile.)
        return None
    hunks = list(HUNK.finditer(merged))
    if not hunks:
        return None
    prefixes, write = style
    is_doc = os.path.splitext(path)[1].lower() in DOC_EXTS
    if not is_doc:
        for h in hunks:
            for side in (h.group(1), h.group(2)):
                for line in side.decode("utf-8").splitlines():
                    s = line.strip()
                    if s and not s.startswith(prefixes):
                        return None       # real code in the clash
    top = (write(DOCS_MARK + " — two versions follow: LOCAL first, then GITHUB. " + when +
                 " Delete these three marker lines when resolved.") + "\n").encode()
    mid = (write(DOCS_MARK + " — GITHUB version below") + "\n").encode()
    end = (write(DOCS_MARK + " — end of both versions") + "\n").encode()
    out = HUNK.sub(lambda h: top + h.group(1) + mid + h.group(2) + end, merged)
    if b"<<<<<<< local" in out:
        return None
    return out


def write_live(path, data, mode):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)
    if mode == "100755":
        os.chmod(path, 0o755)
    git("add", "--", path)


def hold(path, ours, theirs, stamp, reason, fact_block, theirs_mode):
    """GitHub's version goes live; ours is saved under _conflicts/<stamp>/<path>.held."""
    held = os.path.join(HOLD_ROOT, stamp, path + ".held")
    os.makedirs(os.path.dirname(held), exist_ok=True)
    header = ("%s\n\n"
              "HELD CONFLICT, written by scripts/sync-main.py\n"
              "File:      %s\n"
              "Why held:  %s\n"
              "GITHUB's version is live in the repo at the path above. LOCAL's version is at the bottom\n"
              "of this file, below the FACTS.\n"
              "Done with it: the final code is in the live file, this .held file is deleted, and its line\n"
              "in %s is deleted. The list of open items is %s.\n\n%s"
              "---------------- LOCAL VERSION BELOW ----------------\n"
              % (HELD_MARK, path, reason, LOG_REL, LOG_REL, fact_block)).encode()
    body = b"(the local side deleted this file)\n"
    binary = False
    if ours:
        body = content(ours)
        binary = is_binary(body)
    if binary:
        with open(held, "wb") as f:
            f.write(body)
        with open(held + "-note.txt", "wb") as f:
            f.write(header.replace(b"Below is", b"Next to this note (" + os.path.basename(held).encode()
                                   + b") is"))
    else:
        with open(held, "wb") as f:
            f.write(header + body)
    if theirs:
        write_live(path, content(theirs), theirs_mode)
    else:
        git("rm", "-q", "--cached", "--ignore-unmatch", "--", path)
        if os.path.lexists(path):
            os.remove(path)
    return held


def clear_untracked_blockers(merge_output, stamp):
    """Clear the untracked files a merge refused to overwrite. A file byte-identical to GitHub's
    copy is removed (the merge brings it back unchanged); a different one is moved, not lost, to
    _conflicts/<stamp>/<path>.held and listed as a held item. Returns the held entries."""
    paths, listing = [], False
    for line in merge_output.splitlines():
        if "would be overwritten by merge" in line:
            listing = True
        elif listing and line.startswith("\t"):
            paths.append(line.strip())
        elif listing:
            listing = False
    held = []
    for path in paths:
        if not os.path.isfile(path):
            continue
        theirs = blob_at("%s/%s" % (REMOTE, BRANCH), path)
        mine = open(path, "rb").read()
        if theirs and content(theirs) == mine:
            os.remove(path)
            say("untracked %s is identical to GitHub's copy: removed so the merge can bring it." % path)
            continue
        dest = held_copy_path(os.path.join(HOLD_ROOT, stamp), path, ".held")
        shutil.move(path, dest)
        say("UNTRACKED FILE BLOCKED THE MERGE: %s moved to %s (GitHub's version goes live)." % (path, dest))
        held.append((path, dest, "untracked local copy differed from GitHub's; compare and keep the upgrade"))
    if held:
        update_log(stamp, [], held)
        git("add", "--", HOLD_ROOT)
    return held


def _overwritten_paths(merge_output):
    paths, listing = [], False
    for line in merge_output.splitlines():
        if "would be overwritten by merge" in line:
            listing = True
        elif listing and line.startswith("\t"):
            paths.append(line.strip())
        elif listing:
            listing = False
    return paths


def park_dirty_blockers(merge_output):
    """Set aside the uncommitted edits to TRACKED files a merge refused to overwrite — typically
    files the sweep held because they need a package npm has not served yet. Each file's local
    bytes are kept (in memory and in .git/sync-main-parked/ in case this run dies) and the file is
    reset to HEAD so the merge can run; restore_parked() puts the edits back afterwards. Returns
    [(path, local_bytes, head_bytes_or_None)]."""
    _, gd, _ = git("rev-parse", "--git-dir")
    park_dir = os.path.join(gd.strip(), "sync-main-parked")
    parked = []
    for path in _overwritten_paths(merge_output):
        if not os.path.isfile(path):
            continue
        sha = blob_at("HEAD", path)
        if not sha:
            continue
        mine = open(path, "rb").read()
        backup = os.path.join(park_dir, path)
        os.makedirs(os.path.dirname(backup), exist_ok=True)
        with open(backup, "wb") as f:
            f.write(mine)
        base = content(sha)
        with open(path, "wb") as f:
            f.write(base)
        say("held edits to %s blocked the merge: set aside (copy in %s) and re-applied after it."
            % (path, backup))
        parked.append((path, mine, base))
    return parked


def restore_parked(parked, stamp):
    """Re-apply parked local edits on top of what the merge left at each path, still uncommitted.
    Edits that touch lines the merge also changed are moved to _conflicts/<stamp>/<path>.held
    (the merged version stays live). Returns the held entries."""
    held = []
    _, gd, _ = git("rev-parse", "--git-dir")
    park_dir = os.path.join(gd.strip(), "sync-main-parked")
    for path, mine, base in parked:
        sha = blob_at("HEAD", path)
        new = content(sha) if sha else None
        merged = None
        if new is None:
            merged = None
        elif new == base:
            merged = mine
        elif not (is_binary(mine) or is_binary(base) or is_binary(new)):
            d = tempfile.mkdtemp(prefix="sync-main-park-")
            try:
                files = []
                for name, data in (("mine", mine), ("base", base), ("new", new)):
                    fp = os.path.join(d, name)
                    with open(fp, "wb") as f:
                        f.write(data)
                    files.append(fp)
                r = subprocess.run(["git", "merge-file", "-p", *files], capture_output=True)
                if r.returncode == 0:
                    merged = r.stdout
            finally:
                shutil.rmtree(d, ignore_errors=True)
        if merged is not None:
            with open(path, "wb") as f:
                f.write(merged)
            say("re-applied the held edits to %s on top of the merge (still uncommitted)." % path)
        else:
            dest = held_copy_path(os.path.join(HOLD_ROOT, stamp), path, ".held")
            with open(dest, "wb") as f:
                f.write(mine)
            say("HELD EDITS CLASHED WITH GITHUB: %s — GitHub's version is live, the local copy is %s."
                % (path, dest))
            held.append((path, dest, "uncommitted held edits clashed with GitHub's change; compare "
                                     "and keep the upgrade"))
        try:
            os.remove(os.path.join(park_dir, path))
        except OSError:
            pass
    if held:
        update_log(stamp, [], held)
        git("add", "--", HOLD_ROOT)
    return held


def stages(path):
    _, out, _ = git("ls-files", "-u", "-z", "--", path)
    st = {}
    for rec in out.split("\0"):
        if not rec:
            continue
        meta, _ = rec.split("\t", 1)
        mode, sha, n = meta.split()
        st[int(n)] = (mode, sha)
    return st


def superseding_side(path, ours, theirs, mb):
    """'theirs' when LOCAL's exact blob is one GitHub's own history held after the merge base (and
    GitHub then changed or deleted it); 'ours' for the mirror case; else None. Equal to the base
    never counts: a side that left the file alone is not in conflict."""
    base_blob = blob_at(mb, path)
    if ours and ours != base_blob and ours != theirs and ours in versions(CTX["theirs"], mb, path):
        return "theirs"
    if theirs and theirs != base_blob and theirs != ours and theirs in versions(CTX["ours"], mb, path):
        return "ours"
    return None


def parent_side(ref, path, mode):
    """(blob, mode) of `path` in commit `ref`, or (None, mode) when that commit lacks it. A missing
    index stage is not proof that a side deleted the file; the side's own commit is."""
    _, out, _ = git("ls-tree", "-z", ref, "--", path, check=False)
    rec = out.split("\0")[0]
    if rec and "\t" in rec:
        meta, name = rec.split("\t", 1)
        m, typ, sha = meta.split()
        if typ == "blob" and name == path:
            return sha, m
    return None, mode


def decide(path, ours, theirs, ours_mode, theirs_mode, stamp, mb):
    """Resolve ONE conflicted file. Returns ('fixed'|'docs'|'held', held_path_or_None, summary)."""
    def held(reason):
        block, summary = facts(path, ours, theirs)
        return "held", hold(path, ours, theirs, stamp, reason, block, theirs_mode), summary

    # One side's version is one the OTHER side already had after the merge base and then moved past
    # (the same commit replayed under another SHA): that side adds nothing, the other side's current
    # version (a change or a deletion) is the later decision. 2026-10-16: 32 of 34 holds were this.
    winner = superseding_side(path, ours, theirs, mb)
    if winner == "theirs":
        if theirs:
            write_live(path, content(theirs), theirs_mode)
        else:
            git("rm", "-q", "--ignore-unmatch", "--", path)
        return "fixed", None, ""
    if winner == "ours":
        if ours:
            write_live(path, content(ours), ours_mode)
        else:
            git("rm", "-q", "--ignore-unmatch", "--", path)
        return "fixed", None, ""
    if not ours or not theirs:
        return held("deleted on one side, changed on the other")
    mode = ours_mode or theirs_mode
    if mode == "120000" or is_binary(content(ours)) or is_binary(content(theirs)):
        return held("binary or symlink file")
    data, base = resolve_fake(path, ours, theirs, mb)
    if data is not None:
        write_live(path, data, mode)
        return "fixed", None, ""
    _, summary = facts(path, ours, theirs)
    data = resolve_docs(path, ours, base, theirs, when="(" + summary + ")")
    if data is not None:
        write_live(path, data, mode)
        return "docs", None, summary
    return held("both sides changed the same code")


def resolve_all(stamp):
    _, mb, _ = git("merge-base", "HEAD", "MERGE_HEAD")
    mb = mb.strip()
    _, o, _ = git("rev-parse", "HEAD")
    _, t, _ = git("rev-parse", "MERGE_HEAD")
    CTX.update(ours=o.strip(), theirs=t.strip(), mb=mb)
    _CHANGED.clear()
    _, out, _ = git("diff", "--name-only", "--diff-filter=U", "-z")
    files = [f for f in out.split("\0") if f]
    fixed, docs, held = [], [], []
    for path in files:
        st = stages(path)
        if not st:
            # Listed as conflicted a moment ago, no unmerged stage now: another writer in this
            # shared checkout (a second sync, an agent's `git add`) resolved it in between. Reading
            # "no stage" as "deleted" committed two files both parents had as DELETED (common-docs
            # 9e373e994a, 2026-10-22). Their resolution stands -- unless what they staged still
            # holds conflict markers (a `git add` of git's own marked-up file): then it is decided
            # here from the two parent commits, like any other conflict.
            if not staged_marker_files([path]):
                say("CONFLICT ALREADY RESOLVED by another writer, left as it is: %s" % path)
                continue
            say("CONFLICT STAGED WITH MARKERS by another writer, deciding it again: %s" % path)
        ours_mode, ours = st.get(2, (None, None))
        theirs_mode, theirs = st.get(3, (None, None))
        # A side counts as deleted only when its commit really lacks the file.
        ours, ours_mode = ours and (ours, ours_mode) or parent_side(CTX["ours"], path, ours_mode)
        theirs, theirs_mode = theirs and (theirs, theirs_mode) or parent_side(CTX["theirs"], path, theirs_mode)
        kind, held_path, summary = decide(path, ours, theirs, ours_mode, theirs_mode, stamp, mb)
        if kind == "fixed":
            fixed.append(path)
        elif kind == "docs":
            docs.append((path, summary))
        else:
            held.append((path, held_path, summary))
    return fixed, docs, held


# ── the to-do file ──────────────────────────────────────────────────────────────────────────
LOG_HEADER = """# Merge conflicts from scripts/sync-main.py

This folder is permanent. When every list below is empty, nothing from `scripts/sync-main.py` is
open in this repo. (`scripts/sync-main.py` removes empty folders left inside it on every run.)

## What the items are
- **Held file** — `_conflicts/<stamp>/<path>.held`. LOCAL and GITHUB changed the same code.
  GITHUB's version is live in the repo at `<path>`; LOCAL's version is inside the `.held` file,
  below a FACTS block computed from git. Both versions stay in git permanently; each `.held` file
  has the `git show` commands that print either one.
- **Docs/comments, both versions kept** — a file in the repo where a clashing passage now holds
  both versions between three marker lines (LOCAL first, then GITHUB).

## Marking an item done
- Held file: the final code is in `<path>`, the `.held` file is deleted, its line below is deleted.
- Docs/comments: the passage is edited, the three marker lines are deleted, its line below is deleted.
- `python3 scripts/check-conflict-markers.py` lists everything still open, or prints `clean`.
- `python3 scripts/sync-main.py` commits and syncs.

## Escalation
An item is passed up by moving its line to the next section (Needs a manager -> Needs the boss
agent -> Needs Arman) with ` — <question> — <what was checked> — <who>` added to the end of it.
Its files stay as they are.

## Held files

## Needs a manager

## Needs the boss agent

## Needs Arman

## Docs and comments — both versions kept
"""
HELD_H = "## Held files"
DOCS_H = "## Docs and comments"


def insert_in_section(text, heading, block):
    """Insert `block` at the end of the section that starts with `heading` (before the next ## )."""
    i = text.index(heading)
    j = text.find("\n## ", i + len(heading))
    if j == -1:
        return text.rstrip("\n") + "\n" + block
    return text[:j].rstrip("\n") + "\n" + block + "\n" + text[j + 1:]


def update_log(stamp, docs, held):
    if not docs and not held:
        return
    os.makedirs(HOLD_ROOT, exist_ok=True)
    text = open(LOG_REL).read() if os.path.exists(LOG_REL) else LOG_HEADER
    for h in (HELD_H, DOCS_H):
        if h not in text:
            text = text.rstrip("\n") + "\n\n" + h + "\n"
    if held:
        text = insert_in_section(text, HELD_H, "".join(
            "- %s — %s\n" % (hp, s) if s else "- %s\n" % hp for _, hp, s in held))
    if docs:
        text = insert_in_section(text, DOCS_H, "".join(
            "- %s — %s\n" % (p, s) if s else "- %s\n" % p for p, s in docs))
    with open(LOG_REL, "w") as f:
        f.write(text)
    git("add", "--", LOG_REL)


def listed_items(log_path):
    """Items listed under the item sections of the tracker (Held files, Needs *, Docs and
    comments). Bullets in the explanatory sections at the top are not items."""
    items, in_items = [], False
    if not os.path.exists(log_path):
        return items
    for line in open(log_path):
        if line.startswith("## "):
            in_items = line.startswith(("## Held files", "## Needs", "## Docs and comments"))
        elif in_items and line.startswith("- "):
            items.append(line[2:].split(" — ")[0].strip())
    return items


def prune():
    """Housekeeping, announced: delete empty folders under _conflicts/ (git does not track empty
    folders, so they are pure leftovers), and create _conflicts/README.md if it is missing. The
    folder and its README are permanent: an empty list means nothing is open."""
    if os.path.isdir(HOLD_ROOT):
        removed = 0
        for root, dirs, files in os.walk(HOLD_ROOT, topdown=False):
            if root != HOLD_ROOT and not os.listdir(root):
                os.rmdir(root)
                removed += 1
        if removed:
            say("pruned %d empty folder(s) left under %s/" % (removed, HOLD_ROOT))
    if not os.path.exists(LOG_REL):
        os.makedirs(HOLD_ROOT, exist_ok=True)
        with open(LOG_REL, "w") as f:
            f.write(LOG_HEADER)
        say("created %s" % LOG_REL)


def replay(args):
    """Recreate the state right after a past sync for the given files, using TODAY's rules."""
    if len(args) < 2:
        die("usage: python3 scripts/sync-main.py --replay <sync merge commit> <path> [<path> ...]")
    m = args[0]
    rc, ours_ref, _ = git("rev-parse", "-q", "--verify", m + "^1", check=False)
    rc2, theirs_ref, _ = git("rev-parse", "-q", "--verify", m + "^2", check=False)
    if rc or rc2:
        die("%s is not a merge commit (it needs two parents)." % m)
    ours_ref, theirs_ref = ours_ref.strip(), theirs_ref.strip()
    _, mb, _ = git("merge-base", ours_ref, theirs_ref)
    CTX.update(ours=ours_ref, theirs=theirs_ref, mb=mb.strip())
    stamp = "replay-" + datetime.datetime.now().strftime("%Y-%m-%d-%H%M%S")
    fixed, docs, held = [], [], []
    for path in args[1:]:
        def tree_entry(ref):
            _, out, _ = git("ls-tree", ref, "--", path)
            parts = out.split()
            return (parts[0], parts[2]) if len(parts) >= 3 else (None, None)
        ours_mode, ours = tree_entry(ours_ref)
        theirs_mode, theirs = tree_entry(theirs_ref)
        kind, held_path, summary = decide(path, ours, theirs, ours_mode, theirs_mode, stamp, CTX["mb"])
        if kind == "fixed":
            fixed.append(path)
        elif kind == "docs":
            docs.append((path, summary))
        else:
            held.append((path, held_path, summary))
    update_log(stamp, docs, held)
    if held or docs:
        git("add", "--", HOLD_ROOT)
    git("add", "--", *args[1:])
    git("commit", "--no-verify", "-q", "-m", "sync-main --replay %s: %d auto-fixed, %d docs/comments flagged, "
        "%d held (recreated for a re-test)" % (m[:10], len(fixed), len(docs), len(held)), "--",
        *([HOLD_ROOT] if (held or docs) else []), *args[1:])
    report(fixed, docs, held, "replayed %s with today's rules (committed locally, not pushed)" % m[:10])


PACKAGE_FILES = ("package.json", "pnpm-lock.yaml", "package-lock.json")

# THE PUBLISH TRAIN (2026-10-07). aidream publishes @ai-matrx packages from GitHub Actions: every
# push to its main runs "Nominate changed npm packages", which tags each changed package and
# dispatches one "Publish TypeScript Package to npm" run per package, in dependency order (1-10
# minutes each). ship-all ships aidream seconds before this repo, so the package update below read
# npm while those tarballs were still building and locked the previous versions. It now waits
# (bounded) for every publish run ALREADY IN FLIGHT when the sync reached this step. It does not
# wait for nominations: one nomination walks the whole dependency graph and outlived a 10-minute
# wait on the first live run (2026-10-07 22:21), and with ~30 developers pushing aidream the train
# is never idle. What a later publish brings, the sweep hold (sweep_holds) keeps off main until a
# sync whose packages serve it.
PUBLISH_REPO = "AI-Matrix-Engine/aidream"
PUBLISH_WORKFLOW = "Publish TypeScript Package to npm"
PUBLISH_WAIT_MAX_SECONDS = 6 * 60    # agent-chosen: one publish run took 1-10 min on 2026-10-07. Review 2026-11-07.
PUBLISH_POLL_SECONDS = 20


def _gh_runs():
    r = subprocess.run(["gh", "run", "list", "-R", PUBLISH_REPO, "--limit", "100", "--json",
                        "status,workflowName,name,createdAt"], capture_output=True, text=True,
                       timeout=60)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout).strip()[-300:])
    out = []
    for run in json.loads(r.stdout or "[]"):
        ts = datetime.datetime.strptime(run["createdAt"], "%Y-%m-%dT%H:%M:%SZ").replace(
            tzinfo=datetime.timezone.utc).timestamp()
        out.append((run["workflowName"], run["status"] != "completed", ts, run.get("name") or ""))
    return out


def wait_for_publish_train(now=time.time, sleep=time.sleep, runs=_gh_runs):
    """Block until every npm publish run that was in flight when this was called has finished, at
    most PUBLISH_WAIT_MAX_SECONDS. Returns one line for the report."""
    if os.environ.get("MATRX_PUBLISH_TRAIN_WAITED") == "1":
        # ship-all already waited for the runs aidream's push started (THE PACKAGE ORDER).
        return "publish train: ship-all already waited"
    t0 = now()
    waited_for = set()
    last_shown = ""
    while True:
        try:
            listing = runs()
        except (OSError, ValueError, RuntimeError, subprocess.TimeoutExpired) as e:
            say("PUBLISH TRAIN NOT MEASURED (gh run list -R %s failed: %s) — updating packages "
                "without waiting; a package still publishing is locked at its previous version."
                % (PUBLISH_REPO, e))
            return "publish train: not measured"
        publishing = sorted(n for (wf, active, ts, n) in listing if wf == PUBLISH_WORKFLOW and active and ts < t0)
        waited_for.update(publishing)
        if not publishing:
            if not waited_for:
                return "publish train: nothing in flight"
            return "publish train: waited %ds for %s" % (int(now() - t0), ", ".join(sorted(waited_for)))
        if now() - t0 >= PUBLISH_WAIT_MAX_SECONDS:
            say("PUBLISH RUNS STILL IN FLIGHT after %d min (%s) — updating to what npm serves now; a "
                "file that needs a later version stays held by the sweep until a sync that has it."
                % (PUBLISH_WAIT_MAX_SECONDS // 60, ", ".join(publishing[:6])))
            return "publish train: gave up after %d min" % (PUBLISH_WAIT_MAX_SECONDS // 60)
        showing = ", ".join(publishing[:6])
        if showing != last_shown:
            say("waiting for @ai-matrx publish runs already in flight: %s" % showing)
            last_shown = showing
        sleep(PUBLISH_POLL_SECONDS)


# NEVER ADOPT A PACKAGE VERSION THAT ONLY BREAKS THE BUILD (2026-10-07). Every @ai-matrx dependency
# is "latest", so the update below adopts whatever a package last published — including a release
# that deleted or moved what this repo still imports: chat 0.4.0 deleted agents/model-registry
# (v0.4.2980), chat moved ui/markdown-stream (v0.4.2984-85) and utils/content-ir/kinds
# (v0.4.2989), kit dropped json-extract (v0.4.2990), a chat graph change pulled fetch/IndexedDB into
# the kind sandbox (v0.4.2922, 2924, 2986). The same checks Vercel would fail on — every
# @ai-matrx import resolves against the installed packages (check-matrx-imports) and the kind
# sandbox bundle builds — are measured before and after the update. An update that adds a failure
# and fixes none is NOT committed: it ran in a scratch tree, so this checkout's lockfile and
# node_modules never moved, and the package and the files it breaks are named. Releases keep shipping on the
# versions the code builds with; the update is retried every sync.
ITEM_LINE = re.compile(r"^MATRX-ITEM (\{.*\})\s*$", re.M)
LOCKED = re.compile(r"^\s+'?(@ai-matrx/[a-z0-9._-]+)@(\d[^('\":\s]*)", re.M)


def package_health(d, tool):
    """{'imports': {key: title} | None, 'sandbox': True | False | None} for folder d.
    None = not measured (the check is absent or could not run)."""
    health = {"imports": None, "sandbox": None}
    guard = os.path.join(d, "scripts", "check-matrx-imports.mjs")
    if os.path.isfile(guard):
        try:
            r = subprocess.run(["node", guard], cwd=d, capture_output=True, text=True, timeout=600,
                               env=dict(os.environ, MATRX_ITEMS="1"))
            if "MATRX-ITEMS-END" in r.stdout and r.returncode in (0, 1):
                items = {}
                for m in ITEM_LINE.finditer(r.stdout):
                    try:
                        it = json.loads(m.group(1))
                        items[it["key"]] = it.get("title") or it["key"]
                    except (ValueError, KeyError):
                        continue
                health["imports"] = items
        except (OSError, subprocess.TimeoutExpired):
            pass
    try:
        with open(os.path.join(d, "package.json")) as f:
            scripts = json.load(f).get("scripts") or {}
    except (OSError, ValueError):
        scripts = {}
    if "build:kind-sandbox" in scripts:
        try:
            r = subprocess.run([tool, "run", "-s", "build:kind-sandbox"], cwd=d, capture_output=True,
                               text=True, timeout=600)
            health["sandbox"] = r.returncode == 0
            health["sandbox_tail"] = (r.stdout + r.stderr).strip().splitlines()[-6:]
        except (OSError, subprocess.TimeoutExpired):
            pass
    return health


def update_breaks_build(before, after):
    """[(what broke)] when the update adds a failure and fixes none; [] to adopt it."""
    broke, fixed = [], []
    if before["imports"] is not None and after["imports"] is not None:
        for k in sorted(set(after["imports"]) - set(before["imports"])):
            broke.append(after["imports"][k])
        fixed += sorted(set(before["imports"]) - set(after["imports"]))
    if before["sandbox"] is True and after["sandbox"] is False:
        broke.append("the kind sandbox bundle no longer builds: " + " / ".join(after.get("sandbox_tail") or [])[-400:])
    if before["sandbox"] is False and after["sandbox"] is True:
        fixed.append("kind sandbox")
    return broke if broke and not fixed else []


def locked_versions(text):
    return {m.group(1): m.group(2) for m in LOCKED.finditer(text or "")}



def _trial_files(d, ignored_out=None):
    """Every file folder d's checkout holds (tracked + untracked-not-ignored), relative to d.
    ignored_out (a list) also receives what git IGNORES there, whole ignored folders collapsed to one
    `dir/` entry: the folders NOT in that list's ancestry hold only trial files, so each is cloned in
    one call (clone_plan). Both listings run at once — each is a full stat walk of the checkout."""
    cmd = ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"]
    ign = None
    if ignored_out is not None:
        ign = subprocess.Popen(["git", "ls-files", "-z", "--others", "--ignored", "--exclude-standard",
                                "--directory"], cwd=d, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    r = subprocess.run(cmd, cwd=d, capture_output=True)
    if ign is not None:
        out, _ = ign.communicate()
        if ign.returncode != 0:
            return None
        ignored_out.extend(e for e in out.decode("utf-8", "replace").split("\0") if e)
    if r.returncode != 0:
        return None
    rels = []
    for rel in r.stdout.decode("utf-8", "replace").split("\0"):
        if rel and (os.path.isfile(os.path.join(d, rel)) or os.path.islink(os.path.join(d, rel))):
            rels.append(rel)
    return sorted(set(rels))


# TRIAL TREES DIE WITH THE PROCESS (2026-10-21). A sync killed mid-trial left 12 abandoned
# `sync-main-package-trial-*` copies of the checkout in $TMPDIR, each competing for disk. Every tree is
# recorded here, removed at exit and on SIGTERM / SIGINT / SIGHUP, and stamped with the owner's pid so
# the sweep at the next start can tell a dead run's tree from a live one's.
TRIAL_PREFIX = "sync-main-package-trial-"
TRIAL_OWNER = ".sync-main-owner"
TRIAL_MAX_AGE = 2 * 3600
_TRIALS = set()
_HANDLERS_ON = False


def _remove_trials():
    for t in list(_TRIALS):
        drop_trial_tree(t)


def _on_signal(signum, _frame):
    _remove_trials()
    signal.signal(signum, signal.SIG_DFL)
    os.kill(os.getpid(), signum)   # die the way the sender asked, after the cleanup


def _arm_trial_cleanup():
    global _HANDLERS_ON
    if _HANDLERS_ON:
        return
    _HANDLERS_ON = True
    atexit.register(_remove_trials)
    for sig in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
        try:
            signal.signal(sig, _on_signal)
        except (ValueError, OSError):   # not the main thread
            pass


def drop_trial_tree(path):
    """Remove a trial tree WITHOUT waiting for it (2026-10-22: removing one ~38k-file tree took 877 s at
    load average ~175, all of it inside the single-flight lock). The tree is renamed aside at once — the
    name keeps TRIAL_PREFIX, so sweep_old_trials() finishes any removal that dies — and a detached
    `rm -rf` deletes it after this process has moved on. Where that cannot start, it is removed here."""
    _TRIALS.discard(path)
    if not os.path.lexists(path):
        return
    aside = path + ".removing"
    try:
        os.rename(path, aside)
        subprocess.Popen(["rm", "-rf", aside], start_new_session=True, stdin=subprocess.DEVNULL,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except OSError:
        shutil.rmtree(aside if os.path.lexists(aside) else path, ignore_errors=True)


def _cwds_of_live_processes():
    """Every working directory a running process holds (one lsof call), or None when it cannot be read."""
    try:
        r = subprocess.run(["lsof", "-d", "cwd", "-Fn"], capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.TimeoutExpired):
        return None
    return [l[1:] for l in r.stdout.splitlines() if l.startswith("n")]


def sweep_old_trials(now=time.time, tmp_root=None, max_age=TRIAL_MAX_AGE):
    """Remove `sync-main-package-trial-*` folders older than max_age that no live process owns.
    Owner = the pid stamped inside (alive), or any process whose cwd is inside it. Returns removed paths."""
    root = tmp_root or os.path.realpath(tempfile.gettempdir())
    removed = []
    try:
        names = [n for n in os.listdir(root) if n.startswith(TRIAL_PREFIX)]
    except OSError:
        return removed
    cwds = None
    for n in sorted(names):
        path = os.path.join(root, n)
        try:
            age = now() - os.stat(path).st_mtime
        except OSError:
            continue
        if age < max_age or path in _TRIALS:
            continue
        pid = (_read(os.path.join(path, TRIAL_OWNER)) or b"").decode("utf-8", "replace").strip()
        if pid.isdigit() and _pid_alive(int(pid)):
            continue
        if cwds is None:
            cwds = _cwds_of_live_processes()
        if cwds is None:
            return removed   # cannot prove nobody owns it: leave every one
        if any(c == path or c.startswith(path + os.sep) for c in cwds):
            continue
        shutil.rmtree(path, ignore_errors=True)
        removed.append(path)
    if removed:
        say("removed %d abandoned package-trial folder(s) older than %d h: %s"
            % (len(removed), max_age // 3600, ", ".join(os.path.basename(r) for r in removed)))
    return removed


_CLONE_STATS = {"cloned": 0, "fallback": 0, "calls": 0}


CLONE_THREADS = 8   # 2026-10-22, at load average ~175: 1,791 folder/file clones took 51.6 s on one thread, 11.3 s on 8


def clone_files(src_dir, dst_dir, rels):
    """Clone each rel (a file, or a whole folder) from src_dir into dst_dir with clonefile(2)
    (macOS/APFS), CLONE_THREADS at a time. Returns the rels it could NOT clone (all of them off macOS),
    for the caller to copy the slow way."""
    import ctypes
    import ctypes.util
    from concurrent.futures import ThreadPoolExecutor
    try:
        libc = ctypes.CDLL(ctypes.util.find_library("c") or "libc.dylib", use_errno=True)
        clonefile = libc.clonefile
        clonefile.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_uint32]
    except (OSError, AttributeError):
        _CLONE_STATS["fallback"] += len(rels)
        return list(rels)
    rels = list(rels)
    for parent in sorted({os.path.dirname(os.path.join(dst_dir, rel)) for rel in rels}):
        os.makedirs(parent, exist_ok=True)

    def one(rel):
        # CLONE_NOFOLLOW (1): a symlink is cloned as a symlink
        return clonefile(os.path.join(src_dir, rel).encode(), os.path.join(dst_dir, rel).encode(), 1) == 0

    _CLONE_STATS["calls"] += len(rels)
    if len(rels) > 1:
        with ThreadPoolExecutor(CLONE_THREADS) as ex:
            done = list(ex.map(one, rels))
    else:
        done = [one(rel) for rel in rels]
    left = [rel for rel, ok in zip(rels, done) if not ok]
    _CLONE_STATS["cloned"] += len(rels) - len(left)
    _CLONE_STATS["fallback"] += len(left)
    return left


def clone_plan(rels, ignored):
    """The fewest clone units that make exactly rels: a folder whose every entry on disk is a trial file
    (nothing git ignores lies inside it) is ONE unit — clonefile(2) clones a whole folder in one call —
    and a file is a unit only where an ignored entry shares its folder. Returns (units, rels_of): units
    sorted, rels_of[unit] = the rels it carries (the per-file fallback when a folder clone is refused)."""
    impure = set()
    for e in ignored:
        p = e.rstrip("/")
        if e.endswith("/"):
            impure.add(p)   # never cloned whole, even if git listed it beside trial files
        while "/" in p:
            p = p.rsplit("/", 1)[0]
            if p in impure:
                break
            impure.add(p)
    rels_of = {}
    for rel in rels:
        unit, i = rel, rel.find("/")
        while i != -1:
            if rel[:i] not in impure:
                unit = rel[:i]
                break
            i = rel.find("/", i + 1)
        rels_of.setdefault(unit, []).append(rel)
    return sorted(rels_of), rels_of


def make_trial_tree(d):
    """(tmp, rels): a scratch copy of folder d OUTSIDE the checkout, or (None, why)."""
    ignored = []
    rels = _trial_files(d, ignored)
    if rels is None:
        return None, "git ls-files failed in %s/" % d
    # The REAL path (macOS: /var -> /private/var): a node script judging "am I the main module"
    # compares its own real URL to argv[1], and silently does nothing when they differ.
    _arm_trial_cleanup()
    tmp = os.path.realpath(tempfile.mkdtemp(prefix=TRIAL_PREFIX))
    _TRIALS.add(tmp)
    with open(os.path.join(tmp, TRIAL_OWNER), "w") as f:
        f.write(str(os.getpid()))
    # APFS CLONE FIRST (2026-10-21): one tar copy took 29+ minutes for 455 MB on a saturated disk; a
    # clonefile() is instant and costs no space. Any file the clone refuses (not APFS, cross-volume) goes
    # through the old tar copy, so the tree is always complete.
    # ONE CLONE PER FOLDER, NOT PER FILE (2026-10-22): one clonefile() per file ran ~43 files/s over
    # ~38k files at load average 90-125 — 16 minutes holding the single-flight lock, so every other
    # sync gave up after its 15-minute wait. clone_plan() clones each folder that holds no ignored
    # entry (node_modules, .next, .env…) in one call; files are cloned singly only beside an ignored
    # entry. A refused folder clone falls back to its files, then to tar.
    units, rels_of = clone_plan(rels, ignored)
    left = clone_files(d, tmp, units)
    if left:
        left = clone_files(d, tmp, [r for u in left for r in rels_of[u]])
    if left:
        r = subprocess.run("tar --null -T - -cf - | tar -xf - -C %s" % _shq(tmp), shell=True, cwd=d,
                           input=("\0".join(left) + "\0").encode(), capture_output=True)
        if r.returncode != 0:
            drop_trial_tree(tmp)
            return None, "copying %s/ into a trial tree failed: %s" % (d, r.stderr.decode("utf-8", "replace")[-400:])
    return tmp, rels


def _shq(s):
    return "'" + s.replace("'", "'\\''") + "'"


def _read(path):
    try:
        with open(path, "rb") as f:
            return f.read()
    except OSError:
        return None


def installed_off_lock(d, lock_name):
    """[name@version] installed under d/node_modules/@ai-matrx that d's lockfile does not name."""
    text = (_read(os.path.join(d, lock_name)) or b"").decode("utf-8", "replace")
    locked = {"%s@%s" % (m.group(1), m.group(2)) for m in LOCKED.finditer(text)}
    if lock_name == "package-lock.json":
        try:
            pk = json.loads(text).get("packages") or {}
            locked = {"%s@%s" % (k.split("node_modules/")[-1], v.get("version")) for k, v in pk.items()
                      if "@ai-matrx/" in k}
        except ValueError:
            locked = set()
    scope = os.path.join(d, "node_modules", "@ai-matrx")
    off = []
    for n in sorted(os.listdir(scope)) if os.path.isdir(scope) else []:
        try:
            with open(os.path.join(scope, n, "package.json")) as f:
                v = json.load(f).get("version")
        except (OSError, ValueError):
            continue
        if v and "@ai-matrx/%s@%s" % (n, v) not in locked:
            off.append("@ai-matrx/%s@%s" % (n, v))
    return off


def baseline_health(d, tool, lock_name, rels):
    """The build health of d AS ITS LOCKFILE SAYS. Measured in d when its node_modules is what the
    lockfile names; otherwise (someone installed under it) in a second scratch tree with a frozen
    install — an update is judged against the committed state, never against a stray install."""
    off = installed_off_lock(d, lock_name)
    if not off:
        return package_health(d, tool)
    say("baseline measured in a scratch tree: this checkout's node_modules is not what its lockfile "
        "names (%s%s)" % (", ".join(off[:6]), " ..." if len(off) > 6 else ""))
    base, _ = make_trial_tree(d)
    if base is None:
        return {"imports": None, "sandbox": None}
    try:
        install = [tool, "ci"] if tool == "npm" else [tool, "install", "--frozen-lockfile"]
        try:
            ok = subprocess.run(install, cwd=base, capture_output=True, text=True, timeout=1200).returncode == 0
        except (OSError, subprocess.TimeoutExpired):
            ok = False
        return package_health(base, tool) if ok else {"imports": None, "sandbox": None}
    finally:
        drop_trial_tree(base)


# THE SHARED INSTALL ONLY MOVES FORWARD (2026-10-15). The update used to run IN this checkout: the
# trial install moved node_modules to npm latest, update_breaks_build() judged it, and a refusal put
# it back with `pnpm install --frozen-lockfile` — two relinks per sync. In matrx-frontend the shared
# :3001 preview restarts on every node_modules change, so each sync of a not-adopted update (every
# 30 min, ship-all 2026-10-15_15-14-02: api 0.1.24->0.1.26, then 0.1.26->0.1.24) recycled the one
# dev server twice and dropped every agent's browser test. Now the trial runs in a scratch copy of
# the folder outside the checkout; the checkout's node_modules is touched only to ADOPT, once, forward.
def snapshot_and_warning_lines(out):
    """The `release snapshot:` line and every WARNING line of a sync:matrx-packages run, in order."""
    return [l.strip() for l in (out or "").splitlines() if "release snapshot:" in l or "WARNING" in l.upper()]


def update_matrx_packages():
    """Step 4: run every "sync:matrx-packages" script in a trial tree, adopt what may ship. Returns a line."""
    dirs = []
    for manifest in ["package.json"] + sorted(glob.glob("*/package.json")):
        if "node_modules" in manifest or not os.path.isfile(manifest):
            continue
        try:
            with open(manifest) as f:
                scripts = json.load(f).get("scripts") or {}
        except (OSError, ValueError):
            continue
        if "sync:matrx-packages" in scripts:
            dirs.append(os.path.dirname(manifest) or ".")
    if not dirs:
        return None
    failed = []
    train = wait_for_publish_train()
    say(train)
    not_adopted = []
    changed = []
    for d in dirs:
        tool = "npm" if os.path.isfile(os.path.join(d, "package-lock.json")) else "pnpm"
        lock_name = "package-lock.json" if tool == "npm" else "pnpm-lock.yaml"
        tmp, rels = make_trial_tree(d)
        if tmp is None:
            failed.append(d)
            say("PACKAGES NOT UPDATED in %s/ — %s" % (d, rels))
            continue
        try:
            say("updating @ai-matrx packages to npm latest in %s/ (%s run sync:matrx-packages, in a trial "
                "tree — this checkout's node_modules is not touched unless the update is adopted)..." % (d, tool))
            try:
                r = subprocess.run([tool, "run", "sync:matrx-packages"], cwd=tmp, capture_output=True,
                                   text=True, timeout=1200)
                ok, out = r.returncode == 0, (r.stdout + r.stderr).strip()
            except (OSError, subprocess.TimeoutExpired) as e:
                ok, out = False, str(e)
            # Always log the snapshot instant and every WARNING, success or not (2026-10-22: a successful
            # run dropped its output, so `release snapshot: npm latest as of …` and its warnings never showed).
            for line in snapshot_and_warning_lines(out):
                say("  " + line)
            moved_files = [rel for rel in rels if os.path.basename(rel) in PACKAGE_FILES
                           and _read(os.path.join(tmp, rel)) != _read(os.path.join(d, rel))]
            if not ok:
                failed.append(d)
                say("PACKAGES NOT FULLY UPDATED in %s/ — the release may run on stale @ai-matrx packages:\n%s"
                    % (d, "\n".join("  " + l for l in out.splitlines()[-15:])))
                # 2026-10-05: a lockfile naming a version whose tarball npm still 404s breaks every
                # frozen install (CI, Vercel, the next agent). A FAILED update is adopted only when
                # its lockfile names versions npm serves.
                guard = os.path.join(tmp, "scripts", "check-matrx-lockfile.mjs")
                if moved_files and os.path.isfile(guard):
                    try:
                        g = subprocess.run(["node", guard], cwd=tmp, capture_output=True, text=True, timeout=120)
                    except (OSError, subprocess.TimeoutExpired):
                        g = None
                    if g is not None and g.returncode == 1:
                        say("LOCKFILE NOT ADOPTED in %s/ — it named an @ai-matrx version npm does not serve yet; "
                            "this checkout keeps its lockfile and node_modules:\n%s"
                            % (d, "\n".join("  " + l for l in (g.stdout + g.stderr).strip().splitlines()[-8:])))
                        continue
            if not moved_files:
                continue
            before = baseline_health(d, tool, lock_name, rels)
            after = package_health(tmp, tool)
            broke = update_breaks_build(before, after)
            if broke:
                old_v = locked_versions((_read(os.path.join(d, lock_name)) or b"").decode("utf-8", "replace"))
                new_v = locked_versions((_read(os.path.join(tmp, lock_name)) or b"").decode("utf-8", "replace"))
                moved = ["%s %s -> %s" % (n, old_v.get(n, "(new)"), v) for n, v in sorted(new_v.items()) if old_v.get(n) != v]
                not_adopted.append(d)
                say("PACKAGE UPDATE NOT ADOPTED in %s/ — it would break the build and fixes nothing, so the "
                    "lockfile and node_modules stay as they are (the trial ran in a scratch tree; nothing was "
                    "installed here). The package moved something this repo still uses: fix the importers "
                    "below (or restore the export in the package), and the next sync adopts it.\n"
                    "  versions it would have moved: %s\n  what it breaks:\n%s"
                    % (d, ", ".join(moved[:12]) or "(none parsed)", "\n".join("    " + b for b in broke[:12])))
                continue
            # ADOPT: the judged package files come home, then ONE forward install here.
            for rel in moved_files:
                shutil.copyfile(os.path.join(tmp, rel), os.path.join(d, rel))
            install = [tool, "ci"] if tool == "npm" else [tool, "install", "--frozen-lockfile"]
            try:
                ri = subprocess.run(install, cwd=d, capture_output=True, text=True, timeout=1200)
                if ri.returncode != 0:
                    say("ADOPTED in %s/ but `%s` there failed — run it by hand:\n%s"
                        % (d, " ".join(install), "\n".join("  " + l for l in (ri.stdout + ri.stderr).strip().splitlines()[-8:])))
            except (OSError, subprocess.TimeoutExpired) as e:
                say("ADOPTED in %s/ but `%s` there did not finish (%s) — run it by hand." % (d, " ".join(install), e))
            changed += [os.path.normpath(os.path.join(d, rel)) for rel in moved_files]
        finally:
            drop_trial_tree(tmp)
    if changed:
        git("add", "--", *changed)
        git("commit", "--no-verify", "-q", "-m", "chore(deps): every @ai-matrx package to npm latest (sync-main)",
            "--", *changed)
    return "@ai-matrx packages: %s%s%s" % (
        "updated (%s)" % ", ".join(changed) if changed else "already at npm latest",
        "; FAILED in %s (see above)" % ", ".join(failed) if failed else "",
        "; NOT ADOPTED in %s (it would break the build, see above)" % ", ".join(not_adopted) if not_adopted else "")


# ── THE LOCKFILE GUARD (2026-10-08) ─────────────────────────────────────────────────────────
# Merge 406bfce877 kept two byte-identical `'@ai-matrx/records@0.84.4':` blocks in pnpm-lock.yaml
# (both sides added the same block at adjacent lines, so git saw no conflict). pnpm refuses such a
# file (ERR_PNPM_BROKEN_LOCKFILE: duplicated mapping key) and release v0.4.3013 failed on all four
# Vercel projects. So, right before every push: every tracked lockfile in HEAD must parse with
# unique keys (scripts/check-lockfile-keys.py). The deterministic case — every duplicate block is
# identical — is repaired and committed here. Anything else (blocks that differ, a conflict marker,
# JSON that does not parse) is NOT pushed: a lockfile no package manager can read breaks every
# install on main, every agent's checkout and every build, so this is the one push sync-main refuses.
LOCKFILE_NAMES = ("pnpm-lock.yaml", "package-lock.json")


def _lockfile_checker():
    import importlib.util
    here = os.path.join(os.path.dirname(os.path.abspath(__file__)), "check-lockfile-keys.py")
    if not os.path.isfile(here):
        return None
    spec = importlib.util.spec_from_file_location("check_lockfile_keys", here)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def guard_lockfiles():
    """Repair identical duplicate blocks in HEAD's lockfiles; die (nothing pushed) on anything else.
    Returns the repaired paths."""
    checker = _lockfile_checker()
    if checker is None:
        say("LOCKFILE GUARD MISSING: scripts/check-lockfile-keys.py is absent — lockfiles NOT checked before push.")
        return []
    _, out, _ = git("ls-files", "-z")
    paths = [p for p in out.split("\0") if p and os.path.basename(p) in LOCKFILE_NAMES]
    repaired, broken = [], []
    for path in paths:
        _, text, _ = git("show", "HEAD:%s" % path, check=False)
        status, new, msgs = checker.check_text(os.path.basename(path), text, True)
        if status == 0:
            continue
        for m in msgs:
            say("LOCKFILE " + m.replace(os.path.basename(path), path, 1))
        on_disk = None
        try:
            with open(path, encoding="utf-8", newline="") as f:
                on_disk = f.read()
        except OSError:
            pass
        if status == 3 and on_disk == text:
            with open(path, "w", encoding="utf-8", newline="") as f:
                f.write(new)
            repaired.append(path)
        elif status == 3:
            broken.append("%s (repairable, but another writer changed it on disk mid-sync)" % path)
        else:
            broken.append(path)
    if repaired:
        # pnpm must read the repaired file. Only a parse refusal counts here; an out-of-date
        # lockfile (or no network) is someone else's finding, announced, never a stop.
        for path in repaired:
            if not path.endswith("pnpm-lock.yaml"):
                continue
            d = os.path.dirname(path) or "."
            try:
                r = subprocess.run(["pnpm", "install", "--frozen-lockfile", "--lockfile-only", "--ignore-scripts"],
                                   cwd=d, capture_output=True, text=True, timeout=300)
                if "ERR_PNPM_BROKEN_LOCKFILE" in r.stdout + r.stderr:
                    git("checkout", "HEAD", "--", path, check=False)
                    repaired.remove(path)
                    broken.append("%s (pnpm still refuses it after the repair)" % path)
                elif r.returncode != 0:
                    say("LOCKFILE %s repaired; pnpm's frozen check then said (not a parse error, pushing anyway):\n%s"
                        % (path, "\n".join("  " + l for l in (r.stdout + r.stderr).strip().splitlines()[:6])))
            except (OSError, subprocess.TimeoutExpired) as e:
                say("LOCKFILE %s repaired; pnpm could not be run to confirm it (%s)." % (path, e))
    if repaired:
        git("commit", "--no-verify", "-q", "-m",
            "deps: drop identical duplicate lockfile blocks a merge left behind (sync-main lockfile guard)",
            "--only", "--", *repaired)
        say("LOCKFILE REPAIRED and committed: %s" % ", ".join(repaired))
    if broken:
        die("NOT PUSHED — these lockfiles cannot be read by a package manager, and pushing them breaks "
            "every install and every build:\n  %s\nRegenerate each (`pnpm install --lockfile-only` in its "
            "folder), commit it, and run sync again. Everything else is committed locally; nothing is lost."
            % "\n  ".join(broken))
    return repaired


# ── THE TWINS GUARD (2026-10-09) ────────────────────────────────────────────────────────────
# v0.4.3061 failed on every Vercel project: the lockfile on main held @ai-matrx/design-system
# 0.86.26 AND 0.86.27 (commit 31b02bc6b3 adopted meet 0.11.29 by hand), and the postinstall
# `check-matrx-packages.mjs --duplicates` refuses two versions of one package. A lockfile like that
# also fails `pnpm install` for every agent who pulls it. Right before every push, HEAD's
# pnpm-lock.yaml is judged exactly as a fresh install sees it (scripts/lockfile-twins.sh: no
# node_modules), twins are remedied lockfile-only and committed, and twins that cannot be remedied
# are reported loudly and pushed (2026-10-22: the postinstall only warns since 547292dfb2). Twins
# already on origin/main are announced, never a stop.
def guard_twins():
    """Remedy @ai-matrx twins in HEAD's root pnpm-lock.yaml; an unremediable twin is reported, never a hold."""
    helper = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lockfile-twins.sh")
    if not os.path.isfile(helper) or not blob_at("HEAD", "pnpm-lock.yaml"):
        return False
    out = os.path.join(tempfile.mkdtemp(), "pnpm-lock.yaml")

    def judge(rev):
        try:
            r = subprocess.run(["bash", helper, rev, "--out", out], capture_output=True, text=True, timeout=900)
            return r.returncode, r.stdout.strip(), r.stderr.strip()
        except (OSError, subprocess.TimeoutExpired) as e:
            return 2, "", str(e)

    rc, moved, err = judge("HEAD")
    if rc == 0:
        return False
    if rc == 2:
        say("TWINS GUARD could not judge pnpm-lock.yaml (%s) — not checked before push." % (err.splitlines() or ["?"])[-1])
        return False
    if rc == 4:
        say("TWINS REMEDY REJECTED — collapsing @ai-matrx twins would break a package-to-package import; the lockfile "
            "stays as committed (still holds twins):\n%s" % err)
        return False
    if rc == 3:
        _, head_text, _ = git("show", "HEAD:pnpm-lock.yaml", check=False)
        try:
            with open("pnpm-lock.yaml", encoding="utf-8", newline="") as f:
                on_disk = f.read()
        except OSError:
            on_disk = None
        if on_disk == head_text:
            shutil.copyfile(out, "pnpm-lock.yaml")
            git("commit", "--no-verify", "-q", "-m",
                "deps: one version of every @ai-matrx package in pnpm-lock.yaml (sync-main twins guard)",
                "--only", "--", "pnpm-lock.yaml")
            say("LOCKFILE TWINS REMEDIED and committed (%s). Run `pnpm install` here to match node_modules." % moved)
            return True
        err = "remediable, but another writer changed pnpm-lock.yaml on disk mid-sync"
    rc_remote, _, _ = judge("%s/%s" % (REMOTE, BRANCH))
    if rc_remote in (1, 3):
        say("LOCKFILE TWINS already on %s/%s, not remedied here (%s). release.sh remedies them inside the "
            "release; fix main with `pnpm sync:matrx-packages` and commit the lockfile." % (REMOTE, BRANCH, err.splitlines()[-1] if err else "?"))
        return False
    # 2026-10-22: no longer a hold. Since 547292dfb2 Vercel's postinstall (and release.sh) only WARN on
    # twins, and the pre-commit refuses them at write time; holding the push here held every agent's
    # local commits for a lockfile that no longer stops a build. Report loudly and push.
    detail = ("pnpm-lock.yaml in HEAD holds two versions of one @ai-matrx package and could not be "
              "remedied:\n%s\nPushed anyway (Vercel's postinstall only warns). Fix: `pnpm sync:matrx-packages`, "
              "commit the lockfile." % err)
    say("LOCKFILE TWINS PUSHED — " + detail)
    release_scream("lockfile twins (unremedied, pushed)", detail, title="LOCKFILE TWINS — PUSHED ANYWAY")
    return False


# ── THE FROZEN-LOCKFILE GUARD (2026-10-17) ──────────────────────────────────────────────────
# v0.4.3297 failed on Vercel with ERR_PNPM_OUTDATED_LOCKFILE: a sweep committed package.json
# (@ai-matrx/summon "latest") without the lockfile change `pnpm sync:matrx-packages` wrote with it.
# Right before every push, HEAD is judged by the check Vercel runs (scripts/lockfile-frozen.sh:
# `pnpm install --frozen-lockfile --lockfile-only --ignore-scripts`, ~1 s). A disagreement this
# push would ADD is not pushed; one origin/main already has is announced, never a stop (refusing
# would not remove it, and release.sh's own frozen guard keeps it out of a release).
# THE LOCKFILE ADOPTION REPORT (2026-10-21). Commit 689c27aa4d adopted @ai-matrx/chat 0.8.307 by editing
# pnpm-lock.yaml alone. Nothing was installed, so every installed-package check passed, and chat 0.8.307
# had dropped `setDebrief`: v0.4.3429 and its rebuild failed on Vercel. Right before the push, when this
# push changes pnpm-lock.yaml, the code at HEAD is judged against the versions HEAD's lockfile names
# (check-matrx-imports.mjs --lock). NOTHING BLOCKS A RELEASE (Arman, 2026-10-21): a finding never stops the
# push or the adoption. It is printed loudly with the missing export named, and mailed urgently to the
# lockfile commit's author session (its Agent-Session trailer) and to the ship-all lanes.
LOCK_REPORT_FROM = "sync-main"
LOCK_REPORT_TO = ("6bda811a-6b18-5ef3-a1c1-67f81ae6b2c4", "50b803bb-a5df-5ae9-a769-16f0a253bda6")


def _lock_report_mail(message, author):
    cmd = os.environ.get("MATRX_SYNC_ALERT_CMD") or os.path.join(os.path.dirname(os.getcwd()), "scripts", "board.py")
    if not os.path.exists(cmd):
        say("lockfile adoption report: no agent-mail tool at %s; the report above is the only announcement." % cmd)
        return []
    sent = []
    for to in ([author] if author else []) + list(LOCK_REPORT_TO):
        r = subprocess.run([sys.executable, cmd, "post", to, message, "--urgent", "--from", LOCK_REPORT_FROM],
                           capture_output=True, text=True)
        if r.returncode == 0:
            sent.append(to)
        else:
            say("lockfile adoption report: mail to %s failed: %s" % (to[:8], (r.stderr or r.stdout).strip()[:200]))
    return sent


def guard_lock_imports(mail=None):
    """Report-only. Returns the report text when the adoption breaks the build, else None."""
    checker = os.path.join(os.path.dirname(os.path.abspath(__file__)), "check-matrx-imports.mjs")
    if not os.path.isfile(checker) or not os.path.isfile("pnpm-lock.yaml"):
        return None
    rc, _, _ = git("diff", "--quiet", "%s/%s" % (REMOTE, BRANCH), "HEAD", "--", "pnpm-lock.yaml", check=False)
    if rc == 0:
        return None   # the lockfile this push carries is the one origin already has
    try:
        r = subprocess.run(["node", checker, "--lock", "--ref", "HEAD"], capture_output=True, text=True, timeout=900)
        code, out = r.returncode, (r.stdout + r.stderr).strip()
    except (OSError, subprocess.TimeoutExpired) as e:
        code, out = 2, str(e)
    _, head, _ = git("rev-parse", "HEAD")
    if code == 0:
        say("lockfile adoption check: every @ai-matrx import resolves against the versions pnpm-lock.yaml names.")
        os.environ["MATRX_LOCK_IMPORTS_CHECKED"] = head.strip()
        return None
    tail = "\n".join("  " + l for l in out.splitlines()[-25:])
    what = ("adopts @ai-matrx versions that no longer ship something this repo imports, so the release build WILL fail"
            if code == 1 else "could not be checked (exit %d)" % code)
    text = "LOCKFILE ADOPTION REPORT — pnpm-lock.yaml %s:\n%s" % (what, tail)
    say("!" * 20 + " " + text + "\n  (reported only: the push goes ahead. Fix the importer, or restore the export in the package.)")
    _, body, _ = git("log", "-1", "--format=%B", "--", "pnpm-lock.yaml", check=False)
    m = re.search(r"Agent-Session: \w+ ([0-9a-f-]{36})", body or "")
    (mail or _lock_report_mail)("sync-main: " + text[:1800], m.group(1) if m else None)
    return text


def repair_frozen_lockfile(helper):
    """Regenerate HEAD's pnpm-lock.yaml to match HEAD's package.json and commit it. True when committed."""
    _, head_pkg, _ = git("show", "HEAD:package.json", check=False)
    _, head_lock, _ = git("show", "HEAD:pnpm-lock.yaml", check=False)
    try:
        with open("package.json", encoding="utf-8", newline="") as f:
            disk_pkg = f.read()
        with open("pnpm-lock.yaml", encoding="utf-8", newline="") as f:
            disk_lock = f.read()
    except OSError:
        return False
    if disk_pkg != head_pkg or disk_lock != head_lock:
        say("FROZEN-LOCKFILE REMEDY skipped: package.json or pnpm-lock.yaml on disk differs from HEAD (another writer).")
        return False
    out = os.path.join(tempfile.mkdtemp(), "pnpm-lock.yaml")
    try:
        r = subprocess.run(["bash", helper, "HEAD", "--write", out], capture_output=True, text=True, timeout=600)
    except (OSError, subprocess.TimeoutExpired) as e:
        say("FROZEN-LOCKFILE REMEDY could not run (%s)." % e)
        return False
    if r.returncode != 3 or not os.path.isfile(out):
        say("FROZEN-LOCKFILE REMEDY failed (exit %d): %s" % (r.returncode, r.stderr.strip()[-400:]))
        return False
    shutil.copyfile(out, "pnpm-lock.yaml")
    git("add", "--", "pnpm-lock.yaml")
    git("commit", "--no-verify", "-q", "-m",
        "deps: regenerate pnpm-lock.yaml to match package.json (sync-main frozen-lockfile remedy)",
        "--only", "--", "pnpm-lock.yaml")
    say("FROZEN LOCKFILE REPAIRED and committed: HEAD's pnpm-lock.yaml now matches its package.json.")
    return True


def guard_frozen_lockfile():
    helper = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lockfile-frozen.sh")
    if not os.path.isfile(helper) or not blob_at("HEAD", "pnpm-lock.yaml"):
        return

    def judge(rev):
        try:
            r = subprocess.run(["bash", helper, rev], capture_output=True, text=True, timeout=180)
            return r.returncode, r.stderr.strip()
        except (OSError, subprocess.TimeoutExpired) as e:
            return 2, str(e)

    rc, err = judge("HEAD")
    if rc == 0:
        return
    if rc == 2:
        say("FROZEN-LOCKFILE GUARD could not judge HEAD (%s) — not checked before push." % (err.splitlines() or ["?"])[-1])
        return
    rc_remote, _ = judge("%s/%s" % (REMOTE, BRANCH))
    if rc_remote == 1:
        say("FROZEN LOCKFILE already out of step on %s/%s, so this push does not add it:\n%s\n"
            "Fix main: `pnpm install --lockfile-only`, commit package.json and pnpm-lock.yaml TOGETHER." % (REMOTE, BRANCH, err))
        return
    # THE REMEDY (2026-10-21, merge d65df2aca6): a clean merge can pair one side's package.json with
    # the other side's lockfile lines. Regenerate HEAD's lockfile in a scratch tree (lockfile-frozen.sh
    # --write), commit it alone, and judge again; only when that fails is the push stopped.
    fixed_lock = repair_frozen_lockfile(helper)
    if fixed_lock:
        rc, err = judge("HEAD")
        if rc == 0:
            guard_twins()
            guard_lock_imports()
            return
    die("NOT PUSHED — pnpm-lock.yaml in HEAD does not match package.json, so `pnpm install "
        "--frozen-lockfile` (Vercel, CI, every agent) fails:\n%s\nRun `pnpm install --lockfile-only`, commit "
        "package.json and pnpm-lock.yaml together, and sync again. Everything is committed locally; nothing is lost." % err)


def report(fixed, docs, held, headline):
    say(headline + ": %d auto-fixed, %d docs/comments flagged, %d held" % (len(fixed), len(docs), len(held)))
    for p in fixed:
        say("  auto-fixed: " + p)
    for p, s in docs:
        say("  docs/comments: %s  (%s)" % (p, s))
    for p, h, s in held:
        say("  held: %s  ->  %s\n        %s" % (p, h, s))
    if docs or held:
        say("Listed in %s." % LOG_REL)


# ── an orphaned merge (2026-10-21: a sync cut off mid-merge left MERGE_HEAD; 2.5 h of silent stops) ──
# A MERGE_HEAD with no live sync behind it must not stop every later round in silence. This sync's
# own merge (marker .git/sync-main-merging.json, written just before `git merge`, or the merge
# message sync-main's merge makes) whose only conflicts are ones sync-main settles on its own is
# FINISHED here. Anything else is announced by urgent agent mail (once an hour per merge) naming the
# files and the merge's age. NEVER `git merge --abort` or reset: other sessions' work may be in it.
MERGE_MARKER = "sync-main-merging.json"
ORPHAN_ALERT = "sync-main-orphan-alert.json"
ORPHAN_ALERT_EVERY_S = 3600
ORPHAN_ALERT_TO = os.environ.get("MATRX_SYNC_ALERT_TO") or "6bda811a-6b18-5ef3-a1c1-67f81ae6b2c4"


# THE MERGE NEVER WRITES MARKERS INTO THE SHARED TREE (2026-10-22). A plain `git merge` writes
# `<<<<<<< HEAD` / `=======` / `>>>>>>> origin/main` into every conflicted working file and leaves
# them there until resolve_all() reaches that file -- minutes, in this checkout (03:41:22-03:45:17
# and 04:49-05:03 on 2026-10-22). Every other writer in the shared checkout sees those bytes as
# "the file": an agent committing its own files in that window shipped git's markers in
# AssessmentCreate.tsx (4d1b83b210, 03:41:44) and runHistory.ts (a6342f47b3, 04:54:28), and
# releases v0.4.3443 / v0.4.3444 failed to build. So the merge runs with a merge driver that does
# git's own textual 3-way merge (`git merge-file`) and, when that conflicts, puts LOCAL's bytes
# back: the working file stays exactly what its author left, the conflict is still recorded in the
# index (stages 1/2/3), and resolve_all() decides it from those stages as before. A clean
# file merges exactly as git would. The attributes file lives in the git dir, never in the tree.
MERGE_DRIVER_NAME = "sync-main-keep-local"
# The driver's exit 1 is git's "this file conflicts" signal, never a process exit of sync-main.
MERGE_DRIVER = ("sh -c 'cp \"$1\" \"$1.sync-main-local\" || exit 1; "  # release-path-ok: conflict
                "if git merge-file -q \"$1\" \"$2\" \"$3\"; then rm -f \"$1.sync-main-local\"; exit 0; fi; "
                "mv -f \"$1.sync-main-local\" \"$1\"; exit 1' sync-main-merge %A %O %B")  # release-path-ok: conflict


def merge_without_markers(*args):
    """`git merge <args>` that never writes a conflict marker into the working tree (see above)."""
    _, gd, _ = git("rev-parse", "--git-dir")
    attrs = os.path.abspath(os.path.join(gd.strip(), "sync-main-merge.attributes"))
    want = "* merge=%s\n" % MERGE_DRIVER_NAME
    try:
        have = open(attrs).read()
    except OSError:
        have = None
    if have != want:
        with open(attrs, "w") as fh:
            fh.write(want)
    return git("-c", "core.attributesFile=" + attrs,
               "-c", "merge.%s.name=git merge-file, LOCAL bytes kept on conflict" % MERGE_DRIVER_NAME,
               "-c", "merge.%s.driver=%s" % (MERGE_DRIVER_NAME, MERGE_DRIVER),
               "merge", *args, check=False)


def mark_merging(gd):
    rc, t, _ = git("rev-parse", "%s/%s" % (REMOTE, BRANCH), check=False)
    if rc == 0:
        with open(os.path.join(gd, MERGE_MARKER), "w") as fh:
            json.dump({"target": t.strip(), "pid": os.getpid(), "started": time.time()}, fh)


def _merge_owner_alive():
    if globals().get("_LOCK_FD") is not None:
        return False   # we hold the checkout's sync lock, so whoever began this merge is gone
    r = subprocess.run(["pgrep", "-f", "sync-main.py"], capture_output=True, text=True)
    mine = {str(os.getpid()), str(os.getppid())}
    return any(p and p not in mine for p in r.stdout.split())


def _merge_is_ours(gd, head):
    try:
        with open(os.path.join(gd, MERGE_MARKER)) as fh:
            if json.load(fh).get("target") == head:
                return True
    except (OSError, ValueError):
        pass
    try:
        with open(os.path.join(gd, "MERGE_MSG")) as fh:
            first = fh.readline()
    except OSError:
        return False
    return bool(re.match(r"Merge (remote-tracking )?branch '(%s/)?%s'" % (REMOTE, BRANCH), first))


def _settles_alone(path, mb):
    """True when sync-main settles this conflicted file by itself (no hold, no both-versions file)."""
    st = stages(path)
    ours_mode, ours = st.get(2, (None, None))
    theirs_mode, theirs = st.get(3, (None, None))
    if not ours and not theirs:
        return False
    sup = globals().get("superseding_side")
    if sup and sup(path, ours, theirs, mb):
        return True
    if not ours or not theirs:
        return False
    if (ours_mode or theirs_mode) == "120000" or is_binary(content(ours)) or is_binary(content(theirs)):
        return False
    return resolve_fake(path, ours, theirs, mb)[0] is not None


def _announce_orphan(gd, head, files, age_s, why):
    msg = ("sync-main: an ORPHANED merge is blocking the release in %s. MERGE_HEAD %s is %d min old, "
           "its sync-main is gone, and %s. Unmerged files (%d): %s. Finish it: resolve those files, "
           "`git add` them, `git commit --no-edit`. Do NOT `git merge --abort` or reset: other "
           "sessions' staged work may be in it." % (os.getcwd(), head[:10], age_s // 60, why, len(files),
                                                     ", ".join(files[:12]) or "none"))
    print("SYNC STOPPED (orphan merge): " + msg, file=sys.stderr, flush=True)
    path = os.path.join(gd, ORPHAN_ALERT)
    try:
        with open(path) as fh:
            last = json.load(fh)
        if last.get("head") == head and time.time() - last.get("sent", 0) < ORPHAN_ALERT_EVERY_S:
            return
    except (OSError, ValueError):
        pass
    cmd = os.environ.get("MATRX_SYNC_ALERT_CMD") or os.path.join(os.path.dirname(os.getcwd()), "scripts", "board.py")
    if not os.path.exists(cmd):
        print("sync: no agent-mail tool at %s; the alarm above is the only announcement." % cmd,
              file=sys.stderr, flush=True)
        return
    argv = [sys.executable, cmd, "post", ORPHAN_ALERT_TO, msg, "--urgent", "--from", "sync-main"]
    r = subprocess.run(argv, capture_output=True, text=True)
    if r.returncode == 0:
        with open(path, "w") as fh:
            json.dump({"head": head, "sent": time.time()}, fh)
    else:
        print("sync: the agent mail failed: " + (r.stderr or r.stdout).strip(), file=sys.stderr, flush=True)


def handle_orphan_merge(gd):
    """Called with a MERGE_HEAD present. Returns True when it was finished here (go on with the
    sync); otherwise announces and returns False (the caller stops, touching nothing)."""
    if _merge_owner_alive():
        return False
    _, head, _ = git("rev-parse", "MERGE_HEAD")
    head = head.strip()
    try:
        age_s = int(time.time() - os.path.getmtime(os.path.join(gd, "MERGE_HEAD")))
    except OSError:
        age_s = 0
    _, out, _ = git("diff", "--name-only", "--diff-filter=U", "-z")
    files = [f for f in out.split("\0") if f]
    if not _merge_is_ours(gd, head):
        _announce_orphan(gd, head, files, age_s, "it is not a merge sync-main began")
        return False
    _, mb, _ = git("merge-base", "HEAD", "MERGE_HEAD")
    _, o, _ = git("rev-parse", "HEAD")
    CTX.update(ours=o.strip(), theirs=head, mb=mb.strip())
    _CHANGED.clear()
    stuck = [f for f in files if not _settles_alone(f, mb.strip())]
    if stuck:
        _announce_orphan(gd, head, files, age_s,
                         "%d file(s) need a person (sync-main does not settle them alone): %s"
                         % (len(stuck), ", ".join(stuck[:12])))
        return False
    f, d, h = resolve_all(time.strftime("%Y-%m-%d-%H%M%S"))
    _, left, _ = git("diff", "--name-only", "--diff-filter=U")
    if d or h or left.strip():
        _announce_orphan(gd, head, left.split() or files, age_s,
                         "finishing it left conflicts (this is a bug in sync-main)")
        return False
    hold_marked_merge_files(time.strftime("%Y-%m-%d-%H%M%S"))
    git("commit", "--no-verify", "-q", "-m",
        "Merge %s/%s (sync-main): finished an orphaned merge, %d auto-fixed" % (REMOTE, BRANCH, len(f)))
    say("sync: finished an orphaned merge of %s (%d min old, %d auto-fixed); going on." % (head[:10], age_s // 60, len(f)))
    return True


def main():
    if sys.argv[1:2] == ["--replay"]:
        _, top, _ = git("rev-parse", "--show-toplevel")
        os.chdir(top.strip())
        acquire_sync_lock()
        replay(sys.argv[2:])
        return
    argv = sys.argv[1:]
    push = "--no-push" not in argv
    _, top, _ = git("rev-parse", "--show-toplevel")
    os.chdir(top.strip())
    if "--pause-active" in argv:
        pause_active_cmd()
        return
    if "--pause" in argv:
        pause_cmd(argv)
        return
    if "--resume" in argv:
        resume_cmd()
        return
    if "--status" in argv:
        status_cmd()
        return
    if "--hold-status" in argv:
        hold_status_cmd()
        return
    if "--hold-now" in argv:
        hold_now_cmd()
        return
    paused = read_pause()
    if paused:
        stop_paused(paused)
    if load_moved() is not None:
        say(moved_status())
    hold_now = read_hold()
    if hold_now:
        say(hold_line(hold_now))
    if acquire_sync_lock():
        paused = read_pause()
        if paused:
            stop_paused(paused)
        if nothing_left_after_wait():
            say("synced: the sync this one waited for already pushed everything here; nothing to do.")
            return
    sweep_old_trials()   # a killed run's trial copies; only ones older than 2 h that no live process holds
    # Show where we started, so the terminal holds the before-state if anything goes wrong.
    say("==================== git status (before sync) ====================")
    subprocess.run(["git", "status"])
    _, start, _ = git("rev-parse", "HEAD")
    say("==================== starting point: %s ====================" % start.strip())
    say("(to see this exact state again later: git log %s)\n" % start.strip()[:10])
    _, br, _ = git("symbolic-ref", "-q", "--short", "HEAD", check=False)
    if br.strip() != BRANCH:
        die("this checkout is on '%s', not %s." % (br.strip() or "a detached HEAD", BRANCH))
    _, gd, _ = git("rev-parse", "--git-dir")
    gd = gd.strip()
    for leftover in ("MERGE_HEAD", "rebase-merge", "rebase-apply", "CHERRY_PICK_HEAD"):
        if os.path.exists(os.path.join(gd, leftover)):
            if leftover == "MERGE_HEAD" and handle_orphan_merge(gd):
                continue
            die("a %s is already in progress here. Finish it, or undo it with `git merge --abort` "
                "/ `git rebase --abort`, then run this again. BEFORE undoing, run "
                "`git diff --cached --name-only`: undoing resets every STAGED edit (unstaged edits "
                "survive), so commit or note anything staged that is real work." % leftover)

    stamp = datetime.datetime.now().strftime("%Y-%m-%d-%H%M%S")
    total_local = pulled = 0
    fixed, docs, held = [], [], []
    packages = None
    refused = []
    held_for_move = []
    for attempt in range(1, MAX_ATTEMPTS + 1):
        if attempt > 1:
            paused = read_pause()
            if paused:
                stop_paused(paused, "Paused mid-run: earlier attempts' commits are local only, nothing more was done.")
        prune()
        hh = hold_changed_paths(stamp)
        if hh:
            update_log(stamp, [], hh)
            held_for_move += hh
        r = refuse_old_paths(stamp)
        if r:
            update_log(stamp, [], r)
            refused += r
        record_mtimes()
        total_local += commit_all()
        rc, _, err = git("fetch", "-q", REMOTE, BRANCH, check=False)
        # A concurrent `git fetch` by another session in this shared checkout updates
        # refs/remotes/origin/main under us: "cannot lock ref 'refs/remotes/origin/main': is at X but
        # expected Y". GitHub was reached; re-fetch (ported from aidream d4b34d4f4b; ship-all
        # 2026-10-22 reported it as "could not reach GitHub" and pushed nothing).
        for _attempt in range(8):
            if rc == 0 or "cannot lock ref" not in err:
                break
            time.sleep(0.5 + 0.5 * _attempt)
            rc, _, err = git("fetch", "-q", REMOTE, BRANCH, check=False)
        if rc != 0:
            die("could not reach GitHub:\n" + err)
        _, n, _ = git("rev-list", "--count", "HEAD..%s/%s" % (REMOTE, BRANCH))
        pulled += int(n.strip())
        mark_merging(gd)
        rc, out, err = merge_without_markers("--no-edit", "--no-verify", "-q", "%s/%s" % (REMOTE, BRANCH))
        parked = []
        if (rc != 0 and not os.path.exists(os.path.join(gd, "MERGE_HEAD"))
                and "Your local changes to the following files would be overwritten" in out + err):
            # A tracked file with uncommitted edits GitHub also changed — typically one the sweep
            # held. Retrying cannot help: the same file blocks every attempt (2026-10-17 22:13:
            # UserBoard.tsx, five attempts, NOT PULLED). Set the edits aside, merge, put them back.
            parked = park_dirty_blockers(out + err)
            if parked:
                rc, out, err = merge_without_markers("--no-edit", "--no-verify", "-q",
                                                     "%s/%s" % (REMOTE, BRANCH))
        if rc != 0:
            if not os.path.exists(os.path.join(gd, "MERGE_HEAD")):
                if parked:
                    held += restore_parked(parked, stamp)
                if "untracked working tree files would be overwritten" in out + err:
                    # An untracked file GitHub also carries — typically one the sweep held because it
                    # needs code only GitHub has. Retrying cannot help: the same file blocks every
                    # attempt (2026-10-16: five attempts, no merge, no push, "synced" printed).
                    held += clear_untracked_blockers(out + err, stamp)
                    continue
                if "overwritten" in out + err:   # an agent wrote a file between step 1 and now
                    say("the merge refused (going again):\n" + (out + err).strip())
                    continue
                die("git merge failed:\n" + out + err)
            f, d, h = resolve_all(stamp)
            fixed += f
            docs += d
            held += h
            update_log(stamp, d, h)
            if h or d:
                git("add", "--", HOLD_ROOT)
            _, left, _ = git("diff", "--name-only", "--diff-filter=U")
            if left.strip():
                die("these files are still unresolved (this is a bug in sync-main; the merge is "
                    "left open so you can see it):\n" + left)
            mh = hold_marked_merge_files(stamp)
            h += mh
            held += mh
            msg = "Merge %s/%s (sync-main): %d auto-fixed, %d docs/comments flagged, %d held" % (
                REMOTE, BRANCH, len(f), len(d), len(h))
            git("commit", "--no-verify", "-q", "-m", msg)
        if parked:
            held += restore_parked(parked, stamp)
        if packages is None:
            packages = update_matrx_packages() or ""
            # Files the sweep held for a package that the update just installed go out in THIS
            # sync, not the next one: sweep once more against the new node_modules.
            if SWEEP_HELD and packages.startswith("@ai-matrx packages: updated"):
                say("re-sweeping the %d held file(s) against the packages just installed..." % len(SWEEP_HELD))
                total_local += commit_all()
        guard_lockfiles()   # after the sweep, the merge and the package update: what is about to be pushed
        guard_twins()       # the same lockfile, judged as Vercel's postinstall judges it
        guard_lock_imports()      # the code at HEAD against the package versions HEAD's lockfile names
        guard_frozen_lockfile()   # package.json and pnpm-lock.yaml must agree, as Vercel's frozen install sees them
        if not push:
            break
        rc, _, err = git("push", "-q", REMOTE, "HEAD:%s" % BRANCH, check=False)
        if rc == 0:
            break
        if attempt == MAX_ATTEMPTS or not re.search(r"non-fast-forward|fetch first|rejected", err):
            die("git push failed:\n" + err)
        say("GitHub moved while syncing; going again (attempt %d)." % (attempt + 1))
    else:
        # Every attempt hit `continue`: nothing was merged or pushed. Never print "synced".
        die("%d attempts and the merge never ran (a working-tree file kept blocking it); see the "
            "lines above." % MAX_ATTEMPTS)

    report(fixed, docs, held,
           "synced: %d local files committed, %d commits pulled from GitHub%s" % (
               total_local, pulled, "" if push else " (--no-push: nothing pushed)"))
    for path, held_path, _ in held_for_move:
        say("  HELD for the move: %s  ->  %s" % (path, held_path))
    if held_for_move:
        say("%d file(s) under held paths were NOT committed (re-apply after GO); listed in %s."
            % (len(held_for_move), LOG_REL))
    for path, held_path, _ in refused:
        say("  OLD PATH REFUSED: %s  ->  %s" % (path, held_path))
    if refused:
        say("%d file(s) recreated moved paths and were NOT committed there; listed in %s."
            % (len(refused), LOG_REL))
    if packages:
        say(packages)


if __name__ == "__main__":
    main()
