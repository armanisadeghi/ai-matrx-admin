"use client";

// A person's Acquisition tab: the ONE acquisition explorer narrowed to this person by prop
// (pageWhere person = id; counted on the database, no roster read). The journey canvas opens from
// the acquisition list focused on this person — its rows are identity rows, not user ids. Copy for AI
// (the page's one door) hands over what the explorer shows: its question, answers and window.

import { ExternalLink } from "lucide-react";
import AppLink from "@/components/navigation/AppLink";
import { UserAcquisitionExplorer } from "../components/UserAcquisitionExplorer";
import type { UserTabBodyProps } from "./UserRecordPage";

export function userAcquisitionListHref(userId: string): string {
  return `/administration/users/acquisition?user=${encodeURIComponent(userId)}`;
}

export function UserAcquisitionTab({ userId, shareForAi }: UserTabBodyProps) {
  return (
    <div className="flex flex-col gap-3" data-testid="user-acquisition-tab">
      <div className="flex justify-end">
        <AppLink href={userAcquisitionListHref(userId)} className="inline-flex items-center gap-1 type-secondary hover:text-primary">
          Open journey <ExternalLink className="h-3.5 w-3.5" />
        </AppLink>
      </div>
      <UserAcquisitionExplorer focusUser={userId} onShown={shareForAi} />
    </div>
  );
}
