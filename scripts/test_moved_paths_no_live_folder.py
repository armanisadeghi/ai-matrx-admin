"""A folder listed as moved in .matrx/moved-paths.txt must hold no file the app still tracks.

When a folder entry (`old/ -> new/`) covers a folder the app still uses, every NEW file written
there is refused by the sync sweep and moved to _conflicts/, while the tracked files beside it
keep importing it. On 2026-10-22 `features/surfaces/utils/` was listed as moved while
`fleet-readiness.ts` still lived there; a new `probe-record.ts` beside it was refused and every
page of the shared preview answered 500 (Module not found). Such a folder is listed per file.

Run: python3 scripts/test_moved_paths_no_live_folder.py
"""

import os
import subprocess
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOVED = os.path.join(ROOT, ".matrx", "moved-paths.txt")


def folder_entries(text):
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "->" not in line:
            continue
        old = line.split("->", 1)[0].strip()
        if old.endswith("/"):
            yield old


def live_files_under(folder, tracked):
    return [p for p in tracked if p.startswith(folder)]


class MovedFoldersHoldNoLiveFiles(unittest.TestCase):
    def test_no_moved_folder_still_holds_tracked_files(self):
        with open(MOVED) as f:
            folders = list(folder_entries(f.read()))
        tracked = subprocess.run(
            ["git", "ls-files", "-z"], cwd=ROOT, capture_output=True, text=True, check=True
        ).stdout.split("\0")
        offenders = {d: live_files_under(d, tracked)[:3] for d in folders if live_files_under(d, tracked)}
        self.assertEqual(
            offenders, {},
            "these folders are listed as moved but the app still tracks files in them; "
            "list the moved files one per line instead: %r" % offenders,
        )

    def test_detector_flags_a_live_folder(self):
        entries = list(folder_entries("a/moved/ -> ../pkg/moved/\n# c/ -> d/\nx.ts -> y.ts\n"))
        self.assertEqual(entries, ["a/moved/"])
        self.assertEqual(live_files_under("a/moved/", ["a/moved/kept.ts", "b/z.ts"]), ["a/moved/kept.ts"])
        self.assertEqual(live_files_under("a/moved/", ["b/z.ts"]), [])


if __name__ == "__main__":
    unittest.main()
