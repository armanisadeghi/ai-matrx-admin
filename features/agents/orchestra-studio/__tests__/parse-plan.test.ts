import { jobForStep, parsePlannerAnswer, planText, plainOf, stepBadge, studioHrefForStep } from "../parse-plan";

const ANSWER = `# Weekly AP Biology quiz system

## 1. The job as a system
Given any chapter, produce a quiz that tests mechanisms.

## 2. Recommendation
A two-step workflow: distill the chapter, then write the quiz.

## 5. Steps
1. **Distill the chapter** — A frontier model turns the chapter into teaching points and common misconceptions; saved as an asset.
2. **Write the quiz** — This agent reads the saved asset and returns the quiz kind. Mid-size model, no tools.
3. **Reading-level check** — A decision model flags questions above grade level. Code saves the result.

## 6. Checks
Spread check.
`;

describe("parsePlannerAnswer", () => {
  it("reads the Steps section into buildable steps", () => {
    const plan = parsePlannerAnswer(ANSWER, "weekly quiz", "c1");
    expect(plan.title).toBe("Weekly AP Biology quiz system");
    expect(plan.steps.map((s) => s.title)).toEqual(["Distill the chapter", "Write the quiz", "Reading-level check"]);
    expect(plan.steps[0].modelClass).toBe("frontier");
    expect(plan.steps[2].doer).toBe("decision");
    expect(plan.recommendation).toContain("two-step workflow");
    expect(plan.answer).toBe(ANSWER);
  });

  it("reads sub-heading steps", () => {
    const md = "## Steps\n### Step 1: Rubric\nBuild a rubric from the job.\n### Step 2: Score\nScore each resume.\n## Checks\nx";
    const plan = parsePlannerAnswer(md, "rank resumes");
    expect(plan.steps.map((s) => s.title)).toEqual(["Rubric", "Score"]);
  });

  it("keeps the answer and returns no steps when there is no outline", () => {
    const plan = parsePlannerAnswer("This belongs in chat.", "one off");
    expect(plan.steps).toEqual([]);
    expect(plan.answer).toBe("This belongs in chat.");
  });

  it("opens the single-agent Studio with the step's job prefilled", () => {
    const plan = parsePlannerAnswer(ANSWER, "weekly quiz");
    const href = studioHrefForStep(plan, plan.steps[1], "n1");
    const url = new URL(href, "http://x");
    expect(url.pathname).toBe("/agents/new/studio");
    expect(url.searchParams.get("job")).toContain("Write the quiz");
    expect(url.searchParams.get("plan")).toBe("n1");
  });
});

describe("parsePlannerAnswer on a real Architect answer", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const real = require("fs").readFileSync(require("path").join(__dirname, "real-planner-answer.fixture.md"), "utf8") as string;

  it("finds all eight bold Step paragraphs and who does each", () => {
    const plan = parsePlannerAnswer(real, "AP Biology quiz");
    expect(plan.title).toBe("AP Biology weekly quiz system: design");
    expect(plan.steps).toHaveLength(8);
    expect(plan.steps[0].title).toBe("Pull out the teaching points");
    expect(plan.steps[0].doer).toBe("ai-call");
    expect(plan.steps[0].modelClass).toBe("frontier");
    expect(plan.steps[2].doer).toBe("human");
    expect(plan.steps[4].doer).toBe("code");
    expect(plan.steps[5].modelClass).toBe("mid-size");
  });
});

describe("parsePlannerAnswer when steps sit under workflow sub-headings", () => {
  const real = require("fs").readFileSync(require("path").join(__dirname, "real-planner-answer-2.fixture.md"), "utf8") as string;

  it("reads the nine numbered steps, not the two workflows", () => {
    const plan = parsePlannerAnswer(real, "AP Biology quiz");
    expect(plan.steps).toHaveLength(9);
    expect(plan.steps[0].title).toBe("Pull out what matters in the chapter");
    expect(plan.steps[5].doer).toBe("code");
  });
});

