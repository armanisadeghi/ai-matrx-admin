// A tutor opened from a study mode searches THAT deck / assessment, not the
// whole library: every seed a study surface builds carries `studyContext`, so
// the source strip shows and grounding is scoped (sourceScope.ts). Failed
// before the fix — the builders dropped the context and the Write / Test /
// Match / Fast Fire / assessment surfaces never passed one.

import { readFileSync } from "fs";
import { join } from "path";
import {
  assessmentStudyContext,
  deckStudyContext,
  deckTutorSeed,
  flashcardTutorSeed,
  missedQuestionTutorSeed,
  openQuestionTutorSeed,
} from "../seeds";

const deck = deckStudyContext("set-1");
const quiz = assessmentStudyContext("as-1", "Unit 3");

describe("tutor seeds carry the study context", () => {
  it("names the deck and the assessment with their canonical tokens", () => {
    expect(deck).toEqual({ entityType: "fc_set", entityId: "set-1", title: "This deck" });
    expect(quiz).toEqual({ entityType: "assessment", entityId: "as-1", title: "Unit 3" });
  });

  it("every builder passes the context through", () => {
    expect(
      flashcardTutorSeed({ front: "a", back: "b", answered: false, studyContext: deck })
        .studyContext,
    ).toEqual(deck);
    expect(missedQuestionTutorSeed({ question: "q", studyContext: quiz }).studyContext).toEqual(
      quiz,
    );
    expect(openQuestionTutorSeed({ question: "q", studyContext: quiz }).studyContext).toEqual(
      quiz,
    );
    expect(deckTutorSeed("Deck", [{ front: "a", back: "b" }], deck).studyContext).toEqual(deck);
  });

  it("no context keeps the whole-library seed (no key at all)", () => {
    expect("studyContext" in openQuestionTutorSeed({ question: "q" })).toBe(false);
  });
});

// Each study surface that builds a seed must hand it the place it was opened.
const ROOT = join(__dirname, "../../../..");
const SURFACES = [
  "features/flashcards/components/study/WriteSurface.tsx",
  "features/flashcards/components/study/TestSurface.tsx",
  "features/flashcards/components/study/MatchSurface.tsx",
  "features/flashcards/fast-fire/components/FastFireScoreboard.tsx",
  "features/education/assessment/components/take/AssessmentTaker.tsx",
  "features/education/assessment/components/results/AssessmentResults.tsx",
];
const BUILDER_CALL =
  /\b(flashcardTutorSeed|missedQuestionTutorSeed|openQuestionTutorSeed|deckTutorSeed)\(/g;

/** The balanced-paren argument text of the call starting at `open`. */
function callArgs(src: string, open: number): string {
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === "(") depth += 1;
    else if (src[i] === ")") {
      depth -= 1;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return src.slice(open);
}

describe.each(SURFACES)("%s", (file) => {
  it("passes a study context to every seed it builds", () => {
    const src = readFileSync(join(ROOT, file), "utf8");
    const calls = [...src.matchAll(BUILDER_CALL)];
    expect(calls.length).toBeGreaterThan(0);
    for (const m of calls) {
      const args = callArgs(src, (m.index ?? 0) + m[0].length - 1);
      expect(args).toMatch(/StudyContext\(|studyContext:/);
    }
  });
});
