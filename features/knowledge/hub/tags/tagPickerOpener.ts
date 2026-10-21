// features/knowledge/hub/tags/tagPickerOpener.ts
//
// `pickTag(...)` — open THE tag picker (`TagDialog`: your tags, or type a new
// name) from anywhere (a bulk action's run, a thunk) and await the chosen
// name. Zero React: the dialog lives behind the host mounted once
// (`<RecordBulkDialogsHost />`). Resolves null when closed without a choice.

import { createOpener } from "@ai-matrx/kit/opener";
import { requestDialogHosts } from "@/components/dialogs/host/dialogHostsLatch";

export interface PickTagRequest {
  /** "Tag 3 agents" */
  title: string;
  /** How many records the tag goes on. */
  count: number;
}

/** The tag NAME (an existing one, or a new one the database creates on file). */
export type PickTagResponse = string | null;

export const tagPickerOpener = createOpener<PickTagRequest, PickTagResponse>(
  "matrx-frontend.tag-picker-opener-state",
  { hostHint: "<DialogHosts /> (components/dialogs/host, mounted once in app/Providers.tsx)" },
);

export function pickTag(request: PickTagRequest): Promise<PickTagResponse> {
  requestDialogHosts();
  return tagPickerOpener.open(request);
}