describe("step cards are clean prose with one badge", () => {
  const read = (f: string) =>
    require("fs").readFileSync(require("path").join(__dirname, f), "utf8") as string;
  const fixtures = ["real-planner-answer.fixture.md", "real-planner-answer-2.fixture.md", "real-planner-answer-3.fixture.md"];

  it.each(fixtures)("%s: no markdown in summary or job, whole words, a badge on every step", (f) => {
    const plan = parsePlannerAnswer(read(f), "x");
    expect(plan.steps.length).toBeGreaterThan(1);
    for (const s of plan.steps) {
      for (const text of [s.summary, s.job, s.title]) {
        expect(text).not.toMatch(/\*|`|(^|\s)[-•]\s|\s_\w/);
      }
      if (s.markdown.length > 0) expect(s.summary.length).toBeGreaterThan(0);
      expect(s.summary.length).toBeLessThanOrEqual(221);
      // a clip ends in an ellipsis after a whole word, never mid-word
      if (s.summary.endsWith("…")) expect(s.job.startsWith(s.summary.slice(0, -1).trimEnd())).toBe(true);
      expect(stepBadge(s)).not.toBeNull();
    }
  });

  it("the Studio job is the full plain step, not a truncated one", () => {
    const plan = parsePlannerAnswer(read("real-planner-answer-3.fixture.md"), "x");
    for (const s of plan.steps) {
      const job = jobForStep(plan, s);
      expect(job).toContain(s.job);
      expect(job).not.toMatch(/\*|…/);
      expect(job).toContain(`This is step ${s.n} of the system`);
    }
  });

  it("one badge per step from the parsed type", () => {
    expect(stepBadge({ doer: "decision", modelClass: "decision" })).toBe("Decision model");
    expect(stepBadge({ doer: "ai-call", modelClass: "frontier" })).toBe("Frontier model");
    expect(stepBadge({ doer: "code", modelClass: null })).toBe("Code step");
    expect(stepBadge({ doer: "unknown", modelClass: null })).toBeNull();
  });

  it("plainOf strips emphasis and list markers into sentences", () => {
    expect(plainOf("1. Pull the rows. *Rules, no AI.*\n- Why: it is free")).toBe("Pull the rows. Rules, no AI. Why: it is free.");
  });
});

describe("the dental reminders answer (real Architect answer, 2026-10-17)", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const real = require("fs").readFileSync(require("path").join(__dirname, "real-planner-answer-4.fixture.md"), "utf8") as string;
  const plan = parsePlannerAnswer(real, "dental reminders");

  it("reads three steps", () => {
    expect(plan.steps.map((s) => s.title.split(" (")[0])).toEqual(["Setup", "Daily run", "Whenever a patient replies"]);
  });

  it("numbers each step's list from 1 (the reply step is not '5.')", () => {
    expect(plan.steps[2].markdown).toMatch(/^\s*1\.\s/m);
    expect(plan.steps[2].markdown).not.toMatch(/^\s*5\.\s/m);
    expect(plan.steps[1].markdown).toMatch(/^\s*4\.\s/m);
  });

  it("summarizes a multi-part step by all its parts, not its first sub-step", () => {
    const daily = plan.steps[1].summary ?? "";
    expect(daily).toContain("4 parts");
    for (const t of ["Pull the appointments", "Build the messages", "Flag unconfirmed patients", "Write the manager summary"]) {
      expect(daily).toContain(t);
    }
  });

  it("turns tables into lists so no table tool strip lands in plan text", () => {
    const shown = planText(real);
    expect(shown).not.toMatch(/^\s*\|/m);
    expect(shown).toContain("- **Send time** — 10:00 local");
  });
});

describe("a Steps section written as a table (real Architect answer, 2026-10-17)", () => {
  const raw = require("fs").readFileSync(require("path").join(__dirname, "real-planner-answer-5.fixture.md"), "utf8") as string;
  it("reads one step per row, titled by the step cell's bold lead", () => {
    const plan = parsePlannerAnswer(raw, "x");
    expect(plan.steps.length).toBe(8);
    expect(plan.steps[0].title).toBe("Brief, then draft");
    expect(plan.steps[1].title).toMatch(/^Automatic checks/);
    expect(plan.steps[5].doer).toBe("human");
    for (const s of plan.steps) {
      expect(s.summary).not.toMatch(/[*|]/);
      expect(s.job.length).toBeGreaterThan(10);
    }
  });
});

describe("a section called \"The three steps\" with a sub-heading per step (real Architect answer, 2026-10-17)", () => {
  const raw = require("fs").readFileSync(require("path").join(__dirname, "real-planner-answer-6.fixture.md"), "utf8") as string;
  it("reads the three steps, not the bullets inside them", () => {
    const plan = parsePlannerAnswer(raw, "x");
    expect(plan.steps.map((s) => s.title)).toEqual(["Article Writer", "Medical Fact-Checker", "Social Post Writer"]);
  });
});

it("a step's card sentence never opens on its Model line", () => {
  const raw = require("fs").readFileSync(require("path").join(__dirname, "real-planner-answer-6.fixture.md"), "utf8") as string;
  const plan = parsePlannerAnswer(raw, "x");
  expect(plan.steps[0].summary).toMatch(/^Gets:/);
  expect(plan.steps[0].modelClass).toBe("frontier");
});

describe("what a person reads in a step (round 2, item 14)", () => {
  const fs = require("fs") as typeof import("fs"); // eslint-disable-line @typescript-eslint/no-require-imports
  const path = require("path") as typeof import("path"); // eslint-disable-line @typescript-eslint/no-require-imports
  const names = ["", "-2", "-3", "-4", "-5", "-6"].map((x) => `real-planner-answer${x}.fixture.md`);

  it.each(names)("%s: no internal names, no empty fields, no title repeated", (file) => {
    const plan = parsePlannerAnswer(fs.readFileSync(path.join(__dirname, file), "utf8"), "x");
    for (const s of plan.steps) {
      for (const text of [s.summary, s.job, s.markdown]) {
        expect(text).not.toMatch(/\bjev\b/i);
        expect(text).not.toMatch(/Model:\s*[—–-]/);
        expect(text).not.toMatch(/Who does it:\s*(single ai call|code|person)/i);
      }
      const lead = s.title.toLowerCase().replace(/[.:]+$/, "");
      expect(s.summary.toLowerCase().startsWith(`${lead}:`)).toBe(false);
      expect(s.summary.toLowerCase().startsWith(`${lead}.`)).toBe(false);
    }
  });

  it("the post check step names the decision model, not jev", () => {
    const plan = parsePlannerAnswer(fs.readFileSync(path.join(__dirname, "real-planner-answer-5.fixture.md"), "utf8"), "x");
    const post = plan.steps.find((s) => /post check/i.test(s.title))!;
    expect(post.job).toContain("decision model");
    expect(post.job).not.toContain("jev");
  });

  it("keeps the whole summary paragraph", () => {
    const long = `# T\n\n## 2. Recommendation\n${"Everything runs in order and nothing needs an orchestra leader. ".repeat(12)}\n\n## 5. Steps\n1. **A** — x\n2. **B** — y\n`;
    const plan = parsePlannerAnswer(long, "x");
    expect(plan.recommendation!.endsWith("…")).toBe(false);
    expect(plan.recommendation!.length).toBeGreaterThan(300);
  });

  it("the summary is prose: a table under it is not part of it", () => {
    const plan = parsePlannerAnswer(fs.readFileSync(path.join(__dirname, "real-planner-answer-6.fixture.md"), "utf8"), "x");
    expect(plan.recommendation).not.toContain("|");
    expect(plan.recommendation).not.toMatch(/:$/);
  });
});
