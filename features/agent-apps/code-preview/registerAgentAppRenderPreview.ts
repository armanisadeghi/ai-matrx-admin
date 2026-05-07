"use client";

import { registerRenderPreviewer } from "@/features/code/preview/renderPreviewRegistry";
import { AgentAppRenderPreview } from "./AgentAppRenderPreview";

/**
 * Side-effect module: registers `AgentAppRenderPreview` against the
 * `aga-app:` library-source prefix. Importing this module once on the
 * surface that hosts the workspace (e.g. the agent-apps editing page)
 * is enough — re-registration is a no-op.
 */
registerRenderPreviewer("aga-app:", AgentAppRenderPreview);
