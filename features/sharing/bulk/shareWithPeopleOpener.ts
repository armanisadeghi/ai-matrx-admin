// features/sharing/bulk/shareWithPeopleOpener.ts
//
// `shareWithPeople(...)` — open the People share form (the SAME
// `ShareWithUserTab` the Share dialog uses: contacts, email lookup, level,
// "Add everyone in <organization>") for MANY records at once, from anywhere.
// The caller supplies `shareOne(userId, level)`, which grants that person on
// every record and answers like the single-record door ({success, error}).
// Zero React: the dialog lives behind `<RecordBulkDialogsHost />`.

import { createOpener } from "@ai-matrx/kit/opener";
import type { PermissionLevel, ResourceType, ShareActionResult } from "@/utils/permissions/types";

export interface ShareWithPeopleRequest {
  /** "Share 3 agents" */
  title: string;
  resourceType: ResourceType;
  /** The records being shared (for the failure payload only). */
  resourceIds: string[];
  /** Whose contacts to offer: the records' organization when they share one. */
  organizationId?: string;
  shareOne: (userId: string, level: PermissionLevel) => Promise<ShareActionResult>;
}

/** How many people were granted (0 = closed with nothing shared). */
export interface ShareWithPeopleResponse {
  shared: number;
}

export const shareWithPeopleOpener = createOpener<ShareWithPeopleRequest, ShareWithPeopleResponse>(
  "matrx-frontend.share-with-people-opener-state",
  { hostHint: "<RecordBulkDialogsHost /> (mounted once in app/Providers.tsx)" },
);

export function shareWithPeople(request: ShareWithPeopleRequest): Promise<ShareWithPeopleResponse> {
  return shareWithPeopleOpener.open(request);
}
