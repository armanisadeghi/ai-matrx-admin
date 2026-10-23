"use client";

import { PdfWorkspace } from "@ai-matrx/office/pdf";
import { rememberFileOrganization } from "@/features/files/api/fileOrganization";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
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
        <RecordPageHeader backHref="/pdf" parents={[{ label: "PDF", href: "/pdf" }]} record={{ name: host.file.name, token: "file", id: fileId }} />
      ) : null}
      <div className={cn(header ? "h-dvh w-full pt-[var(--shell-header-h)]" : "h-full w-full", className)} data-surface={surface ? PDF_WORKSPACE_SURFACE_NAME : undefined}>
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
