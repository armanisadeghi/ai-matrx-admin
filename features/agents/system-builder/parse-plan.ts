import type { StepDoer, SystemPlan, SystemPlanStep } from "./types";

/**
 * The Architect (system agent "Master Intelligence Architect") answers in markdown with no
 * output schema: an 11-part outline whose section 5 is "Steps". Until it gets a registered
 * kind, this reads the Steps section tolerantly (sub-headings, numbered items or bullets) and
 * keeps the full answer beside it so nothing is ever lost when the outline is not found.
 */

const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const BOLD_HEADING = /^\s*\*\*\s*(?:\d+[.)]\s*)?([^*]{2,80}?)\s*\*\*\s*:?\s*$/;
const NUMBERED_SECTION = /^\s{0,3}(?:#{1,6}\s+)?\**\s*(\d{1,2})[.)]\s+\**\s*([^*\n]{2,80}?)\**\s*$/;

interface Section {
  title: string;
  level: number;
  lines: string[];
}

function stripMd(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|[\s(])\*([^*\n]+?)\*(?=[\s).,;:!?]|$)/g, "$1$2")
    .replace(/(^|[\s(])_([^_\n]+?)_(?=[\s).,;:!?]|$)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function sectionTitle(line: string): { title: string; level: number } | null {
  const h = HEADING.exec(line);
  if (h) return { title: stripMd(h[2]).replace(/^\d+[.)]\s*/, ""), level: h[1].length };
  const b = BOLD_HEADING.exec(line);
  if (b && !/^\s*\*\*\s*step\s*\d+/i.test(line)) return { title: stripMd(b[1]).replace(/^\d+[.)]\s*/, ""), level: 7 };
  return null;
}

