"use client";

// features/sharing/bulk/ShareWithPeopleHostDialog.tsx
//
// The dialog behind `shareWithPeople(...)`: the Share dialog's own People form
// (`ShareWithUserTab`), pointed at many records. Each grant goes through the
// request's `shareOne`; the form shows its answer in place, and closing the
// dialog answers how many people were granted.

import React, { useRef } from "react";
import { useOpenerHost } from "@ai-matrx/kit/opener-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShareWithUserTab } from "@/features/sharing/components/tabs/ShareWithUserTab";
import type { PermissionLevel } from "@/utils/permissions/types";
import { shareWithPeopleOpener } from "./shareWithPeopleOpener";

export function ShareWithPeopleHostDialog() {
  const shared = useRef(0);
  const { open, shown, settle } = useOpenerHost(shareWithPeopleOpener, {
    onActivate: () => {
      shared.current = 0;
    },
  });
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
