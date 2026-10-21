import type { CSSProperties } from "react";

/**
 * The Studio's panes never get narrower than this (px), so the controls' tabs, a test case's
 * header and the assistant's composer always have room. `studio-layout.test.ts`.
 */
export const STUDIO_PANE_MIN_PX = { assistant: 280, agent: 360, controls: 340 } as const;

/** In the two-pane layout the side column (assistant or controls, one at a time) never gets narrower. */
export const STUDIO_SIDE_MIN_PX = 320;

/** The Studio body width (px, the WORKSPACE's own box — not the window) each layout needs. */
export const STUDIO_THREE_PANE_PX = 1080;
export const STUDIO_TWO_PANE_PX = 680;

/**
 * three — assistant | agent | controls.
 * two   — one side column (Assistant or Controls, switched in its header) | the agent.
 *         What a 1440 window gets when Watch AI or the Builder panel takes its right side.
 * tabs  — one pane at a time (Assistant · Agent · Controls): phones and very narrow bodies.
 */
export type StudioLayout = "three" | "two" | "tabs";

/** The layout for the workspace's measured width. Pure, so the breakpoints are tested. */
export function studioLayoutFor(width: number): StudioLayout {
  if (width >= STUDIO_THREE_PANE_PX) return "three";
  if (width >= STUDIO_TWO_PANE_PX) return "two";
  return "tabs";
}

/** Below this center width a compare shows one answer at a time, never two cramped columns. */
export const STUDIO_COMPARE_SIDE_BY_SIDE_PX = 640;

/** Grid tracks per layout: the same four children, placed by CSS only. Pure, so the guard reads it. */
export function studioGrid(layout: StudioLayout): CSSProperties {
  if (layout === "three") {
    return {
      gridTemplateColumns: `minmax(${STUDIO_PANE_MIN_PX.assistant}px, 27fr) minmax(${STUDIO_PANE_MIN_PX.agent}px, 46fr) minmax(${STUDIO_PANE_MIN_PX.controls}px, 27fr)`,
      gridTemplateRows: "minmax(0, 1fr)",
    };
  }
  if (layout === "two") {
    return {
      gridTemplateColumns: `minmax(${STUDIO_SIDE_MIN_PX}px, 42fr) minmax(${STUDIO_PANE_MIN_PX.agent}px, 58fr)`,
      gridTemplateRows: "auto minmax(0, 1fr)",
    };
  }
  return { gridTemplateColumns: "minmax(0, 1fr)", gridTemplateRows: "minmax(0, 1fr)" };
}

/** Where each pane sits in a layout, and whether it shows. Pure. */
export function studioSlot(
  layout: StudioLayout,
  pane: "switch" | "assistant" | "agent" | "controls",
  ui: { side: "assistant" | "controls"; tab: "assistant" | "agent" | "controls" },
): { style: CSSProperties; shown: boolean } {
  if (layout === "three") {
    const col = { switch: 1, assistant: 1, agent: 2, controls: 3 }[pane];
    return { style: { gridColumn: col, gridRow: 1 }, shown: pane !== "switch" };
  }
  if (layout === "two") {
    if (pane === "switch") return { style: { gridColumn: 1, gridRow: 1 }, shown: true };
    if (pane === "agent") return { style: { gridColumn: 2, gridRow: "1 / span 2" }, shown: true };
    return { style: { gridColumn: 1, gridRow: 2 }, shown: ui.side === pane };
  }
  return { style: { gridColumn: 1, gridRow: 1 }, shown: pane !== "switch" && ui.tab === pane };
}

