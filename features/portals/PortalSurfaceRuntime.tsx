"use client";

/**
 * Surface runtime for the client portal pages (`/portal/c/[slug]`, its form and its record
 * pages). Those pages are Server Components that read everything on the server, so they hand
 * this wrapper the values they already rendered, as plain props, and it registers them.
 *
 * Only the record page passes `writes`: changing a field the portal lets her change and sending a
 * message, through the same server actions its own editor and message box call. Paying stays
 * her own button (it opens a checkout), and nothing here reaches any other client's records:
 * every action re-checks that this record is hers on this portal.
 */

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { refuseSurfaceWrite } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";

interface PortalWriteOutcome {
  ok: boolean;
  message?: string;
  hint?: string | null;
  version?: number;
}

export interface PortalRecordWrites {
  slug: string;
  recordId: string;
  /** The field keys the portal lets her change on this record. */
  editableKeys: string[];
  /** The record's version as the page read it; each save is sent against the latest one. */
  version: number | null;
  /** Whether this record's Table takes messages. */
  comments: boolean;
  saveField: (slug: string, recordId: string, key: string, value: string, version: number | null) => Promise<PortalWriteOutcome>;
  addComment: (slug: string, recordId: string, body: string) => Promise<PortalWriteOutcome>;
}

interface FieldChange {
  key: string;
  value: string;
}

/** Pure: the `update_record_fields` value, checked against what the portal lets her change. */
export function parsePortalFieldChanges(value: unknown, editableKeys: readonly string[]): FieldChange[] {
  if (!Array.isArray(value) || value.length === 0) {
    refuseSurfaceWrite('update_record_fields takes a JSON array of { "key", "value" } objects, at least one.');
  }
  if (editableKeys.length === 0) refuseSurfaceWrite("Nothing on this record can be changed from the portal.");
  const seen = new Set<string>();
  return value.map((item, i) => {
    if (!item || typeof item !== "object") refuseSurfaceWrite(`Item ${i + 1} is not an object.`);
    const { key, value: next } = item as Record<string, unknown>;
    if (typeof key !== "string" || !editableKeys.includes(key)) {
      refuseSurfaceWrite(`Item ${i + 1}: "${String(key)}" is not a field she can change. Changeable: ${editableKeys.join(", ")}.`);
    }
    if (seen.has(key)) refuseSurfaceWrite(`"${key}" is listed twice.`);
    seen.add(key);
    if (typeof next !== "string") refuseSurfaceWrite(`Item ${i + 1}: "value" must be a string.`);
    return { key, value: next };
  });
}

export function PortalSurfaceRuntime({
  surfaceName,
  values,
  writes,
  children,
}: {
  surfaceName: string;
  values: Record<string, unknown>;
  writes?: PortalRecordWrites;
  children: ReactNode;
}) {
  const router = useRouter();
  const getScope = () => values as SurfaceScopePayload;
  const getWriteHandlers = () => ({
    update_record_fields: {
      validate: (value: unknown) => {
        if (!writes) refuseSurfaceWrite("This page has no record open.");
        parsePortalFieldChanges(value, writes.editableKeys);
      },
      apply: async (value: unknown) => {
        if (!writes) refuseSurfaceWrite("This page has no record open.");
        const changes = parsePortalFieldChanges(value, writes.editableKeys);
        let version = writes.version;
        const saved: string[] = [];
        for (const change of changes) {
          const outcome = await writes.saveField(writes.slug, writes.recordId, change.key, change.value, version);
          if (!outcome.ok) {
            router.refresh();
            const said = [outcome.message, outcome.hint].filter(Boolean).join(" ");
            throw new Error(
              `${saved.length ? `Saved ${saved.join(", ")}; ` : ""}"${change.key}" was not saved: ${said || "the portal refused it."}`,
            );
          }
          if (typeof outcome.version === "number") version = outcome.version;
          saved.push(change.key);
        }
        router.refresh();
        return { summary: `Saved ${saved.join(", ")}.`, data: { saved, version } };
      },
    },
    post_message: {
      validate: (value: unknown) => {
        if (!writes?.comments) refuseSurfaceWrite("This record does not take messages.");
        if (typeof value !== "string" || !value.trim()) refuseSurfaceWrite("post_message takes the message text.");
      },
      apply: async (value: unknown) => {
        if (!writes?.comments) refuseSurfaceWrite("This record does not take messages.");
        const outcome = await writes.addComment(writes.slug, writes.recordId, String(value));
        router.refresh();
        if (!outcome.ok) throw new Error([outcome.message, outcome.hint].filter(Boolean).join(" ") || "The message was not sent.");
        return { summary: "Message sent." };
      },
    },
  });
  return (
    // surface-write-handlers-surface: matrx-public/client-portal, matrx-public/client-portal-form, matrx-public/client-portal-record
    <SurfaceRuntimeProvider
      surfaceName={surfaceName}
      getScope={getScope}
      getWriteHandlers={writes ? getWriteHandlers : undefined}
    >
      {children}
    </SurfaceRuntimeProvider>
  );
}
