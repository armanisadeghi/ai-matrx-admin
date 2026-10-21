/**
 * The web's document dialogs render the chat package's bodies — the SAME code Matrx 2 opens from an
 * answer's menu:
 *   - Save as flashcard: `@ai-matrx/chat/window-panels/windows/study/SaveAsFlashcardDialog`
 *     (the web's own prompt and its fcService save are gone);
 *   - Clean up / Help with this / Custom agent: the package's review-and-apply window
 *     (`window-panels/windows/text-review/DocumentAgentReview`) bound to the web's notes-aware edit
 *     port (`../actions/handlers/preparedEdit`).
 * The web's ProTextarea agent pieces are the package's (their web paths only re-export).
 *
 * Red before: DocumentDialogsImpl drew its own TextInputDialog over fcService, and
 * DocumentAgentReview was the web's own 287-line body.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const cardProps: Array<Record<string, unknown>> = [];
const reviewProps: Array<Record<string, unknown>> = [];

jest.mock("@ai-matrx/chat/window-panels/windows/study/SaveAsFlashcardDialog", () => ({
  SaveAsFlashcardDialog: (props: Record<string, unknown>) => {
    cardProps.push(props);
    return null;
  },
}));
jest.mock("@ai-matrx/chat/window-panels/windows/text-review/DocumentAgentReview", () => ({
  DocumentAgentReview: (props: Record<string, unknown>) => {
    reviewProps.push(props);
    return null;
  },
}));
jest.mock("@/features/education/convert/ConvertContentDialog", () => ({ ConvertContentDialog: () => null }));
jest.mock("../ChatMessageDialogs", () => ({ ChatMessageDialogs: () => null }));

import DocumentDialogsImpl from "../DocumentDialogsImpl";
import { webPreparedEditPort } from "../DocumentAgentReview";
import { prepareContentEdit, savePreparedContentEdit, acknowledgedPreparedSource } from "../../actions/handlers/preparedEdit";

const base = {
  convert: null,
  cardAnswer: null,
  onCardClose: () => undefined,
  agentReview: null,
  onAgentReviewClose: () => undefined,
  chatDialog: null,
  onChatDialogClose: () => undefined,
};

describe("the web's document dialogs are the chat package's bodies", () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
  });

  it("Save as flashcard renders the package prompt with the passage as the answer", async () => {
    const onCardClose = jest.fn();
    const root = createRoot(document.createElement("div"));
    await act(async () => root.render(<DocumentDialogsImpl {...base} cardAnswer="The passage." onCardClose={onCardClose} />));
    expect(cardProps.at(-1)).toMatchObject({ answer: "The passage.", onClose: onCardClose });
    await act(async () => root.unmount());
  });

  it("the review renders the package window with the web's notes-aware edit port", async () => {
    const ctx = { source: { type: "note", noteId: "n1" } } as never;
    const onClose = jest.fn();
    const root = createRoot(document.createElement("div"));
    await act(async () =>
      root.render(<DocumentDialogsImpl {...base} agentReview={{ actionId: "cleanup", ctx }} onAgentReviewClose={onClose} />),
    );
    expect(reviewProps.at(-1)).toMatchObject({ actionId: "cleanup", ctx, onClose, editPort: webPreparedEditPort });
    expect(webPreparedEditPort).toEqual({
      prepare: prepareContentEdit,
      save: savePreparedContentEdit,
      acknowledged: acknowledgedPreparedSource,
    });
    await act(async () => root.unmount());
  });

  it("the web's ProTextarea agent pieces only re-export the package's", () => {
    const root = join(__dirname, "..", "..", "..", "..");
    for (const [file, module] of [
      ["components/official/proTextareaAgentActions.ts", "proTextareaAgentActions"],
      ["components/official/useProTextareaAgentAction.ts", "useProTextareaAgentAction"],
      ["components/official/ProTextAgentActionPopoverBody.tsx", "ProTextAgentActionPopoverBody"],
      ["components/official/ProTextareaAgentPanel.tsx", "ProTextareaAgentPanel"],
      ["features/transcription-cleanup/hooks/useAiPostProcess.ts", "useAiPostProcess"],
    ] as const) {
      const code = readFileSync(join(root, file), "utf8")
        .split("\n")
        .filter((line) => line.trim() && !line.trim().startsWith("//") && !line.includes('"use client"'));
      expect(code).toEqual([`export * from "@ai-matrx/chat/window-panels/windows/text-review/${module}";`]);
    }
  });
});
