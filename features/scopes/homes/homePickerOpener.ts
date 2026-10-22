// features/scopes/homes/homePickerOpener.ts
//
// `pickHome(...)` — open THE home picker from anywhere (a bulk action's run, a
// thunk) and await the chosen home. Zero React: the dialog lives behind the
// summon overlay `homePickerDialog` (features/overlays/definitions).
// Resolves null when the person closes it without choosing.

import { requestOverlay } from "@/features/overlays/requestOverlay";
import type { ItemHome } from "./homeModel";

export interface PickHomeRequest {
  /** "Move 3 agents to…" */
  title: string;
  /** The home to mark as current (one record), else null. */
  currentScopeId?: string | null;
  /** Where "New home…" is created by default (the record's organization). */
  initialOrganizationId?: string | null;
}

export type PickHomeResponse = { home: ItemHome; label: string } | null;

export function pickHome(request: PickHomeRequest): Promise<PickHomeResponse> {
  return requestOverlay<PickHomeRequest, PickHomeResponse>("homePickerDialog", request, { cancel: null });
}
