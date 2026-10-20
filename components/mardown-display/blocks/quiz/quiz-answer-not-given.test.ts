/**
 * "THE ANSWER IS NOT GIVEN" ONLY ONCE THE BLOCK IS COMPLETE (coordinator ruling on review 2 #16).
 * Mid-stream a question's answer may not have arrived yet; saying "not given" then is a lie that
 * flashes away. Break it names: dropping the stream check → "while streaming" red; the quiz
 * artifact not passing isStreamActive → "the artifact passes it" red.
 */
import fs from "node:fs";
import path from "node:path";

jest.mock("next/dynamic", () => () => () => null);

describe("showsAnswerNotGiven", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { showsAnswerNotGiven } = require("./MultipleChoiceQuiz") as typeof import("./MultipleChoiceQuiz");
  it("a complete block with no right option says so", () => expect(showsAnswerNotGiven(-1, false)).toBe(true));
  it("never while streaming", () => expect(showsAnswerNotGiven(-1, true)).toBe(false));
  it("never when there is a right option", () => expect(showsAnswerNotGiven(2, false)).toBe(false));
  it("the quiz artifact passes the stream state through", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../../../../features/canvas/artifact-types/renderers/QuizArtifact.tsx"), "utf8");
    expect(src).toMatch(/isStreamActive=\{isStreamActive\}/);
  });
});
