/**
 * A Controls change on a MATERIALIZED artifact in a chat answer (live,
 * 2026-10-17): pie → Bar saved the answer's archive text and queued the edit
 * chip, but the chart on screen — drawn from the canvas row by id — stayed a
 * pie, and stayed a pie after reload because the row never changed.
 *
 * The block's write must (1) save the answer through the host's write (the
 * hand-edit save), (2) save the row the screen draws, (3) show the change at
 * once, and (4) offer Undo, which puts all three back.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PIE = '{\n  "type": "pie",\n  "title": "Market Share",\n  "data": [{ "label": "Chrome", "value": 65 }]\n}';
const BAR = PIE.replace('"pie"', '"bar"');
const ROW_ID = "23f81dd1-671a-4df0-ba4a-a8b96b853106";

const toastSuccess = jest.fn();
jest.mock("@/lib/toast", () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a), error: jest.fn(), info: jest.fn() } }));

const update = jest.fn(async () => ({ data: null, error: null }));
jest.mock("@/features/canvas/services/canvasItemsService", () => ({
  canvasItemsService: { update: (...a: unknown[]) => (update as (...b: unknown[]) => unknown)(...a) },
}));

jest.mock("@/features/canvas/hooks/useCanvasItem", () => ({
  invalidateCanvasItemCache: jest.fn(),
  useCanvasItem: (id: string | null) => ({
    row: id ? { id: ROW_ID, type: "chart", title: "Chart 1", version: 1, content: { data: PIE, type: "chart", metadata: {} } } : null,
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));
jest.mock("@/features/canvas/artifact-types/artifact-type-registry", () => ({ getArtifactDef: () => ({ userEditable: false }) }));
jest.mock("@ai-matrx/rich-content/kinds/react/kind-route", () => ({ kindServerDataFromStoredValue: () => null }));
jest.mock("@/features/canvas/artifact-types/storedKindValue", () => ({ storedKindValue: () => null }));
jest.mock("@/components/loaders/MatrxMiniLoader", () => () => null);
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@ai-matrx/rich-content/display/blocks/mermaid/MermaidBlock", () => () => null);

// The chart inside: shows what it draws, and changes its type through the nearest write path
// exactly as Block Controls does (the block's source with its own body replaced).
jest.mock("../ArtifactBlock", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useBlockEdit } = require("@ai-matrx/rich-content/display/block-controls/block-edit");
  return function FakeChart({ content }: { content: string }) {
    const edit = useBlockEdit();
    const body = content.trim();
    return (
      <div>
        <span data-testid="drawn">{JSON.parse(body).type}</span>
        {edit && edit.source.includes(body) ? (
          <button
            data-testid="to-bar"
            onClick={() => edit.write(edit.source.replace(body, body.replace(/"type": "\w+"/, '"type": "bar"')))}
          />
        ) : null}
      </div>
    );
  };
});

import { BlockEditProvider } from "@ai-matrx/rich-content/display/block-controls/block-edit";
import ArtifactRefBlock from "../ArtifactRefBlock";

/** The chat answer: its artifact block's archive body, saved by replaceBlockContent. */
function Answer() {
  const [archive, setArchive] = React.useState(`\n${PIE}\n`);
  return (
    <BlockEditProvider
      source={archive}
      replace={(original: string, next: string) => {
        answerWrites.push(next);
        setArchive((now) => now.replace(original, next));
      }}
    >
      <span data-testid="archive">{archive.includes('"bar"') ? "bar" : "pie"}</span>
      <ArtifactRefBlock serverData={{ artifact_id: ROW_ID, artifact_type: "chart" }} fallbackContent={archive} messageId="m1" conversationId="c1" />
    </BlockEditProvider>
  );
}
const answerWrites: string[] = [];

function q(host: HTMLElement, id: string) {
  return host.querySelector(`[data-testid="${id}"]`);
}

describe("Controls on a saved artifact in a chat answer", () => {
  let host: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    answerWrites.length = 0;
    update.mockClear();
    toastSuccess.mockClear();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(<Answer />));
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("pie → bar shows at once and saves the answer and the drawn row", async () => {
    expect(q(host, "drawn")?.textContent).toBe("pie");
    await act(async () => {
      (q(host, "to-bar") as HTMLButtonElement).click();
    });
    expect(q(host, "drawn")?.textContent).toBe("bar");
    expect(q(host, "archive")?.textContent).toBe("bar");
    expect(answerWrites).toHaveLength(1);
    expect(update).toHaveBeenCalledWith(ROW_ID, { content: { data: BAR, type: "chart", metadata: {} } });
  });

  it("Undo puts the answer, the row and the screen back", async () => {
    await act(async () => {
      (q(host, "to-bar") as HTMLButtonElement).click();
    });
    const undo = (toastSuccess.mock.calls[0]?.[1] as { action?: { label: string; onClick: () => void } })?.action;
    expect(undo?.label).toBe("Undo");
    await act(async () => {
      undo?.onClick();
    });
    expect(q(host, "drawn")?.textContent).toBe("pie");
    expect(q(host, "archive")?.textContent).toBe("pie");
    expect(update).toHaveBeenLastCalledWith(ROW_ID, { content: { data: PIE, type: "chart", metadata: {} } });
  });
});
