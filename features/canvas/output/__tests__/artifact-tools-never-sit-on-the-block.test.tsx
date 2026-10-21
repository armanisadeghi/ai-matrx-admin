/**
 * THE ARTIFACT TOOLS NEVER SIT ON THE BLOCK (review 5, G10, 2026-10-21).
 *
 * The attach / history / expand row was an absolutely positioned corner over the block's own body:
 * in a chat answer it sat on a stats tile, a flashcard face and the quiz's View Results button.
 * The row now takes its own line under the body, and it is reserved while the block streams so the
 * block finishing moves nothing.
 *
 * RED on the old code: the row is `absolute` and drawn only once `enabled`.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import { ArtifactBlockAttach, ArtifactDoorsDrawnProvider } from "../ArtifactBlockAttach";

jest.mock("@/lib/redux/store-singleton", () => ({ getStore: () => null }));
jest.mock("@/features/canvas/components/ArtifactVersionHistory", () => ({ ArtifactVersionHistory: () => null }));
jest.mock("@/features/canvas/hooks/useOpenArtifactInCanvas", () => ({ useOpenArtifactInCanvas: () => ({ openArtifact: jest.fn() }) }));
jest.mock("../artifactAttach", () => ({
  artifactAttachOptions: () => [{ value: "screenshot", label: "Screenshot" }],
  attachArtifactToChat: jest.fn(),
}));

const SAVED = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d";
async function mountSaved(doorsDrawnAbove: boolean) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    createRoot(container).render(
      <ArtifactDoorsDrawnProvider value={doorsDrawnAbove}>
        <ArtifactBlockAttach type="stats" data={{}} title="Totals" conversationId="c1" artifactId={SAVED}>
          <p>body</p>
        </ArtifactBlockAttach>
      </ArtifactDoorsDrawnProvider>,
    );
  });
  return container;
}

async function mount(enabled: boolean) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    createRoot(container).render(
      <ArtifactBlockAttach type="stats" data={{}} title="Totals" conversationId="c1" enabled={enabled}>
        <p>body</p>
      </ArtifactBlockAttach>,
    );
  });
  return { container };
}
afterEach(() => (document.body.innerHTML = ""));

describe("the artifact tools never sit on the block", () => {
  it("draws the row under the body, not as an absolute corner", async () => {
    const { container } = await mount(true);
    const tools = container.querySelector("[data-artifact-attach-tools]") as HTMLElement;
    expect(tools).not.toBeNull();
    expect(tools.className).not.toMatch(/\babsolute\b/);
    const body = container.querySelector("p")!.parentElement!;
    expect(body.compareDocumentPosition(tools) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(body.contains(tools)).toBe(false);
  });

  it("reserves the row while streaming, inert, so finishing moves nothing", async () => {
    const { container } = await mount(false);
    const tools = container.querySelector("[data-artifact-attach-tools]") as HTMLElement;
    expect(tools).not.toBeNull();
    expect(tools.className).toMatch(/invisible/);
    expect(tools.className).toMatch(/pointer-events-none/);
  });

  it("draws Open in canvas once for a saved block: the row above owns it (G10)", async () => {
    expect((await mountSaved(false)).querySelectorAll('[aria-label="Open in canvas"]').length).toBe(1);
    document.body.innerHTML = "";
    expect((await mountSaved(true)).querySelectorAll('[aria-label="Open in canvas"]').length).toBe(0);
  });
});
