"use client";

/**
 * Lightweight hover preview for a DataRef (db_record / db_query / db_field), drawn by THE Peek.
 * Pure presentation — DataRefs are tiny descriptors of what to fetch on the
 * server, not loaded entities, so the preview just shows the descriptor in a
 * readable form. No fetch, no Redux read.
 */

import { Peek, PeekHoverCard, type PeekBlock } from "@ai-matrx/design-system";
import { Database } from "lucide-react";
import type { DataRef } from "@ai-matrx/agents/message-parts";
import { tryGetEntityInfoByUniqueTableName } from "@/features/scopes/registry/entityRegistry";

function describeRefType(dataRef: DataRef): string {
  switch (dataRef.ref_type) {
    case "db_record":
      return "Single record";
    case "db_query":
      return "Filtered query";
    case "db_field":
      return "Single field";
  }
}

interface DataRefPreviewContentProps {
  dataRef: DataRef;
  /** `surface` when this is the card itself (a hover), `bare` inside a panel that already frames it. */
  frame?: "surface" | "bare";
}

export function DataRefPreviewContent({ dataRef, frame = "bare" }: DataRefPreviewContentProps) {
  const entityInfo = tryGetEntityInfoByUniqueTableName(dataRef.table);
  const recordId = "id" in dataRef ? dataRef.id : null;
  const recordName = dataRef.label?.trim() || dataRef.table;

  const body: PeekBlock[] = [];
  // The record the reference points at opens like every identity in the app.
  if (entityInfo && recordId) {
    body.push({ fact: recordName, entity: { token: entityInfo.token, id: recordId, newTab: true, showActions: true } });
  }
  if (dataRef.ref_type === "db_record") {
    body.push({ property: "ID", value: dataRef.id });
    if (dataRef.fields && dataRef.fields.length > 0) body.push({ property: "Fields", value: dataRef.fields.join(", ") });
  } else if (dataRef.ref_type === "db_field") {
    body.push({ property: "ID", value: dataRef.id });
    body.push({ property: "Field", value: dataRef.field_name });
  } else if (dataRef.ref_type === "db_query") {
    if (dataRef.filter && Object.keys(dataRef.filter).length > 0) {
      body.push({ section: "Filter", code: { text: JSON.stringify(dataRef.filter, null, 2), language: "JSON" } });
    } else {
      body.push({ property: "Filter", value: "—" });
    }
    if (dataRef.fields && dataRef.fields.length > 0) body.push({ property: "Fields", value: dataRef.fields.join(", ") });
    if (typeof dataRef.limit === "number") body.push({ property: "Limit", value: String(dataRef.limit) });
  }
  if (dataRef.optional_context) {
    body.push({ fact: "Optional context — fetch failures are dropped silently", muted: true, wrap: true });
  }

  return (
    <Peek
      frame={frame}
      record={{
        kind: "Data reference",
        id: recordId ?? `${dataRef.ref_type}:${dataRef.table}`,
        title: recordName,
        subtitle: `${describeRefType(dataRef)} · ${dataRef.table}`,
        glyph: Database,
        body,
        // The old Copy JSON button copied the descriptor.
        copyData: dataRef,
      }}
    />
  );
}

interface DataRefHoverPreviewProps {
  /** The DataRef descriptor to preview. */
  dataRef: DataRef;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
}

export function DataRefHoverPreview({ dataRef, children, side = "top", align = "start" }: DataRefHoverPreviewProps) {
  return (
    <PeekHoverCard trigger={children} side={side} align={align} label="Data reference">
      <DataRefPreviewContent dataRef={dataRef} frame="surface" />
    </PeekHoverCard>
  );
}
