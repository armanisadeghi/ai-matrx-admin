/**
 * What a plan step SAYS to a person. The Architect writes planner scaffolding into step text
 * ("Who does it: Single AI call. Model: —. What it produces: …", an internal name like `jev`, a first
 * sentence that repeats the step's title). None of that is for the reader: internal names are never
 * shown, an empty field is hidden, a label the badge already says is dropped, and a title is not
 * repeated under itself. Applied when a plan is parsed AND when a saved plan is shown, so plans saved
 * before this existed read the same way.
 */

const LABELS = ["who does it", "model", "what it produces", "what the split buys"] as const;
const LABEL_SPLIT = /\s+(?=(?:who does it|model|what it produces|what the split buys)\s*:)/gi;
const LINE = /^(\s*(?:[-*•]|\d+[.)])?\s*)\**\s*(who does it|model|what it produces|what the split buys)\s*\**\s*:\s*\**\s*(.*?)\s*$/i;
const EMPTY = /^[\s.—–-]*(none|n\/a|na|nothing|no model|no ai|not applicable)?[\s.]*$/i;
const MODEL_CLASS_ONLY = /^(a |an |the )?(frontier|mid-size|mid size|small|tiny|top-tier|top tier|decision)( model)?[\s.]*$/i;
const KIND_ONLY = /^(a |an |the )?(single ai call|ai call|one ai call|code|simple code|simple rules|an? agent|agent|person|you|a person)(\s*\([^)]*\))?[\s.]*$/i;

/** Internal names that must never reach a person. `jev` is the decision model's platform name. */
export function withoutInternalNames(text: string): string {
  return text
    .replace(/\s*\(\s*`?jev`?\s*\)/gi, "")
    .replace(/`?\bjev\b`?/gi, "decision model");
}

/** The step text, line by line, with scaffolding labels resolved. Markdown stays markdown. */
export function cleanStepMarkdown(md: string): string {
  const out: string[] = [];
  const spread = withoutInternalNames(md)
    .split("\n")
    .flatMap((l) => l.split(LABEL_SPLIT));
  for (const raw of spread) {
    const m = LINE.exec(raw);
    if (!m) {
      out.push(raw);
      continue;
    }
    const [, lead, labelRaw, valueRaw] = m;
    const label = labelRaw.toLowerCase() as (typeof LABELS)[number];
    const value = valueRaw.replace(/\*\*/g, "").trim();
    if (EMPTY.test(value)) continue;
    if (label === "model" && MODEL_CLASS_ONLY.test(value)) continue;
    if (label === "who does it" && KIND_ONLY.test(value)) continue;
    const cap = value.charAt(0).toUpperCase() + value.slice(1);
    if (label === "who does it" || label === "model") out.push(`${lead}${label === "model" ? "Model: " : ""}${cap}`);
    else out.push(`${lead}${label === "what it produces" ? "Produces" : "Why it is its own step"}: ${value}`);
  }
  return out.join("\n");
}

/** A step's text as plain prose: scaffolding resolved and the title not repeated. */
export function cleanStepPlain(plain: string, title: string): string {
  const lines = cleanStepMarkdown(plain).split("\n");
  const text = lines
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (/[.!?:;)"”]$/.test(l) ? l : `${l}.`))
    .join(" ")
    .replace(/\s+\.(\s|$)/g, ".$1")
    .replace(/\s+/g, " ")
    .trim();
  return withoutTitle(text, title);
}

/** The text without its opening repeat of the step's title ("Post check: …" under "Post check"). */
export function withoutTitle(text: string, title: string): string {
  const t = title.replace(/\*\*/g, "").trim().replace(/[.:]+$/, "");
  let out = text.trim();
  if (t && out.toLowerCase().startsWith(t.toLowerCase())) {
    const rest = out.slice(t.length);
    // Only a real repeat: the title stands alone before a colon, dot or dash — never the front of a longer sentence.
    if (rest === "" || /^\s*[:.—–-]/.test(rest)) out = rest.replace(/^[\s:.,—–-]+/, "");
  }
  return out.charAt(0).toUpperCase() + out.slice(1);
}
