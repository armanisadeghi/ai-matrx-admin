"use client";

// features/admin/applications/catalogs/components/UnifiedModelKindTable.tsx
//
// Applications › Catalogs for a MODEL kind (Arman, "one editor"): the list reads the unified catalog
// (ai.*) through THE shared query and order — fetchCuratedModels + curatedList from
// @ai-matrx/agents/models, the same list Matrx 2 shows (its offered rows) in the same order. Order is
// edited inline, Active (offered in Matrx 2) is a switch, and opening a row edits every field and fact —
// all through THE one write path, PATCH /admin/ai-catalog/discovery/models/{id}/listing, with the
// last-read stamp (a stale edit is refused and the list reloads). The old public.catalog_entries rows
// stay viewable, read-only, behind "Old list (read-only)" so old and new can be compared.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ExternalLink, Link2 } from "lucide-react";
import { curatedList, fetchCuratedModels, type CuratedCatalogClient, type CuratedModel } from "@ai-matrx/agents/models";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { ErrorNotice } from "@ai-matrx/design-system";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { CellEditsMap, MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { formatFileSize } from "@ai-matrx/kit/format";
import { createClient } from "@/utils/supabase/client";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAccessToken } from "@/lib/redux/slices/userSlice";
import { selectResolvedBaseUrl } from "@/lib/redux/slices/apiConfigSlice";
import { useServerOrganizationId } from "@/lib/api/useServerOrganizationId";
import { extractErrorMessage } from "@/utils/errors";
import { discoveryApi, type CallAuth, type ListingEdit } from "@/features/ai-models/discovery/api";
import { ModelListingEditor } from "./ModelListingEditor";
import { kindLabel } from "@/features/admin/applications/catalogs/schemas";
import type { CatalogEntryRow } from "@/features/admin/applications/catalogs/types";

/** The catalog kinds whose rows live in the unified catalog (ai.*) — Arman's "one editor". */
export const MODEL_KINDS: ReadonlySet<string> = new Set([
  "llm_model",
  "whisper_model",
  "tts_model_file",
  "image_gen_model",
  "video_gen_model",
  "ner_model",
  "wake_word_model",
  "lora",
]);

/**
 * The catalog kind a unified model belongs to: the kind of the old rows its variants carry (the list
 * migration stamps them); a model added later is placed by what it does.
 */
export function kindOfModel(m: CuratedModel, kindOfEntry: ReadonlyMap<string, string>): string {
  for (const v of m.variants) for (const id of v.catalog_entry_ids) {
    const k = kindOfEntry.get(id);
    if (k && MODEL_KINDS.has(k)) return k;
  }
  const out = m.capabilities.output ?? [];
  const inp = m.capabilities.input ?? [];
  if (m.presentation?.shelf === "loras") return "lora";
  if (out.includes("video")) return "video_gen_model";
  if (out.includes("image")) return "image_gen_model";
  if (out.includes("audio")) return "tts_model_file";
  if (inp.includes("audio")) return "whisper_model";
  if (m.capabilities.interaction === "extraction") return "ner_model";
  return "llm_model";
}

export interface ModelRow {
  id: string;
  name: string;
  maker: string;
  version: string;
  size: number | null;
  offered: boolean;
  order: number | null;
  model: CuratedModel;
}

function toRow(m: CuratedModel): ModelRow {
  const v = m.variants.find((x) => x.is_default) ?? m.variants.find((x) => x.review_state === "offered") ?? m.variants[0];
  return {
    id: m.id,
    name: m.common_name || m.name,
    maker: m.maker ?? "",
    version: v ? v.quant || v.key : "",
    size: v?.total_bytes ?? null,
    offered: m.offered,
    order: m.presentation?.display_order ?? null,
    model: m,
  };
}

interface UnifiedModelKindTableProps {
  app: string;
  kind: string;
  /** Every catalog_entries row (all kinds): ties migrated models to their old rows' kind. */
  allEntries: CatalogEntryRow[];
  onBack: () => void;
  onAddFromLink: () => void;
  /** The old list for this kind, read-only (CatalogKindTable readOnly). */
  oldList: ReactNode;
  /** Test seam: the ai.* client. Default: the browser Supabase client. */
  client?: CuratedCatalogClient;
}

