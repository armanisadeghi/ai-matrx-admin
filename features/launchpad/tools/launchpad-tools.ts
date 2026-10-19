/**
 * The launchpad's AGENT TOOLS — what an agent working beside /launchpad/<key> can do to that launchpad.
 * Declared once here and carried by the `matrx-user/launchpad` surface manifest; executed in the browser
 * by `useLaunchpadAgentTools` through the SAME pure verbs the person's Edit mode uses (../doc.ts).
 * The names are the Start page's (start_*): the `start_page.maintainer` agent was built on them, and the
 * Start page is now the person's `start` launchpad, so they were repointed, not renamed.
 * All changes one agent turn makes are coalesced into ONE saved version, marked as the agent's (acting
 * for the person), with a note — undoable from History like any other version.
 */
import type { SurfaceClientTool } from "@ai-matrx/chat/surfaces/types";

const sizeProp = { type: "string" as const, enum: ["s", "m", "l"], description: "s = a quarter of the width, m = half, l = the full row. Each widget allows only the sizes start_list_widgets lists." };
const wProp = { type: "number" as const, description: "Width in grid columns (1-12; overrides size). start_list_widgets lists each widget's minimum and maximum." };
const hProp = { type: "number" as const, description: "Height in grid rows of 24px (e.g. 5 = a counts strip, 11 = an ordinary list)." };
const idProp = { type: "string" as const, description: "The widget's id, from start_read_page." };
const configProp = {
  type: "object" as const,
  additionalProperties: { type: "string" as const },
  description: "Config values by field key (start_list_widgets lists each widget's fields and allowed values). An empty string clears a key.",
};

export const LAUNCHPAD_CLIENT_TOOLS: SurfaceClientTool[] = [
  {
    name: "start_read_page",
    label: "Read launchpad",
    description:
      "Returns the launchpad as it is now: {widgets: [{id, type, size, x, y, w, h, config, describe, position}], pending_changes} — `describe` is the one-line name of each widget, `position` is 0-based reading order, `pending_changes` counts changes this turn has made that are not saved yet (they save together as one version when you stop).",
    inputSchema: { type: "object", properties: {}, required: [] },
    mode: "ui",
  },
  {
    name: "start_list_widgets",
    label: "List widgets",
    description:
      "The widget catalog: [{type, label, section, sizes, grid: {defaultW, defaultH, minW, minH, maxW?, maxH?}, default_config, fields: [{key, label, options?: [{value, label}], picker?}], describe}] — every widget that can go on a launchpad, with the sizes it allows and its config fields.",
    inputSchema: { type: "object", properties: {}, required: [] },
    mode: "ui",
  },
  {
    name: "start_add_widget",
    label: "Add widget",
    description: "Adds a widget. Returns {ok, id, position}. Omit `position` to add at the end.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "A widget type from start_list_widgets." },
        size: sizeProp,
        w: wProp,
        h: hProp,
        config: configProp,
        position: { type: "number", description: "0-based place in reading order (optional)." },
      },
      required: ["type"],
    },
    mode: "draft",
  },
  {
    name: "start_remove_widget",
    label: "Remove widget",
    description: "Removes one widget. The person can bring it back from History.",
    inputSchema: { type: "object", properties: { id: idProp }, required: ["id"] },
    mode: "draft",
  },
  {
    name: "start_move_widget",
    label: "Move widget",
    description: "Moves one widget to a 0-based position in reading order (clamped to the ends).",
    inputSchema: { type: "object", properties: { id: idProp, position: { type: "number", description: "0-based target position." } }, required: ["id", "position"] },
    mode: "draft",
  },
  {
    name: "start_resize_widget",
    label: "Resize widget",
    description: "Changes one widget's size: `size` (s, m, l) or `w` / `h` in grid units; widgets below move down.",
    inputSchema: { type: "object", properties: { id: idProp, size: sizeProp, w: wProp, h: hProp }, required: ["id"] },
    mode: "draft",
  },
  {
    name: "start_configure_widget",
    label: "Set up widget",
    description: "Sets config values on one widget (e.g. {kind: \"note\"} on a recent widget, {metric: \"tasks\"} on a count).",
    inputSchema: { type: "object", properties: { id: idProp, config: configProp }, required: ["id", "config"] },
    mode: "draft",
  },
];

export const LAUNCHPAD_TOOL_NAMES = LAUNCHPAD_CLIENT_TOOLS.map((t) => t.name);
