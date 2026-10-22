// features/knowledge/hub/tags/tagPickerOpener.ts
//
// `pickTag(...)` — open THE tag picker (`TagDialog`: your tags, or type a new
// name) from anywhere (a bulk action's run, a thunk) and await the chosen
// name. Zero React: the dialog lives behind the host mounted once
// (summon overlay `tagPickerDialog`). Resolves null when closed without a choice.

import { requestOverlay } from "@/features/overlays/requestOverlay";

export interface PickTagRequest {
  /** "Tag 3 agents" */
  title: string;
  /** How many records the tag goes on. */
  count: number;
}

/** The tag NAME (an existing one, or a new one the database creates on file). */
export type PickTagResponse = string | null;

export function pickTag(request: PickTagRequest): Promise<PickTagResponse> {
  return requestOverlay<PickTagRequest, PickTagResponse>("tagPickerDialog", request, { cancel: null });
}
