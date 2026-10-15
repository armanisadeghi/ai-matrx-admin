"use client";

/**
 * Drains `cantRemoveOpener` one request at a time into `GovernedActionDialog`.
 * After a hide, every list query re-reads so the record leaves the screen.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useOpenerHost } from "@ai-matrx/kit/opener-react";
import { GovernedActionDialog } from "@/features/access-gate/components/GovernedActionDialog";
import { cantRemoveOpener } from "./cantRemoveOpener";

export default function CantRemoveDialogHostImpl() {
  const { request, open, settle } = useOpenerHost(cantRemoveOpener);
  const queryClient = useQueryClient();
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
      onHidden={() => {
        void queryClient.invalidateQueries();
        settle("hidden");
      }}
    />
  );
}
