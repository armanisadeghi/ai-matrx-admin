// The tabs that render in an organization's seat too (userSurfaces.ts `inOrganization`): they take
// only ScopedTabBodyProps. The platform page (UserRecordPage) and the organization member page
// (OrgMemberRecord) both render THIS map, so the two seats never carry their own tab copies.

import type { ComponentType } from "react";
import { UserActivityTab } from "./UserActivityTab";
import { UserContentTab } from "./UserContentTab";
import { UserHistoryTab } from "./UserHistoryTab";
import { UserNotesTab } from "./UserNotesTab";
import { UserSupportTab } from "./UserSupportTab";
import type { ScopedTabBodyProps } from "./UserRecordPage";
import type { UserTabId } from "./userSurfaces";

export const SCOPED_TAB_BODIES: Partial<Record<UserTabId, ComponentType<ScopedTabBodyProps>>> = {
  activity: UserActivityTab,
  content: UserContentTab,
  notes: UserNotesTab,
  support: UserSupportTab,
  history: UserHistoryTab,
};
