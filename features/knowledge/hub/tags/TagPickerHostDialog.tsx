"use client";

// features/knowledge/hub/tags/TagPickerHostDialog.tsx
//
// The dialog behind `pickTag(...)`: THE tag picker (`TagDialog`) fed with the
// person's tags. It only answers which tag; the caller files the records.

import React from "react";
import { useOpenerHost } from "@ai-matrx/kit/opener-react";
import { TagDialog } from "./TagDialog";
import { tagPickerOpener } from "./tagPickerOpener";
import { useHubTags } from "./useHubTags";

export function TagPickerHostDialog() {
  const { open, shown, settle } = useOpenerHost(tagPickerOpener);
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
