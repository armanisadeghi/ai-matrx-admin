/**
 * The notes speller: nspell + the Hunspell en_US dictionary, both fetched /
 * imported on the FIRST right-click and cached for the page's life. Nothing
 * here loads with the page.
 */
import type NSpell from "nspell";

type Speller = ReturnType<typeof NSpell>;

const PERSONAL_KEY = "matrx.notes.spelling.personalWords.v1";
const DICT_BASE = "/spellcheck";

let spellerPromise: Promise<Speller> | null = null;
let loaded: Speller | null = null;
const ignoredThisSession = new Set<string>();

export function readPersonalWords(userId?: string | null): string[] {
  try {
    const raw = window.localStorage.getItem(`${PERSONAL_KEY}:${userId ?? "anon"}`);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((w): w is string => typeof w === "string") : [];
  } catch {
    return [];
  }
}

export function addPersonalWord(word: string, userId?: string | null): void {
  loaded?.add(word);
  try {
    const words = new Set(readPersonalWords(userId));
    words.add(word);
    window.localStorage.setItem(
      `${PERSONAL_KEY}:${userId ?? "anon"}`,
      JSON.stringify([...words]),
    );
  } catch {
    // Storage blocked or full: the word still counts for this page's life.
  }
}

export function ignoreWord(word: string): void {
  ignoredThisSession.add(word.toLowerCase());
}

export function isSpellerLoaded(): boolean {
  return loaded !== null;
}

/** Load once; later calls share the same promise. */
export function loadSpeller(userId?: string | null): Promise<Speller> {
  if (!spellerPromise) {
    spellerPromise = (async () => {
      const [{ default: nspell }, aff, dic] = await Promise.all([
        import("nspell"),
        fetch(`${DICT_BASE}/en.aff`).then((r) => {
          if (!r.ok) throw new Error(`dictionary aff ${r.status}`);
          return r.text();
        }),
        fetch(`${DICT_BASE}/en.dic`).then((r) => {
          if (!r.ok) throw new Error(`dictionary dic ${r.status}`);
          return r.text();
        }),
      ]);
      const speller = nspell(aff, dic);
      for (const w of readPersonalWords(userId)) speller.add(w);
      loaded = speller;
      return speller;
    })().catch((err) => {
      spellerPromise = null; // let the next right-click retry
      throw err;
    });
  }
  return spellerPromise;
}

/** Sync: true means misspelled. False when not loaded (nothing to say yet). */
export function isMisspelled(word: string): boolean {
  if (!loaded) return false;
  if (ignoredThisSession.has(word.toLowerCase())) return false;
  return !loaded.correct(word);
}

export function suggestionsFor(word: string, limit = 5): string[] {
  return loaded ? loaded.suggest(word).slice(0, limit) : [];
}
