"use client";

import { PdfWorkspaceBody } from "@/features/pdf/workspace/PdfWorkspaceRoute";

export interface PdfEditTabProps {
  fileId: string;
  className?: string;
}

/**
 * The Files "Edit" tab for a PDF: the one PDF workspace (features/pdf/workspace), mounted in the tab. The
 * Analysis Studio's canvas and panels are the workspace's Annotate and Analysis tools.
 */
export function PdfEditTab({ fileId, className }: PdfEditTabProps) {
  return <PdfWorkspaceBody fileId={fileId} surface={false} className={className} />;
}

export default PdfEditTab;
