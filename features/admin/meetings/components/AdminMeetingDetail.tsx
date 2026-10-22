"use client";

// One meeting, seen from the platform Meetings admin page. Wraps the canonical
// meeting home (`MeetingDetail`, chrome="embedded") — never a second renderer —
// under a one-row admin strip with the way back. Mounted under
// /administration/** so every read carries the admin lane.

import { RecordHostChrome } from "@/features/shell/host-chrome/RecordHostChrome";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { MeetingDetail } from "@/features/meet/components/manage/MeetingDetail";

export function AdminMeetingDetail({ meetingId }: { meetingId: string }) {
  // This strip is the host: it names the meeting the embedded home no longer repeats.
  const [title, setTitle] = useState<string | null>(null);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        <Link href="/administration/users/meetings?tab=history" className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs hover:bg-muted">
          <ArrowLeft className="h-3.5 w-3.5" /> All meetings
        </Link>
        <span className="min-w-0 truncate text-sm font-medium">{title ?? "Meeting"}</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">Admin view</span>
      </div>
      <div className="min-h-0 flex-1">
        {/* This view's own row names the meeting: the shared host chrome drops the name from the meeting's bar. */}
        <RecordHostChrome host="frame" record={{ token: "meet_meeting", id: meetingId }} names opens={false}>
          <MeetingDetail meetingId={meetingId} at={null} section={null} chrome="embedded" onMeeting={(m) => setTitle(m.title)} />
        </RecordHostChrome>
      </div>
    </div>
  );
}
