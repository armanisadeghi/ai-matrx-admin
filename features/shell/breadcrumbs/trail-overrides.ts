// features/shell/breadcrumbs/trail-overrides.ts
//
// THE ONE OVERRIDE LIST for derived breadcrumbs (Arman, 2026-10-19: "keep a list somewhere that
// allows a particular route to have an override for what we show").
//
// A trail is derived from the address, the menu and the route tree (derive-trail.ts). Add a line here
// ONLY when the derived words are wrong for one route. Never hand-type a trail in a page.
//
// Keys are addresses; a `:param` segment matches any one segment:
//   "/agents/:id/build": "Builder"
// A label override may also be `null` to HIDE the level (a container that is not a page of its own).

export const TRAIL_LABEL_OVERRIDES: Readonly<Record<string, string | null>> = {
  // Examples of the shape (kept real, kept few):
  "/agents/:id/v": "Versions",
};

/** Does `pattern` (with `:param` segments) match the address `href`? */
export function matchesTrailPattern(pattern: string, href: string): boolean {
  const a = pattern.split("/").filter(Boolean);
  const b = href.split("/").filter(Boolean);
  if (a.length !== b.length) return false;
  return a.every((seg, i) => seg.startsWith(":") || seg === b[i]);
}

/** The override for this address: a label, `null` (hide the level) or `undefined` (derive it). */
export function trailOverrideFor(
  href: string,
  overrides: Readonly<Record<string, string | null>> = TRAIL_LABEL_OVERRIDES,
): string | null | undefined {
  if (href in overrides) return overrides[href];
  for (const [pattern, value] of Object.entries(overrides)) {
    if (pattern.includes(":") && matchesTrailPattern(pattern, href)) return value;
  }
  return undefined;
}
