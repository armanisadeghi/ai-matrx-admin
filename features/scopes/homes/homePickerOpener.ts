// features/scopes/homes/homePickerOpener.ts
//
// `pickHome(...)` — open THE home picker from anywhere (a bulk action's run, a
// thunk) and await the chosen home. Zero React: the dialog lives behind the
// host mounted once in app/Providers.tsx (`<RecordBulkDialogsHost />`).
// Resolves null when the person closes it without choosing.

import { createOpener } from "@ai-matrx/kit/opener";
import { requestDialogHosts } from "@/components/dialogs/host/dialogHostsLatch";
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

export const homePickerOpener = createOpener<PickHomeRequest, PickHomeResponse>(
  "matrx-frontend.home-picker-opener-state",
  { hostHint: "<DialogHosts /> (components/dialogs/host, mounted once in app/Providers.tsx)" },
);

export function pickHome(request: PickHomeRequest): Promise<PickHomeResponse> {
  requestDialogHosts();
  return homePickerOpener.open(request);
}
