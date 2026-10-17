"use client";

/**
 * The fetched lists behind the Insert menu — kind schemas and prompt blocks —
 * loaded when the menu first opens (never on mount), each row carrying its
 * owner lane and its Peek.
 */

import { useRef, useState } from "react";
import { FileJson, Boxes } from "lucide-react";
import type { PeekRecord } from "@ai-matrx/design-system";
import { readAllRows } from "@ai-matrx/data/db";
import { kindSchemaToJsonSchema } from "@ai-matrx/content-ir";
import { supabase } from "@/utils/supabase/client";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import {
  catalogResolver,
  listAllKinds,
  listCompiledKinds,
  type KindCatalogEntry,
} from "@/features/content-ir/registry/kind-catalog";
import { loadBlocks } from "@/features/prompt-blocks/blocksCache";
import type { PromptBlockRow } from "@/features/prompt-blocks/types";
import { ownerLaneOf, type OwnedPickerItem } from "./OwnedItemPicker";

interface KindOwnerRow {
  kind: string;
  organization_id: string | null;
  created_by: string | null;
}

function errorText(error: unknown, what: string): string {
  return error instanceof Error ? error.message : `Could not load ${what}`;
}

function kindPeek(entry: KindCatalogEntry): PeekRecord {
  const fields = Object.keys(entry.fields ?? {});
  return {
    kind: "Kind",
    id: entry.kind,
    title: entry.label,
    subtitle: entry.kind,
    glyph: FileJson,
    body: [
      ...(fields.length > 0 ? [{ section: "Fields", tags: fields.slice(0, 24) }] : []),
      ...(entry.referencedKinds.length > 0 ? [{ section: "Uses", tags: entry.referencedKinds.slice(0, 12) }] : []),
    ],
    aside: [
      ...(entry.family ? [{ fact: entry.family, muted: true }] : []),
      { fact: `${fields.length} field${fields.length === 1 ? "" : "s"}`, muted: true },
    ],
  };
}

function blockPeek(row: PromptBlockRow): PeekRecord {
  return {
    kind: "Prompt block",
    id: row.id,
    title: row.label || row.name,
    subtitle: `{{<${row.name}>}}`,
    glyph: Boxes,
    body: [
      ...(row.description ? [{ section: "About", text: row.description, clamp: 3 as const }] : []),
      ...(row.content ? [{ section: "Content", text: row.content, clamp: 6 as const, breaks: true }] : []),
    ],
    aside: [{ fact: row.block_type, muted: true }],
  };
}

export function useInsertMenuLists() {
  const meId = useAppSelector(selectUserId);
  const [catalog, setCatalog] = useState<KindCatalogEntry[] | null>(null);
  const [kindOwners, setKindOwners] = useState<Map<string, KindOwnerRow> | null>(null);
  const [kindsError, setKindsError] = useState<string | null>(null);
  const [blockRows, setBlockRows] = useState<PromptBlockRow[] | null>(null);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const started = useRef(false);

  const load = () => {
    if (started.current) return;
    started.current = true;
    listAllKinds()
      .then(setCatalog)
      .catch((error: unknown) => {
        // Loud recovery: the compiled kinds keep the menu usable.
        console.error("[MessageInsertMenu] kind catalog DB load failed — compiled kinds only:", error);
        setCatalog(listCompiledKinds());
      });
    readAllRows<KindOwnerRow>(
      ({ from, to }) =>
        supabase
          .schema("content_ir")
          .from("kind_definition")
          .select("kind, organization_id, created_by", { count: "exact" })
          .is("deleted_at", null)
          .order("id", { ascending: true })
          .range(from, to),
      { label: "content_ir.kind_definition owners" },
    )
      .then((rows) => setKindOwners(new Map(rows.map((row) => [row.kind, row]))))
      .catch((error: unknown) => setKindsError(errorText(error, "kind owners")));
    loadBlocks()
      .then(setBlockRows)
      .catch((error: unknown) => setBlocksError(errorText(error, "prompt blocks")));
  };

  // Kinds a person chooses from: active, never a machine-minted contract snapshot.
  const kinds: OwnedPickerItem[] | null =
    catalog && kindOwners
      ? catalog
          .filter((entry) => entry.isActive !== false && !entry.isContractArtifact)
          .sort((a, b) => a.label.localeCompare(b.label))
          .map((entry) => {
            const owner = kindOwners.get(entry.kind);
            return {
              key: entry.kind,
              id: entry.kind,
              label: entry.label,
              detail: entry.kind,
              // A compiled-only kind (no row) ships with the platform.
              lane: owner
                ? ownerLaneOf({ organizationId: owner.organization_id, createdBy: owner.created_by }, meId)
                : "public",
              search: `${entry.label} ${entry.kind}`,
              peek: () => kindPeek(entry),
            };
          })
      : null;

  const blocks: OwnedPickerItem[] | null = blockRows
    ? blockRows.map((row) => ({
        key: row.id,
        id: row.name,
        label: row.label || row.name,
        detail: row.name,
        lane: ownerLaneOf({ organizationId: row.organization_id, createdBy: row.created_by }, meId),
        search: `${row.label} ${row.name} ${row.description ?? ""}`,
        peek: () => blockPeek(row),
      }))
    : null;

  /** The kind's JSON Schema (with `__kind`): the stored one, else built from its fields. */
  const kindSchema = (kind: string): unknown => {
    if (!catalog) return null;
    const entry = catalog.find((e) => e.kind === kind);
    if (entry?.emittedJsonSchema) return entry.emittedJsonSchema;
    return kindSchemaToJsonSchema(kind, catalogResolver(catalog))?.schema ?? null;
  };

  return { load, kinds, kindsError, blocks, blocksError, kindSchema };
}
