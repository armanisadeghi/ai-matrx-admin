"""Write lib/spaces-blocks/cover-library.json from upload.py's output (tooling, run once after an upload).

    python3 -I build-manifest.py <uploaded.json> <repo root>

The manifest lists photos in the gallery's category order (lib/spaces-blocks/template-pack.ts), and
assignments.json (beside this script) records which pack each photo was sourced for (slot = catalogue id).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


def main() -> int:
    uploaded = json.loads(Path(sys.argv[1]).read_text())
    root = Path(sys.argv[2])
    src = (root / "lib/spaces-blocks/template-pack.ts").read_text()
    block = src[src.index("SPACE_TEMPLATE_CATEGORIES = [") :]
    block = block[: block.index("] as const")]
    order = re.findall(r'key: "([a-z]+)"', block)
    rank = {k: i for i, k in enumerate(order)}
    missing = sorted({e["category"] for e in uploaded} - set(rank))
    if missing:
        raise SystemExit(f"unknown categories: {missing}")
    rows = sorted(uploaded, key=lambda e: (rank[e["category"]], e["slot"].startswith("extra"), e["slot"]))
    manifest = [
        {
            "key": e["key"],
            "fileId": e["fileId"],
            "src": e["cdnUrl"],
            "thumb": e["thumbUrl"],
            "alt": e["alt"],
            "category": e["category"],
            "tags": e["tags"],
            "credit": e["photographer"],
            "creditUrl": e["photographerUrl"],
            "sourceUrl": e["sourceUrl"],
            "license": e["license"],
            "licenseUrl": e["licenseUrl"],
            "color": e.get("avgColor"),
            "width": e["width"],
            "height": e["height"],
        }
        for e in rows
    ]
    (root / "lib/spaces-blocks/cover-library.json").write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + "\n")
    assignments = {e["slot"]: e["key"] for e in rows if not e["slot"].startswith("extra")}
    (root / "scripts/spaces-cover-library/assignments.json").write_text(json.dumps(assignments, indent=1) + "\n")
    print(f"{len(manifest)} photos, {len(assignments)} pack assignments")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
