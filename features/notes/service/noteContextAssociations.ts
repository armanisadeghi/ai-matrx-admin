"use client";

import { associationsService } from "@/features/scopes/service/associationsService";
import { getAssociationsStore } from "@/features/scopes/host/associationsStore";
import type { NoteContextLinks } from "../types";
import {
  type NoteContextField,
} from "./noteSaveErrors";

type IdentifiedRow = { id: string };

function emptyLinks(): NoteContextLinks {
  return { project_id: null, task_id: null };
}

export interface NoteContextSettlement {
  succeededFields: NoteContextField[];
  failedFields: NoteContextField[];
  safeCauses: Partial<Record<NoteContextField, string>>;
  postSaveRecoveryError?: Error;
}

// Reads in flight, by note id. The list read and an opened note's read hydrate the same
// ids a moment apart on /notes; an id already being read shares that read instead of
// asking `assoc_for_sources` again. In-flight sharing ONLY: an id leaves the map the
// moment its read settles, so a later call (after any change) always reads fresh.
const inFlightLinks = new Map<string, { flight: Promise<NoteContextLinks>; startedAt: number }>();
/**
 * Only a read that left in the same burst is shared (the list read and a note load at page load).
 * A later ask — after a write changed a link — starts its own read, never one that predates it.
 */
const SHARE_WINDOW_MS = 1_000;

async function readLinks(ids: string[]): Promise<Map<string, NoteContextLinks>> {
  const result = await associationsService.listForSources("note", ids);
  if (!result.ok) {
    throw new Error(
      `Could not load note context associations: ${result.error.message}`,
    );
  }

  const byNote = new Map<string, NoteContextLinks>();
  for (const edge of result.data.edges) {
    if (edge.targetType !== "project" && edge.targetType !== "task") continue;
    const links = byNote.get(edge.sourceId) ?? emptyLinks();
    if (edge.targetType === "project") {
      if (links.project_id && links.project_id !== edge.targetId) {
        console.error("Note has multiple project associations", {
          noteId: edge.sourceId,
          firstProjectId: links.project_id,
          additionalProjectId: edge.targetId,
        });
      } else {
        links.project_id = edge.targetId;
      }
    } else if (links.task_id && links.task_id !== edge.targetId) {
      console.error("Note has multiple task associations", {
        noteId: edge.sourceId,
        firstTaskId: links.task_id,
        additionalTaskId: edge.targetId,
      });
    } else {
      links.task_id = edge.targetId;
    }
    byNote.set(edge.sourceId, links);
  }
  return byNote;
}

/**
 * Hydrate the note UI's project/task projection from the canonical association
 * graph in one batched read. The DB note row intentionally owns neither FK.
 */
export async function hydrateNoteContextLinks<T extends IdentifiedRow>(
  rows: T[],
): Promise<Array<T & NoteContextLinks>> {
  if (rows.length === 0) return [];

  const wanted = Array.from(new Set(rows.map((row) => row.id)));
  const now = Date.now();
  const mine = wanted.filter((id) => {
    const entry = inFlightLinks.get(id);
    return !entry || now - entry.startedAt > SHARE_WINDOW_MS;
  });
  if (mine.length > 0) {
    const read = readLinks(mine);
    for (const id of mine) {
      const flight = read.then((byNote) => byNote.get(id) ?? emptyLinks());
      inFlightLinks.set(id, { flight, startedAt: now });
      const leave = () => {
        if (inFlightLinks.get(id)?.flight === flight) inFlightLinks.delete(id);
      };
      flight.then(leave, leave);
    }
  }
  const links = new Map<string, NoteContextLinks>();
  await Promise.all(
    wanted.map(async (id) => {
      const entry = inFlightLinks.get(id);
      links.set(id, entry ? await entry.flight : emptyLinks());
    }),
  );
  return rows.map((row) => ({ ...row, ...(links.get(row.id) ?? emptyLinks()) }));
}

/**
 * Replace only the context edge types the caller explicitly supplies.
 * `undefined` means leave that target type untouched; `null` means clear it.
 */
export async function syncNoteContextLinks(args: {
  noteId: string;
  organizationId: string;
  projectId?: string | null;
  taskId?: string | null;
}): Promise<NoteContextSettlement> {
  let postSaveRecoveryError: Error | undefined;
  const writes: Array<{ field: NoteContextField; write: Promise<unknown> }> = [];

  if (args.projectId !== undefined) {
    writes.push({
      field: "project_id",
      write: associationsService.setTargets({
        sourceType: "note",
        sourceId: args.noteId,
        targetType: "project",
        targetIds: args.projectId ? [args.projectId] : [],
        orgId: args.organizationId,
      }),
    });
  }
  if (args.taskId !== undefined) {
    writes.push({
      field: "task_id",
      write: associationsService.setTargets({
        sourceType: "note",
        sourceId: args.noteId,
        targetType: "task",
        targetIds: args.taskId ? [args.taskId] : [],
        orgId: args.organizationId,
      }),
    });
  }

  const results = await Promise.allSettled(writes.map(({ write }) => write));
  const succeededFields: NoteContextField[] = [];
  const failedFields: NoteContextField[] = [];
  const safeCauses: Partial<Record<NoteContextField, string>> = {};

  for (const [index, result] of results.entries()) {
    const field = writes[index].field;
    if (
      result.status === "fulfilled" &&
      !(typeof result.value === "object" && result.value !== null && "ok" in result.value && result.value.ok === false)
    ) {
      succeededFields.push(field);
      continue;
    }
    failedFields.push(field);
    const cause = result.status === "rejected" ? result.reason : result.value;
    safeCauses[field] = cause instanceof Error
      ? cause.message
      : typeof cause === "object" && cause !== null && "error" in cause &&
          typeof cause.error === "object" && cause.error !== null &&
          "message" in cause.error && typeof cause.error.message === "string"
        ? cause.error.message
        : "The context association request failed.";
  }

  if (succeededFields.length > 0) {
    try {
      getAssociationsStore().invalidate("note", args.noteId);
    } catch (error) {
      // The durable RPC already settled. A cache refresh failure is recovery
      // evidence, never evidence that a successful edge was not saved.
      postSaveRecoveryError = error instanceof Error
        ? error
        : new Error("Could not invalidate the note association cache.");
    }
  }
  return {
    succeededFields,
    failedFields,
    safeCauses,
    postSaveRecoveryError,
  };
}
