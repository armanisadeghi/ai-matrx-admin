import type { Layout } from "react-resizable-panels";

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

export type StudioPane = "assistant" | "agent" | "controls";
export type StudioPaneUi = { side: "assistant" | "controls"; tab: StudioPane };

/** The panes' resizable group: one id, and one size cookie per layout that has more than one pane. */
export const STUDIO_PANES_GROUP_ID = "agent-studio-panes";
export const studioPanesCookie = (layout: StudioLayout) => `panels:${STUDIO_PANES_GROUP_ID}:${layout}`;

/** What the person last dragged, per layout (percent per pane, the library's Layout). */
export type StudioSavedSizes = { three?: Layout; two?: Layout };

const THREE_DEFAULT: Layout = { assistant: 27, agent: 46, controls: 27 };
const TWO_SIDE_DEFAULT = 42;

const valid = (l: Layout | undefined): l is Layout =>
  Boolean(l) &&
  (["assistant", "agent", "controls"] as const).every((k) => typeof l?.[k] === "number" && l[k] >= 0) &&
  Math.abs((l?.assistant ?? 0) + (l?.agent ?? 0) + (l?.controls ?? 0) - 100) < 1;

/** Whether a pane shows in a layout (the switch shows only in two). Pure. */
export function studioPaneShown(layout: StudioLayout, pane: StudioPane | "switch", ui: StudioPaneUi): boolean {
  if (layout === "three") return pane !== "switch";
  if (layout === "two") return pane === "switch" || pane === "agent" || ui.side === pane;
  return pane !== "switch" && ui.tab === pane;
}

/**
 * The sizes (percent) the panes get in a layout. Hidden panes collapse to 0 — they stay mounted, so no pane
 * ever remounts on a layout change. Three and two restore what the person last dragged. Pure.
 */
export function studioPanesLayout(layout: StudioLayout, ui: StudioPaneUi, saved: StudioSavedSizes): Layout {
  if (layout === "three") return valid(saved.three) && saved.three.assistant > 0 && saved.three.controls > 0 ? saved.three : THREE_DEFAULT;
  if (layout === "two") {
    const side = valid(saved.two) && saved.two.agent < 100 ? 100 - saved.two.agent : TWO_SIDE_DEFAULT;
    return { assistant: ui.side === "assistant" ? side : 0, agent: 100 - side, controls: ui.side === "controls" ? side : 0 };
  }
  return { assistant: ui.tab === "assistant" ? 100 : 0, agent: ui.tab === "agent" ? 100 : 0, controls: ui.tab === "controls" ? 100 : 0 };
}

/** A pane's smallest width (px) where it shows beside another; a lone pane has no floor. */
export function studioPaneMinPx(layout: StudioLayout, pane: StudioPane): number {
  if (layout === "three") return STUDIO_PANE_MIN_PX[pane];
  if (layout === "two") return pane === "agent" ? STUDIO_PANE_MIN_PX.agent : STUDIO_SIDE_MIN_PX;
  return 0;
}
