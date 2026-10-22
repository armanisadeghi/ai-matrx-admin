/** Navigation-only Images landing. Parent identity/bindings stay valid for hub tabs. */
import type { SurfaceManifest } from "@ai-matrx/chat/surfaces/types";
import { createImageManagerScope } from "./image-manager.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const imagesHomeManifest: SurfaceManifest = {
  surfaceName: "matrx-user/images-home",
  situation:
    "They are on the Images landing page, the starting point that lists every image tool and workspace.",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Images",
  description: "Navigation landing for the image tools and workspaces.",
  urlPattern: "/images",
  inheritsFrom: "matrx-user/image-manager",
  intro: `<surface_intro>
The Images landing lists the Manager and Studio tool catalogs. image_hub_sections, image_hub_links and image_hub_overview come from the displayed cards, including section home routes. There are no selected files or editable image records on this page.
Use open_image_workspace with one displayed route to navigate to its real workspace. It cannot create, edit or delete images. The specialist destination then supplies its own surface contract. Existing image-manager family bindings remain inherited here.
</surface_intro>`,
  groups: [{ key: "navigation", label: "Navigation", sortOrder: 100 }],
  values: [],
  writeTargets: [{
    name: "open_image_workspace",
    label: "Open image workspace",
    description: "Navigates to a tool or section home displayed on the Images landing. Value is a route string from image_hub_links or image_hub_sections, e.g. /images/upload. Refuses unknown/external destinations. No image records change.",
    valueType: "string",
    mode: "ui",
    applyPolicy: "auto",
    group: "navigation",
    sortOrder: 100,
  }],
};

/** Inherited always-available hub identity remains required. */
export function createImagesHomeScope(values: Parameters<typeof createImageManagerScope>[0]) {
  return createImageManagerScope(values);
}
