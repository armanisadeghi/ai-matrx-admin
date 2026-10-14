// features/scheduling/lib/scheduleBulkActions.ts
//
// The schedules list's batch verbs as the platform's shared `EntityBulkAction`s.
// Every verb calls the SAME thunk the row's own switch / menu calls, through
// `runPerRow`, so a schedule the server refuses is skipped and NAMED.
// Delete replaces the built-in Move to Trash by id: the row's own delete also
// updates the schedules slice and tells the scheduler (not a bare deleted_at).

import { Pause, PlayCircle, Play, Trash2 } from "lucide-react";
import {
  bulkCountLabel,
  type EntityBulkAction,
} from "@/lib/entity-list/selection";
import {
  mergeBulkActions,
  runPerRow,
  standardBulkActionsFor,
} from "@/lib/entity-list/standardBulkActions";
import type { AppDispatch } from "@/lib/redux/store";
import {
  deleteScheduledTask,
  runTaskNowThunk,
  toggleTaskEnabled,
} from "../redux/tasks/thunks";
import type { AgendaTask } from "../types";

const NOUN = "schedule";
export const scheduleIdOf = (task: AgendaTask) => task.id;
const labelOf = (task: AgendaTask) => task.title;

/** The user toggle refuses platform (tool) jobs by design; say so by name. */
const systemJob = (task: AgendaTask) =>
  task.kind === "tool" ? "platform job, managed by admins" : null;

export function buildScheduleBulkActions(dispatch: AppDispatch): EntityBulkAction<AgendaTask>[] {
  const setEnabled = (enabled: boolean): EntityBulkAction<AgendaTask> => ({
    id: enabled ? "resume" : "pause",
    label: enabled ? "Resume" : "Pause",
    icon: enabled ? Play : Pause,
    // Resuming starts runs that spend; pausing is a free, reversible stop.
    confirm: enabled
      ? (selection) => ({
          title: `Resume ${bulkCountLabel(selection.count, NOUN)}?`,
          description: "They run again on their schedules; each run is billed.",
          confirmLabel: "Resume",
        })
      : undefined,
    run: (selection) =>
      runPerRow(
        selection,
        async (id) => {
          await dispatch(toggleTaskEnabled(id, enabled));
        },
        {
          done: enabled ? "Resumed" : "Paused",
          noun: NOUN,
          labelOf,
          skipReason: (task) =>
            systemJob(task) ??
            (task.enabled === enabled
              ? enabled
                ? "already running"
                : "already paused"
              : null),
        },
        scheduleIdOf,
      ),
  });

  const own: EntityBulkAction<AgendaTask>[] = [
    setEnabled(false),
    setEnabled(true),
    {
      id: "run-now",
      label: "Run now",
      icon: PlayCircle,
      // A run is an agent execution: it spends. Say so before queuing many.
      confirm: (selection) => ({
        title: `Run ${bulkCountLabel(selection.count, NOUN)} now?`,
        description:
          "Each one queues an agent run right away, and each run is billed like its normal scheduled run.",
        confirmLabel: "Run now",
      }),
      run: (selection) =>
        runPerRow(
          selection,
          async (id) => {
            await dispatch(runTaskNowThunk(id));
          },
          { done: "Run queued", noun: NOUN, labelOf },
          scheduleIdOf,
        ),
    },
    {
      id: "move-to-trash",
      label: "Delete",
      icon: Trash2,
      variant: "destructive",
      confirm: (selection) => ({
        title: `Delete ${bulkCountLabel(selection.count, NOUN)}?`,
        description:
          "They stop running and leave your list; an admin can restore them. Any you can't delete are skipped and named.",
        confirmLabel: "Delete",
        variant: "destructive",
      }),
      run: (selection) =>
        runPerRow(
          selection,
          async (id) => {
            await dispatch(deleteScheduledTask(id));
          },
          { done: "Deleted", noun: NOUN, labelOf, removesRows: true },
          scheduleIdOf,
        ),
    },
  ];

  // Built-ins left on: none that show anywhere on this list (no stars; the
  // row does not display tags). Trash is replaced above by id.
  const standard = standardBulkActionsFor<AgendaTask>({
    token: "sch_task",
    noun: NOUN,
    rowIdOf: scheduleIdOf,
    labelOf,
    config: { favorite: false, tag: false },
    favoritesShown: false,
  });
  return mergeBulkActions(own, standard);
}
