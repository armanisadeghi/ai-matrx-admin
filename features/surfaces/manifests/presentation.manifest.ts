/**
 * Surface manifest — Presentation (`matrx-user/presentation`).
 *
 * ONE presentation open in the slides editor at `/presentations/[id]` (`PresentationEditor`): the deck
 * (title, theme, slide size, every slide's layout, texts and speaker notes), where the person is in it
 * (the current slide), whether they may edit, and the save state. Emitted by the editor itself, so the
 * Board's Presentation tile registers the very same surface.
 *
 * Writes go through the editor's own paths: the name is the header field's rename; every deck change is
 * a step of the editor's deck reducer (`deck-model`), the same step a click or a keystroke makes, so it
 * is undoable and autosaves like the person's own edit.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const PRESENTATION_SURFACE_NAME = "matrx-user/presentation";

/** The deck reducer steps an agent may send in `deck_actions` (the editor's own vocabulary; images and slide-level formatting stay the person's). */
export const AGENT_DECK_ACTIONS = [
  "setTitle",
  "setPreset",
  "setTheme",
  "setSlideSize",
  "addSlide",
  "duplicateSlide",
  "deleteSlide",
  "moveSlide",
  "setLayout",
  "setField",
  "insertItem",
  "removeItem",
  "setNotes",
] as const;

const groups: SurfaceValueGroup[] = [
  { key: "presentation_identity", label: "Presentation identity", sortOrder: 100 },
  { key: "presentation_deck", label: "Presentation deck", sortOrder: 200 },
  { key: "editor_state", label: "Editor state", sortOrder: 300 },
];

const surfaceSpecific: SurfaceValue[] = [
  {
    name: "presentation_id",
    label: "Presentation ID",
    description: "UUID of the presentation open on the page.",
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 36,
    group: "presentation_identity",
    sortOrder: 100,
  },
  {
    name: "presentation_name",
    label: "Presentation name",
    description: "The name in the header field (the file's name, not the deck's title).",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 60,
    group: "presentation_identity",
    sortOrder: 110,
  },
  {
    name: "slide_count",
    label: "Slide count",
    description: "How many slides the deck has.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 3,
    group: "presentation_deck",
    sortOrder: 200,
  },
  {
    name: "deck_theme",
    label: "Deck theme",
    description: "The deck's theme: preset name, colors and font that are set.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 200,
    group: "presentation_deck",
    sortOrder: 210,
  },
  {
    name: "slide_outline",
    label: "Slide outline",
    description: "Every slide in order as { index, layout, title, skipped }, so a slide can be named by its index in deck_actions.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 1200,
    group: "presentation_deck",
    sortOrder: 220,
  },
  {
    name: "deck",
    label: "Deck",
    description: "The whole deck as stored: title, theme, slide size and every slide with all its fields and speaker notes. Large; read slide_outline first.",
    valueType: "object",
    alwaysAvailable: false,
    autoContext: false,
    typicalCharCount: 8000,
    group: "presentation_deck",
    sortOrder: 230,
  },
  {
    name: "current_slide_index",
    label: "Current slide index",
    description: "Zero-based index of the slide the person is on.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 3,
    group: "editor_state",
    sortOrder: 300,
  },
  {
    name: "current_slide",
    label: "Current slide",
    description: "The slide the person is on, with every field and its speaker notes.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 800,
    group: "editor_state",
    sortOrder: 310,
  },
  {
    name: "can_edit",
    label: "Can edit",
    description: "False while the deck is loading or when the person may only view it: no write lands then.",
    valueType: "boolean",
    alwaysAvailable: true,
    typicalCharCount: 5,
    group: "editor_state",
    sortOrder: 320,
  },
  {
    name: "save_state",
    label: "Save state",
    description: "saved, saving, unsaved or error: whether the latest edit is stored.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 8,
    group: "editor_state",
    sortOrder: 330,
  },
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "presentation_name",
    label: "Presentation name",
    description:
      "Renames the presentation (the file) and saves it at once, as the header field does. Plain string, 1-200 characters, replacing the whole name. Refused when the person may only view it.",
    valueType: "string",
    updatesValue: "presentation_name",
    mode: "entity",
    applyPolicy: "ask",
    group: "presentation_identity",
    sortOrder: 100,
  },
  {
    name: "deck_actions",
    label: "Deck changes",
    description:
      "Changes the deck with the editor's own steps, in order, each an undoable step like the person's own, autosaved. Value is an array of at most 40 steps, each { type, ... }: setTitle {title}; setPreset {preset}; setTheme {theme}; setSlideSize {size}; addSlide {after, layout?} (after -1 = first; layouts: title, section, bullets, two-column, image-split, image-full, quote, stat, closing); duplicateSlide {index}; deleteSlide {index}; moveSlide {from, to}; setLayout {index, layout}; setField {index, path, value} (path is a field of the slide such as title, subtitle, bullets.0 or quote); insertItem / removeItem {index, path}; setNotes {index, notes}. Indexes are zero-based positions in slide_outline AS THEY ARE WHEN THAT STEP RUNS, so a deleteSlide shifts the ones after it. Any invalid step rejects the whole batch and nothing changes. Refused when can_edit is false.",
    valueType: "array",
    updatesValue: "deck",
    mode: "draft",
    applyPolicy: "ask",
    group: "presentation_deck",
    sortOrder: 200,
  },
];

export const presentationManifest: SurfaceManifest = {
  surfaceName: PRESENTATION_SURFACE_NAME,
  situation:
    "They have the presentation \"{presentation_name|untitled}\" open in the slides editor: {slide_count|an unknown number of} slides, save state {save_state|unknown}, they may edit it: {can_edit}. The deck and the slide in front are in your context; they can rename it and change the deck.",
  inheritsFrom: "matrx-default/content",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description: "One presentation in the slides editor: deck, current slide and save state",
  label: "Presentation",
  urlPattern: "/presentations/[id]",
  intro: `<surface_intro>
You are in the slides editor on ONE presentation. slide_outline lists the slides by index; current_slide is the one the person is looking at; deck is the whole thing (large, read it only when you need a slide's full text).
You can rename the file (presentation_name) and change the deck with deck_actions: the same steps the person's clicks make, each undoable, autosaved. Check can_edit first: when it is false nothing you send lands. After a deck_actions batch, slide_outline and deck describe the deck from BEFORE it; re-read them rather than reporting from the old copy.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("selection", "context"), surfaceSpecific),
  briefValues: ["presentation_name", "slide_count", "current_slide_index"],
  writeTargets,
};

export function createPresentationScope(values: {
  presentation_id: string;
  can_edit: boolean;
  presentation_name?: string;
  slide_count?: number;
  deck_theme?: Record<string, unknown>;
  slide_outline?: unknown[];
  deck?: Record<string, unknown>;
  current_slide_index?: number;
  current_slide?: Record<string, unknown>;
  save_state?: string;
  selection?: string;
  context?: Record<string, unknown>;
}): SurfaceScopePayload {
  return values as unknown as SurfaceScopePayload;
}
