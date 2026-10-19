// lib/spaces-blocks/template-slug.ts — A SPACE TEMPLATE'S PUBLIC ADDRESS (/templates/<slug>; the pack's `spec.id`).
//
// ADVERSARIAL-2 #10: fourteen packs were published at `spaces-sp0150`…`spaces-sp0163` (the catalog id, opaque to a
// person and a search engine) and three carried another template's name (Creator Content Planner at
// `spaces-content-calendar`, while Content Calendar is its own template). The rules:
//   · a new pack's slug is `packSlugFor(title)` — `spaces-` + the title's words;
//   · a published slug is STABLE: a later title change keeps it (the address people shared still answers);
//   · when a slug has to change, the old one goes in the pack's `formerSlugs` and its address redirects (308) to
//     the new one forever (public.template_public_page answers a former slug; the page sends it on);
//   · every slug is unique across the library, live and former, and never names another template's title.
// `slugFindings` is the check (publish refuses a pack with a finding; __tests__/template-slug.test.ts runs it over
// the library). Pure: no React, no store.

/** The slug a title makes: `spaces-` + its words, lower case, joined by dashes ("1:1 Meeting Notes" → "spaces-1-1-meeting-notes"). */
export function packSlugFor(title: string): string {
  const words = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return `spaces-${words.join("-")}`;
}

const CATALOG_ID_SLUG = /^spaces-sp\d+$/;
const SLUG_SHAPE = /^spaces-[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** What the slug check reads of a pack. */
export interface SlugPack {
  file?: string;
  title: string;
  formerSlugs?: readonly string[];
  spec: { id?: string };
}

const wordsOf = (slug: string) => new Set(slug.replace(/^spaces-/, "").split("-"));

/** Every slug problem in a library of packs, one line each, naming the pack. Empty = every address is right. */
export function slugFindings(packs: readonly SlugPack[]): string[] {
  const out: string[] = [];
  const owner = new Map<string, string>();
  const titleSlugs = new Map<string, string>();
  for (const p of packs) titleSlugs.set(packSlugFor(p.title), p.title);
  const name = (p: SlugPack) => p.file ?? p.title;
  for (const p of packs) {
    const slug = p.spec.id ?? "";
    if (!SLUG_SHAPE.test(slug)) out.push(`${name(p)}: spec.id "${slug}" is not a readable slug (spaces-<words>); use "${packSlugFor(p.title)}".`);
    else if (CATALOG_ID_SLUG.test(slug)) out.push(`${name(p)}: spec.id "${slug}" is the catalog id, not a name; use "${packSlugFor(p.title)}" and keep "${slug}" in formerSlugs.`);
    const other = titleSlugs.get(slug);
    if (other && other !== p.title) out.push(`${name(p)}: spec.id "${slug}" is another template's name ("${other}"); use "${packSlugFor(p.title)}".`);
    const own = packSlugFor(p.title);
    // A shared word, or one root ("invoice" / "invoicing"): the slug still names this template.
    const root = (w: string) => (w.length >= 5 ? w.slice(0, 5) : w);
    const ownRoots = new Set([...wordsOf(own)].map(root));
    const shared = [...wordsOf(slug)].some((w) => ownRoots.has(root(w)));
    if (SLUG_SHAPE.test(slug) && !shared) out.push(`${name(p)}: spec.id "${slug}" shares no word with the title "${p.title}"; use "${own}".`);
    for (const s of [slug, ...(p.formerSlugs ?? [])]) {
      const prev = owner.get(s);
      if (prev && prev !== name(p)) out.push(`${name(p)}: slug "${s}" is also ${prev}'s.`);
      else owner.set(s, name(p));
    }
  }
  return out;
}
