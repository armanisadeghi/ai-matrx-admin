/**
 * Surface manifest - the Video clone tile of a Board: `matrx-user/video-clone`.
 *
 * The tile is the Socials studio for ONE clone project. Its agent actions are the platform tool `video_clone`
 * (analyze, create, read, plan, edit, variants, generate, render, links), the same ones the studio's buttons run
 * through the same services; this surface tells the agent WHICH project is on screen and what it holds.
 */

import type { SurfaceManifest, SurfaceScopePayload, SurfaceValue } from "@ai-matrx/chat/surfaces/types";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";

export const VIDEO_CLONE_SURFACE_NAME = "matrx-user/video-clone";

function value(name: string, label: string, description: string, valueType: SurfaceValue["valueType"], typicalCharCount: number, sortOrder: number, alwaysAvailable = false): SurfaceValue {
  return { name, label, description, valueType, alwaysAvailable, typicalCharCount, group: "clone", sortOrder };
}

export const videoCloneManifest: SurfaceManifest = {
  surfaceName: VIDEO_CLONE_SURFACE_NAME,
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Video clone",
  description: "One video clone project: the reference post, the plan, its versions and its rendered videos.",
  briefValues: ["project_loaded", "name", "head_version"],
  readiness: "partial",
  readinessNote: "Board tile surface: values emitted by the tile; actions are the video_clone tool.",
  intro: `<surface_intro>
You are on ONE video clone project. Check project_loaded first. project_id and head_version are the arguments for the video_clone tool: read (part=script|plan|estimate), edit (base_version = head_version), generate, render, links. Generating and rendering price first; above the confirmation setting the tool returns needs_confirmation and you ask the person.
</surface_intro>`,
  groups: [{ key: "clone", label: "Video clone", sortOrder: 100 }],
  values: mergeBaselineValues(pickBaseline("selection", "context"), [
    value("project_loaded", "Project loaded", "True once a clone project exists on this tile; false while the person is still choosing a post.", "boolean", 5, 100, true),
    value("project_id", "Project ID", "UUID of the video project (social.video_project); pass it to video_clone.", "string", 36, 110),
    value("name", "Name", "The project's name.", "string", 40, 120),
    value("head_version", "Head version", "The newest composition version; edit needs it as base_version.", "number", 3, 130),
    value("reference_post_id", "Reference post", "UUID of the post being cloned (structure only).", "string", 36, 140),
    value("load_error", "Load error", "Why the project could not be read.", "string", 120, 190),
  ]),
};

export interface VideoCloneScopeValues {
  project_loaded: boolean;
  project_id?: string;
  name?: string;
  head_version?: number;
  reference_post_id?: string;
  load_error?: string;
}
export const createVideoCloneScope = (v: VideoCloneScopeValues): SurfaceScopePayload => v as unknown as SurfaceScopePayload;
