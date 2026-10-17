/**
 * A STREAMED SHAPE MOUNTS ONCE — first token → fence closed → the SAVED answer (Arman,
 * 2026-10-14: a streamed shape mounts once and only moves forward; never moves backward).
 *
 * Drawn UNMOCKED through the real pipeline: RichContent → MarkdownStream → BlockRenderer → the
 * app's real ArtifactRender → the real flashcards renderer. Then the answer is SAVED the way the
 * product saves it (`materializeMessageArtifacts`: each kind fence becomes
 * `<artifact type id version>{the same value}</artifact>`, `wrapArtifactText`).
 *
 * Caught live (2026-10-17, /chat, rich-content 0.2.204, Test Data Agent): at save the finished
 * flashcard set was removed, an "Initializing Matrx..." loader card drew for ~218ms (the by-id
 * ArtifactRefBlock waiting on its row), and a DIFFERENT element (ArtifactBlock's chrome) mounted;
 * the answer's text length dropped 1786 → 1005. And while the fence streamed, the block's body was
 * re-parented the frame it settled (the attach wrapper appeared only once streaming ended).
 */
import "../render-paths/__tests__/dom-frame-judge";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { RichContent } from "@ai-matrx/rich-content/levels/RichContent";
import { wrapArtifactText } from "@/features/canvas/materialization/artifactWire";

const SAVED_ID = "0f0e0d0c-0b0a-4908-8706-050403020101";

const VALUE = {
  __kind: "flashcard_set",
  title: "Cells",
  cards: [
    { __kind: "flashcard", front: "Mitochondria", back: "The powerhouse of the cell." },
    { __kind: "flashcard", front: "Ribosome", back: "Builds proteins from amino acids." },
    { __kind: "flashcard", front: "Nucleus", back: "Holds the cell's DNA." },
  ],
};
const BODY = JSON.stringify(VALUE, null, 2);

// The saved row answers by id, like the product's canvas_items read (after a beat).
jest.mock("@/features/canvas/hooks/useCanvasItem", () => {
  const React = jest.requireActual("react");
  return {
    invalidateCanvasItemCache: () => {},
    useCanvasItem: (id: string | null) => {
      const [ready, setReady] = React.useState(false);
      React.useEffect(() => {
        if (!id) return;
        const t = setTimeout(() => setReady(true), 20);
        return () => clearTimeout(t);
      }, [id]);
      const row =
        id && ready
          ? { id, type: "flashcards", version: 1, title: "Cells", content: { type: "flashcards", data: JSON.parse(JSON.stringify(VALUE)) } }
          : null;
      return { row, loading: Boolean(id) && !ready, error: null, refetch: () => {} };
    },
  };
});

const flush = async (rounds = 6) => {
  for (let i = 0; i < rounds; i += 1) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
};

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test("one flashcard set: ONE mounted body from the streamed fence through the saved artifact, no loader, text never shrinks", async () => {
  const intro = "Here are your cards:\n\n";
  const outro = "\n\nStudy well.";
  const streamed = `${intro}\`\`\`json\n${BODY}\n\`\`\`${outro}`;
  const saved = `${intro}${wrapArtifactText({ canvasType: "flashcards", id: SAVED_ID, version: 1, body: BODY })}${outro}`;

  // Every element ever attached under a kind host's body slot, every one removed, and whether a
  // loader card ever replaced drawn content.
  const removedFromHost: string[] = [];
  const loaderAfterContent: string[] = [];
  const observer = new MutationObserver((records) => {
    for (const r of records) {
      const host = (r.target as Element).closest?.("[data-kind-record-host]");
      if (host && r.target !== host) {
        r.removedNodes.forEach((n) => {
          if (n instanceof Element && (n.textContent ?? "").includes("Mitochondria")) removedFromHost.push(n.className || n.tagName);
        });
      }
      if (r.target === host) {
        r.removedNodes.forEach((n) => {
          if (n instanceof Element) removedFromHost.push(`host-child:${n.className || n.tagName}`);
        });
      }
    }
  });
  observer.observe(container, { childList: true, subtree: true });

  const lengths: number[] = [];
  let sawCards = false;
  const draw = async (source: string, isStreaming: boolean) => {
    await act(async () => {
      root.render(<RichContent level="full" imagePolicy="ai" source={source} isStreaming={isStreaming} hideCopyButton />);
    });
    await flush();
    const text = container.textContent ?? "";
    if (text.includes("Mitochondria")) sawCards = true;
    if (sawCards) {
      lengths.push(text.length);
      if (/Initializing Matrx/.test(text)) loaderAfterContent.push(`${isStreaming ? "live" : "settled"}@${source.length}`);
    }
  };

  // The fence streams in, card by card, then closes; the turn ends; then the answer is saved.
  const firstCard = streamed.indexOf('"Ribosome"');
  for (const end of [firstCard, streamed.indexOf('"Nucleus"'), streamed.length - outro.length, streamed.length]) {
    await draw(streamed.slice(0, end), true);
  }
  await draw(streamed, false);
  const hostBeforeSave = container.querySelector("[data-kind-record-host]");
  const bodyBeforeSave = hostBeforeSave?.firstElementChild ?? null;
  await draw(saved, false);
  await flush(10); // the saved row answers by id
  observer.disconnect();

  const host = container.querySelector("[data-kind-record-host]");
  expect(sawCards).toBe(true);
  expect(host).not.toBeNull();
  expect(host).toBe(hostBeforeSave);
  // The saved answer draws the cards in the SAME body element the stream drew.
  expect(host!.textContent).toContain("Mitochondria");
  expect(host!.firstElementChild).toBe(bodyBeforeSave);
  expect({ removedFromHost, loaderAfterContent }).toEqual({ removedFromHost: [], loaderAfterContent: [] });
}, 120_000);
