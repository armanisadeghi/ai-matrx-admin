// features/shell/breadcrumbs/redirect-levels.ts
//
// A REDIRECT IS A REAL DOOR. `/marketing/brands/smart-add` has no page of its own — next.config.js
// sends it to `/marketing/brands/smart-add/company` (a config redirect on purpose: a page calling
// redirect() inside the streaming Smart Add layout threw React #419). A crumb linking there lands on a
// page, so it must stay a link (Arman, 2026-10-22: "Smart Add brand" has to take him there).
//
// `redirectedPatternsOf` reads the UNCONDITIONAL redirect sources out of next.config.js's
// `redirects()` and turns them into route patterns (`:id` → `[id]`); `pagelessLevelsOf` treats each
// as an address that answers. Read statically, never by requiring next.config.js (it copies files
// and asserts the dev-server guards on load). Skipped, by design: a source with a wildcard or regex
// part (`:path*`, `:brand(…)`) — it names a family, not one level — and a redirect carrying `has` /
// `missing`, which fires only for some requests.

/** Route patterns (`[param]` per `:param`) of every unconditional, single-address redirect source. */
export function redirectedPatternsOf(configText: string): string[] {
  const start = configText.search(/\basync\s+redirects\s*\(\s*\)/);
  if (start === -1) return [];
  const body = configText.slice(start, blockEnd(configText, configText.indexOf("{", start)));
  const out = new Set<string>();
  for (const block of objectBlocks(body)) {
    const source = /\bsource\s*:\s*["']([^"']+)["']/.exec(block)?.[1];
    if (!source || /\b(has|missing)\s*:/.test(block)) continue;
    if (/[*+?()]/.test(source)) continue;
    out.add(source.replace(/:([A-Za-z_]\w*)/g, "[$1]").replace(/\/+$/, "") || "/");
  }
  return [...out].sort();
}

/** Index just past the `}` matching the `{` at `open` (strings and comments skipped). */
function blockEnd(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === "/" && text[i + 1] === "/") {
      i = text.indexOf("\n", i);
      if (i === -1) return text.length;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      i = stringEnd(text, i);
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return i + 1;
  }
  return text.length;
}

function stringEnd(text: string, at: number): number {
  const q = text[at];
  for (let i = at + 1; i < text.length; i++) {
    if (text[i] === "\\") i++;
    else if (text[i] === q) return i;
  }
  return text.length;
}

/** Every innermost `{ … }` object that names a `source` (one redirect rule each). */
function objectBlocks(body: string): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(/\bsource\s*:/g)) {
    const open = body.lastIndexOf("{", m.index);
    if (open === -1) continue;
    out.push(body.slice(open, blockEnd(body, open)));
  }
  return out;
}

/** Does this concrete address hit one of the redirected patterns (`[param]` = any one segment)? */
export function isRedirectedAddress(href: string, patterns: readonly string[]): boolean {
  const segs = (href.split(/[?#]/, 1)[0] ?? "").split("/").filter(Boolean);
  return patterns.some((pattern) => {
    const pat = pattern.split("/").filter(Boolean);
    return pat.length === segs.length && pat.every((p, i) => p.startsWith("[") || p === segs[i]);
  });
}
