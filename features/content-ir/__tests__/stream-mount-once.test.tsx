/**
 * THE RENDER RATCHET, end to end (Arman, 2026-10-14: "during the stream, it re-renders").
 *
 * The REAL accumulator streams a kind payload character by character (and in odd chunk sizes
 * that split mid-key, mid-string and mid-`__kind`) into ONE persistent React root that draws
 * every visible block through the REAL BlockRenderer, keyed by position exactly as
 * EnhancedChatMarkdown keys them. For the kind block it asserts:
 *  - the stage sequence is monotonic (text → loader → generic → component, never back);
 *  - once the component drew, its DOM root is the SAME node to the end of the stream
 *    (a remount replaces the node) — mount count 1;
 *  - a genuinely kindless stream stays text.
 * A planted break — the old content-prefix key — must remount, proving the judge can fail.
 */
// The DOM judge first: its jest.mocks must register before BlockRenderer loads.
import "../render-paths/__tests__/dom-frame-judge";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import type { RenderBlockPayload } from "@ai-matrx/agents/generated/stream-events";
import { StreamBlockAccumulator } from "@ai-matrx/chat/agents/redux/execution-system/utils/stream-block-accumulator";
import { renderBlockToContentBlock } from "@ai-matrx/rich-content/display/chat-markdown/render-block-to-content-block";
import { BlockRenderer, decideBlockRender } from "@ai-matrx/rich-content/display/chat-markdown/block-registry/BlockRenderer";
import { renderStageOf } from "@ai-matrx/rich-content/display/chat-markdown/block-registry/render-ratchet";
import { TooltipProvider } from "@/components/ui/tooltip";

type Upsert = { block: RenderBlockPayload };
type KeyFn = (block: { type: string; content: string }, index: number) => string;

const POSITIONAL: KeyFn = (_b, i) => `block-${i}`;
const OLD_CONTENT_KEY: KeyFn = (b, i) => (b.type === "code" ? `code-${i}` : `${b.type}-${b.content.slice(0, 100)}-${i}`);

const PAYLOAD = JSON.stringify(
  {
    __kind: "flashcard_set",
    title: "Flashcards",
    cards: [
      { __kind: "flashcard", front: "Polyatomic Ion", back: "An electrically charged group of atoms." },
      { __kind: "flashcard", front: "Oxoanion", back: "A polyatomic anion that contains oxygen." },
      { __kind: "flashcard", front: "Ate vs ite", back: "-ite has one less oxygen than -ate." },
    ],
  },
  null,
  2,
);

function frames(text: string, chunk: number): Array<{ blocks: RenderBlockPayload[]; live: boolean }> {
  const out: Array<{ blocks: RenderBlockPayload[]; live: boolean }> = [];
  const current = new Map<string, RenderBlockPayload>();
  const acc = new StreamBlockAccumulator("req-mount-once", (payload) => {
    const { block } = payload as Upsert;
    current.set(block.blockId, block);
    return payload;
  });
  const snapshot = (live: boolean) =>
    out.push({
      blocks: [...current.values()].sort((a, b) => a.blockIndex - b.blockIndex),
      live,
    });
  const dispatch = (action: unknown) => action;
  for (let i = 0; i < text.length; i += chunk) {
    acc.ingest(text.slice(i, i + chunk), dispatch);
    snapshot(true);
  }
  acc.finalize(dispatch);
  snapshot(false);
  return out;
}

function Message({ blocks, live, keyFn }: { blocks: RenderBlockPayload[]; live: boolean; keyFn: KeyFn }) {
  return React.createElement(
    TooltipProvider,
    null,
    blocks.map((payload) => {
      const block = renderBlockToContentBlock(payload);
      return React.createElement(
        "div",
        { key: keyFn(block as never, payload.blockIndex), "data-slot": payload.blockId },
        React.createElement(BlockRenderer, {
          block: block as never,
          index: payload.blockIndex,
          isStreamActive: live,
          replaceBlockContent: () => undefined,
          handleOpenEditor: () => undefined,
        }),
      );
    }),
  );
}

async function settle(): Promise<void> {
  for (let i = 0; i < 3; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

/** Drive one stream; report the drawn stage per frame and how often the kind's DOM root was replaced. */
async function drive(text: string, chunk: number, keyFn: KeyFn) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const stages: number[] = [];
  let componentNode: Element | null = null;
  let remounts = 0;
  try {
    for (const { blocks, live } of frames(text, chunk)) {
      await act(async () => {
        root.render(React.createElement(Message, { blocks, live, keyFn }));
      });
      await settle();
      const kind = blocks.find((b) => (b.content ?? "").includes('"__kind"'));
      if (!kind) continue;
      const decision = decideBlockRender(renderBlockToContentBlock(kind) as never, { isStreamActive: live });
      const slot = container.querySelector(`[data-slot="${kind.blockId}"]`);
      const node = slot?.firstElementChild ?? null;
      // The DRAWN stage: once the component is on screen, a frame whose own decision is
      // behind must still show the same node (the ratchet held it).
      const drawnStage = componentNode && node === componentNode ? 3 : renderStageOf(decision);
      stages.push(drawnStage);
      if (drawnStage === 3 && node) {
        if (componentNode && node !== componentNode) remounts += 1;
        componentNode = node;
      }
    }
  } finally {
    act(() => root.unmount());
    container.remove();
  }
  return { stages, remounts, reachedComponent: componentNode !== null };
}

const isMonotonic = (s: number[]) => s.every((v, i) => i === 0 || v >= s[i - 1]!);

describe("a streamed kind mounts its component once and never steps back", () => {
  const FENCED = `Here you go:\n\n\`\`\`json\n${PAYLOAD}\n\`\`\`\n\nDone.`;

  it.each([1, 3, 7])("chunk %i: monotonic stages, one mount", async (chunk) => {
    const { stages, remounts, reachedComponent } = await drive(FENCED, chunk, POSITIONAL);
    expect(reachedComponent).toBe(true);
    expect(isMonotonic(stages)).toBe(true);
    expect(remounts).toBe(0);
  }, 240_000);

  it("planted break: the old content-prefix key remounts the prose block per token", async () => {
    // The kind block was keyed `code-i` even before; the prose block ahead of it was not.
    const prose = "A plain answer that streams one token at a time and is long enough.";
    const countRemounts = async (keyFn: KeyFn) => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);
      let node: Element | null = null;
      let remounts = 0;
      for (const { blocks, live } of frames(prose, 1)) {
        await act(async () => {
          root.render(React.createElement(Message, { blocks, live, keyFn }));
        });
        const now = container.firstElementChild;
        if (node && now && now !== node) remounts += 1;
        node = now;
      }
      act(() => root.unmount());
      container.remove();
      return remounts;
    };
    expect(await countRemounts(OLD_CONTENT_KEY)).toBeGreaterThan(10);
    expect(await countRemounts(POSITIONAL)).toBe(0);
  }, 240_000);

  it("a kindless stream stays text the whole way", async () => {
    const { stages } = await drive("Just prose, no structure at all, streaming along.", 2, POSITIONAL);
    expect(stages).toEqual([]);
  }, 120_000);
});
