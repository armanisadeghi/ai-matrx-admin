/**
 * The presentation deck model — PURE (no React, no IO), so the editor's every
 * change is a tested reducer step.
 *
 * A saved presentation stores exactly the `presentation_deck` kind the chat and
 * agents already emit (`features/content-ir/kinds/presentation-deck.ts`):
 *
 *   { __kind: "presentation_deck", title?, theme?: { preset?, … },
 *     slides: [{ __kind: "presentation_slide", layout?, title?, … }] }
 *
 * `__kind` is part of the data (kind-marker law): normalize ADDS it, nothing
 * here ever strips it. Unknown slide/deck keys ride through untouched.
 */

import type { SlideData, SlideTheme } from "@/components/mardown-display/blocks/presentations/SlideView";

export const DECK_KIND = "presentation_deck";
export const SLIDE_KIND = "presentation_slide";

export type DeckSlide = SlideData & { __kind: typeof SLIDE_KIND; id?: string; [key: string]: unknown };
export type DeckTheme = SlideTheme & { preset?: string };
export type Deck = {
  __kind: typeof DECK_KIND;
  title?: string;
  theme?: DeckTheme | null;
  slides: DeckSlide[];
  [key: string]: unknown;
};

/** The layouts the editor offers (SlideView renders each). */
export const EDITOR_LAYOUTS = [
  { key: "title", label: "Title slide" },
  { key: "section", label: "Section header" },
  { key: "bullets", label: "Title and body" },
  { key: "two-column", label: "Two columns" },
  { key: "image-split", label: "Title, body and image" },
  { key: "image-full", label: "Full image" },
  { key: "quote", label: "Quote" },
  { key: "stat", label: "Big numbers" },
  { key: "closing", label: "Closing" },
] as const;
export type EditorLayout = (typeof EDITOR_LAYOUTS)[number]["key"];

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

let idCounter = 0;
/** A stable per-slide key for the rail (drag, React keys). Not part of the content contract. */
export function newSlideId(): string {
  idCounter += 1;
  return `s${Date.now().toString(36)}${idCounter.toString(36)}`;
}

function normalizeSlide(raw: unknown): DeckSlide {
  const s = isRecord(raw) ? raw : {};
  return { ...s, __kind: SLIDE_KIND, id: typeof s.id === "string" && s.id ? s.id : newSlideId() } as DeckSlide;
}

/**
 * Any deck-shaped value → a `Deck`: the flat kind, the legacy `{presentation:{slides,theme}}`
 * envelope, or a bare slides array. Never throws; an unreadable value is an empty deck.
 */
export function normalizeDeck(raw: unknown): Deck {
  let value: unknown = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      value = {};
    }
  }
  if (Array.isArray(value)) value = { slides: value };
  if (isRecord(value) && isRecord(value.presentation) && !Array.isArray(value.slides)) {
    value = { ...value.presentation };
  }
  const v = isRecord(value) ? value : {};
  const slides = Array.isArray(v.slides) ? v.slides.map(normalizeSlide) : [];
  const theme = isRecord(v.theme) ? (v.theme as DeckTheme) : null;
  return { ...v, __kind: DECK_KIND, slides, theme } as Deck;
}

/** The deck as stored (slide rail ids are editor-only and dropped). */
export function deckForStorage(deck: Deck): Deck {
  return {
    ...deck,
    __kind: DECK_KIND,
    slides: deck.slides.map(({ id: _id, ...rest }) => ({ ...rest, __kind: SLIDE_KIND }) as DeckSlide),
  };
}

export function blankSlide(layout: EditorLayout = "bullets"): DeckSlide {
  const base: DeckSlide = { __kind: SLIDE_KIND, id: newSlideId(), layout };
  if (layout === "title") return { ...base, title: "", subtitle: "" };
  if (layout === "bullets") return { ...base, title: "", bullets: [""] };
  if (layout === "two-column") {
    return { ...base, title: "", extra: { columns: [{ title: "", bullets: [""] }, { title: "", bullets: [""] }] } };
  }
  if (layout === "image-split") return { ...base, title: "", bullets: [""] };
  if (layout === "quote") return { ...base, quote: "", author: "" };
  if (layout === "stat") {
    return { ...base, title: "", extra: { stats: [{ value: "", label: "" }, { value: "", label: "" }, { value: "", label: "" }] } };
  }
  if (layout === "closing") return { ...base, title: "Thank you", subtitle: "" };
  return { ...base, title: "" };
}

