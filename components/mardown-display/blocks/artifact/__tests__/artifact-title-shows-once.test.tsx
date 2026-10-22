/**
 * A finished `<artifact type="timeline" title="X">` printed "X" twice in a row:
 * ArtifactBlock's muted title label, then the timeline card's own header title.
 * A kind whose card prints its own title gets no label; one that does not
 * (html) keeps it; a still-streaming one keeps it (no card header yet).
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/components/dialogs/confirm/ConfirmDialogHost", () => ({ confirm: jest.fn() }));
jest.mock("@/features/canvas/export/exportArtifactMarkdown", () => ({ artifactContentToMarkdown: () => "" }));
jest.mock("@/features/canvas/materialization/useUnbindArtifact", () => ({
  useUnbindArtifact: () => ({ canUnbind: false, busy: false, unbind: jest.fn(), surfaceNoun: "message" }),
}));
jest.mock("@/features/canvas/components/ArtifactVersionHistory", () => ({ ArtifactVersionHistory: () => null }));
jest.mock("@/features/canvas/hooks/useCanvas", () => ({ useCanvas: () => ({ open: jest.fn() }) }));
jest.mock("@/features/canvas/hooks/useOpenArtifactInCanvas", () => ({
  useOpenArtifactInCanvas: () => ({ openArtifact: jest.fn() }),
}));
jest.mock("@/features/canvas/hooks/useCanvasOpenGuard", () => ({ useCanvasOpenGuard: () => ({ isCanvasAvailable: false }) }));
jest.mock("@/features/canvas/host/useArtifactCanvas", () => ({
  useArtifactContentToggle: () => ({ isVisible: false, closeIfVisible: () => false }),
}));
jest.mock("@/features/canvas/artifact-types/artifact-renderers", () => ({
  hasArtifactRenderer: () => true,
  ArtifactRender: () => <div data-testid="card" />,
}));
jest.mock("@ai-matrx/design-system", () => ({
  ...jest.requireActual("@ai-matrx/design-system"),
  MatrxMiniLoader: () => null,
}));
jest.mock("@ai-matrx/rich-content/code-block/CodeBlock", () => () => null);
jest.mock("@ai-matrx/rich-content/display/chat-markdown/BasicMarkdownContent", () => () => null);
jest.mock("@ai-matrx/rich-content/display/chat-markdown/block-registry/json-parse-utils", () => ({
  safeJsonParse: (s: string) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  },
}));

import ArtifactBlock from "../ArtifactBlock";

function render(artifactType: string, isComplete = true, payloadTitle = "Roman Republic", artifactTitle = "Roman Republic"): string {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <ArtifactBlock
        content={JSON.stringify({ __kind: "x", title: payloadTitle })}
        metadata={{ artifactType, artifactTitle, isComplete }}
      />,
    );
  });
  const text = host.textContent ?? "";
  act(() => root.unmount());
  host.remove();
  return text;
}

describe("an artifact's title shows once", () => {
  it.each(["timeline", "research", "quiz", "recipe", "comparison", "decision-tree", "diagram", "progress", "troubleshooting", "resources", "math_problem"])(
    "%s: no label above a card that prints its own title",
    (type) => {
      expect(render(type)).not.toContain("Roman Republic");
    },
  );

  it("a payload titled differently keeps the label (it is the only place the attribute title shows)", () => {
    expect(render("timeline", true, "Something else")).toContain("Roman Republic");
  });

  it("a kind whose card has no title keeps the label", () => {
    expect(render("html")).toContain("Roman Republic");
  });

  it("while streaming the label stays (no card header yet)", () => {
    expect(render("timeline", false)).toContain("Roman Republic");
  });

  it("a numbered placeholder title (\"Chart 1\") is never drawn: it names nothing the person wrote", () => {
    // Live 2026-10-19: "Chart 1" sat above a chart whose own header read "RVW visits · Pie chart".
    expect(render("chart", true, "RVW visits", "Chart 1")).not.toContain("Chart 1");
    expect(render("progress", true, "Onboarding", "Progress tracker 2")).not.toContain("Progress tracker 2");
    expect(render("html", true, "x", "Html 3")).not.toContain("Html 3");
    // A real title that happens to end in a number keeps its label.
    expect(render("chart", true, "RVW visits", "Q3 revenue 2026")).toContain("Q3 revenue 2026");
  });
});
