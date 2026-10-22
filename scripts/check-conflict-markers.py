#!/usr/bin/env python3
"""check-conflict-markers — list everything scripts/sync-main.py left open in this repo.

Run it from the repo root:   python3 scripts/check-conflict-markers.py

It looks only for the two markers sync-main writes (in tracked and untracked files), for empty
folders under _conflicts/, and compares what it finds with the list in _conflicts/README.md:
  - a marker whose item is not listed         -> "NOT LISTED"
  - a listed item whose marker is gone        -> "DONE, DELETE ITS LINE"
  - an empty folder under _conflicts/         -> "EMPTY FOLDER, DELETE IT"
Every `_conflicts/**/*.held` file is an open item even when it carries no marker (older holds were
raw copies with no FACTS block, and five of them sat unlisted while this printed "clean").
Exit 0 and "clean" when nothing is open, 1 otherwise.

  python3 scripts/check-conflict-markers.py --self-test [checker.py]
builds a throwaway repo holding one marker-less, unlisted .held file and requires the checker
(this file, or the one named) to report it; it fails on a checker that only greps for markers.
"""
import os
import subprocess
import sys

HELD_MARK = "matrx-auto-git-conflict-file-work-delete-this-when-resolved"
DOCS_MARK = "matrx-auto-git-docs-resolution-needed-delete-this-when-resolved"
HOLD_ROOT = "_conflicts"
LOG_REL = "_conflicts/README.md"
SELF = {"scripts/sync-main.py", "scripts/check-conflict-markers.py"}


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True).stdout


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


def main():
    top = git("rev-parse", "--show-toplevel").strip()
    if not top:
        print("not inside a git repository")
        sys.exit(2)
    os.chdir(top)

    found = {}  # path -> set of kinds
    for kind, mark in (("held", HELD_MARK), ("docs", DOCS_MARK)):
        for path in git("grep", "-l", "--untracked", "-F", "-e", mark).splitlines():
            if path and path not in SELF:
                found.setdefault(path, set()).add(kind)

    # A .held file is held whether or not it carries the marker.
    if os.path.isdir(HOLD_ROOT):
        for root, _dirs, files in os.walk(HOLD_ROOT):
            for name in files:
                if name.endswith(".held"):
                    found.setdefault(os.path.join(root, name), set()).add("held")

    listed = set(listed_items(LOG_REL))

    problems = 0
    for path in sorted(found):
        key = path[: -len("-note.txt")] if path.endswith(".held-note.txt") else path
        note = "" if key in listed else "   <- NOT LISTED in " + LOG_REL
        print("%-5s %s%s" % ("/".join(sorted(found[path])), path, note))
        problems += 1
    live = set(found) | {p[: -len("-note.txt")] for p in found if p.endswith(".held-note.txt")}
    for item in sorted(listed - live):
        print("DONE, DELETE ITS LINE in %s: %s" % (LOG_REL, item))
        problems += 1
    if os.path.isdir(HOLD_ROOT):
        for root, dirs, files in os.walk(HOLD_ROOT, topdown=False):
            if root != HOLD_ROOT and not os.listdir(root):
                print("EMPTY FOLDER, DELETE IT: %s/" % root)
                problems += 1

    if problems:
        print("\n%d item(s) need attention." % problems)
        sys.exit(1)
    print("clean: nothing from sync-main is open in this repo.")


def self_test(checker):
    """RED on a marker-only checker, GREEN on this one: an unlisted, marker-less .held must be named."""
    import tempfile

    with tempfile.TemporaryDirectory() as repo:
        subprocess.run(["git", "init", "-q", repo], check=True)
        hold = os.path.join(repo, HOLD_ROOT, "2026-01-01-000000", "features")
        os.makedirs(hold)
        with open(os.path.join(repo, LOG_REL), "w") as fh:
            fh.write("# Merge conflicts\n\n## Held files\n\n## Resolution log\n")
        with open(os.path.join(hold, "a.tsx.held"), "w") as fh:
            fh.write("export const a = 1;\n")  # a raw copy: no marker, no FACTS
        res = subprocess.run([sys.executable, os.path.abspath(checker)], cwd=repo,
                             capture_output=True, text=True)
        want = "_conflicts/2026-01-01-000000/features/a.tsx.held"
        if res.returncode == 1 and want in res.stdout and "NOT LISTED" in res.stdout:
            print("SELF-TEST PASSED: an unlisted marker-less .held is reported")
            return 0
        print("SELF-TEST FAILED: the checker said %r (exit %d) with %s held"
              % (res.stdout.strip(), res.returncode, want))
        return 1


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--self-test":
        sys.exit(self_test(sys.argv[2] if len(sys.argv) > 2 else __file__))
    main()
