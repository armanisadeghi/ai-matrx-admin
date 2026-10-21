/**
 * ONE HEADER ROW PER BLOCK, RENDERED (adversarial review 5, G1 + G3, 2026-10-21).
 *
 * The web's own block components (stats, comparison, tasks, progress tracker, troubleshooting,
 * recipe, decision tree, map and the rest) draw their own card header. Inside the kind host
 * (BlockRenderer `withRecordChrome` = BlockTypeLabelSlotProvider + KindControlsHeader) that header
 * must CLAIM the type label, or the kind host draws a second header row with the same drag / "</>" /
 * trash tools the card header already shows.
 *
 * Drawn UNMOCKED through the real pipeline: RichContent → BlockRenderer → the kind host → the app's
 * real ArtifactRender → the real web block component. Three ways a block is seen:
 *   - Read / a chat bubble: no host tools.
 *   - Write: inside the rich editor's BlockHostProvider, which gives the block its tools.
 *   - A SAVED chat answer: the server materializes each block into
 *     `<artifact type id version>{the same body}</artifact>` (G3: stats and tasks lost their label).
 * Each must show exactly ONE header row, exactly ONE type label inside it, and the host's tools once.
 */
import "../../../../features/content-ir/render-paths/__tests__/dom-frame-judge";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { RichContent } from "@ai-matrx/rich-content/levels/RichContent";
import { BlockHostProvider } from "@ai-matrx/rich-content/display/block-host";
import { TooltipProvider } from "@ai-matrx/design-system";
import { wrapArtifactText } from "@/features/canvas/materialization/artifactWire";

// A saved answer's artifact row is not in the database here: the by-id read misses and the block
// draws its inline archive body, which is exactly what the saved answer carries.
jest.mock("@/features/canvas/hooks/useCanvasItem", () => ({
  invalidateCanvasItemCache: () => {},
  useCanvasItem: () => ({ row: null, loading: false, error: null, refetch: () => {} }),
}));

const json = (value: unknown) => JSON.stringify(value);
const fence = (language: string, body: string) => "```" + language + "\n" + body + "\n```";
const tag = (name: string, body: string) => `<${name}>\n${body}\n</${name}>`;

interface Case {
  name: string;
  /** How a person or an answer writes it. */
  text: string;
  /** The artifact type the server saves it under (the `<artifact type=…>` of a saved answer). */
  savedType: string;
  savedBody: string;
  /** Text the card's own header shows (its title). */
  title: string;
}

const STATS = json({ title: "RV5 Totals", stats: [{ label: "Revenue", value: "$1.2M" }, { label: "Users", value: 12 }] });
const COMPARISON = json({ comparison: { title: "RV5 Plans", items: ["Alpha", "Beta"], criteria: [{ name: "Price", values: [10, 20] }] } });
const TASKS = "## Sprint 12\n- [ ] Write the plan\n- [x] Book the room";
const PROGRESS = "### Launch\n- [x] Plan\n- [ ] Ship";
const TROUBLE = "### The app will not start\n- Check the cable\n- Restart it";
const RECIPE = "### Pancakes\n#### Ingredients\n- 2 eggs\n#### Instructions\n1. Mix";
const TREE = json({ decision_tree: { title: "RV5 Pick", root: { question: "Ready?", yes: { action: "Go" }, no: { action: "Wait" } } } });
const MAP = json({ title: "RV5 Offices", markers: [{ name: "Paris", lat: 48.85, lng: 2.35 }] });

