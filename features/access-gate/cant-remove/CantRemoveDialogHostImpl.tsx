"use client";

/**
 * Drains `cantRemoveOpener` one request at a time into `GovernedActionDialog`.
 * After a hide the hidden-ids store refreshes, so the record leaves every list of its kind.
 */

import { useOpenerHost } from "@ai-matrx/kit/opener-react";
import { GovernedActionDialog } from "@/features/access-gate/components/GovernedActionDialog";
import { cantRemoveOpener } from "./cantRemoveOpener";

export default function CantRemoveDialogHostImpl() {
  const { request, open, settle } = useOpenerHost(cantRemoveOpener);
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
