/**
 * Defect 82 (Q-04 rerun, live 2026-10-22): a cell edit in a saved chat table did not persist.
 *
 * A saved answer's table is `<artifact type="table" id=uuid>` drawn from its canvas row by
 * TableArtifactMaterialized. Its edit door used the `onContentChange` prop (never given in a chat
 * answer) and a direct row write whose failure was dropped: chat.message stayed unchanged and a
 * refused row write said nothing. The chat's ONE answer save (BlockEditProvider write →
 * saveAnswerEdit → syncEditedArtifactRows) writes the message AND the row, so inside an answer the
 * table must edit through it and never write the row a second way; with no answer around it
 * (canvas pane) it writes the row itself and says out loud when that is refused.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ROW_ID = "1a8befb6-4235-4e5a-975f-f9eb25a68cf5";
const OLD = "| A | B |\n|---|---|\n| 1 | 2 |";
const NEW = "| A | B |\n|---|---|\n| 1 | Bay 3 |";

const update = jest.fn();
const toastError = jest.fn();
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: (...a: unknown[]) => toastError(...a), info: jest.fn() } }));
jest.mock("@/features/canvas/services/canvasItemsService", () => ({
  canvasItemsService: { update: (...a: unknown[]) => update(...a) },
}));
jest.mock("@/features/canvas/services/canvasArtifactService", () => ({ canvasArtifactService: { setExternalLink: jest.fn() } }));
jest.mock("@/features/canvas/hooks/useCanvasItem", () => ({
  CANVAS_ITEM_UPDATED_EVENT: "canvas-item-updated",
  useCanvasItem: () => ({
    row: { id: ROW_ID, type: "table", title: "Table 1", content: { data: OLD, type: "table", metadata: {} } },
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));
jest.mock("@/features/data-tables/derive-dataset-name", () => ({ deriveDatasetNameForChatTable: jest.fn(), isPlaceholderTableTitle: () => true }));
jest.mock("@/features/data-tables/service", () => ({ readTableDetails: jest.fn() }));
jest.mock("@/features/overlays/definitions/userTableWindow.overlay", () => ({ useOpenUserTableWindow: () => jest.fn() }));
jest.mock("@/features/data-tables/components/LocatedTableViewerDoor", () => () => null);
jest.mock("@ai-matrx/rich-content/display/blocks/table/StreamingTableRenderer", () => ({
  StreamingTableRenderer: ({ onContentChange }: { onContentChange?: (md: string) => void }) => (
    <button data-testid="save-cell" onClick={() => onContentChange?.(NEW)} />
  ),
}));

import { BlockEditProvider } from "@ai-matrx/rich-content/display/block-controls/block-edit";
import TableArtifact from "../TableArtifact";

describe("a table cell edit in a saved answer", () => {
  let host: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    update.mockReset();
    update.mockResolvedValue({ data: {}, error: null });
    toastError.mockClear();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });
  const press = async () => {
    await act(async () => {
      (host.querySelector('[data-testid="save-cell"]') as HTMLButtonElement).click();
    });
  };

  it("inside an answer, saves through the answer's own write and never writes the row a second way", async () => {
    const answerWrites: string[] = [];
    act(() =>
      root.render(
        <BlockEditProvider source={OLD} replace={(_o: string, next: string) => answerWrites.push(next)}>
          <TableArtifact raw={OLD} artifactId={ROW_ID} mode="artifact" />
        </BlockEditProvider>,
      ),
    );
    await press();
    expect(answerWrites).toEqual([NEW]);
    expect(update).not.toHaveBeenCalled();
  });

  it("with no answer around it, writes the row and says so when the write is refused", async () => {
    update.mockResolvedValue({ data: null, error: new Error("your access does not let you change it") });
    act(() => root.render(<TableArtifact raw={OLD} artifactId={ROW_ID} mode="canvas" />));
    await press();
    expect(update).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalled();
  });
});
