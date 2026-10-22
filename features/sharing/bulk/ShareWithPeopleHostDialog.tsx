"use client";

// features/sharing/bulk/ShareWithPeopleHostDialog.tsx
//
// The dialog behind `shareWithPeople(...)`: the Share dialog's own People form
// (`ShareWithUserTab`), pointed at many records. Each grant goes through the
// request's `shareOne`; the form shows its answer in place, and closing the
// dialog answers how many people were granted.

import React, { useRef } from "react";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";
import { useOverlayRequest } from "@ai-matrx/summon/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShareWithUserTab } from "@ai-matrx/sharing/react";
import type { PermissionLevel } from "@ai-matrx/sharing/core";
import type { ShareWithPeopleRequest, ShareWithPeopleResponse } from "./shareWithPeopleOpener";

export function ShareWithPeopleHostDialog({ data, close: closeOverlay }: Pick<OverlayRenderProps, "data" | "close">) {
  const shared = useRef(0);
  // One mount per request (each ask opens the overlay afresh), so the count starts at 0.
  const { request: shown, settle } = useOverlayRequest<ShareWithPeopleRequest, ShareWithPeopleResponse>(data, closeOverlay);
  const open = shown !== null;
  const close = () => settle({ shared: shared.current });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-2 overflow-y-auto p-3 sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{shown?.title ?? "Share"}</DialogTitle>
        </DialogHeader>
        {open && shown ? (
          <ShareWithUserTab
            resourceType={shown.resourceType}
            resourceId={shown.resourceIds.join(",")}
            {...(shown.organizationId ? { organizationId: shown.organizationId } : {})}
            onShare={async (userId: string, level: PermissionLevel) => {
              const result = await shown.shareOne(userId, level);
              if (result.success) shared.current += 1;
              return result;
            }}
            onSuccess={close}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
