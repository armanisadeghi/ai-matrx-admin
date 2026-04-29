#!/usr/bin/env python3
"""Parse analyze.data files across all routes and surface the biggest cost contributors.

Reconstructs full source paths via parent_source_index chain, then aggregates:
- Per-route stats (size, module count)
- Module ubiquity (how many routes import each module)
- Total impact (route_count × route_size sum)
"""

import json
import sys
from collections import Counter, defaultdict
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

ANALYZE_ROOT = Path(".next/diagnostics/analyze/data")


def find_json_end(data: bytes) -> int:
    depth = 0
    in_str = False
    escape = False
    OB, CB, QT, BS = ord("{"), ord("}"), ord('"'), ord("\\")
    for i, b in enumerate(data):
        if escape:
            escape = False
            continue
        if in_str:
            if b == BS:
                escape = True
            elif b == QT:
                in_str = False
            continue
        if b == QT:
            in_str = True
        elif b == OB:
            depth += 1
        elif b == CB:
            depth -= 1
            if depth == 0:
                return i + 1
    return -1


def reconstruct_paths(sources):
    """Reconstruct full path for every source by walking parent_source_index chain.
    Returns list of full paths aligned to source indices.
    """
    n = len(sources)
    full = [None] * n

    def resolve(i, stack=None):
        if i is None or i < 0 or i >= n:
            return ""
        if full[i] is not None:
            return full[i]
        if stack is not None and i in stack:
            return ""
        s = sources[i]
        p = s.get("path") or ""
        parent = s.get("parent_source_index")
        if parent is None or parent < 0 or parent == i:
            full[i] = p
            return p
        if stack is None:
            stack = set()
        stack = stack | {i}
        parent_path = resolve(parent, stack)
        if parent_path and not parent_path.endswith("/"):
            res = parent_path + "/" + p if p else parent_path
        else:
            res = parent_path + p
        full[i] = res
        return res

    sys.setrecursionlimit(1000000)
    for i in range(n):
        if full[i] is None:
            resolve(i)
    return full


