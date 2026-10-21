/**
 * Send a meeting part up into the person's Notes (the meeting tile's "…" menu).
 * A new note through the notes service, in the meeting's own organization,
 * holding the part's reference (`meetingPartNote`).
 */

import { createNote } from "@/features/notes/service/notesService";
import { selectMeetingEntry } from "@/features/meet/redux/meetingsSlice";
import { getStoreSingleton } from "@/lib/redux/store-singleton";
import { toast } from "@/lib/toast";
import type { NodeSource } from "../board/document";
import { meetingPartNote, meetingPartOf } from "./meeting-items.logic";
import { openOutbound } from "@ai-matrx/kit/outbound";

export async function sendMeetingPartToNotes(source: NodeSource, tileTitle: string): Promise<void> {
  const target = meetingPartOf(source);
  if (!target) return;
  const store = getStoreSingleton();
  const meeting = store ? selectMeetingEntry(store.getState(), target.meetingId)?.loaded?.meeting : undefined;
  const { label, content } = meetingPartNote({
    meetingId: target.meetingId,
    meetingTitle: meeting?.title ?? tileTitle,
    part: target.part,
  });
  try {
    const note = await createNote({ label, content, organization_id: meeting?.organizationId ?? (await activeOrg()) });
    toast("Sent to Notes", {
      action: { label: "Open", onClick: () => openOutbound(`/notes?active=${encodeURIComponent(note.id)}`, "_blank", "noopener") },
    });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Could not send to Notes");
  }
}

async function activeOrg(): Promise<string> {
  const { ensureOrgId } = await import("@/lib/organizations/ensureOrgId");
  return ensureOrgId(null);
}
