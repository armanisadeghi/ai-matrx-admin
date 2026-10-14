/**
 * A finding the analyzer rolled up from many pages into ONE shared cause
 * (matrx-scraper `web_crawl/rollup.py`): a theme image with no size, a
 * hosting rule that expires every file, a template's missing tag, or most
 * pages failing a speed target together. The page reads it from the result's
 * own evidence — nothing here is guessed.
 */

import type { StoredRemedy } from "@/features/marketing/lib/finding-remedy-render";
import type { StoryFact } from "@/features/marketing/lib/missing-page-story";

interface SharedCause {
  cause: string;
  pages: number;
  sample_pages: string[];
}

export interface SharedCauseStory {
  facts: StoryFact[];
  remedy: Extract<StoredRemedy, { kind: "manual" }>;
  samplePages: string[];
}

const n = (value: number) => value.toLocaleString("en-US");

function shortCause(cause: string): string {
  try {
    const url = new URL(cause.startsWith("http") ? cause : `https://${cause}`);
    const file = url.pathname.split("/").filter(Boolean).pop();
    return cause.startsWith("http") && file ? file : cause;
  } catch {
    return cause;
  }
}

function asCauses(value: unknown): SharedCause[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const e = entry as Record<string, unknown>;
    if (typeof e.cause !== "string" || typeof e.pages !== "number") return [];
    const samples = Array.isArray(e.sample_pages)
      ? e.sample_pages.filter((s): s is string => typeof s === "string")
      : [];
    return [{ cause: e.cause, pages: e.pages, sample_pages: samples }];
  });
}

/** null when the evidence is not a roll-up. */
export function explainSharedCause(
  evidence: unknown,
  itemLabel: string,
): SharedCauseStory | null {
  if (!evidence || typeof evidence !== "object") return null;
  const ev = evidence as Record<string, unknown>;
  if (ev.rolled_up !== true) return null;
  const pages = typeof ev.pages_affected === "number" ? ev.pages_affected : null;
  const causes = asCauses(ev.shared_causes);
  const facts: StoryFact[] = [];
  if (pages !== null) {
    facts.push({
      label: "Pages affected",
      value:
        typeof ev.pages_checked === "number"
          ? `${n(pages)} of ${n(ev.pages_checked)} checked`
          : n(pages),
    });
  }
  if (typeof ev.typical_value === "string") {
    facts.push({ label: "Typical value", value: ev.typical_value });
  }
  causes.slice(0, 3).forEach((c, i) => {
    facts.push({
      label: i === 0 ? "Shared cause" : "Also shared",
      value: `${shortCause(c.cause)} · ${n(c.pages)} pages`,
    });
  });

  const samplePages = causes.length
    ? causes[0].sample_pages
    : Array.isArray(ev.sample_pages)
      ? ev.sample_pages.filter((s): s is string => typeof s === "string")
      : [];

  const steps: string[] = [];
  if (causes.length) {
    for (const c of causes.slice(0, 5)) {
      steps.push(`Fix ${c.cause} once — it appears on ${n(c.pages)} pages.`);
    }
    if (causes.length > 5) steps.push(`…and ${causes.length - 5} more shared causes.`);
  } else {
    steps.push(
      `Most pages fail "${itemLabel}" together, so the cause is shared: the theme, a plugin, or hosting.`,
    );
    steps.push("Hand this to whoever manages your theme or hosting; fixing it there clears every page.");
  }
  if (samplePages.length) steps.push(`Check it on: ${samplePages.slice(0, 3).join(", ")}`);

  return {
    facts,
    samplePages,
    remedy: {
      kind: "manual",
      title: causes.length ? "Fix the shared cause once" : "Fix it where every page shares it",
      where: "your theme, header or footer, plugins, or hosting",
      summary: "This clears on the next analysis once the shared cause is fixed.",
      instruction: steps.join("\n"),
    },
  };
}
