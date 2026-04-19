/**
 * Lucide.dev lists icons in kebab-case (e.g. `alarm-clock`); the React package
 * exports PascalCase (`AlarmClock`). Normalize pasted / typed names into candidates
 * to validate against `lucide-react` exports.
 */

/** `alarm-clock` → `AlarmClock`, `a-arrow-down` → `AArrowDown` */
export function kebabCaseToLucidePascalCase(raw: string): string {
  const s = raw.trim();
  if (!s.includes("-")) {
    return s;
  }
  return s
    .split("-")
    .filter(Boolean)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase())
    .join("");
}

/**
 * Ordered unique candidates: exact input, first-letter fix, kebab → Pascal variants.
 * Skip Lucide heuristics for `svg:…` Matrx assets (caller should pass only those as `[trimmed]`).
 */
export function collectLucideIconNameCandidates(raw: string): string[] {
  const t = raw.trim();
  if (!t) {
    return [];
  }

  const out: string[] = [];
  const push = (s: string) => {
    if (s && !out.includes(s)) {
      out.push(s);
    }
  };

  push(t);

  if (t[0] === t[0].toLowerCase()) {
    push(t.charAt(0).toUpperCase() + t.slice(1));
  }

  if (t.includes("-")) {
    push(kebabCaseToLucidePascalCase(t));
    const lower = t.toLowerCase();
    if (lower !== t) {
      push(kebabCaseToLucidePascalCase(lower));
    }
  }

  return out;
}
