/**
 * Surface manifest — Launchpad (`matrx-user/launchpad`, route /launchpad/<key>).
 *
 * One of the person's launchpads: a grid of widgets (counts, tasks, today's meetings, recents, favorites,
 * pinned agents, data pages, Applets, links to other launchpads, any app page). Its job for agents is the
 * EDIT vocabulary — the start_* tools (`features/launchpad/tools/launchpad-tools.ts`, named for the Start
 * page they began on; the Start page is the person's `start` launchpad now) — so the maintainer (mandate
 * key `start_page.maintainer`, declared in aidream `aidream/services/start_page/mandates.py`, held by the
 * Agent Factory's "Start Page Maintainer") keeps the launchpad the way the person asks. Every agent turn
 * saves as ONE version the person can undo from History.
 *
 * Runtime emitter: `features/launchpad/components/LaunchpadPage.tsx`.
 */

import type { SurfaceManifest, SurfaceValue, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";
import { MANDATE_KEYS } from "@ai-matrx/agents/mandates";
import { LAUNCHPAD_CLIENT_TOOLS } from "@/features/launchpad/tools/launchpad-tools";

export const LAUNCHPAD_SURFACE_NAME = "matrx-user/launchpad";

const groups: SurfaceValueGroup[] = [
  { key: "start_page", label: "Launchpad", sortOrder: 100, description: "The launchpad the person is on: its widgets and placement." },
];

const values: SurfaceValue[] = [
  {
    name: "start_widgets",
    label: "Widgets on the page",
    description:
      "Every widget on the launchpad, in reading order: [{id, type, size, x, y, w, h, config, describe, position}]. `describe` is the widget's one-line name. Change the launchpad with the start_* tools.",
    valueType: "array",
    alwaysAvailable: true,
    typicalCharCount: 1500,
    group: "start_page",
    sortOrder: 100,
  },
  {
    name: "start_editing",
    label: "Person is editing",
    description: "True while the person has the page in Edit mode; the start_* tools wait until they press Done.",
    valueType: "boolean",
    alwaysAvailable: true,
    typicalCharCount: 5,
    group: "start_page",
    sortOrder: 110,
  },
];

export const launchpadManifest: SurfaceManifest = {
  surfaceName: LAUNCHPAD_SURFACE_NAME,
  situation:
    "They are on one of their launchpads: a grid of widgets from across the app, their data pages and Applets. You can read it and add, remove, move, resize or set up widgets; while they are editing it by hand, your changes wait until they press Done.",
  inheritsFrom: "matrx-default/workspace",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  label: "Launchpad",
  description: "One of the person's launchpads: a grid of widgets from across the app, their data pages and Applets.",
  executionMode: "python-stream",
  urlPattern: "/launchpad/:key",
  intro: `<surface_intro>
The person is on one of their launchpads: a grid of widgets on 12 columns (s = a quarter of the width, m = half, l = the whole row; w / h give exact grid units).
You can CHANGE THE LAUNCHPAD with the start_* tools, using the same rules as the person's own Edit mode:
- start_read_page first — every widget's id, type, size, placement, config and one-line name.
- start_list_widgets — every widget type, the sizes it allows and its config fields.
- start_add_widget, start_remove_widget, start_move_widget, start_resize_widget, start_configure_widget.
Everything you change in this turn is saved together as ONE version the person can undo from History. Say in one sentence what you changed.
</surface_intro>`,
  groups,
  values: mergeBaselineValues([], values),
  agentRoles: [
    {
      name: "start_page_maintainer",
      label: "Launchpad maintainer",
      description: "Keeps the person's launchpad the way they ask in chat: adds, removes, moves, resizes and sets up widgets; one undoable version per turn.",
      kind: "single",
      defaultAgentId: null,
      mandateKey: MANDATE_KEYS.start_page__maintainer,
      sortOrder: 100,
    },
  ],
  clientTools: LAUNCHPAD_CLIENT_TOOLS,
};
