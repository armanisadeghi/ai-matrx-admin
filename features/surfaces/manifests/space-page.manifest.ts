/**
 * Surface manifest — one open Space page (`matrx-user/space-page`), route `/spaces/[spaceId]`.
 *
 * The Notion-style page: its title, its body (read as Markdown), where it sits (path) and the pages
 * under it. Emitter: `SpacePage` (`features/spaces/page/SpacePage.tsx`), scope built by the pure
 * `buildSpacePageScope` in `features/spaces/page/page-surface.ts`.
 *
 * Write targets (both patchable text, both land in the live editor and save the way typing does):
 *   - `page_body` — the body as Markdown. Only the run of top-level blocks whose Markdown changed is
 *     re-made (`planBodyEdit`); every untouched block (a database, an embed) stays as it was.
 *   - `page_title` — the title.
 * NOT writable: cover, icon, properties, comments, sharing, moving or trashing the page.
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

export const SPACE_PAGE_SURFACE_NAME = "matrx-user/space-page";

const groups: SurfaceValueGroup[] = [
  { key: "space_page", label: "Page", sortOrder: 100, description: "The open page: title and body." },
  { key: "space_place", label: "Where it sits", sortOrder: 200, description: "Its path and the pages under it." },
];

const surfaceSpecific: SurfaceValue[] = [
  {
    name: "space_id",
    label: "Page ID",
    description: "UUID of the open Space page (from the address).",
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 36,
    autoContext: true,
    group: "space_page",
    sortOrder: 100,
  },
  {
    name: "page_load_status",
    label: "Load status",
    description: '"loading", "loaded" or "not_found" (no such page, or no access).',
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 9,
    autoContext: true,
    group: "space_page",
    sortOrder: 110,
  },
  {
    name: "page_title",
    label: "Title",
    description: "The page title as shown.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 40,
    autoContext: true,
    group: "space_page",
    sortOrder: 120,
  },
  {
    name: "page_body",
    label: "Page content",
    description:
      "The page body as Markdown (no title line), as the editor holds it now including unsaved typing. Sub-pages appear as links; a database shows as its title.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 4000,
    inlineUpTo: 10000,
    autoContext: true,
    group: "space_page",
    sortOrder: 130,
  },
  {
    name: "page_block_count",
    label: "Blocks",
    description: "How many top-level blocks the body has.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 3,
    autoContext: false,
    group: "space_page",
    sortOrder: 140,
  },
  {
    name: "page_can_edit",
    label: "Can edit",
    description: "True when the person can edit this page right now (has edit access, not locked, not in Trash).",
    valueType: "boolean",
    alwaysAvailable: false,
    typicalCharCount: 5,
    autoContext: true,
    group: "space_page",
    sortOrder: 150,
  },
  {
    name: "page_edit_blocked_reason",
    label: "Why it cannot be edited",
    description: "When page_can_edit is false: read-only access, in Trash, or locked. Null otherwise.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 40,
    autoContext: false,
    group: "space_page",
    sortOrder: 160,
  },
  {
    name: "page_save_state",
    label: "Save state",
    description: '"saved", "saving", "failed" (will retry) or "refused" (the page as it is cannot be stored).',
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 7,
    autoContext: false,
    group: "space_page",
    sortOrder: 170,
  },
  {
    name: "page_path",
    label: "Path",
    description: "The pages above this one, outermost first: [{ id, title }].",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 150,
    autoContext: true,
    group: "space_place",
    sortOrder: 200,
  },
  {
    name: "sub_pages",
    label: "Sub-pages",
    description: "The pages directly under this one that are loaded in the sidebar: [{ id, title }].",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 300,
    autoContext: false,
    group: "space_place",
    sortOrder: 210,
  },
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "page_body",
    label: "Edit the page content",
    description:
      "Change the page body. It lands in the editor and SAVES the way typing does once the person approves (they can undo). Value is Markdown for the body without the title line; send an anchored edit for anything smaller than a rewrite. Blocks whose Markdown you leave unchanged stay exactly as they are (databases, embeds, files). Refused (nothing changes): the page is read-only, locked or in Trash, or still loading.",
    valueType: "string",
    mode: "entity",
    applyPolicy: "ask",
    updatesValue: "page_body",
    patchable: true,
    group: "space_page",
    sortOrder: 300,
  },
  {
    name: "page_title",
    label: "Rename the page",
    description:
      "Change the page title. SAVED like typing once the person approves. Value is the new title, one line. Refused: the page is read-only, locked or in Trash.",
    valueType: "string",
    mode: "entity",
    applyPolicy: "ask",
    updatesValue: "page_title",
    patchable: true,
    group: "space_page",
    sortOrder: 310,
  },
];

const declared: Omit<SurfaceManifest, "readiness"> = {
  surfaceName: SPACE_PAGE_SURFACE_NAME,
  situation:
    "They have the Space page {page_title|this page} open (page: {page_load_status}); editable by them: {page_can_edit|unknown}. You can edit its content or rename it.",
  inheritsFrom: "matrx-default/content",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Space page",
  description: "One Notion-style Space page: its title, body, path and sub-pages.",
  urlPattern: "/spaces/[spaceId]",
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
  writeTargets,
};

/** No typed `readiness` (D2: earned, never typed). The installed `@ai-matrx/chat` type still
 * requires the key until the D2 package change ships, hence the one cast. */
export const spacePageManifest = declared as SurfaceManifest;

export function createSpacePageScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
