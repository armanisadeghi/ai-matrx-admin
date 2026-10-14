"use client";

/**
 * Database-defined converters: list, edit, create, and check against the sample page.
 * The mapping is data (detect, item selector, custom-extractor fields); saving a mapping change bumps its version.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { FlaskConical, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProInput } from "@/components/official/ProInput";
import { Input, Select } from "@ai-matrx/design-system/controls";
import { selectActiveOrganizationId } from "@/features/scopes/redux/selectors/active-context";
import type { Json } from "@/types/database.types";
import { ErrorNotice, type ReadOutcome } from "@ai-matrx/design-system";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { formatRelativeTime } from "@ai-matrx/kit/format";

import {
  checkConverterDefinition,
  createConverterDefinition,
  listConverterDefinitions,
  saveConverterDefinition,
  type ConverterDefinitionCheck,
  type ConverterDefinitionDraft,
  type ConverterDefinitionRow,
} from "./definitions";

const STATUSES = ["draft", "active", "retired"] as const;

const BLANK: ConverterDefinitionDraft = {
  slug: "",
  label: "",
  description: null,
  target: "social.post",
  status: "draft",
  detect: { url_host: [], markers: [] },
  item_selector: null,
  fields: [],
  constants: {},
  sample_url: null,
};

function draftOf(row: ConverterDefinitionRow): ConverterDefinitionDraft {
  return {
    slug: row.slug,
    label: row.label,
    description: row.description,
    target: row.target,
    status: row.status,
    detect: row.detect,
    item_selector: row.item_selector,
    fields: row.fields,
    constants: row.constants,
    sample_url: row.sample_url,
  };
}

function lastCheck(row: ConverterDefinitionRow): {
  status?: string;
  items?: number;
} {
  const c = row.last_check;
  return c && typeof c === "object" && !Array.isArray(c)
    ? (c as { status?: string; items?: number })
    : {};
}

const JSON_FIELDS = ["detect", "fields", "constants"] as const;
type JsonField = (typeof JSON_FIELDS)[number];

function DefinitionEditor({
  row,
  onClose,
  onSaved,
}: {
  row: ConverterDefinitionRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const orgId = useSelector(selectActiveOrganizationId); // org-filter: write-target converter saves belong to the selected organization
  const [draft, setDraft] = useState<ConverterDefinitionDraft>(
    row ? draftOf(row) : BLANK,
  );
  const [text, setText] = useState<Record<JsonField, string>>(() => {
    const d = row ? draftOf(row) : BLANK;
    return {
      detect: JSON.stringify(d.detect, null, 2),
      fields: JSON.stringify(d.fields, null, 2),
      constants: JSON.stringify(d.constants, null, 2),
    };
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState<ConverterDefinitionCheck | null>(null);

  const parsed = (): ConverterDefinitionDraft | null => {
    const out = { ...draft };
    for (const k of JSON_FIELDS) {
      try {
        out[k] = JSON.parse(text[k]) as Json;
      } catch {
        setError(`${k} is not valid JSON`);
        return null;
      }
    }
    return out;
  };

  const save = async (): Promise<string | null> => {
    const d = parsed();
    if (!d) return null;
    setBusy(true);
    setError(null);
    try {
      if (row) {
        await saveConverterDefinition(row, d);
        onSaved();
        return row.id;
      }
      if (!orgId) throw new Error("No active organization");
      const id = await createConverterDefinition(orgId, d);
      onSaved();
      return id;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const runCheck = async () => {
    const id = await save();
    if (!id) return;
    setBusy(true);
    try {
      setCheck(await checkConverterDefinition(id));
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, el: React.ReactNode) => (
    <label className="grid gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      {el}
    </label>
  );

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {row ? `${row.label} · v${row.converter_version}` : "New converter"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            {field(
              "Name",
              <ProInput
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              />,
            )}
            {field(
              "Slug",
              // ui-exception: raw value (slug, target id, CSS selector, URL), not prose
              <Input
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              />,
            )}
            {field(
              "Target",
              // ui-exception: raw value (slug, target id, CSS selector, URL), not prose
              <Input
                value={draft.target}
                onChange={(e) => setDraft({ ...draft, target: e.target.value })}
              />,
            )}
            {field(
              "Status",
              // ui-exception: three fixed status values
              <Select
                value={draft.status}
                onValueChange={(v) => setDraft({ ...draft, status: v })}
                aria-label="Status"
                options={STATUSES.map((s) => ({ value: s, label: s }))}
              />,
            )}
            {field(
              "Item selector",
              // ui-exception: raw value (slug, target id, CSS selector, URL), not prose
              <Input
                value={draft.item_selector ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, item_selector: e.target.value || null })
                }
              />,
            )}
            {field(
              "Sample page address",
              // ui-exception: raw value (slug, target id, CSS selector, URL), not prose
              <Input
                value={draft.sample_url ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, sample_url: e.target.value || null })
                }
              />,
            )}
          </div>
          {JSON_FIELDS.map((k) =>
            field(
              k === "detect"
                ? "Detect"
                : k === "fields"
                  ? "Fields"
                  : "Constants",
              // ui-exception: raw JSON spec (detect / fields / constants), not prose
              <textarea
                className="min-h-24 w-full rounded-md border bg-background p-2 font-mono text-xs"
                spellCheck={false}
                value={text[k]}
                onChange={(e) => setText({ ...text, [k]: e.target.value })}
              />,
            ),
          )}
          {error ? <ErrorNotice title="Not saved" message={error} /> : null}
          {check ? (
            <div className="rounded-md border p-2 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{check.status}</Badge>
                <span>{check.items} items</span>
                {check.detected === false ? (
                  <span className="text-destructive">sample not detected</span>
                ) : null}
              </div>
              {check.failures?.length ? (
                <ErrorNotice
                  title="Items that failed"
                  message={check.failures
                    .map(
                      (
                        f: ConverterDefinitionCheck["failures"] extends
                          (infer F)[] | undefined
                          ? F
                          : never,
                      ) => String(f.error ?? ""),
                    )
                    .join("; ")}
                />
              ) : null}
              {check.preview?.length ? (
                <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(check.preview, null, 2)}
                </pre>
              ) : null}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={() => void runCheck()}
            disabled={busy}
          >
            <FlaskConical className="h-4 w-4" /> Save and check
          </Button>
          <Button
            onClick={() => void save().then((id) => id && onClose())}
            disabled={busy}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const columns: MatrxColumnDef<ConverterDefinitionRow>[] = [
  {
    id: "label",
    header: "Converter",
    accessorKey: "label",
    cell: (r) => (
      <div className="min-w-0">
        <div className="truncate text-xs font-medium">{r.label}</div>
        <div className="truncate font-mono text-xs text-muted-foreground">
          {r.slug}
        </div>
      </div>
    ),
  },
  {
    id: "target",
    header: "Target",
    accessorKey: "target",
    filter: "select",
    cell: (r) => <span className="font-mono text-xs">{r.target}</span>,
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "status",
    filter: "select",
    cell: (r) => <Badge variant="outline">{r.status}</Badge>,
  },
  {
    id: "version",
    header: "Version",
    accessorFn: (r) => r.converter_version,
    cell: (r) => <span className="text-xs">v{r.converter_version}</span>,
  },
  {
    id: "check",
    header: "Last check",
    accessorFn: (r) => lastCheck(r).status ?? "never",
    cell: (r) => {
      const c = lastCheck(r);
      return c.status ? (
        <span className="text-xs">
          {c.status} · {c.items ?? 0} items
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">never</span>
      );
    },
  },
  {
    id: "updated",
    header: "Updated",
    sortValue: (r) => r.updated_at,
    cell: (r) => (
      <span className="text-xs">{formatRelativeTime(r.updated_at)}</span>
    ),
  },
];

export function DefinitionsPanel({ onChanged }: { onChanged?: () => void }) {
  const query = useQuery<ConverterDefinitionRow[]>({
    queryKey: ["admin", "converter-definitions"],
    queryFn: () => listConverterDefinitions(),
  });
  const rows = query.data ?? [];
  const loading = query.isPending;
  const error = query.error;
  const load = () => void query.refetch();
  const [editing, setEditing] = useState<ConverterDefinitionRow | "new" | null>(
    null,
  );

  const read: ReadOutcome = error
    ? {
        status: "error",
        error,
        onRetry: load,
        what: "converter definitions",
        hasData: rows.length > 0,
      }
    : {
        status: loading ? "loading" : "ready",
        what: "converter definitions",
        hasData: rows.length > 0,
      };

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <MatrxDataTable
        tableId="admin-converter-definitions"
        data={rows}
        columns={[
          ...columns,
          {
            id: "edit",
            header: "Edit",
            sortable: false,
            filter: false,
            customActions: (r) => (
              <Button variant="outline" onClick={() => setEditing(r)}>
                Edit
              </Button>
            ),
          },
        ]}
        getRowId={(r) => r.id}
        isLoading={loading}
        density="condensed"
        pageSize={50}
        coverage={{
          noun: "definition",
          answeredBy: "client",
          loaded: rows.length,
          total: loading ? undefined : rows.length,
        }}
        toolbar={{
          title: "Database-defined converters",
          search: true,
          actions: (
            <Button variant="outline" onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" /> New
            </Button>
          ),
        }}
        read={read}
        emptyState={{
          icon: <Plus className="h-5 w-5" />,
          title: "No database-defined converters",
          description: "Add one with New.",
        }}
      />
      {editing ? (
        <DefinitionEditor
          row={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            load();
            onChanged?.();
          }}
        />
      ) : null}
    </div>
  );
}
