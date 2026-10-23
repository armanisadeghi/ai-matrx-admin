"use client";

import { PdfWorkspace } from "@ai-matrx/office/pdf";
import { rememberFileOrganization } from "@/features/files/api/fileOrganization";
import { PdfRecordHeader } from "./PdfRecordHeader";
import { cn } from "@/lib/utils";
import { usePdfWorkspaceHost } from "./usePdfWorkspaceHost";
import { PDF_WORKSPACE_SURFACE_NAME, WorkspaceSurface } from "./WorkspaceSurface";
import { ExtractorSurface } from "./extractor/ExtractorSurface";
import { AutoCleanOnOpen } from "./extractor/AutoCleanOnOpen";

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
  const { host, studio, extractorBridge, getPage } = usePdfWorkspaceHost(fileId);
  const body = (
    <>
      <AutoCleanOnOpen fileId={fileId} />
      {header ? (
        <PdfRecordHeader fileId={fileId} fileName={host.file.name} />
      ) : null}
      {/* On the page the body is `h-full` (never `h-dvh`): `.shell-main` takes no scroll runway when its child is `h-full`, so the
          main can never scroll under the workspace and opening a sheet or focusing a control never moves the page (the
          `h-dvh` body left a 50dvh runway: main scrolled 80px at 375 wide when the thumbnails sheet opened). */}
      <div
        className={cn(header ? "h-full w-full overflow-hidden pt-[var(--shell-header-h)]" : "h-full w-full", className)}
        data-surface={surface ? PDF_WORKSPACE_SURFACE_NAME : undefined}
        data-matrx-viewport-surface={header ? "" : undefined}
      >
        <PdfWorkspace host={host} />
      </div>
    </>
  );
  return surface ? (
    <ExtractorSurface fileId={fileId} getPage={getPage} bridge={extractorBridge}>
      <WorkspaceSurface fileId={fileId} fileName={host.file.name} studio={studio}>
        {body}
      </WorkspaceSurface>
    </ExtractorSurface>
  ) : (
    body
  );
}

/** `/pdf/[fileId]`: the workspace under the record page header, declaring the agent surface. */
export function PdfWorkspaceRoute({ fileId, organizationId }: { fileId: string; organizationId?: string | null }) {
  return <PdfWorkspaceBody fileId={fileId} organizationId={organizationId} header />;
}
