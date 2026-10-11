/**
 * The Studio's three panes never get narrower than this (px), so the controls' tabs, a test case's
 * header and the assistant's composer always have room. At the narrowest desktop width the Studio
 * serves (1280, less the 44px nav rail) the three minimums must still fit; `studio-layout.test.ts`.
 */
export const STUDIO_PANE_MIN_PX = { assistant: 240, agent: 340, controls: 360 } as const;

/** The narrowest window the three-pane layout serves; below it the Studio uses its tabbed layout. */
export const STUDIO_MIN_THREE_PANE_PX = 1024;