const CASES: Case[] = [
  { name: "stats", text: fence("stats", STATS), savedType: "stats", savedBody: STATS, title: "RV5 Totals" },
  { name: "comparison", text: fence("comparison", COMPARISON), savedType: "comparison_table", savedBody: COMPARISON, title: "RV5 Plans" },
  { name: "tasks", text: fence("tasks", TASKS), savedType: "tasks", savedBody: TASKS, title: "Sprint 12" },
  { name: "progress tracker", text: tag("progress_tracker", PROGRESS), savedType: "progress_tracker", savedBody: PROGRESS, title: "Launch" },
  { name: "troubleshooting", text: tag("troubleshooting", TROUBLE), savedType: "troubleshooting", savedBody: TROUBLE, title: "" },
  { name: "recipe", text: tag("cooking_recipe", RECIPE), savedType: "cooking_recipe", savedBody: RECIPE, title: "Pancakes" },
  { name: "decision tree", text: fence("decision_tree", TREE), savedType: "decision_tree", savedBody: TREE, title: "RV5 Pick" },
  { name: "map", text: fence("map", MAP), savedType: "map", savedBody: MAP, title: "RV5 Offices" },
];

const SAVED_ID = "0b46d390-ab07-4d37-b34f-c4981a10dd42";

const flush = async (rounds = 8) => {
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

/** The editor's own tools for a block, as the rich editor's node view provides them. */
function HostTool() {
  return (
    <button type="button" data-test-host-tool="" aria-label="Remove block">
      x
    </button>
  );
}

async function draw(source: string, withHost: boolean) {
  const content = <RichContent level="full" imagePolicy="ai" source={source} isStreaming={false} hideCopyButton />;
  await act(async () => {
    root.render(<TooltipProvider>{withHost ? <BlockHostProvider renderActions={() => <HostTool />}>{content}</BlockHostProvider> : content}</TooltipProvider>);
  });
  await flush();
}

/** Header rows outside any nested card body: every `[data-block-header]` in the rendered block. */
function read() {
  const headers = [...container.querySelectorAll("[data-block-header]")];
  const labels = [...container.querySelectorAll("[data-block-type-label]")];
  const hostTools = container.querySelectorAll("[data-test-host-tool]").length;
  // A button name drawn twice in the same block (Copy source twice, Controls twice).
  const names = [...container.querySelectorAll("[data-block-header] button[aria-label]")].map((b) => b.getAttribute("aria-label") ?? "");
  const repeated = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
  return {
    headers: headers.length,
    labels: labels.map((l) => (l.textContent ?? "").trim()),
    labelInHeader: labels.every((l) => l.closest("[data-block-header]") !== null),
    hostTools,
    repeated,
    headerText: headers.map((h) => (h.textContent ?? "").replace(/\s+/g, " ").trim()),
  };
}

describe("every web block draws ONE header row holding its title, its type label and the tools once", () => {
  for (const c of CASES) {
    it(`${c.name}: Read shows one header row with one label`, async () => {
      await draw(c.text, false);
      const seen = read();
      expect({ name: c.name, headers: seen.headers, labels: seen.labels.length, labelInHeader: seen.labelInHeader }).toEqual({
        name: c.name,
        headers: 1,
        labels: 1,
        labelInHeader: true,
      });
      expect(seen.labels[0]).toMatch(/\S/);
      if (c.title) expect(seen.headerText[0]).toContain(c.title);
    }, 60_000);

    it(`${c.name}: Write shows one header row, one label and the editor's tools once`, async () => {
      await draw(c.text, true);
      const seen = read();
      expect({ name: c.name, headers: seen.headers, labels: seen.labels.length, hostTools: seen.hostTools, repeated: seen.repeated }).toEqual({
        name: c.name,
        headers: 1,
        labels: 1,
        hostTools: 1,
        repeated: [],
      });
      if (c.title) expect(seen.headerText[0]).toContain(c.title);
    }, 60_000);

    it(`${c.name}: a SAVED chat answer (<artifact type=${c.savedType}>) shows one header row with one label`, async () => {
      await draw(wrapArtifactText({ canvasType: c.savedType, id: SAVED_ID, version: 2, body: c.savedBody }), false);
      const seen = read();
      expect({ name: c.name, headers: seen.headers, labels: seen.labels.length, labelInHeader: seen.labelInHeader }).toEqual({
        name: c.name,
        headers: 1,
        labels: 1,
        labelInHeader: true,
      });
    }, 60_000);
  }
});
