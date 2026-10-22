#!/usr/bin/env python3
"""Test: when ship.sh's sync did not push, the scream it raises never says "PUSHED ANYWAY".

Run: python3 scripts/test_ship_sync_scream_title.py
2026-10-22: a sync that pushed nothing screamed release-scream's default banner "RELEASE WARNING —
PUSHED ANYWAY". ship.sh now passes an honest title (--title when release-scream has it, else the title
leads --check). The real block is cut out of ship.sh and run under /bin/bash (3.2, set -u) against a
stub release-scream with and without --title. SHIP_SH_UNDER_TEST points at another ship.sh blob.
"""
import os
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SHIP = os.environ.get("SHIP_SH_UNDER_TEST") or os.path.join(HERE, "..", "ship.sh")

STUB = r'''#!/usr/bin/env python3
import json, sys
if "--help" in sys.argv:
    print("usage: release-scream --repo R --check C %s" % ("[--title T]" if HAS_TITLE else ""))
    sys.exit(0)
args = sys.argv[1:]
kv = {args[i]: args[i + 1] for i in range(0, len(args) - 1) if args[i].startswith("--")}
if "--title" in kv and not HAS_TITLE:
    sys.exit(0)  # the real script swallows a bad call silently: the scream would vanish
title = kv.get("--title", "RELEASE WARNING — PUSHED ANYWAY")
print("BANNER " + title + " | " + kv.get("--check", ""))
'''


def scream_block(text):
    start = text.index("if [[ $SYNC_RC -ne 0 ]]; then")
    end = text.index("|| true", start) + len("|| true")
    return text[text.index("\n", start) + 1:end]


class SyncScreamTitle(unittest.TestCase):
    def run_block(self, has_title):
        home = tempfile.mkdtemp(prefix="ship-scream-")
        d = os.path.join(home, "code", "matrx-ship", "scripts")
        os.makedirs(d)
        with open(os.path.join(d, "release-scream.py"), "w") as f:
            f.write(STUB.replace("HAS_TITLE", "True" if has_title else "False"))
        log = os.path.join(home, "sync.log")
        with open(log, "w") as f:
            f.write("SYNC STOPPED: NOT PUSHED — something\n")
        with open(SHIP) as f:
            block = scream_block(f.read())
        script = "set -uo pipefail\nSYNC_RC=1\nSYNC_LOG=%s\n%s\n" % (log, block)
        r = subprocess.run(["/bin/bash", "-c", script], capture_output=True, text=True,
                           env={**os.environ, "HOME": home})
        return r.stdout + r.stderr

    def banner(self, out):
        lines = [l[len("BANNER "):] for l in out.splitlines() if l.startswith("BANNER ")]
        self.assertEqual(len(lines), 1, out)  # the scream fired exactly once, never swallowed
        title, _, check = lines[0].partition(" | ")
        return title, check

    def test_with_title_option_the_banner_title_is_honest(self):
        title, _ = self.banner(self.run_block(True))
        self.assertIn("SYNC DID NOT PUSH", title)
        self.assertNotIn("PUSHED ANYWAY", title)

    def test_without_title_option_the_title_leads_the_check(self):
        _, check = self.banner(self.run_block(False))
        self.assertTrue(check.startswith("RELEASE WARNING — SYNC DID NOT PUSH"), check)


if __name__ == "__main__":
    unittest.main()
