import { judgeReadsState } from "../render-paths/__tests__/dom-frame-judge";
import type { RenderBlockPayload } from "@ai-matrx/agents/generated/stream-events";
import { StreamBlockAccumulator } from "@ai-matrx/chat/agents/redux/execution-system/utils/stream-block-accumulator";
import { renderBlockToContentBlock } from "@ai-matrx/rich-content/display/chat-markdown/render-block-to-content-block";
import { decideBlockRender } from "@ai-matrx/rich-content/display/chat-markdown/block-registry/BlockRenderer";
import { readEnvelope } from "@ai-matrx/rich-content/kinds/redux/render-block-envelope";
void judgeReadsState;

const PAYLOAD = JSON.stringify({
  __kind: "flashcard_set",
  title: "Flashcards",
  cards: [
    { __kind: "flashcard", front: "Polyatomic Ion", back: "An electrically charged group." },
    { __kind: "flashcard", front: "Oxoanion", back: "A polyatomic anion with oxygen." },
  ],
}, null, 2);

it("probe", () => {
  const upserts: Array<{ block: RenderBlockPayload }> = [];
  const acc = new StreamBlockAccumulator("req-probe", (payload) => { upserts.push(payload as never); return payload; });
  const d = (a: unknown) => a;
  const stream = "Here you go:\n\n```json\n" + PAYLOAD + "\n```\n\nDone.";
  const lines: string[] = []; const lines0: string[] = [];
  for (const ch of stream) acc.ingest(ch, d);
  acc.finalize(d);
  upserts.slice(88,98).forEach(({block},i)=>lines0.push(`${88+i} ${block.blockId} ${block.blockIndex} ${block.type} ${block.status} ${JSON.stringify((block.content??"").slice(-30))}`));
  console.log(lines0.join("\n"));
  let last = "";

  upserts.forEach(({ block }, i) => {
    if (block.blockIndex !== 1 && !(block.content??"").includes("__kind")) return;
    const cb = renderBlockToContentBlock(block) as never as { type: string; content: string };
    const key = cb.type === "code" ? `code-${block.blockIndex}` : `${cb.type}-${(cb.content ?? "").slice(0, 100)}-${block.blockIndex}`;
    const dec = decideBlockRender(cb as never, { isStreamActive: true });
    const env = readEnvelope((dec.block as { metadata?: Record<string, unknown> }).metadata);
    const sig = `${block.type}|${cb.type}|${dec.gate?.kind ?? "-"}|${dec.block.type}|${env?.root.kind ?? ""}:${env?.root.kindState ?? ""}:${env?.root.status ?? ""}|sd=${(dec.block as { serverData?: unknown }).serverData ? 1 : 0}`;
    const keyNote = key.length > 40 ? key.slice(0, 40) : key;
    if (sig !== last) { lines.push(`#${i} id=${block.blockId} idx=${block.blockIndex} st=${block.status} len=${(block.content ?? "").length} ${sig} key=${JSON.stringify(keyNote)}`); last = sig; }
  });
  console.log(lines.join("\n"));
});
