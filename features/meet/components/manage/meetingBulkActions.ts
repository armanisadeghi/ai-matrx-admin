// features/meet/components/manage/meetingBulkActions.ts
//
// The /meetings list's batch verbs as the platform's shared `EntityBulkAction`s.
// Archive and Restore call the SAME repository verbs the row menu calls
// (`useMeetingActions`), through `runPerRow`, so a meeting you may not change
// is skipped and NAMED. Archive replaces the built-in Move to Trash by id:
// the row's own archive also tells invited guests when the meeting had not
// ended, which a bare deleted_at stamp would not.

import { Archive, ArchiveRestore, CalendarCheck, XCircle } from "lucide-react";
import type { MeetingRecord, RsvpAnswer } from "@ai-matrx/meet/react";
import {
  bulkCountLabel,
  type EntityBulkAction,
} from "@/lib/entity-list/selection";
import {
  mergeBulkActions,
  runPerRow,
  standardBulkActionsFor,
} from "@/lib/entity-list/standardBulkActions";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import type { useMeetingActions } from "@/features/meet/hooks/useMeetingActions";

const NOUN = "meeting";
export const meetingIdOf = (meeting: MeetingRecord) => meeting.id as string;
const labelOf = (meeting: MeetingRecord) => meeting.title;

type Role = "host" | "cohost" | "invitee";

