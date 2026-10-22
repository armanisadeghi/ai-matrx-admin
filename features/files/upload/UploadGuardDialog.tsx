"use client";

// The `uploadGuardDialog` overlay's render: the duplicate-upload choices for the request requestUploadGuard filed.
import type { OverlayRenderProps } from "@ai-matrx/summon/react";
import { useOverlayRequest } from "@ai-matrx/summon/react";
import {
  DuplicateUploadDialog,
  type ResolvedDecision,
} from "@/features/files/components/core/DuplicateUploadDialog/DuplicateUploadDialog";
import type { UploadGuardDialogRequest } from "./requestUploadGuard";

export default function UploadGuardDialog({ data, close }: OverlayRenderProps) {
  const { request, settle } = useOverlayRequest<UploadGuardDialogRequest, ResolvedDecision[] | null>(data, close);
  return (
    <DuplicateUploadDialog
      open={request !== null}
      conflicts={request?.conflicts.map((c) => ({ id: c.id, file: c.file, match: c.match })) ?? []}
      onResolve={(decisions) => settle(decisions)}
      onCancel={() => settle(null)}
    />
  );
}