export function UnifiedModelKindTable({ app, kind, allEntries, onBack, onAddFromLink, oldList, client }: UnifiedModelKindTableProps) {
  const { toast } = useToast();
  const auth: CallAuth = {
    accessToken: useAppSelector(selectAccessToken) ?? null,
    baseUrl: useAppSelector(selectResolvedBaseUrl) ?? null,
    organizationId: useServerOrganizationId(),
  };
  const [models, setModels] = useState<CuratedModel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOld, setShowOld] = useState(false);
  const [editing, setEditing] = useState<CuratedModel | null>(null);

  const load = useCallback(async () => {
    try {
      setModels(await fetchCuratedModels(client ?? (createClient() as unknown as CuratedCatalogClient)));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const kindOfEntry = useMemo(() => new Map(allEntries.map((e) => [e.id, e.kind])), [allEntries]);
  const rows = useMemo(
    () => (models ? curatedList(models, { offeredOnly: false }).filter((m) => kindOfModel(m, kindOfEntry) === kind).map(toRow) : []),
    [models, kind, kindOfEntry],
  );

  // Text facts offer the values the kind's other models already use (from the data, never a list here).
  const suggestions = useMemo(() => {
    const out: Record<string, Set<string>> = {};
    for (const r of rows) for (const [k, v] of Object.entries(r.model.facts)) if (typeof v === "string" && v) (out[k] ??= new Set()).add(v);
    return Object.fromEntries(Object.entries(out).map(([k, set]) => [k, [...set].sort()]));
  }, [rows]);

  const saveEdits = useCallback(
    async (edits: CellEditsMap, editedRows: ModelRow[]) => {
      const failures: string[] = [];
      for (const row of editedRows) {
        const raw = edits[row.id]?.order;
        if (raw === undefined) continue;
        const parsed = Number(raw);
        if (!Number.isInteger(parsed)) {
          failures.push(`${row.name}: the order must be a whole number`);
          continue;
        }
        if (parsed === row.order) continue;
        try {
          await discoveryApi.editListing(auth, row.id, { expected_updated_at: row.model.updated_at, display_order: parsed });
        } catch (err) {
          failures.push(`${row.name}: ${extractErrorMessage(err)}`);
        }
      }
      await load();
      if (failures.length) {
        toast({ title: "Some orders did not save", description: failures.join("; "), variant: "destructive" });
        throw new Error(failures.join("; "));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth.accessToken, auth.baseUrl, auth.organizationId, load, toast],
  );

  /** The one write: send, reload, and say a refusal in words (a stale stamp reloads the list). */
  const edit = useCallback(
    async (model: CuratedModel, change: ListingEdit) => {
      try {
        await discoveryApi.editListing(auth, model.id, change);
      } catch (err) {
        await load();
        throw new Error(extractErrorMessage(err));
      }
      await load();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth.accessToken, auth.baseUrl, auth.organizationId, load],
  );

  const toggleActive = useCallback(
    async (row: ModelRow, next: boolean) => {
      try {
        await edit(row.model, { expected_updated_at: row.model.updated_at, active: next });
      } catch (err) {
        toast({ title: `${row.name} was not changed`, description: extractErrorMessage(err), variant: "destructive" });
      }
    },
    [edit, toast],
  );

  const columns = useMemo(
    (): MatrxColumnDef<ModelRow>[] => [
      { id: "order", accessorKey: "order", header: "Order", editable: "number", align: "right", width: 90, cell: (r) => <span className="font-mono text-xs">{r.order ?? "—"}</span> },
      { id: "name", accessorKey: "name", header: "Name", cell: (r) => <span className="font-medium text-foreground">{r.name}</span> },
      { id: "maker", accessorKey: "maker", header: "Maker", width: 140 },
      { id: "version", accessorKey: "version", header: "Version", width: 120, cell: (r) => <span className="font-mono text-xs">{r.version}</span> },
      { id: "size", accessorKey: "size", header: "Size", align: "right", width: 100, cell: (r) => <span className="text-xs">{r.size ? formatFileSize(r.size) : "—"}</span> },
      {
        id: "offered",
        accessorKey: "offered",
        header: "Active",
        align: "center",
        width: 110,
        filter: "boolean",
        cell: (r) => (
          <Switch checked={r.offered} onCheckedChange={(next) => void toggleActive(r, Boolean(next))} aria-label={`${r.name} offered in Matrx 2`} />
        ),
      },
    ],
    [toggleActive],
  );

  return (
    <div className="flex h-full flex-col gap-3" data-testid="unified-model-kind-table">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Button icon={<ArrowLeft />} type="button" variant="quiet" onClick={onBack}> All kinds
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">
              {kindLabel(kind)} <code className="text-xs font-normal text-muted-foreground">{app}/{kind}</code>
            </h2>
            <p className="truncate text-xs text-muted-foreground">The model catalog: the same list and order Matrx 2 shows</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" aria-pressed={showOld} onClick={() => setShowOld((v) => !v)}>
            {showOld ? "Back to the model catalog" : "Old list (read-only)"}
          </Button>
          <a href="/administration/ai/ai-models/discovery" className="inline-flex items-center gap-1 text-sm text-primary">
            <ExternalLink className="h-3.5 w-3.5" /> Discovery
          </a>
        </div>
      </div>
      {showOld ? (
        <div className="min-h-0 flex-1" data-testid="old-list-read-only">
          {oldList}
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          {error ? <ErrorNotice message={error} size="compact" /> : null}
          <p className="pb-2 text-xs text-muted-foreground">Active means Matrx 2 offers it. Open a row to edit its fields and facts.</p>
          <MatrxDataTable
            urlState={{ id: `application-catalog-models-${kind.replace(/_/g, "-")}` }}
            data={rows}
            columns={columns}
            getRowId={(r) => r.id}
            pageSize={100}
            emptyState={{
              title: models ? `No ${kindLabel(kind)} in the model catalog yet` : "Loading the model catalog…",
              description: "Use Add from link to find one.",
            }}
            toolbar={{
              search: true,
              searchPlaceholder: "Search name, maker…",
              actions: (
                <Button icon={<Link2 />} variant="primary" type="button" onClick={onAddFromLink}> Add from link
                </Button>
              ),
            }}
            onRowOpen={(r) => setEditing(r.model)}
            detail={{ enabled: false }}
            edit={{ enabled: true, onSave: saveEdits }}
          />
        </div>
      )}
      {editing ? (
        <ModelListingEditor kind={kind} suggestions={suggestions} model={editing} onClose={() => setEditing(null)} onSave={(change) => edit(editing, change)} />
      ) : null}
    </div>
  );
}
