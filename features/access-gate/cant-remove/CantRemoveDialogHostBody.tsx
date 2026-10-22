"use client";

/**
 * Drains `cantRemoveOpener` one request at a time into `GovernedActionDialog`.
 * After a hide the hidden-ids store refreshes, so the record leaves every list of its kind.
 */

import type { OverlayRenderProps } from "@ai-matrx/summon/react";
import { useOverlayRequest } from "@ai-matrx/summon/react";
import { GovernedActionDialog } from "@/features/access-gate/components/GovernedActionDialog";
import type { CantRemoveRequest, CantRemoveOutcome } from "@/features/access-gate/cant-remove/cantRemoveOpener";

export default function CantRemoveDialogHostBody({ data, close }: OverlayRenderProps) {
  const { request, settle } = useOverlayRequest<CantRemoveRequest, CantRemoveOutcome>(data, close);
  const open = request !== null;
  if (!request) return null;
  return (
    <GovernedActionDialog
      key={`${request.token}:${request.id}`}
      open={open}
      onOpenChange={(next) => {
        if (!next) settle("closed");
      }}
      resourceType={request.token}
      resourceId={request.id}
      itemName={request.itemName}
      itemLabel={request.itemLabel}
      action={request.action}
      href={request.href ?? null}
      // The hidden-ids store refreshed inside the hide, so every list of this kind re-renders.
      onHidden={() => settle("hidden")}
    />
  );
}
