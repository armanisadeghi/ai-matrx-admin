/**
 * Surface manifest — Image Manager (`matrx-user/image-manager`).
 *
 * The image hub itself and its tab routes under `/images/**` that are NOT one
 * of the already-declared specialist surfaces: the landing hero (`/images`),
 * the manager shell, and the tabs rendered from `features/image-manager/**`
 * (tools, branded upload, profile photo, public image search, studio library,
 * presets, all-files).
 *
 * Declared 2026-08-17: only `/images/my-cloud` (the library tab, surface
 * `matrx-user/images`) and the four specialist routes (studio, generate, edit,
 * annotate) resolved to a surface at all — every other `/images/**` route
 * resolved to nothing, so a dozen live routes could not bind an agent.
 *
 * Deliberately NARROW: this is the hub vocabulary (which tab, what is selected)
 * and nothing more. The library tab keeps its own richer surface
 * (`matrx-user/images`) with its own emitter — do not fold the two together.
 *
 * FILE DOCTRINE (features/files/handler/FEATURE.md): images are identified by
 * DURABLE refs only — `file_id`, never a signed URL or an S3 `storage_uri`.
 *
 * Curated groups (band 0-899):
 *   hub_location  Which part of the image hub the user is on
 *   selection     Which images they have picked
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

const groups: SurfaceValueGroup[] = [
  {
    key: "hub_location",
    label: "Hub location",
    sortOrder: 100,
    description: "Which tab of the image hub the user is currently on.",
  },
  {
    key: "selection",
    label: "Image selection",
    sortOrder: 200,
    description: "The images the user has picked on the current tab.",
  },
];

export interface ImageHubLink { href: string; label: string; description: string }
export interface ImageHubSection { title: string; landing: string; links: ImageHubLink[] }

const surfaceSpecific: SurfaceValue[] = [
  { name: "image_hub_overview", label: "Image hub overview", description: "Compact XML of the tools displayed on a landing (the Images landing's Manager and Studio homes, or the Manager landing's tools) with routes and descriptions. Absent on non-landing hub tabs.", valueType: "string", alwaysAvailable: false, typicalCharCount: 4000, inlineUpTo: 4500, group: "hub_location", sortOrder: 140 },
  { name: "image_hub_sections", label: "Hub sections", description: "Navigation groups rendered on a landing (Images or Manager), each with its title, home route, and complete link catalog. Absent on other hub tabs.", valueType: "array", alwaysAvailable: false, typicalCharCount: 3000, group: "hub_location", sortOrder: 110 },
  { name: "image_hub_links", label: "Hub links", description: "Every tool link shown on the landing (Images or Manager), with its label, description and route. Absent on other tabs.", valueType: "array", alwaysAvailable: false, typicalCharCount: 2600, group: "hub_location", sortOrder: 120 },
  { name: "image_hub_link_count", label: "Hub link count", description: "Number of tool links rendered on the landing (Images or Manager). Absent on other tabs.", valueType: "number", alwaysAvailable: false, typicalCharCount: 3, group: "hub_location", sortOrder: 130 },
  {
    name: "image_hub_tab",
    label: "Hub tab",
    description:
      'Which image hub tab is open — e.g. "home", "manager", "tools", "branded", "profile-photo", "public-search", "studio-library", "presets", "all-files". Always populated.',
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 16,
    sortOrder: 100,
    group: "hub_location",
  },
  {
    name: "selected_image_ids",
    label: "Selected image IDs",
    description:
      "Durable `file_id`s of the images the user has selected on the current tab. Absent on navigation-only landings; empty array when a selectable tab has loaded with nothing selected. Never a URL: bytes are re-minted from the id.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 200,
    sortOrder: 200,
    group: "selection",
  },
  {
    name: "focused_image_id",
    label: "Focused image ID",
    description:
      "Durable `file_id` of the single image the user has opened or focused on this tab. Empty when nothing is focused.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 36,
    sortOrder: 210,
    group: "selection",
  },
];

export const imageManagerManifest: SurfaceManifest = {
  surfaceName: "matrx-user/image-manager",
  situation:
    "They are in the image hub on the \"{image_hub_tab}\" tab, which leads to the image tools, branded images, profile photo, public search and the studio library. They can open any of those workspaces.",
  inheritsFrom: "matrx-default/media",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description:
    "The image hub and its tabs (tools, branded, profile photo, public search, studio library).",
  label: "Image Manager",
  urlPattern: "/images/manager",
  intro: `<surface_intro>
You are in the Image Manager: the hub the user moves through to find, upload, brand, and organize images. image_hub_tab tells you which tab they are on; the selection group tells you which images they have picked.
Images are always identified here by a durable file_id, never by a URL — a URL you were given may already have expired, so resolve bytes from the id.
The dedicated image workspaces (library, studio, generate, edit, annotate) are separate surfaces with their own richer vocabulary; do not assume their values are available here. The /images navigation landing is the images-home child. This family identity does not claim runtime completeness for every tab.
On the Manager landing (image_hub_tab "manager") image_hub_links lists the displayed tools; use open_image_workspace with one of their routes to open it. Nothing on the landing creates, edits or deletes images.
</surface_intro>`,
  groups: [...groups, { key: "navigation", label: "Navigation", sortOrder: 300 }],

  values: mergeBaselineValues(pickBaseline("selection", "context"), surfaceSpecific),
  writeTargets: [
    {
      name: "open_image_workspace",
      label: "Open image workspace",
      description:
        "Navigates to a tool displayed on the Manager landing. Value is a route string from image_hub_links, e.g. /images/upload. Refuses unknown or external destinations. No image records change.",
      valueType: "string",
      mode: "ui",
      applyPolicy: "auto",
      group: "navigation",
      sortOrder: 100,
    },
  ],
};

/** Type-safe payload helper — required keys mirror `alwaysAvailable: true`. */
export function createImageManagerScope(values: {
  image_hub_tab: string;
  selected_image_ids?: string[];
  image_hub_sections?: ImageHubSection[];
  image_hub_overview?: string;
  image_hub_links?: ImageHubLink[];
  image_hub_link_count?: number;
  content?: string;
  selection?: string;
  context?: Record<string, unknown>;
  focused_image_id?: string;
}): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