export function buildMeetingBulkActions(args: {
  actions: ReturnType<typeof useMeetingActions>;
  roles: ReadonlyMap<string, Role>;
}): EntityBulkAction<MeetingRecord>[] {
  const { actions, roles } = args;

  const notYours = (meeting: MeetingRecord) =>
    roles.get(meeting.id as string) === "invitee"
      ? "only the host or a co-host can change it"
      : null;

  // Writes need the meeting host (organization). Open the picker and stop, as
  // the row menu does, rather than failing on the first row.
  const ready = async () => {
    if (actions.ready) return;
    try {
      await ensureOrgId(null);
    } catch {
      /* cancelled */
    }
    throw new Error("Choose an organization, then press the button again.");
  };

  const ended = (m: MeetingRecord) => m.endedAt !== null && !m.recurrenceRule;

  // The skip rules, written once: the confirm counts only the meetings that will actually run.
  const cancelSkip = (m: MeetingRecord): string | null => {
    const r = notYours(m);
    if (r) return r;
    if (m.deletedAt) return "archived";
    if (m.cancelledAt) return "already canceled";
    if (ended(m)) return "already over";
    return null;
  };
  const archiveSkip = (m: MeetingRecord): string | null =>
    notYours(m) ?? (m.deletedAt ? "already archived" : null);

  const own: EntityBulkAction<MeetingRecord>[] = [
    {
      // The row menu's Going / Maybe / Not going, one answer for every meeting you are invited to.
      id: "rsvp",
      label: "Respond to invite…",
      icon: CalendarCheck,
      confirm: (selection) => ({
        title: `Answer ${bulkCountLabel(selection.count, NOUN)}?`,
        description:
          "Your answer goes to each host. Meetings you host or that are over, canceled or archived are skipped and named.",
        confirmLabel: "Send answer",
        ask: {
          kind: "choice",
          label: "Your answer",
          options: [
            { value: "accepted", label: "Going" },
            { value: "tentative", label: "Maybe" },
            { value: "declined", label: "Not going" },
          ],
          defaultValue: "accepted",
        },
      }),
      run: (selection, input) =>
        runPerRow(
          selection,
          async (id) => {
            const answer = input?.value as RsvpAnswer | undefined;
            if (!answer) throw new Error("no answer picked");
            await actions.respond(id as MeetingRecord["id"], answer);
          },
          {
            done: "Answered",
            noun: NOUN,
            labelOf,
            skipReason: (m) => {
              if (roles.get(m.id as string) !== "invitee") return "you are not an invitee";
              if (m.deletedAt) return "archived";
              if (m.cancelledAt) return "canceled";
              if (ended(m)) return "already over";
              return null;
            },
          },
          meetingIdOf,
        ),
    },
    {
      id: "cancel-meeting",
      label: "Cancel meeting",
      icon: XCircle,
      variant: "destructive",
      confirm: (selection) => {
        const runnable = selection.rows.filter((m) => cancelSkip(m) === null);
        const recurring = runnable.filter((m) => m.recurrenceRule).length;
        const skipped = selection.count - runnable.length;
        return {
          title: `Cancel ${bulkCountLabel(runnable.length, NOUN)}?`,
          description: `Nobody can join a canceled meeting, and every guest who was invited is emailed a cancellation that removes it from their calendar.${skipped > 0 ? ` ${skipped} that cannot be canceled will be skipped and named.` : ""}${recurring > 0 ? ` ${recurring} ${recurring === 1 ? "is a recurring meeting" : "are recurring meetings"} — the whole series is canceled.` : ""}`,
          confirmLabel: "Cancel and email guests",
          variant: "destructive",
          reason: { placeholder: "Reason shown on the meeting link (optional)", optional: true },
        };
      },
      run: async (selection, input) => {
        await ready();
        return runPerRow(
          selection,
          async (_id, meeting) => {
            if (!meeting) throw new Error("not loaded");
            const invitees = actions.repository
              ? await actions.repository.invitees(meeting.id)
              : [];
            await actions.cancel(meeting, input?.reason?.trim() || null);
            if (invitees.length > 0) {
              const told = await actions.announce(meeting.id, true);
              if (!told) {
                throw new Error("canceled, but its guests were not emailed the cancellation");
              }
            }
          },
          {
            done: "Canceled",
            noun: NOUN,
            labelOf,
            skipReason: cancelSkip,
          },
          meetingIdOf,
        );
      },
    },
    {
      id: "restore",
      label: "Restore",
      icon: ArchiveRestore,
      run: async (selection) => {
        await ready();
        return runPerRow(
          selection,
          async (_id, meeting) => {
            if (meeting) await actions.restore(meeting);
          },
          {
            done: "Restored",
            noun: NOUN,
            labelOf,
            skipReason: (m) =>
              notYours(m) ?? (m.deletedAt ? null : "not archived"),
          },
          meetingIdOf,
        );
      },
    },
    {
      id: "move-to-trash",
      label: "Archive",
      icon: Archive,
      variant: "destructive",
      confirm: (selection) => {
        // Built from the selected rows: what the archive does depends on which meetings they are.
        const runnable = selection.rows.filter((m) => archiveSkip(m) === null);
        const series = runnable.filter((m) => m.recurrenceRule).length;
        const notEnded = runnable.filter(
          (m) => m.endedAt === null && !m.deletedAt,
        ).length;
        const parts = [
          "They leave your lists; records, notes and recordings are kept.",
        ];
        if (series > 0) {
          parts.push(
            `${series} ${series === 1 ? "is a recurring meeting" : "are recurring meetings"} — all dates of a recurring meeting are archived.`,
          );
        }
        if (notEnded > 0) {
          parts.push(
            `${notEnded} ${notEnded === 1 ? "meeting is" : "meetings are"} not yet ended and stop${notEnded === 1 ? "s" : ""} admitting anyone — any guests already invited are emailed a cancellation.`,
          );
        }
        parts.push("Restore from Archived.");
        return {
          title: `Archive ${bulkCountLabel(runnable.length, NOUN)}?`,
          description: parts.join(" "),
          confirmLabel: "Archive",
          variant: "destructive",
        };
      },
      run: async (selection) => {
        await ready();
        const archived: MeetingRecord[] = [];
        const result = await runPerRow(
          selection,
          async (_id, meeting) => {
            if (!meeting) throw new Error("not loaded");
            const invitees = actions.repository
              ? await actions.repository.invitees(meeting.id)
              : [];
            await actions.archive(meeting);
            archived.push(meeting);
            if (
              meeting.endedAt === null &&
              invitees.some((i) => i.lastSentSequence !== null)
            ) {
              const told = await actions.announce(meeting.id, true);
              // The archive stands, but the guests were not told: that is a refusal to name, not a success.
              if (!told) {
                throw new Error(
                  "archived, but its guests were not emailed the cancellation",
                );
              }
            }
          },
          {
            done: "Archived",
            noun: NOUN,
            labelOf,
            skipReason: archiveSkip,
          },
          meetingIdOf,
        );
        return {
          ...result,
          undo: async () => {
            await Promise.all(archived.map((m) => actions.restore(m)));
          },
        };
      },
    },
  ];

  const standard = standardBulkActionsFor<MeetingRecord>({
    token: "meet_meeting",
    noun: NOUN,
    rowIdOf: meetingIdOf,
    labelOf,
    config: { favorite: false, tag: false },
    favoritesShown: false,
  });
  return mergeBulkActions(own, standard);
}
