/**
 * A Learn session is "completed" only when every card in it is mastered.
 * Answering every card once is not completion; a learner who ends early has
 * a partial session, recorded as such (status 'abandoned' — the column's
 * check allows active|completed|abandoned — with aggregate_score.outcome
 * 'partial' and the mastered count), never as 'completed'.
 */
import "fake-indexeddb/auto";
import { createStudySpineFake } from "@/test-utils/study-spine-fake";
import { renderHook, settle } from "@/test-utils/renderHook";

const USER = "44444444-4444-4444-8444-444444444444";
const SET = "set-learn-1";
const SESSION = "session-learn-1";
const spine = createStudySpineFake();
const CARDS = [
  { id: "l-1", front: "capital of France", back: "Paris" },
  { id: "l-2", front: "capital of Japan", back: "Tokyo" },
];
const updateSession = jest.fn(async () => ({ data: null, error: null }));

jest.mock("@/lib/redux/hooks", () => ({
  useAppSelector: () => USER,
  useAppDispatch: () => jest.fn(),
}));
jest.mock("@ai-matrx/chat/store/hooks", () => jest.requireMock("@/lib/redux/hooks"));
jest.mock("@/lib/toast", () => ({
  toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));
jest.mock("@/features/flashcards/data/fcService", () => ({
  fcService: {
    getSetWithCards: async () => ({
      data: { set: { id: SET, name: "Capitals", organization_id: "org-1" }, cards: CARDS },
      error: null,
    }),
  },
}));
jest.mock("@/features/education/study/service/studyService", () => ({
  studyService: {
    getMasteryBulk: async () => ({ data: [], error: null }),
    createSession: async () => ({ data: { id: SESSION }, error: null }),
    updateSession: (...args: unknown[]) => (updateSession as jest.Mock)(...args),
    recordAttempt: (input: unknown) => spine.recordAttempt(input as Record<string, unknown>),
  },
}));

import { useFlashcardStudy } from "../useFlashcardStudy";

describe("Learn session completion", () => {
  beforeEach(() => {
    spine.reset();
    updateSession.mockClear();
  });

  it("answering every card once does not complete it; mastering every card does", async () => {
    let mastered = 0;
    const hook = await renderHook(() =>
      useFlashcardStudy({
        setId: SET,
        withSession: true,
        mode: "learn",
        mastery: { mastered, total: CARDS.length },
      }),
    );
    await settle(hook, (h) => !h.loading && h.cards.length === 2, "cards");
    for (const c of CARDS) {
      await hook.act(async () => {
        await hook.current.grade("correct", { cardId: c.id });
      });
    }
    expect(updateSession).not.toHaveBeenCalledWith(
      SESSION,
      expect.objectContaining({ status: "completed" }),
    );
    // The learner masters both (the surface's stage machine says so); the
    // next answer re-renders the hook with that count.
    mastered = 2;
    await hook.act(async () => {
      await hook.current.grade("correct", { cardId: CARDS[0].id });
    });
    expect(updateSession).toHaveBeenCalledWith(
      SESSION,
      expect.objectContaining({
        status: "completed",
        aggregate_score: { outcome: "mastered", mastered: 2, total: 2 },
      }),
    );
    await hook.unmount();
  });

  it("ending before mastery records a partial session, never 'completed'", async () => {
    const hook = await renderHook(() =>
      useFlashcardStudy({
        setId: SET,
        withSession: true,
        mode: "learn",
        mastery: { mastered: 1, total: CARDS.length },
      }),
    );
    await settle(hook, (h) => !h.loading && h.cards.length === 2, "cards");
    for (const c of CARDS) {
      await hook.act(async () => {
        await hook.current.grade("correct", { cardId: c.id });
      });
    }
    await hook.act(async () => {
      hook.current.endSession();
    });
    expect(updateSession).toHaveBeenCalledTimes(1);
    expect(updateSession).toHaveBeenCalledWith(
      SESSION,
      expect.objectContaining({
        status: "abandoned",
        aggregate_score: { outcome: "partial", mastered: 1, total: 2 },
      }),
    );
    await hook.unmount();
    expect(updateSession).toHaveBeenCalledTimes(1);
  });
});
