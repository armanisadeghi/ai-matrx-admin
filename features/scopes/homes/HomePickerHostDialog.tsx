"use client";

// features/scopes/homes/HomePickerHostDialog.tsx
//
// The dialog behind `pickHome(...)`: THE home picker in a plain Dialog (a
// bottom sheet on phones). It only answers which home; the caller moves.

import React from "react";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";
import { useOverlayRequest } from "@/features/overlays/useOverlayRequest";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HomePickerList } from "./HomePickerList";
import type { PickHomeRequest, PickHomeResponse } from "./homePickerOpener";

export function HomePickerHostDialog({ data, close: closeOverlay }: Pick<OverlayRenderProps, "data" | "close">) {
  const { request: shown, settle } = useOverlayRequest<PickHomeRequest, PickHomeResponse>(data, closeOverlay);
  const open = shown !== null;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && settle(null)}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-2 p-3 sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{shown?.title ?? "Move to…"}</DialogTitle>
        </DialogHeader>
        {open && shown ? (
          <HomePickerList
            currentScopeId={shown.currentScopeId ?? null}
            initialOrganizationId={shown.initialOrganizationId ?? null}
            onPick={(home, label) => settle({ home, label })}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
