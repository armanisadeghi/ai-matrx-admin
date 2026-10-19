"""Give every Space template pack its own cover-library photo (tooling, one pass).

    python3 -I assign.py <repo root> [--dry]

For each pack in features/spaces/templates/packs/ (except the design-system packs SP0363 and SP0490–SP0499):
reads the file from disk right before editing; edits only when the disk copy is the same as origin/main or the
file is clean against HEAD (then the origin/main copy is the base, so a newer pushed version is never reverted);
otherwise the pack is skipped and listed (another lane is editing it). Changes only `cover` (the pack's and the
root page's, which the checker keeps equal), and bumps `version` and `spec.version` by one. Keeps each file's
own formatting (two-space JSON, with or without a final newline). Prints the edited files, one per line, after
`EDITED:` and the skipped ones after `SKIPPED:`.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

DESIGN = re.compile(r"^SP0(363|49\d)$")


def git(root: Path, *args: str) -> str | None:
    r = subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None


def main() -> int:
    root = Path(sys.argv[1])
    dry = "--dry" in sys.argv
    assignments: dict[str, str] = json.loads((root / "scripts/spaces-cover-library/assignments.json").read_text())
    edited, skipped = [], []
    for path in sorted((root / "features/spaces/templates/packs").glob("*.pack.json")):
        rel = path.relative_to(root).as_posix()
        disk = path.read_text()
        pack = json.loads(disk)
        cid = pack["catalogueId"]
        if DESIGN.match(cid):
            continue
        key = assignments.get(cid)
        if not key:
            skipped.append(f"{rel} (no photo sourced for {cid})")
            continue
        origin = git(root, "show", f"origin/main:{rel}")
        head = git(root, "show", f"HEAD:{rel}")
        if origin is not None and disk == origin:
            base = disk
        elif head is not None and disk == head and origin is not None:
            base = origin  # clean but behind: edit the pushed version, never revert it
        else:
            skipped.append(f"{rel} (uncommitted edits from another lane)")
            continue
        p = json.loads(base)
        cover = {"url": f"gallery:{key}", "offsetY": 50}
        if p.get("cover") == cover and p["pages"] and p["pages"][0].get("cover") == cover:
            continue
        p["cover"] = cover
        if p["pages"]:
            p["pages"][0]["cover"] = cover
        nxt = max(int(p["version"]), int(p["spec"]["version"])) + 1
        p["version"] = nxt
        p["spec"]["version"] = nxt
        text = json.dumps(p, indent=2, ensure_ascii=False) + ("\n" if base.endswith("\n") else "")
        if not dry:
            path.write_text(text)
        edited.append(rel)
    print("EDITED:")
    print("\n".join(edited))
    print("SKIPPED:")
    print("\n".join(skipped))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
