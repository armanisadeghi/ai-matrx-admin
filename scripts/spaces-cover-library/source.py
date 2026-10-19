"""Source the Spaces cover library from Pexels (tooling run once, never product code).

Reads queries.json (one query per template pack + extra picks per category), searches the official Pexels API
for landscape photos, skips photos whose description names people, downloads a 2000px-wide JPEG of each pick into
an output folder and writes sourced.json: key, category, tags, alt, source URL, photographer, license.

Pexels License: free for commercial use, no attribution required (we keep the credit anyway).

    PEXELS_API_KEY=... python3 -I source.py <queries.json> <out-dir> [--ban <pexels id>...]

Re-running keeps earlier picks (sourced.json) and only fills missing ones; --ban drops a pick and re-chooses.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://api.pexels.com/v1/search"
PEOPLE = re.compile(
    r"\b(man|men|woman|women|person|people|girl|girls|boy|boys|child|children|kid|kids|portrait|face|faces|"
    r"guy|lady|couple|crowd|baby|businessman|businesswoman|worker|workers|student|students|doctor|nurse|selfie|"
    r"hand holding|smiling|posing|family|friends|team|colleagues|logo|brand|apple|iphone|macbook|nike|coca)\b",
    re.I,
)


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:40].strip("-")


def search(key: str, query: str, page: int = 1) -> list[dict]:
    url = f"{API}?{urllib.parse.urlencode({'query': query, 'orientation': 'landscape', 'per_page': 40, 'page': page})}"
    req = urllib.request.Request(url, headers={"Authorization": key, "User-Agent": "aimatrx-cover-library/1"})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read())["photos"]
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 5:
                raise
            time.sleep(15 * (attempt + 1))
    return []


def main() -> int:
    qpath, out = Path(sys.argv[1]), Path(sys.argv[2])
    bans = {int(b) for a in sys.argv[sys.argv.index("--ban") + 1 :] for b in a.split()} if "--ban" in sys.argv else set()
    key = os.environ["PEXELS_API_KEY"]
    out.mkdir(parents=True, exist_ok=True)
    queries = json.loads(qpath.read_text())
    manifest_path = out / "sourced.json"
    have: dict[str, dict] = {e["slot"]: e for e in json.loads(manifest_path.read_text())} if manifest_path.exists() else {}
    banned_all = bans | {int(b) for b in json.loads((out / "banned.json").read_text())} if (out / "banned.json").exists() else bans
    (out / "banned.json").write_text(json.dumps(sorted(banned_all)))
    for slot, e in list(have.items()):
        if e["pexelsId"] in banned_all:
            (out / f"{e['key']}.jpg").unlink(missing_ok=True)
            del have[slot]
    used = {e["pexelsId"] for e in have.values()}
    slots = [(sp, cat, q) for sp, (cat, q) in queries["packs"].items()] + [
        (f"extra-{i:02d}", cat, q) for i, (cat, q) in enumerate(queries["extras"])
    ]
    for slot, cat, q in slots:
        if slot in have:
            continue
        pick = None
        for page in (1, 2):
            for p in search(key, q, page):
                if p["id"] in used or p["id"] in banned_all or p["width"] < 2000 or p["width"] < p["height"] * 1.3:
                    continue
                if PEOPLE.search(p.get("alt") or ""):
                    continue
                pick = p
                break
            if pick:
                break
        if not pick:
            print(f"NO PICK {slot} {q}")
            continue
        used.add(pick["id"])
        k = f"{cat}-{slug(q)}"
        while any(e["key"] == k for e in have.values()):
            k += "-2"
        img = pick["src"]["original"] + "?auto=compress&cs=tinysrgb&w=2000&fm=jpg"
        dest = out / f"{k}.jpg"
        req = urllib.request.Request(img, headers={"User-Agent": "aimatrx-cover-library/1"})
        with urllib.request.urlopen(req, timeout=60) as r:
            dest.write_bytes(r.read())
        alt = (pick.get("alt") or q).strip()
        have[slot] = {
            "slot": slot,
            "key": k,
            "category": cat,
            "query": q,
            "alt": alt[:160],
            "tags": sorted({cat, *[w for w in slug(q).split("-") if len(w) > 2]}),
            "pexelsId": pick["id"],
            "sourceUrl": pick["url"],
            "photographer": pick["photographer"],
            "photographerUrl": pick["photographer_url"],
            "license": "Pexels License",
            "licenseUrl": "https://www.pexels.com/license/",
            "avgColor": pick.get("avg_color"),
        }
        print(f"{slot} {k} {pick['id']} {alt[:60]}")
        manifest_path.write_text(json.dumps(list(have.values()), indent=1))
        time.sleep(0.4)
    manifest_path.write_text(json.dumps(list(have.values()), indent=1))
    print(f"{len(have)} photos")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
