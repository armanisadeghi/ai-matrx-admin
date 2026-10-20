/**
 * A BRIDGED KIND ANSWER DRAWS ITS COMPONENT, NOT ITS JSON (2026-10-19).
 *
 * Agent Studio, agent 996a6bfc ("Brand-foundation research analyst", Agent Factory, output shape
 * `structured_info`): conversation f76c576a's answer is a schema-valid `{"__kind":"structured_info",…}`
 * value, yet it drew as raw JSON captioned "0 sections". The kind route was right: it routed the block
 * to `structured_info` with the bridge's markdown in `serverData.content`. The unified artifact renderer
 * (`StructuredInfoArtifact`) read only `data`/`raw`, so it handed the JSON text to the viewer, whose
 * section counter found no bold headings. `TranscriptArtifact` had the same hole.
 *
 * The class: an artifact renderer behind a kind with a legacy bridge must draw the bridge output.
 * 1. The stored answer, through the reload path (splitter → BlockRenderer), draws its sections.
 * 2. EVERY system kind with a bridge AND an artifact renderer, fed its own complete value as bare
 *    JSON, draws no raw `__kind` on screen (the leak sentinel's scan) — census over the registry.
 */
// eslint-disable-next-line import/order -- the judge's mocks must register first
import { domElementVerdict } from "@/features/content-ir/render-paths/__tests__/dom-frame-judge";
import React from "react";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { BlockRenderer } from "@ai-matrx/rich-content/display/chat-markdown/block-registry/BlockRenderer";
import { splitContentIntoBlocksV2 } from "@ai-matrx/rich-content/display/markdown-classification/processors/utils/content-splitter-v2";
import { SYSTEM_KIND_DEFINITIONS } from "@/features/content-ir/registry/system-kinds";
import { hasArtifactRenderer } from "@/features/canvas/artifact-types/artifact-renderers";
import { TRANSCRIPT_CANONICAL_EXAMPLE } from "./fixtures/transcript-fixture";

jest.mock("@/features/canvas/hooks/useCanvasItem", () => ({
  useCanvasItem: () => ({ row: null, loading: false, error: "not in this store" }),
}));

jest.setTimeout(120_000);

async function drawReload(text: string) {
  const verdicts = [];
  for (const [index, block] of splitContentIntoBlocksV2(text).entries()) {
    verdicts.push(
      await domElementVerdict(
        React.createElement(BlockRenderer, {
          block: block as never,
          index,
          isStreamActive: false,
          replaceBlockContent: () => undefined,
          handleOpenEditor: () => undefined,
        }),
      ),
    );
  }
  return {
    raw: verdicts.some((v) => v.raw),
    failed: verdicts.some((v) => v.failed),
    text: verdicts.map((v) => v.text).join("\n"),
  };
}

describe("a bridged kind answer draws its component, not its JSON", () => {
  it("stored structured_info answer (f76c576a, agent 996a6bfc) draws its 14 sections", async () => {
    const answer = readFileSync(join(__dirname, "fixtures", "stored-structured-info-answer-f76c576a.txt"), "utf8");
    const drawn = await drawReload(answer);
    expect(drawn.raw).toBe(false);
    expect(drawn.failed).toBe(false);
    expect(drawn.text).not.toContain('"__kind"');
    expect(drawn.text).toContain("Brand Foundation — Harborline Physical Therapy");
    expect(drawn.text).toContain("Sources consulted");
    expect(drawn.text).toContain("14 sections");
    expect(drawn.text).not.toContain("0 sections");
  });

  it("transcript as a bare __kind value draws its segments", async () => {
    const drawn = await drawReload(JSON.stringify(TRANSCRIPT_CANONICAL_EXAMPLE, null, 2));
    expect(drawn.raw).toBe(false);
    expect(drawn.failed).toBe(false);
    expect(drawn.text).not.toContain('"__kind"');
  });

  // The census: which system kinds carry a bridge into a unified artifact renderer.
  const bridgedArtifactKinds = SYSTEM_KIND_DEFINITIONS.filter(
    (def) => def.toLegacyServerData && hasArtifactRenderer(def.artifact?.canvasType),
  ).map((def) => def.kind);

  it("finds the bridged artifact kinds (structured_info and transcript among them)", () => {
    expect(bridgedArtifactKinds).toEqual(expect.arrayContaining(["structured_info", "transcript"]));
  });

  // Every renderer such a kind lands on must read the bridge output: a renderer that ignores
  // `serverData` hands the component the JSON text (the "0 sections" defect).
  const RENDERERS_DIR = resolve(__dirname, "../../canvas/artifact-types");
  const registrySource = readFileSync(join(RENDERERS_DIR, "artifact-renderers.tsx"), "utf8");
  function rendererFile(canvasType: string): string {
    const entry = new RegExp(`^\\s*(?:"${canvasType}"|${canvasType}):\\s*(.+?),?$`, "m").exec(registrySource);
    if (!entry) throw new Error(`no RENDERERS entry for ${canvasType}`);
    const lazy = /import\("\.\/renderers\/(\w+)"\)/.exec(entry[1]);
    if (lazy) return lazy[1];
    const name = entry[1].trim();
    const imported = new RegExp(`import ${name} from "\\./renderers/(\\w+)"`).exec(registrySource);
    if (!imported) throw new Error(`no import for ${name}`);
    return imported[1];
  }

  it.each(
    SYSTEM_KIND_DEFINITIONS.filter(
      (def) => def.toLegacyServerData && hasArtifactRenderer(def.artifact?.canvasType),
    ).map((def) => [def.kind, def.artifact!.canvasType] as const),
  )("%s → the %s renderer reads serverData", (_kind, canvasType) => {
    const file = rendererFile(canvasType);
    const source = readFileSync(join(RENDERERS_DIR, "renderers", `${file}.tsx`), "utf8");
    expect({ file, readsServerData: /\bserverData\b/.test(source) }).toEqual({ file, readsServerData: true });
  });
});
