"use client";

/**
 * Schema tab — the kind's stored field list (`kind_definition.data`, the
 * ordered StoredFieldElement[]) plus the materialized `emitted_json_schema`
 * (collapsible, copyable). Python-owned kinds have no `data` — their fields
 * live in the pydantic mirror, so only the emitted schema shows.
 */

import { useClipboard } from "@ai-matrx/kit/clipboard";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import { Copy, Info } from "lucide-react";
import type { Json } from "@/types/database.types";
import type { StoredFieldElement } from "@ai-matrx/content-ir";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";

interface FieldRow {
  name: string;
  depth: number;
  type: string;
  required: boolean;
  nullable: boolean;
}

const FIELD_COLUMNS: MatrxColumnDef<FieldRow>[] = [
  {
    accessorKey: "name",
    header: "Field",
    filter: "text",
    width: 265,
    cell: (row) => (
      <span
        className="block truncate font-mono text-xs"
        style={{ paddingLeft: `${row.depth * 16}px` }}
        title={row.name}
      >
        {row.name}
      </span>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    filter: "text",
    width: 300,
    cell: (row) => <span className="block truncate" title={row.type}>{row.type}</span>,
  },
  { accessorKey: "required", header: "Required", filter: "boolean", width: 90 },
  { accessorKey: "nullable", header: "Nullable", filter: "boolean", width: 90 },
];

function isStoredFieldArray(value: Json | null): value is Json[] {
  return (
    Array.isArray(value) &&
    value.every(
      (el) =>
        typeof el === "object" &&
        el !== null &&
        !Array.isArray(el) &&
        typeof (el as { name?: unknown }).name === "string" &&
        typeof (el as { type?: unknown }).type === "string",
    )
  );
}

/** The child kind a field holds, read off the emitted schema's `$ref` (the field list alone does not name it). */
function childKindOf(schema: Json | null, field: string): string | null {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return null;
  const props = (schema as { properties?: Record<string, unknown> }).properties;
  const node = props?.[field];
  if (!node || typeof node !== "object") return null;
  const n = node as { $ref?: unknown; items?: { $ref?: unknown } };
  const ref = typeof n.$ref === "string" ? n.$ref : typeof n.items?.$ref === "string" ? n.items.$ref : null;
  return ref ? (ref.split("/").pop() ?? null) : null;
}

function typeSummary(el: StoredFieldElement, schema: Json | null): string {
  switch (el.type) {
    case "enum":
      return `enum(${el.values.join(" | ")})`;
    case "union":
      return `union(${el.scalars.join(" | ")})`;
    case "record":
      return `record<string, ${el.values}>`;
    case "inline_object":
      return `inline_object (${el.fields.length} fields)`;
    case "object":
      return childKindOf(schema, el.name) ?? "nested shape";
    case "array":
      {
        const child = childKindOf(schema, el.name);
        return child ? `list of ${child}` : "list of nested shapes";
      }
    default:
      return el.type;
  }
}

function flattenStoredFields(
  elements: StoredFieldElement[],
  schema: Json | null,
  prefix = "",
  depth = 0,
): FieldRow[] {
  const rows: FieldRow[] = [];
  for (const el of elements) {
    rows.push({
      name: `${prefix}${el.name}`,
      depth,
      type: typeSummary(el, schema),
      required: el.required ?? false,
      nullable: el.nullable ?? false,
    });
    if (el.type === "inline_object") {
      rows.push(...flattenStoredFields(el.fields, schema, `${prefix}${el.name}.`, depth + 1));
    }
  }
  return rows;
}

interface KindSchemaTabProps {
  kind: string;
  fieldData: Json | null;
  emittedJsonSchema: Json | null;
}

export default function KindSchemaTab({
  kind,
  fieldData,
  emittedJsonSchema,
}: KindSchemaTabProps) {
  const { copyText } = useClipboard({
    notify: copyNotify,
  });
  const fieldRows = isStoredFieldArray(fieldData)
    ? flattenStoredFields(fieldData as unknown as StoredFieldElement[], emittedJsonSchema)
    : null;
  const schemaText =
    emittedJsonSchema === null ? null : JSON.stringify(emittedJsonSchema, null, 2);

  async function copySchema() {
    if (!schemaText) return;
    if (!(await copyText(schemaText, `Copied ${kind} emitted_json_schema`))) return;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      {/* Fields */}
      <section className="overflow-hidden rounded-md border border-border bg-card">
        <div className="border-b border-border px-3 py-2 text-sm font-semibold text-foreground">
          Fields
        </div>
        {fieldRows === null ? (
          <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0" />
            This shape has no field list of its own. Its structure is defined by
            the full schema below.
          </div>
        ) : (
          <MatrxDataTable<FieldRow>
            data={fieldRows}
            columns={FIELD_COLUMNS}
            getRowId={(row) => row.name}
            viewTabs={false}
            detail={{ enabled: false }}
            toolbar={{ searchPlaceholder: "Search fields…" }}
            pageSize={0}
            emptyState={{ title: "Empty field list" }}
          />
        )}
      </section>

      {/* emitted_json_schema */}
      <section className="rounded-md border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <span className="text-sm font-semibold text-foreground">
            Full schema
          </span>
          <button
            type="button"
            onClick={copySchema}
            disabled={!schemaText}
            className="ml-auto flex h-7 items-center gap-1.5 rounded-md border border-border px-2 text-xs text-foreground transition-colors hover:bg-accent disabled:opacity-40"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </button>
        </div>
        {schemaText ? (
          <details open>
            <summary className="cursor-pointer px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              {schemaText.length.toLocaleString()} chars — click to collapse
            </summary>
            <pre data-kind-source="explicit" className="overflow-x-auto border-t border-border p-3 font-mono text-xs text-foreground">
              {schemaText}
            </pre>
          </details>
        ) : (
          <p className="px-3 py-3 text-xs text-muted-foreground">
            This shape has no full schema yet, so its structure can't be
            checked until one exists.
          </p>
        )}
      </section>
    </div>
  );
}
