// Study ergonomics: swipe-to-grade thresholds and the "Answer with" face
// orientation (basic cards turn around; cloze / matching / formula never do).
import { swipeOutcome, swipeThreshold } from "../../components/study/SwipeToGrade";
import {
  orientedStudyFaces,
  showsBackFirst,
} from "../../utils/cardVariants";

describe("swipeOutcome", () => {
  it("commits right as good and left as again past the threshold", () => {
    expect(swipeOutcome(140, 400)).toBe("good");
    expect(swipeOutcome(-140, 400)).toBe("again");
  });
  it("springs back below the threshold", () => {
    expect(swipeOutcome(100, 400)).toBeNull();
    expect(swipeOutcome(-100, 400)).toBeNull();
    expect(swipeOutcome(0, 400)).toBeNull();
  });
  it("never commits under 80px on a narrow card", () => {
    expect(swipeThreshold(200)).toBe(80);
    expect(swipeOutcome(79, 200)).toBeNull();
    expect(swipeOutcome(80, 200)).toBe("good");
  });
});

describe("orientedStudyFaces", () => {
  const basic = {
    front: "Mitochondria",
    back: "Powerhouse of the cell",
    card_kind: "basic",
    dynamic_content: null,
  };
  it("keeps the front first when answering with the definition", () => {
    expect(orientedStudyFaces(basic, "definition")).toEqual({
      front: "Mitochondria",
      back: "Powerhouse of the cell",
    });
    expect(showsBackFirst(basic, "definition")).toBe(false);
  });
  it("turns a basic card around when answering with the term", () => {
    expect(orientedStudyFaces(basic, "term")).toEqual({
      front: "Powerhouse of the cell",
      back: "Mitochondria",
    });
    expect(showsBackFirst(basic, "term")).toBe(true);
  });
  it("keeps a cloze card's natural direction", () => {
    const cloze = {
      front: "The {{c1::mitochondria}} makes ATP",
      back: "",
      card_kind: "cloze",
      dynamic_content: null,
    };
    expect(showsBackFirst(cloze, "term")).toBe(false);
    const faces = orientedStudyFaces(cloze, "term");
    expect(faces.front).not.toContain("mitochondria");
    expect(faces.back).toContain("mitochondria");
  });
  it("keeps a matching card's natural direction", () => {
    expect(
      showsBackFirst({ card_kind: "matching" }, "term"),
    ).toBe(false);
  });
});
