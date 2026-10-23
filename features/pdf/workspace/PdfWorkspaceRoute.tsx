"use client";

import { PdfWorkspace } from "@ai-matrx/office/pdf";
import { rememberFileOrganization } from "@/features/files/api/fileOrganization";
import { PdfRecordHeader } from "./PdfRecordHeader";
import { cn } from "@/lib/utils";
import { usePdfWorkspaceHost } from "./usePdfWorkspaceHost";
import { PDF_WORKSPACE_SURFACE_NAME, WorkspaceSurface } from "./WorkspaceSurface";

export { PDF_WORKSPACE_SURFACE_NAME };

/**
 * The workspace itself for one cloud file, without a page header: the page route, the Files "Edit" tab and
 * the floating window all mount THIS. `surface` declares the agent surface; a host that already sits under
 * its own surface (a file tab) turns it off.
 */
export function PdfWorkspaceBody({
  fileId,
  organizationId,
  surface = true,
  header = false,
  className,
}: {
  fileId: string;
  organizationId?: string | null;
  surface?: boolean;
  header?: boolean;
  className?: string;
}) {
  // Every per-file request carries the file's own organization (the Analysis panels read it).
  rememberFileOrganization(fileId, organizationId);
  const { host, studio } = usePdfWorkspaceHost(fileId);
  const body = (
    <>
      {header ? (
        <PdfRecordHeader fileId={fileId} fileName={host.file.name} />
      ) : null}
      <div className={cn(header ? "h-dvh w-full pt-[var(--shell-header-h)]" : "h-full w-full", className)} data-surface={surface ? PDF_WORKSPACE_SURFACE_NAME : undefined}>
        <PdfWorkspace host={host} />
      </div>
    </>
  );
  return surface ? (
    <WorkspaceSurface fileId={fileId} fileName={host.file.name} studio={studio}>
      {body}
    </WorkspaceSurface>
  ) : (
    body
  );
}

/** `/pdf/[fileId]`: the workspace under the record page header, declaring the agent surface. */
export function PdfWorkspaceRoute({ fileId, organizationId }: { fileId: string; organizationId?: string | null }) {
  return <PdfWorkspaceBody fileId={fileId} organizationId={organizationId} header />;
}