def parse_one(path_str: str):
    path = Path(path_str)
    raw = path.read_bytes()
    data = raw[4:]
    end = find_json_end(data)
    if end <= 0:
        return None
    try:
        d = json.loads(data[:end].decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None

    sources = d.get("sources", [])
    full_paths = reconstruct_paths(sources)

    # Filter to "real module" paths — those starting with [project]/
    project_paths = []
    for p in full_paths:
        if p and p.startswith("[project]/") and not p.endswith("/"):
            project_paths.append(p[len("[project]/"):])

    route = str(path.parent.relative_to(ANALYZE_ROOT))
    if route == ".":
        route = "/"
    return {
        "route": route,
        "size": len(raw),
        "total_sources": len(sources),
        "modules": project_paths,
    }


def main():
    if not ANALYZE_ROOT.exists():
        print(f"Missing {ANALYZE_ROOT}", file=sys.stderr)
        sys.exit(1)

    files = [str(p) for p in ANALYZE_ROOT.rglob("analyze.data")]
    print(f"Parsing {len(files)} routes in parallel...", file=sys.stderr)

    route_summaries = []
    module_route_count = Counter()  # module path -> # routes that include it
    module_total_size = defaultdict(int)  # module path -> sum of route sizes that include it

    with ProcessPoolExecutor(max_workers=16) as ex:
        futures = [ex.submit(parse_one, f) for f in files]
        done = 0
        for fut in as_completed(futures):
            done += 1
            if done % 100 == 0:
                print(f"  {done}/{len(files)}", file=sys.stderr)
            res = fut.result()
            if res is None:
                continue
            route_summaries.append({
                "route": res["route"],
                "size": res["size"],
                "total_sources": res["total_sources"],
                "module_count": len(res["modules"]),
            })
            seen = set(res["modules"])
            for m in seen:
                module_route_count[m] += 1
                module_total_size[m] += res["size"]

    out = []
    out.append("=" * 80)
    out.append("BUILD-TIME COST ANALYSIS — Next.js Turbopack route chunk graphs")
    out.append("=" * 80)
    out.append("")

    out.append("# 1. ROUTE SIZE DISTRIBUTION (.next/diagnostics/analyze chunk graph size)")
    buckets = {"<1MB (api)": 0, "1-5MB": 0, "5-10MB": 0, "10-12MB": 0, "12MB+": 0}
    for r in route_summaries:
        s = r["size"]
        if s < 1024 * 1024: buckets["<1MB (api)"] += 1
        elif s < 5 * 1024 * 1024: buckets["1-5MB"] += 1
        elif s < 10 * 1024 * 1024: buckets["5-10MB"] += 1
        elif s < 12 * 1024 * 1024: buckets["10-12MB"] += 1
        else: buckets["12MB+"] += 1
    for k, v in buckets.items():
        out.append(f"  {k:>15}  {v:>4} routes")
    out.append(f"  {'TOTAL':>15}  {len(route_summaries):>4} routes")
    out.append("")

    out.append("# 2. MODULE COUNT PER ROUTE (project files only — excl. node_modules/synthetic)")
    counts = sorted(r["module_count"] for r in route_summaries)
    n = len(counts)
    out.append(f"  Min:    {counts[0]:,}")
    out.append(f"  P10:    {counts[int(n*0.1)]:,}")
    out.append(f"  Median: {counts[n//2]:,}")
    out.append(f"  P90:    {counts[int(n*0.9)]:,}")
    out.append(f"  Max:    {counts[-1]:,}")
    out.append("")

    out.append("# 3. TOP 30 ROUTES BY analyze.data SIZE")
    route_summaries.sort(key=lambda r: -r["size"])
    out.append(f"  {'Size':>9}  {'Total':>7}  {'Modules':>7}  Route")
    for r in route_summaries[:30]:
        out.append(
            f"  {r['size']/1024/1024:>7.2f}MB  "
            f"{r['total_sources']:>7,}  "
            f"{r['module_count']:>7,}  /{r['route']}"
        )
    out.append("")

    out.append("# 4. TOP 50 PROJECT FILES BY ROUTE COUNT (in static graph of N routes)")
    out.append("# (these are the files whose change cascade-invalidates the most routes)")
    out.append(f"  {'Routes':>6}  Path")
    project_modules = [
        (m, c) for m, c in module_route_count.items()
        if any(m.startswith(p) for p in ("features/", "lib/", "components/", "app/", "utils/", "hooks/", "providers/", "types/", "constants/", "config/", "styles/", "packages/"))
    ]
    project_modules.sort(key=lambda x: -x[1])
    for m, c in project_modules[:50]:
        out.append(f"  {c:>6,}  {m}")
    out.append("")

    out.append("# 5. TOP 50 NODE_MODULES BY ROUTE COUNT")
    out.append("# (heaviest external libs that ship to most routes)")
    out.append(f"  {'Routes':>6}  Path")
    nm_modules = [
        (m, c) for m, c in module_route_count.items()
        if "node_modules" in m
    ]
    nm_modules.sort(key=lambda x: -x[1])
    for m, c in nm_modules[:50]:
        # Trim the .pnpm noise for readability
        display = m
        if "/.pnpm/" in m and "/node_modules/" in m:
            after = m.split("/node_modules/", 1)[1]
            after = after.split("/node_modules/", 1)[-1] if "/node_modules/" in after else after
            display = "node_modules/" + after
        out.append(f"  {c:>6,}  {display}")
    out.append("")

    out.append("# 6. NPM PACKAGE DAMAGE COUNT (modules per package, sorted by total)")
    out.append("# (a package that ships 1500 modules to 200 routes costs more than one shipping 5 modules to 200 routes)")
    pkg_module_count = Counter()
    pkg_total_routes = defaultdict(int)
    for m, c in module_route_count.items():
        if "/.pnpm/" in m and "/node_modules/" in m:
            # Extract the actual package name (after the LAST /node_modules/)
            pkg_path = m.split("/node_modules/")[-1]
            # Package name is first 1 or 2 segments (handle @scope/name)
            parts = pkg_path.split("/")
            if parts[0].startswith("@") and len(parts) > 1:
                pkg = parts[0] + "/" + parts[1]
            else:
                pkg = parts[0]
            pkg_module_count[pkg] += 1
            pkg_total_routes[pkg] = max(pkg_total_routes[pkg], c)
    out.append(f"  {'#mods':>6}  {'MaxRoutes':>9}  Package")
    for pkg, mods in sorted(pkg_module_count.items(), key=lambda x: -x[1])[:40]:
        out.append(f"  {mods:>6,}  {pkg_total_routes[pkg]:>9,}  {pkg}")

    print("\n".join(out))


if __name__ == "__main__":
    main()
