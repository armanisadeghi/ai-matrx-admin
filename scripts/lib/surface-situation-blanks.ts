/**
 * Situation blanks must name real values.
 *
 * A surface's `situation` is the moment in words; the server (aidream
 * `services/conversation_context/situation.py`) fills each `{blank}` from the surface's
 * live values every turn. A blank that names a value the surface (or an ancestor) never
 * declares can never fill: the agent reads "(not known: …)" forever, or the fallback
 * words even when the fact is on screen. A brace pair that is not a valid blank renders
 * literally. Both are declaration defects, caught here before sync.
 *
 * Blank grammar (the server's `_BLANK_RE`): `{name}`, `{name.path}`, `{name|words}`.
 * The root name must be a value declared in the resolved chain (ALL_MANIFESTS carries
 * every inherited value) or a request context key the server adds (`user`).
 */

/** Same grammar as the server's `_BLANK_RE`. */
const BLANK_RE = /\{\s*([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*)\s*(?:\|([^{}]*))?\}/g;
/** Any brace pair, valid or not. */
const BRACE_RE = /\{[^{}]*\}/g;

/** Request context keys the server adds beside the surface's own values. */
export const SITUATION_CONTEXT_KEYS: ReadonlySet<string> = new Set(["user"]);

export interface SituationSurface {
  surfaceName: string;
  situation?: string | null;
  values: ReadonlyArray<{ name: string }>;
}

/** One sentence per defect; empty when every blank resolves. */
export function situationBlankFailures(
  manifests: ReadonlyArray<SituationSurface>,
): string[] {
  const failures: string[] = [];
  for (const m of manifests) {
    const template = m.situation?.trim();
    if (!template) continue;
    const declared = new Set(m.values.map((v) => v.name));
    for (const brace of template.match(BRACE_RE) ?? []) {
      BLANK_RE.lastIndex = 0;
      const match = BLANK_RE.exec(brace);
      if (!match || match[0] !== brace) {
        failures.push(
          `Surface "${m.surfaceName}" situation has "${brace}", which is not a blank ({name}, {name.path} or {name|words}) and would render literally. Fix: write it as a blank or drop the braces.`,
        );
        continue;
      }
      const root = match[1].split(".")[0];
      if (!declared.has(root) && !SITUATION_CONTEXT_KEYS.has(root)) {
        failures.push(
          `Surface "${m.surfaceName}" situation blank "${brace}" names "${root}", which neither this surface nor any ancestor declares, so it can never fill. Fix: use a declared value key or declare the value.`,
        );
      }
    }
  }
  return failures;
}
