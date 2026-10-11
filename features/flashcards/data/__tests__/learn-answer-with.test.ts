/**
 * Learn honors the per-person "Answer with" preference in its multiple-choice
 * stage (the typed stage reads orientedStudyFaces, the same bridge classic
 * study uses). Basic cards turn around; cloze keeps its natural direction.
 */
import { buildQuizQuestions } from "../quiz/buildQuizQuestions";
import type { CardWithDetails } from "../types";

const card = (id: string, front: string, back: string, kind = "basic"): CardWithDetails =>
  ({ id, front, back, card_kind: kind, dynamic_content: null }) as unknown as CardWithDetails;

const deck = [
  card("1", "capital of France", "Paris"),
  card("2", "capital of Japan", "Tokyo"),
  card("3", "capital of Peru", "Lima"),
  card("4", "capital of Kenya", "Nairobi"),
  card("5", "The {{c1::heart}} pumps blood", "", "cloze"),
];

describe("buildQuizQuestions — Answer with", () => {
  it("answer with term: a basic card asks its definition and answers with its term", () => {
    const [q] = buildQuizQuestions([deck[0]], deck, "term");
    expect(q.front).toBe("Paris");
    expect(q.correctAnswer).toBe("capital of France");
    expect(q.options).toContain("capital of France");
    expect(q.options).not.toContain("Tokyo");
  });

  it("answer with definition (default) is unchanged", () => {
    const [q] = buildQuizQuestions([deck[0]], deck);
    expect(q.front).toBe("capital of France");
    expect(q.correctAnswer).toBe("Paris");
  });

  it("a cloze card keeps its natural direction", () => {
    const [q] = buildQuizQuestions([deck[4]], deck, "term");
    expect(q.correctAnswer).toContain("heart");
    expect(q.front).toContain("[ … ]");
  });
});
