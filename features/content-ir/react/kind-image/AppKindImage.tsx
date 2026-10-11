"use client";

/**
 * The app's `KindImage`: a shape's saved image rendered by THE canonical image
 * block (`UnifiedImageBlockRenderer`) — expand/lightbox, share, copy, download,
 * download-as, print, context menu — never a second image renderer. Registered
 * as the kind kit's `Image` host slot (lib/code-runtime/kind-kit-host.ts).
 *
 * The canonical block resolves the bytes itself from `fileId` (the bearer blob
 * lane), so the host-supplied `src` is not used here; the ref's organization is
 * remembered for that read. A ref without a file id (or with a load error) falls
 * back to the kit's own frame-safe image, which says what happened.
 */
import { DefaultKindImage, type KindImageProps } from "@ai-matrx/content-ir-react/kind-kit";
import UnifiedImageBlockRenderer from "@/features/files/blocks/image/UnifiedImageBlockRenderer";
import type { MatrxImageBlock } from "@/features/files/blocks/image/types";
import { rememberFileOrganization } from "@/features/files/api/fileOrganization";

export function AppKindImage(props: KindImageProps) {
  const image = props.image;
  const fileId = typeof image?.file_id === "string" && image.file_id ? image.file_id : null;
  if (!fileId || image?.src_error) return <DefaultKindImage {...props} />;
  if (image?.organization_id) rememberFileOrganization(fileId, image.organization_id);
  const block: MatrxImageBlock = {
    kind: "image",
    origin: "matrx",
    fileId,
    visibility: "personal",
    cdnUrl: null,
    downloadUrl: null,
    parentFileId: null,
    derivationKind: null,
    status: "complete",
    progress: null,
    errorMessage: null,
    mimeType: image?.mime_type ?? null,
    fileName: props.alt?.trim() || null,
    sizeBytes: null,
    base64: null,
    metadata: null,
    width: image?.width ?? null,
    height: image?.height ?? null,
  } as MatrxImageBlock;
  return <UnifiedImageBlockRenderer block={block} />;
}

export default AppKindImage;
