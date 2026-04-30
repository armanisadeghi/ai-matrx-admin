/**
 * Local constants for the Image Studio describe flow.
 *
 * The describe shortcut id and its `jsonExtraction` config live in the
 * central registry — read them via:
 *
 *   import { getSystemShortcut } from "@/features/agents/constants/system-shortcuts";
 *   const DESCRIBE = getSystemShortcut("image-studio-describe-01");
 *
 * Shape of the agent's response (always wrapped in a single ```json``` block):
 * ```
 * {
 *   "image_metadata": {
 *     "filename_base": "...",
 *     "alt_text": "...",
 *     "caption": "...",
 *     "title": "...",
 *     "description": "...",
 *     "keywords": [...],
 *     "dominant_colors": [...]
 *   }
 * }
 * ```
 */

/**
 * Hidden cloud-files folder for the describe-agent preview uploads. The
 * `.matrx-tmp/` prefix is treated as hidden by `isHiddenFolder` so these
 * never show in the user-facing tree.
 */
export const DESCRIBE_TEMP_FOLDER_PATH = ".matrx-tmp/image-studio-describe";

/**
 * Max edge length for the WebP preview that's shipped to the agent. The
 * agent only needs enough resolution to read the image — keeping the upload
 * small means describe runs in <1s of network transfer even on slow links.
 */
export const DESCRIBE_PREVIEW_MAX_EDGE_PX = 1024;

/** WebP quality for the describe preview. */
export const DESCRIBE_PREVIEW_QUALITY = 0.85;
