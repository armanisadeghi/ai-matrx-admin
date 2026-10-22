/**
 * A Controls change on a MATERIALIZED artifact in a chat answer (live,
 * 2026-10-17): pie → Bar saved the answer's archive text and queued the edit
 * chip, but the chart on screen — drawn from the canvas row by id — stayed a
 * pie, and stayed a pie after reload because the row never changed.
 *
 * The block's write must (1) save the answer through the host's write (the
 * hand-edit save — which writes the row the screen draws: saveAnswerEdit →
 * syncEditedArtifactRows, guarded in @ai-matrx/chat), (2) never write the row a
 * second way here (review 6 H2: one save path for every surface), (3) show the
 * change at once, and (4) offer Undo, which puts both back. When the drawn row
 * is behind the answer's archive (a save reached the answer only), the block
 * keeps its Controls and the next change saves through the archive.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PIE = '{\n  "type": "pie",\n  "title": "Market Share",\n  "data": [{ "label": "Chrome", "value": 65 }]\n}';
/** What the row holds: the answer's archive by default; the old title when the row is behind. */
let rowData = PIE;
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
    row: id ? { id: ROW_ID, type: "chart", title: "Chart 1", version: 1, content: { data: rowData, type: "chart", metadata: {} } } : null,
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));
jest.mock("@/features/canvas/artifact-types/artifact-type-registry", () => ({ getArtifactDef: () => ({ userEditable: false }) }));
jest.mock("@ai-matrx/rich-content/kinds/react/kind-route", () => ({ kindServerDataFromStoredValue: () => null }));
jest.mock("@/features/canvas/artifact-types/storedKindValue", () => ({ storedKindValue: () => null }));
jest.mock("@ai-matrx/design-system", () => ({
  ...jest.requireActual("@ai-matrx/design-system"),
  MatrxMiniLoader: () => null,
}));
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
  const [archive, setArchive] = React.useState(`\n${ARCHIVE}\n`);
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
let ARCHIVE = PIE;

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
    expect(answerWrites).toEqual([`\n${BAR}\n`]);
    // The answer save writes the row; this block never writes it a second way.
    expect(update).not.toHaveBeenCalled();
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
    expect(answerWrites).toEqual([`\n${BAR}\n`, `\n${PIE}\n`]);
    expect(update).not.toHaveBeenCalled();
  });
});

describe("the drawn row is behind the answer's archive (a save reached the answer only)", () => {
  let host: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    answerWrites.length = 0;
    rowData = PIE.replace("Market Share", "Old Share");
    ARCHIVE = PIE;
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(<Answer />));
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    rowData = PIE;
  });

  it("keeps its Controls, and a change saves over the archive so the answer save levels the row", async () => {
    expect(q(host, "to-bar")).not.toBeNull();
    await act(async () => {
      (q(host, "to-bar") as HTMLButtonElement).click();
    });
    const drawnBar = rowData.replace('"pie"', '"bar"');
    expect(answerWrites).toEqual([`\n${drawnBar}\n`]);
    expect(q(host, "archive")?.textContent).toBe("bar");
  });
});
