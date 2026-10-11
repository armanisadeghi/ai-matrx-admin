import { parsePlannerAnswer, studioHrefForStep } from "../parse-plan";

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
