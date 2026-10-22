"use client";

// features/knowledge/hub/tags/TagPickerHostDialog.tsx
//
// The dialog behind `pickTag(...)`: THE tag picker (`TagDialog`) fed with the
// person's tags. It only answers which tag; the caller files the records.

import React from "react";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";
import { useOverlayRequest } from "@ai-matrx/summon/react";
import { TagDialog } from "./TagDialog";
import type { PickTagRequest, PickTagResponse } from "./tagPickerOpener";
import { useHubTags } from "./useHubTags";

export function TagPickerHostDialog({ data, close: closeOverlay }: Pick<OverlayRenderProps, "data" | "close">) {
  const { request: shown, settle } = useOverlayRequest<PickTagRequest, PickTagResponse>(data, closeOverlay);
  const open = shown !== null;
  const tags = useHubTags(open);
  return (
    <TagDialog
      open={open}
      onOpenChange={(next) => !next && settle(null)}
      count={shown?.count ?? 0}
      title={shown?.title}
      tags={tags.items}
      onPick={(name) => settle(name)}
    />
  );
}