export function blankDeck(title = ""): Deck {
  return { __kind: DECK_KIND, title, theme: { preset: "classic" }, slides: [blankSlide("title")] };
}

/** The deck's display title: its own, else its first slide's. */
export function deckTitle(deck: Deck): string {
  return (deck.title || deck.slides[0]?.title || "").trim();
}

// ── field paths ─────────────────────────────────────────────────────────────
// A path addresses one text inside a slide: "title", "bullets.2", "extra.eyebrow",
// "extra.stats.1.value", "extra.columns.0.bullets.3".

function splitBullets(bullets?: string[]): Array<{ title?: string; bullets: string[] }> {
  const b = bullets ?? [];
  const mid = Math.ceil(b.length / 2);
  return [{ bullets: b.slice(0, mid) }, { bullets: b.slice(mid) }];
}

function clone<T>(v: T): T {
  return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);
}

/** A slide whose two-column layout reads split bullets gets real columns before an edit lands in one. */
function materializeColumns(slide: DeckSlide): DeckSlide {
  const extra = isRecord(slide.extra) ? slide.extra : {};
  if (Array.isArray(extra.columns)) return slide;
  const { bullets: _b, ...rest } = slide;
  return { ...rest, extra: { ...extra, columns: splitBullets(slide.bullets) } } as DeckSlide;
}

function setIn(target: Record<string, unknown> | unknown[], keys: string[], value: unknown): void {
  let cur: Record<string, unknown> | unknown[] = target;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const k = keys[i]!;
    const nextIsIndex = /^\d+$/.test(keys[i + 1]!);
    const existing = (cur as Record<string, unknown>)[k];
    if (!existing || typeof existing !== "object") {
      (cur as Record<string, unknown>)[k] = nextIsIndex ? [] : {};
    }
    cur = (cur as Record<string, unknown>)[k] as Record<string, unknown> | unknown[];
  }
  (cur as Record<string, unknown>)[keys[keys.length - 1]!] = value;
}

