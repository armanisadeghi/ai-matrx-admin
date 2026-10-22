"use client";

import { PdfWorkspace } from "@ai-matrx/office/pdf";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { usePdfWorkspaceHost } from "./usePdfWorkspaceHost";

/** The agent-visible surface of the PDF workspace page. */
export const PDF_WORKSPACE_SURFACE_NAME = "matrx-user/pdf-workspace";

/**
 * The PDF workspace for one cloud file: the Acrobat-style chrome from `@ai-matrx/office/pdf` on this
 * app's host. The shell header is a solid band; the workspace fills the area below it. Its own bars and
 * panels have fixed sizes, so nothing here shifts the page.
 */
export function PdfWorkspaceRoute({ fileId }: { fileId: string }) {
  const { host } = usePdfWorkspaceHost(fileId);
  return (
    <SurfaceRuntimeProvider
      surfaceName={PDF_WORKSPACE_SURFACE_NAME}
      getScope={() => ({ file_id: fileId, file_name: host.file.name })}
      isEditable
    >
      <RecordPageHeader
        backHref="/pdf"
        parents={[{ label: "PDF", href: "/pdf" }]}
        record={{ name: host.file.name, token: "file", id: fileId }}
      />
      <div className="h-dvh w-full pt-[var(--shell-header-h)]" data-surface={PDF_WORKSPACE_SURFACE_NAME}>
        <PdfWorkspace host={host} />
      </div>
    </SurfaceRuntimeProvider>
  );
}
