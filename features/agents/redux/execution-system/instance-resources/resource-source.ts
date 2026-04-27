/**
 * features/agents/redux/execution-system/instance-resources/resource-source.ts
 *
 * Shared adapter that converts a resource-picker–emitted `resource.data`
 * into the value we hand to the `addResource` reducer.
 *
 * Two responsibilities:
 *   1. `refineBlockType` — given a base blockType from the picker (often
 *      `"document"` because the picker only knows it's a "file") plus the
 *      raw resource data, narrow it to the right media block when the
 *      data carries a real image/video/audio MIME. Without this, an
 *      uploaded JPEG goes to the backend as `{ type: "document", ... }`
 *      and the AI model never sees it as an image.
 *
 *   2. `resourceDataToSource` — for media block types, synthesize a
 *      `MediaRef` (`file_id` preferred, then `file_uri`, then `url`) so
 *      the payload selector emits the right field on the outbound API
 *      content block. Sending `file_id` lets the backend skip the
 *      share-link redirect.
 *
 * Non-media block types (text, notes, tasks, table, list, etc.) pass
 * through unchanged.
 *
 * Used by:
 *   - features/agents/components/inputs/resources/SmartAgentResourcePickerButton.tsx
 *   - features/cx-chat/components/user-input/ConversationInput.tsx
 *   - any other resource-picker → addResource bridge
 */

import type { MediaRef } from "@/features/files/types";
import type { ResourceBlockType } from "@/features/agents/types/instance.types";

const MEDIA_BLOCK_TYPES = new Set<ResourceBlockType>([
  "image",
  "audio",
  "video",
  "document",
]);

/**
 * Pull a "best guess" raw MIME from the heterogeneous `resource.data`
 * shapes the pickers deliver. Order of preference:
 *   1. `mime_type` / `mimeType`           — explicit MIME (canonical)
 *   2. `metadata.mimetype`                — Storage Metadata shape
 *   3. `details.mimetype`                 — EnhancedFileDetails shape
 *   4. `type` IF it looks like a real MIME (contains a slash, e.g.
 *      "image/jpeg" — `FilesResourcePicker.FileSelection.type` carries
 *      this). Do NOT accept the bare classification token like "image"
 *      or "audio" as a MIME — those came from `classifyFileType()` in
 *      `useFileUploadWithStorage` and must NOT flow to the backend as
 *      `mime_type`. The backend expects RFC-compliant `type/subtype`.
 */
function readMime(d: Record<string, unknown>): string | undefined {
  if (typeof d.mime_type === "string" && d.mime_type) return d.mime_type;
  if (typeof d.mimeType === "string" && d.mimeType) return d.mimeType;
  const meta = d.metadata as Record<string, unknown> | undefined;
  if (meta && typeof meta.mimetype === "string" && meta.mimetype) {
    return meta.mimetype;
  }
  const details = d.details as Record<string, unknown> | undefined;
  if (details && typeof details.mimetype === "string" && details.mimetype) {
    return details.mimetype;
  }
  // Only accept `type` if it looks like a real MIME (`image/jpeg`).
  // Reject the bare classification tokens ("image" / "video" / "audio" /
  // "document" / "text" / "pdf" / "other" / "unknown" / "file") that
  // `classifyFileType()` produces — those are FE display classes, not
  // RFC MIME types.
  if (typeof d.type === "string" && d.type.includes("/")) return d.type;
  return undefined;
}

/**
 * Narrow a picker-supplied blockType to the right media kind when the
 * underlying data carries an image / video / audio MIME. Pickers that
 * just know "the user picked a file" deliver `Resource.type = "file"`
 * which the agent system maps to blockType `"document"` — but for a
 * JPEG that means the AI never sees it as an image. This function
 * upgrades `"document"` → `"image"` / `"audio"` / `"video"` based on
 * what the data actually is.
 *
 * Non-document block types (text, notes, tasks, etc.) and explicit
 * media types pass through unchanged.
 */
export function refineBlockType(
  blockType: ResourceBlockType,
  data: unknown,
): ResourceBlockType {
  if (blockType !== "document") return blockType;
  if (!data || typeof data !== "object") return blockType;
  const mime = readMime(data as Record<string, unknown>);
  if (!mime) return blockType;
  const lower = mime.toLowerCase();
  if (lower.startsWith("image/")) return "image";
  if (lower.startsWith("video/")) return "video";
  if (lower.startsWith("audio/")) return "audio";
  return blockType;
}

export function resourceDataToSource(
  blockType: ResourceBlockType,
  data: unknown,
): unknown {
  if (!MEDIA_BLOCK_TYPES.has(blockType)) return data;
  if (!data || typeof data !== "object") return data;

  const d = data as Record<string, unknown>;
  // Pickers may deliver the cld_files UUID under either `fileId` (the
  // newer canonical field, surfaced by `useFileUploadWithStorage` and
  // `FilesResourcePicker`) or `id` (FileResourceData / older shapes).
  // Either way we want it as `file_id` in the MediaRef.
  const fileId =
    typeof d.fileId === "string"
      ? d.fileId
      : typeof d.id === "string"
        ? d.id
        : null;
  const mime = readMime(d);
  if (fileId) {
    const ref: MediaRef = { file_id: fileId };
    if (mime) ref.mime_type = mime;
    return ref;
  }
  if (typeof d.file_uri === "string") {
    const ref: MediaRef = { file_uri: d.file_uri };
    if (mime) ref.mime_type = mime;
    return ref;
  }
  if (typeof d.url === "string") {
    const ref: MediaRef = { url: d.url };
    if (mime) ref.mime_type = mime;
    return ref;
  }
  return data;
}
