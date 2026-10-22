// Which product (and which sidebar row) a pathname belongs to, from the generated route table.
// Pure and tiny: the frame host runs it in the browser on every navigation (usePathname), and the
// table builder runs the same function to prune rows a parent route already answers.
import type { FrameRouteHomes, FrameRouteRow } from "./route-homes-types";

/** How well a route pattern matches a pathname: -1 = no match; more static segments = better. */
export function patternScore(pattern: string, pathname: string): number {
  const pat = pattern.split("/").filter(Boolean);
  const path = pathname.split("/").filter(Boolean);
  let score = 1;
  for (let i = 0; i < pat.length; i++) {
    const seg = pat[i];
    if (seg.startsWith("[[...")) return score; // optional catch-all: zero or more
    if (seg.startsWith("[...")) return i < path.length ? score : -1; // catch-all: one or more
    if (i >= path.length) return -1;
    if (seg.startsWith("[")) score += 1;
    else if (seg === path[i]) score += 100;
    else return -1;
  }
  return pat.length === path.length ? score : -1;
}

/** The named params a pattern binds from a pathname (`/marketing/brands/[brandId]` + `/marketing/brands/abc` → brandId=abc). */
export function patternParams(pattern: string, pathname: string): Record<string, string> {
  const out: Record<string, string> = {};
  const pat = pattern.split("/").filter(Boolean);
  const path = pathname.split("/").filter(Boolean);
  pat.forEach((seg, i) => {
    const m = /^\[([^.[\]]+)\]$/.exec(seg);
    if (m && path[i] !== undefined) out[m[1]] = path[i];
  });
  return out;
}

/** A pattern with every param filled from `params`; null when one is unknown. */
export function fillPattern(pattern: string, params: Record<string, string>): string | null {
  const segs: string[] = [];
  for (const seg of pattern.split("/").filter(Boolean)) {
    if (seg.startsWith("[[...")) continue;
    const m = /^\[([^.[\]]+)\]$/.exec(seg);
    if (m) {
      const value = params[m[1]];
      if (!value || value.startsWith("[")) return null;
      segs.push(value);
    } else if (seg.startsWith("[")) return null;
    else segs.push(seg);
  }
  return "/" + segs.join("/");
}

function bestExact(rows: readonly FrameRouteRow[], pathname: string): FrameRouteRow | null {
  let best: FrameRouteRow | null = null;
  let bestScore = -1;
  for (const row of rows) {
    const score = patternScore(row[0], pathname);
    if (score > bestScore) {
      best = row;
      bestScore = score;
    }
  }
  return best;
}

/** The row for a pathname: its own route, else its nearest ancestor's; null when nothing (not even `/`) matches. */
export function resolveRouteRow(rows: readonly FrameRouteRow[], pathname: string): FrameRouteRow | null {
  const segs = pathname.split("?")[0].split("/").filter(Boolean);
  for (let n = segs.length; n >= 0; n--) {
    const found = bestExact(rows, "/" + segs.slice(0, n).join("/"));
    if (found) return found;
  }
  return null;
}

export interface FrameRouteHome {
  productId: string;
  itemIndex: number;
  title: string;
  /** The params of the matched route, to fill the sidebar's dynamic links. */
  params: Record<string, string>;
}

export const FRAME_DEFAULT_PRODUCT_ID = "home";

export function resolveRouteHome(table: FrameRouteHomes, pathname: string): FrameRouteHome {
  const row = resolveRouteRow(table.routes, pathname);
  if (!row) return { productId: FRAME_DEFAULT_PRODUCT_ID, itemIndex: -1, title: "", params: {} };
  return { productId: row[1], itemIndex: row[2], title: row[3], params: patternParams(row[0], pathname) };
}
