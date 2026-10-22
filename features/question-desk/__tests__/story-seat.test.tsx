/** @jest-environment jsdom */
// The story seat of the shared answer bar (a brand owner's sitting): words only,
// typed or spoken. Red recipe: drop the `story ? null :` guards in AnswerBar and
// the skip / hand-back / table buttons render here again.

import { act, createRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/components/official/ProTextarea", () => ({ ProTextarea: () => <textarea aria-label="Answer" /> }));
jest.mock("@/features/audio/RecordingOriginProvider", () => ({
  RecordingOriginProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));

import { AnswerBar, type AnswerBarProps } from "../components/AnswerBar";
import { questionsToAsk } from "@/features/marketing/owner-sitting/service";

const noop = () => {};

function props(answering: "decision" | "story"): AnswerBarProps {
  return {
    interviewId: "i1", questionId: "q1", questionTitle: "The customer you'd clone", answering,
    hasRecommendation: answering === "decision", skipShipsRecommendation: false, writing: false, draftText: "",
    onDraftChange: noop, draftStorageError: null, draftFromVoice: false, textareaRef: createRef(),
    onTranscriptionComplete: noop, onTranscriptionError: noop,
    audio: { fileId: null, error: null, retry: null } as unknown as AnswerBarProps["audio"],
    onOpenWrite: noop, onAnswerByVoice: noop, onTakeRecommendation: noop, onSkip: noop, onHandBack: noop,
    onSaveOwnWords: noop, onDiscardDraft: noop, speaking: false, canReadAloud: true, onReadAloud: noop,
    onStopReading: noop, onToggleView: noop, actionError: null, saveLine: null, undoAvailable: false,
    onUndo: noop, busy: false,
  };
}

describe("the shared answer bar's seats", () => {
  let host: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("a story seat offers only words, typed or spoken", () => {
    act(() => root.render(<AnswerBar {...props("story")} />));
    const text = host.textContent ?? "";
    expect(text).toContain("Write an answer");
    expect(text).toContain("Answer by voice");
    expect(text).not.toContain("Skip");
    expect(text).not.toContain("Not mine");
    expect(text).not.toContain("Table view");
    expect(text).not.toContain("recommendation");
  });

  it("the decision seat keeps every way of answering", () => {
    act(() => root.render(<AnswerBar {...props("decision")} />));
    const text = host.textContent ?? "";
    for (const label of ["Go with your recommendation", "Skip", "Not mine", "Write an answer", "Table view"]) {
      expect(text).toContain(label);
    }
  });
});

describe("the owner sitting asks only what was not asked", () => {
  const bank = [
    { slug: "profit", position: 3, title: "P", question: "?", why_it_matters: null, kind: "open_ended", door: "two_way" },
    { slug: "clone", position: 1, title: "C", question: "?", why_it_matters: null, kind: "open_ended", door: "two_way" },
    { slug: "never", position: 2, title: "N", question: "?", why_it_matters: null, kind: "open_ended", door: "two_way" },
  ];
  it("in bank order, skipping every slug already asked", () => {
    expect(questionsToAsk(bank, ["never"]).map((q) => q.slug)).toEqual(["clone", "profit"]);
    expect(questionsToAsk(bank, ["clone", "never", "profit"])).toEqual([]);
  });
});
