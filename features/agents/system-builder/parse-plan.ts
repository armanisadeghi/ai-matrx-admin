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
  if (/\b(no ai|simple code|code compares|deterministic|pure code|workflow node)\b/.test(t)) return "code";
  if (/\b(decision model|decision-model|small model|classifier)\b/.test(t)) return "decision";
  if (/\b(frontier|mid-size|mid size)\b/.test(t)) return "ai-call";
  if (/\b(workflow pauses|you (review|approve|check|decide|upload)|a person signs)\b/.test(t)) return "human";
  if (/\bagent\b/.test(t)) return "agent";
  if (/\b(ai call|llm call|model call|prompt)\b/.test(t)) return "ai-call";
  if (/\bcode\b/.test(t)) return "code";
  return "unknown";
}

function modelClassOf(text: string): string | null {
  const m = /\b(frontier|mid-size|mid size|small|decision|tiny)\s+(?:model|models)?/i.exec(text);
  if (!m) return null;
  const c = m[1].toLowerCase();
  return c === "mid size" ? "mid-size" : c;
}

function clip(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`;
}

function stepFrom(n: number, title: string, body: string): SystemPlanStep {
  const text = stripMd(body);
  return {
    n,
    title: clip(stripMd(title), 90),
    job: clip(text, 320),
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
      cur.rest.push(line.trim());
    }
  }
  if (cur) items.push(finish(cur));
  return items;

  function finish(c: { head: string; rest: string[] }) {
    const bold = /^\*\*(.+?)\*\*\s*[:—–-]*\s*(.*)$/.exec(c.head);
    if (bold) return { title: bold[1], body: [bold[2], ...c.rest].join(" ") };
    const colon = /^([^:—–]{3,70}?)\s*[:—–]\s+(.*)$/.exec(c.head);
    if (colon) return { title: colon[1], body: [colon[2], ...c.rest].join(" ") };
    return { title: c.head, body: c.rest.join(" ") };
  }
}

/** `**Step 1: Title.** body` paragraphs, each owning the lines (bullets included) up to the next. */
function boldStepParagraphs(lines: string[]): Array<{ title: string; body: string }> {
  const out: Array<{ title: string; body: string[] }> = [];
  for (const line of lines) {
    const m = /^\s*\*\*\s*Step\s*\d+\s*[:.\-–—]\s*(.+?)\*\*\s*(.*)$/i.exec(line);
    if (m) out.push({ title: m[1].replace(/[.:]\s*$/, ""), body: m[2] ? [m[2]] : [] });
    else if (out.length > 0 && line.trim()) out[out.length - 1].body.push(line.replace(/^\s*[-*•]\s+/, "").trim());
  }
  return out.map((o) => ({ title: o.title, body: o.body.join(" ") }));
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
      steps = subs.map((s, i) => stepFrom(i + 1, s.title.replace(/^(step\s*)?\d+[.):]?\s*/i, ""), s.lines.join(" ")));
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

/** The job text the single-agent Studio opens with for one step. */
export function jobForStep(plan: Pick<SystemPlan, "title">, step: SystemPlanStep): string {
  const parts = [`${step.title}.`, step.job, `This is step ${step.n} of the system "${plan.title}".`];
  return parts.filter(Boolean).join(" ").slice(0, 900);
}

export function studioHrefForStep(plan: SystemPlan, step: SystemPlanStep, planId: string | null): string {
  const q = new URLSearchParams({ job: jobForStep(plan, step), from: "system-plan" });
  if (planId) {
    q.set("plan", planId);
    q.set("step", String(step.n));
  }
  return `/agents/new/studio?${q.toString()}`;
}
