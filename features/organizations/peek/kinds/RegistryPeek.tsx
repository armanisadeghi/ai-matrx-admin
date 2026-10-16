// record-view: any
"use client";

import { humanizeIdentifier } from "@ai-matrx/kit/text-case";
/**
 * RegistryPeek — the peek every registered entity gets for free.
 *
 * THE DOOR LAW's third door is Peek: "whenever the user's next question is
 * 'wait, which one is that?'". Hand-written peeks answer that for 20 kinds and
 * left ~40 registered tokens with nothing — so an attached `crm_outreach_list`,
 * `seo_keyword`, `folder`, `code_repository` or `working_document` rendered as
 * plain text with no way to find out what it was. Writing 40 near-identical
 * fetch-and-show components would have been the wrong fix (and the exact
 * duplication PRINCIPLES.md bans).
 *
 * Instead this reads the ENTITY REGISTRY — schema, table, title column, icon,
 * label all come from `platform.entity_types` via `getEntityInfo` — and shows
 * the record. Registering a new entity therefore gives it a preview with no
 * frontend work at all.
 *
 * A BESPOKE peek always wins (`PEEK_REGISTRY` is checked first): this is the
 * floor, not a replacement. Write a real one whenever the kind deserves more
 * than title/description/dates — a file wants its thumbnail, an agent its
 * model.
 *
 * It reads `select("*")` deliberately: column sets vary per table and a peek is
 * a single row, so the alternative is a per-token column map that would drift.
 * A schema PostgREST doesn't expose (`rag`) simply fails the read and says so —
 * never a blank dialog pretending the record is empty.
 */

import { shownToLabel } from "@/lib/row-access";
import React from "react";
import { Boxes } from "lucide-react";
import { Peek, PeekWindow, type PeekBlock, type PeekGlyph } from "@ai-matrx/design-system";
import { supabase } from "@/utils/supabase/client";
import { tryGetEntityInfo } from "@/features/scopes/registry/entityRegistry";
import { useRecordPeekDoors } from "../useRecordPeekDoors";
import type { PeekProps } from "../types";

/** Fields worth showing under the title, in the order a reader wants them. */
const DETAIL_FIELDS = [
  "description",
  "summary",
  "tagline",
  "status",
  "shown_to",
  "category",
] as const;

const DATE_FIELDS = ["updated_at", "created_at"] as const;

type Row = Record<string, unknown>;

function asText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

export function RegistryPeek({
  token,
  id,
  open,
  onClose,
}: PeekProps & { token: string }) {
  const info = tryGetEntityInfo(token);
  const [row, setRow] = React.useState<Row | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [attempt, setAttempt] = React.useState(0);
  const doors = useRecordPeekDoors({ token, id, onClose });

  React.useEffect(() => {
    if (!info) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setFailed(false);
      // Same dynamic-read shape as `features/scopes/service/associationCandidates.ts`:
      // supabase-js wants literal schema/table names, so narrow the runtime
      // values the registry gives us and cast the unknown row on read.
      const db = (
        info.schema && info.schema !== "public"
          ? supabase.schema(info.schema as "files")
          : supabase
      ) as typeof supabase;

      const { data, error } = await db
        .from(info.table as never)
        .select("*")
        .eq("id" as never, id as never)
        .maybeSingle();
      if (cancelled) return;
      // A read that ERRORED is not the same as a record that isn't there —
      // never report an empty preview for data we could not read.
      if (error) setFailed(true);
      setRow((data as Row | null) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [info, id, attempt]);

  const Icon = (info?.Icon ?? Boxes) as PeekGlyph;
  const title =
    (info?.titleColumn ? asText(row?.[info.titleColumn]) : null) ??
    info?.label ??
    "Record";
  const kindWord = info?.label?.toLowerCase() ?? "record";

  const body: PeekBlock[] = [];
  if (row && !failed) {
    for (const field of DETAIL_FIELDS) {
      const raw = asText(row[field]);
      const value = field === "shown_to" && raw ? shownToLabel(raw) : raw;
      if (value) body.push({ section: humanizeIdentifier(field) || field, text: value, breaks: true });
    }
    for (const field of DATE_FIELDS) {
      const value = asText(row[field]);
      if (value) body.push({ property: humanizeIdentifier(field) || field, value: new Date(value).toLocaleString() });
    }
    body.push({ part: "custom-fields", token, id });
  } else if (!loading && !failed) {
    body.push({ part: "access", token, id });
  }

  return (
    <PeekWindow open={open} onClose={onClose} label={title}>
      <Peek
        size="lg"
        record={{
          kind: info?.label ?? "Record",
          id,
          title,
          glyph: Icon,
          body,
          ...(failed
            ? {
                failure: {
                  what: `this ${kindWord}`,
                  message: `Couldn't read this ${kindWord} — it may not be readable from the browser, or you may not have access.`,
                  onRetry: () => setAttempt((n) => n + 1),
                },
              }
            : {}),
          ...doors,
        }}
        loading={loading}
      />
    </PeekWindow>
  );
}

export default RegistryPeek;