function splitSections(md: string): Section[] {
  const sections: Section[] = [];
  let current: Section = { title: "", level: 0, lines: [] };
  let inFence = false;
  for (const line of md.split("\n")) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const t = inFence ? null : sectionTitle(line);
    if (t) {
      sections.push(current);
      current = { title: t.title, level: t.level, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);
  return sections;
}

function doerOf(text: string): StepDoer {
  const t = text.toLowerCase();
  if (/\b(no ai|simple code|simple rules|plain rules|code compares|deterministic|pure code|workflow node)\b/.test(t)) return "code";
  if (/\b(decision model|decision-model|small model|classifier)\b/.test(t)) return "decision";
  if (/\b(frontier|mid-size|mid size|top-tier|top tier|large model)\b/.test(t)) return "ai-call";
  if (/\b(workflow pauses|you (review|approve|check|decide|upload)|a person signs)\b/.test(t)) return "human";
  if (/\bagent\b/.test(t)) return "agent";
  if (/\b(ai call|llm call|model call|prompt)\b/.test(t)) return "ai-call";
  if (/\b(the same model|a model|the model)\b/.test(t)) return "ai-call";
  if (/\bcode\b/.test(t)) return "code";
  if (/\b(creates?|publish\w*|posts?|saves?|sends?|records?|totals?|exports?|automatic(ally)?)\b/.test(t)) return "code";
  return "unknown";
}

function modelClassOf(text: string): string | null {
  const m = /\b(frontier|mid-size|mid size|top-tier|top tier|small|decision|tiny)[\s-]+models?\b/i.exec(text);
  if (!m) return null;
  const c = m[1].toLowerCase();
  if (c === "mid size") return "mid-size";
  if (c === "top-tier" || c === "top tier") return "frontier";
  return c;
}

/** Cut at a word boundary (never mid-word), adding an ellipsis only when something was cut. */
function clip(s: string, n: number): string {
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  const at = cut.lastIndexOf(" ");
  return `${(at > n * 0.5 ? cut.slice(0, at) : cut).trimEnd().replace(/[,;:\-–—]$/, "")}…`;
}

/** Markdown to plain prose: one line per sentence-ish unit, list markers and emphasis gone. */
export function plainOf(md: string): string {
  const parts: string[] = [];
  for (const raw of md.split("\n")) {
    const line = stripMd(
      raw
        .replace(/^\s*#{1,6}\s+/, "")
        .replace(/^\s*>\s?/, "")
        .replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "")
        .replace(/^\s*\|?\s*[-:| ]+\|?\s*$/, ""),
    );
    if (!line) continue;
    parts.push(/[.!?:;)"”]$/.test(line) ? line : `${line}.`);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** The first one or two whole sentences, at most `max` characters, never cut mid-word. */
export function summaryOf(plain: string, max = 220): string {
  const sentences = plain.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length === 0) return "";
  let out = sentences[0];
  if (out.length > max) return clip(out, max);
  for (const next of sentences.slice(1, 2)) {
    if (`${out} ${next}`.length > max) break;
    out = `${out} ${next}`;
  }
  return out;
}

const MODEL_CLASS_LABEL: Record<string, string> = {
  frontier: "Frontier model",
  "mid-size": "Mid-size model",
  small: "Small model",
  tiny: "Small model",
  decision: "Decision model",
};

/** The one badge a step shows, from its parsed type (null only when the type is unknown). */
export function stepBadge(step: Pick<SystemPlanStep, "doer" | "modelClass">): string | null {
  switch (step.doer) {
    case "decision":
      return "Decision model";
    case "ai-call":
      return (step.modelClass && MODEL_CLASS_LABEL[step.modelClass]) || "AI call";
    case "agent":
      return "Agent";
    case "code":
      return "Code";
    case "human":
      return "You";
    default:
      return null;
  }
}

function stepFrom(n: number, title: string, body: string): SystemPlanStep {
  const plain = plainOf(body);
  return {
    n,
    title: clip(stripMd(title), 120),
    markdown: body.replace(/\n{3,}/g, "\n\n").trim(),
    summary: summaryOf(plain),
    job: plain,
    doer: doerOf(`${title} ${body}`),
    modelClass: modelClassOf(`${title} ${body}`),
    usesAgentId: null,
    usesAgentName: null,
  };
}

/** Items of a list: `1. **Name** — body` / `- **Name**: body`, with indented continuation. */
function listItems(lines: string[]): Array<{ title: string; body: string }> {
  const items: Array<{ title: string; body: string }> = [];
  let cur: { head: string; rest: string[] } | null = null;
  for (const line of lines) {
    const m = /^(\s{0,3})(?:\d+[.)]|[-*•])\s+(.*)$/.exec(line);
    if (m) {
      if (cur) items.push(finish(cur));
      cur = { head: m[2], rest: [] };
    } else if (cur && line.trim() !== "") {
      cur.rest.push(line.replace(/^ {0,3}/, "").trimEnd());
    }
  }
  if (cur) items.push(finish(cur));
  return items;

  function finish(c: { head: string; rest: string[] }) {
    const bold = /^\*\*(.+?)\*\*\s*[:—–-]*\s*(.*)$/.exec(c.head);
    if (bold) return { title: bold[1], body: [bold[2], ...c.rest].join("\n") };
    const colon = /^([^:—–]{3,70}?)\s*[:—–]\s+(.*)$/.exec(c.head);
    if (colon) return { title: colon[1], body: [colon[2], ...c.rest].join("\n") };
    return { title: c.head, body: c.rest.join("\n") };
  }
}

/** `**Step 1: Title.** body` paragraphs, each owning the lines (bullets included) up to the next. */
function boldStepParagraphs(lines: string[]): Array<{ title: string; body: string }> {
  const out: Array<{ title: string; body: string[] }> = [];
  for (const line of lines) {
    const m = /^\s*\*\*\s*Step\s*\d+\s*[:.\-–—]\s*(.+?)\*\*\s*(.*)$/i.exec(line);
    if (m) out.push({ title: m[1].replace(/[.:]\s*$/, ""), body: m[2] ? [m[2]] : [] });
    else if (out.length > 0) out[out.length - 1].body.push(line.trimEnd());
  }
  return out.map((o) => ({ title: o.title, body: o.body.join("\n") }));
}

export function parsePlannerAnswer(
  answer: string,
  description: string,
  conversationId: string | null = null,
): SystemPlan {
  const sections = splitSections(answer);
  const stepsAt = sections.findIndex((s) => /^(the )?steps?\b|^step[- ]by[- ]step|^the (design|pipeline)\b/i.test(s.title));
  let steps: SystemPlanStep[] = [];
  if (stepsAt >= 0) {
    const head = sections[stepsAt];
    const subs: Section[] = [];
    for (let i = stepsAt + 1; i < sections.length && sections[i].level > head.level; i++) subs.push(sections[i]);
    // "Step N" paragraphs may sit under sub-headings (e.g. "Workflow A"), so read them all.
    const bolded = boldStepParagraphs([...head.lines, ...subs.flatMap((x) => x.lines)]);
    if (bolded.length >= 2) {
      steps = bolded.map((b, i) => stepFrom(i + 1, b.title, b.body));
    } else if (subs.length >= 1 && head.level < 7) {
      steps = subs.map((s, i) => stepFrom(i + 1, s.title.replace(/^(step\s*)?\d+[.):]?\s*/i, ""), s.lines.join("\n")));
    } else {
      const items = listItems(head.lines);
      steps = items.map((it, i) => stepFrom(i + 1, it.title.replace(/^(step\s*)?\d+[.):]?\s*/i, ""), it.body));
    }
    steps = steps.filter((s) => s.title.length > 0);
  }

  const first = sections.find((s) => /^# /.test("# ") && s.level === 1 && s.title);
  const recAt = sections.findIndex((s) => /^recommend/i.test(s.title));
  const firstParagraph = (lines: string[]) => {
    const body = lines.join("\n").trim().split(/\n\s*\n/)[0] ?? "";
    return clip(stripMd(body.replace(/\n\s*[-*•]\s+.*/g, "")), 300);
  };
  const recommendation = recAt >= 0 ? firstParagraph(sections[recAt].lines) || null : null;
  const jobAt = sections.findIndex((s) => /^the job as a system/i.test(s.title));
  const firstLine = (lines: string[]) => lines.map(stripMd).find((l) => l.length > 0) ?? "";
  const title =
    (first?.title && !/^(the )?architect/i.test(first.title) ? first.title : "") ||
    (jobAt >= 0 ? clip(firstLine(sections[jobAt].lines), 80) : "") ||
    clip(description.trim(), 80) ||
    "Planned system";

  return { description, title, recommendation, steps, answer, conversationId };
}

/** The job text the single-agent Studio opens with for one step: the full step as plain prose. */
export function jobForStep(plan: Pick<SystemPlan, "title">, step: SystemPlanStep): string {
  const end = (t: string) => (/[.!?]$/.test(t) ? t : `${t}.`);
  const parts = [end(stripMd(step.title)), step.job, `This is step ${step.n} of the system "${stripMd(plan.title)}".`];
  return parts.filter(Boolean).join(" ");
}

export function studioHrefForStep(plan: SystemPlan, step: SystemPlanStep, planId: string | null): string {
  const q = new URLSearchParams({ job: jobForStep(plan, step), from: "system-plan" });
  if (planId) {
    q.set("plan", planId);
    q.set("step", String(step.n));
  }
  return `/agents/new/studio?${q.toString()}`;
}
