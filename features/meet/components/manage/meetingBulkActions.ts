// features/meet/components/manage/meetingBulkActions.ts
//
// The /meetings list's batch verbs as the platform's shared `EntityBulkAction`s.
// Archive and Restore call the SAME repository verbs the row menu calls
// (`useMeetingActions`), through `runPerRow`, so a meeting you may not change
// is skipped and NAMED. Archive replaces the built-in Move to Trash by id:
// the row's own archive also tells invited guests when the meeting had not
// ended, which a bare deleted_at stamp would not.

import { Archive, ArchiveRestore } from "lucide-react";
import type { MeetingRecord } from "@ai-matrx/meet/react";
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

  const own: EntityBulkAction<MeetingRecord>[] = [
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
      confirm: (selection) => ({
        title: `Archive ${bulkCountLabel(selection.count, NOUN)}?`,
        description:
          "They leave your lists; records, notes and recordings are kept. A meeting that has not ended stops admitting anyone, and its invited guests are emailed a cancellation. Restore from Archived.",
        confirmLabel: "Archive",
        variant: "destructive",
      }),
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
              await actions.announce(meeting.id, true);
            }
          },
          {
            done: "Archived",
            noun: NOUN,
            labelOf,
            skipReason: (m) =>
              notYours(m) ?? (m.deletedAt ? "already archived" : null),
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
