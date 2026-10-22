// THE one Education create shell (review 2026-10-22): flashcards, quizzes and
// practice tests, oral practice, mind maps, memory aids and audio study all
// render `EducationCreatePage` with `useEducationSources` + `useCreateRun`, so
// the Make step, blocked reason, hold for the clean version, drop notice and
// the tab-bound run (stopped notice → Try again, no duplicates) live once.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { restoreStudyRunRequest, studyRunRequest } from "../createRunRequest";

const ROOT = resolve(__dirname, "../../../..");
const read = (f: string) => readFileSync(join(ROOT, f), "utf8");

const PAGES = [
  "features/flashcards/components/create/CreateDeckPage.tsx",
  "features/education/assessment/components/create/AssessmentCreate.tsx",
  "features/education/spoken-practice/components/PracticeSetup.tsx",
  "features/education/media/mindmap/components/MindMapNew.tsx",
  "features/education/memory/components/MemoryNew.tsx",
  "features/education/media/audio/components/AudioStudyNew.tsx",
];

describe("one Education create shell", () => {
  it.each(PAGES)("%s renders the shell with its Sources half and a tab-bound run", (file) => {
    const src = read(file);
    expect(src).toContain("<EducationCreatePage");
    expect(src).toContain("useEducationSources(");
    expect(src).toContain("useCreateRun(");
    expect(src).toMatch(/run=\{\{/);
    // Re-implementations the shell holds once: none of their doors is imported here.
    for (const door of [
      "source-input/useSourceSet",
      "source-input/components/SourceInput",
      "wizard-draft/useTabBoundRun",
      "wizard-draft/WizardDraftRestored",
      "data/draftSourceHonesty",
    ]) {
      expect({ file, door, imported: new RegExp(`from "[^"]*${door}"`).test(src) }).toEqual({ file, door, imported: false });
    }
  });

  it("extraKinds is explicit on every screen: no default, one shared constant", () => {
    expect(read("features/education/create/EducationCreatePage.tsx")).not.toMatch(/extraKinds\s*=\s*(?!\{)/);
    let found = "";
    try {
      found = execFileSync(
        "git",
        ["grep", "-n", "-E", "=\\s*\\[\\s*\"fc_set\"\\s*\\]", "--", "features/education/*.ts*", "features/flashcards/*.ts*"],
        { cwd: ROOT, encoding: "utf8" },
      );
    } catch (e) {
      // git grep exits 1 when nothing matches — the outcome we want.
      if ((e as { status?: number }).status !== 1) throw e;
    }
    const copies = found
      .split("\n")
      .filter(Boolean)
      .filter((l) => !l.includes("__tests__") && !l.startsWith("features/education/create/studyFromDeck.ts"));
    expect(copies).toEqual([]);
  });

  it("a deck in the link is read by id, never by listing every deck on load", () => {
    for (const f of PAGES.slice(3)) expect({ f, lists: read(f).includes("listDecks(") }).toEqual({ f, lists: false });
    expect(read("features/education/create/useEducationSources.ts")).toContain("getDeckNamesByIds([seedDeckId])");
  });

  it("one namer: no second '<first> and N more' title helper in the create layer", () => {
    expect(read("features/education/create/groundedMaterial.ts")).not.toContain("sourceTitleOf");
  });
});

describe("a stopped create run comes back as the same request", () => {
  const restoreStyle = (d: Record<string, unknown>) => ({
    values: typeof d.focus === "string" ? { focus: d.focus } : {},
  });
  const set = { __kind: "source_set", version: 1, sources: [] } as never;

  it("keeps the topic and the page's style answers", () => {
    const req = JSON.parse(JSON.stringify(studyRunRequest(set, {}, "mitosis", { focus: "phases" })));
    expect(restoreStudyRunRequest(restoreStyle)(req)).toEqual({ topic: "mitosis", drafts: [], style: { focus: "phases" } });
  });

  it("refuses a request with nothing to make it from, unless the subject is a style answer", () => {
    const req = JSON.parse(JSON.stringify(studyRunRequest(set, {}, "", { focus: "Biology" })));
    expect(restoreStudyRunRequest(restoreStyle)(req)).toBeNull();
    expect(restoreStudyRunRequest(restoreStyle, { subjectInStyle: true })(req)).toEqual({
      topic: "",
      drafts: [],
      style: { focus: "Biology" },
    });
    expect(restoreStudyRunRequest(restoreStyle)({ topic: "x" })).toBeNull();
  });
});