export function getPath(slide: DeckSlide, path: string): unknown {
  let cur: unknown = slide;
  for (const k of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

export function setSlidePath(slide: DeckSlide, path: string, value: string): DeckSlide {
  const base = path.startsWith("extra.columns") ? materializeColumns(slide) : slide;
  const next = clone(base);
  setIn(next as Record<string, unknown>, path.split("."), value);
  return next;
}

/** The list a list-item path belongs to ("bullets.2" → ["bullets", 2]). */
function listOf(path: string): { list: string; index: number } | null {
  const m = /^(.*)\.(\d+)$/.exec(path);
  if (!m) return null;
  return { list: m[1]!, index: Number(m[2]) };
}

// ── reducer ─────────────────────────────────────────────────────────────────

export type DeckAction =
  | { type: "load"; deck: Deck }
  | { type: "setTitle"; title: string }
  | { type: "setPreset"; preset: string }
  | { type: "addSlide"; after: number; layout?: EditorLayout }
  | { type: "duplicateSlide"; index: number }
  | { type: "deleteSlide"; index: number }
  | { type: "moveSlide"; from: number; to: number }
  | { type: "setLayout"; index: number; layout: EditorLayout }
  | { type: "setField"; index: number; path: string; value: string }
  /** Enter at the end of a list item: a new empty item after it. */
  | { type: "insertItem"; index: number; path: string }
  /** Backspace in an empty list item: the item goes (a list keeps one). */
  | { type: "removeItem"; index: number; path: string }
  | { type: "setNotes"; index: number; notes: string }
  | { type: "setImage"; index: number; image: string | null; prompt?: string | null };

export type DeckState = { deck: Deck; current: number };

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function withSlide(state: DeckState, index: number, fn: (s: DeckSlide) => DeckSlide): DeckState {
  const slide = state.deck.slides[index];
  if (!slide) return state;
  const next = fn(slide);
  if (next === slide) return state;
  const slides = state.deck.slides.slice();
  slides[index] = next;
  return { ...state, deck: { ...state.deck, slides } };
}

export function deckReducer(state: DeckState, action: DeckAction): DeckState {
  const { deck } = state;
  const n = deck.slides.length;
  switch (action.type) {
    case "load":
      return { deck: action.deck, current: clamp(state.current, 0, Math.max(0, action.deck.slides.length - 1)) };
    case "setTitle":
      return { ...state, deck: { ...deck, title: action.title } };
    case "setPreset":
      return { ...state, deck: { ...deck, theme: { ...(deck.theme ?? {}), preset: action.preset } } };
    case "addSlide": {
      const at = clamp(action.after + 1, 0, n);
      const slides = deck.slides.slice();
      slides.splice(at, 0, blankSlide(action.layout ?? (n === 0 ? "title" : "bullets")));
      return { deck: { ...deck, slides }, current: at };
    }
    case "duplicateSlide": {
      const src = deck.slides[action.index];
      if (!src) return state;
      const slides = deck.slides.slice();
      slides.splice(action.index + 1, 0, { ...clone(src), id: newSlideId() });
      return { deck: { ...deck, slides }, current: action.index + 1 };
    }
    case "deleteSlide": {
      if (!deck.slides[action.index]) return state;
      const slides = deck.slides.filter((_, i) => i !== action.index);
      return { deck: { ...deck, slides }, current: clamp(state.current >= action.index ? state.current - 1 : state.current, 0, Math.max(0, slides.length - 1)) };
    }
    case "moveSlide": {
      const from = action.from;
      const to = clamp(action.to, 0, n - 1);
      if (from === to || !deck.slides[from]) return state;
      const slides = deck.slides.slice();
      const [moved] = slides.splice(from, 1);
      slides.splice(to, 0, moved!);
      // The selection stays on the slide it was on, wherever the move put it.
      const selected = deck.slides[state.current];
      const cur = selected ? slides.indexOf(selected) : to;
      return { deck: { ...deck, slides }, current: cur };
    }
    case "setLayout":
      return withSlide(state, action.index, (s) => {
        const next: DeckSlide = { ...s, layout: action.layout };
        delete next.type;
        if (action.layout === "two-column") return materializeColumns(next);
        if (action.layout === "stat") {
          const extra = isRecord(next.extra) ? next.extra : {};
          if (!Array.isArray(extra.stats)) next.extra = { ...extra, stats: [{ value: "", label: "" }, { value: "", label: "" }] };
        }
        if ((action.layout === "bullets" || action.layout === "image-split") && !next.bullets?.length) next.bullets = [""];
        return next;
      });
    case "setField":
      return withSlide(state, action.index, (s) => setSlidePath(s, action.path, action.value));
    case "insertItem":
      return withSlide(state, action.index, (s) => {
        const at = listOf(action.path);
        if (!at) return s;
        const base = at.list.startsWith("extra.columns") ? materializeColumns(s) : s;
        const next = clone(base);
        const list = getPath(next, at.list);
        if (!Array.isArray(list)) return s;
        const empty = at.list === "extra.stats" ? { value: "", label: "" } : "";
        list.splice(at.index + 1, 0, empty);
        return next;
      });
    case "removeItem":
      return withSlide(state, action.index, (s) => {
        const at = listOf(action.path);
        if (!at) return s;
        const next = clone(s);
        const list = getPath(next, at.list);
        if (!Array.isArray(list) || list.length <= 1) return s;
        list.splice(at.index, 1);
        return next;
      });
    case "setNotes":
      return withSlide(state, action.index, (s) => ({ ...s, notes: action.notes }));
    case "setImage":
      return withSlide(state, action.index, (s) => {
        const extra: Record<string, unknown> = { ...(isRecord(s.extra) ? s.extra : {}) };
        delete extra.image;
        delete extra.imagePrompt;
        delete extra.image_prompt;
        if (action.prompt) extra.imagePrompt = action.prompt;
        const next: DeckSlide = { ...s, extra };
        delete next.imageUrl;
        if (action.image) next.image_url = action.image;
        else delete next.image_url;
        const layout = (next.layout ?? "").toLowerCase();
        if ((action.image || action.prompt) && !layout.startsWith("image")) next.layout = "image-split";
        return next;
      });
    default:
      return state;
  }
}

/** Plain text of a deck (search, agents, the HTML door's description). */
export function deckPlainText(deck: Deck): string {
  const out: string[] = [];
  for (const s of deck.slides) {
    for (const v of [s.title, s.subtitle, s.description, s.quote, s.author]) if (v) out.push(v);
    for (const b of s.bullets ?? []) if (b) out.push(b);
  }
  return out.join("\n");
}
