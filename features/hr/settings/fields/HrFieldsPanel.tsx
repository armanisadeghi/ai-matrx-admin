// features/hr/settings/fields/HrFieldsPanel.tsx
//
// ROUTE 73 — CUSTOM FIELDS AND CUSTOM TABS.
//
// FIELDS COME FROM, AND GO TO, THE CUSTOM STORE — never `platform.custom_field_definition`.
// An organization's custom fields on a platform record type (`hr_employee`, ...) are read with
// `custom.entity_fields` (`useEntityFields`), declared with `FieldEditor entityToken`
// (`custom.entity_field_declare`), renamed/retired with `useEntityFieldMutation`
// (`custom.entity_field_update` / `entity_field_retire`), all from @ai-matrx/records(-ui) — the
// platform's ONE field editor, never an HR fork. `platform.custom_field_target` (which tokens are on,
// their ceilings) is still read as policy, read-only.
//
// THE ARCHIVED-ITEMS LAW: the read asks for retired fields too (`entityFields({ include_retired })`,
// each with `archived_at`). Archived rows are hidden until "Archived fields (N)" is opened; then they
// sit beside the live ones with a Status column and Restore (`custom.field_restore`) per row.
//
// ── THE GOVERNANCE RULES, STATED ON THE PAGE (SPEC-EMPLOYEES §7.4) ─────────
//  • A field's key and type are IMMUTABLE once any value exists: archive and recreate instead.
//  • DELETING A DEFINITION NEVER DELETES VALUES.
//  • A `restricted`-tier field is NEVER in an AI Provision.

"use client";

import { useEffect, useState } from "react";
import { Archive, ArchiveRestore, ClipboardList, Lock, Plus } from "lucide-react";
import { ArchivedDisclosure } from "@ai-matrx/design-system";
import { RecordsProvider, useEntityFieldMutation, useRecordsClient } from "@ai-matrx/records/react";
import type { Field, RecordsError } from "@ai-matrx/records";
import { FieldEditor, RefusalLine } from "@/features/data-tables/records-ui-host/recordsUiLazy";
import { FIELD_SENSITIVITY_LABEL, fieldTypeLabel } from "@ai-matrx/records-ui/helpers";
import { ConfirmDelete } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { AGENT_ICON } from "@/components/icons/domain-icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppRecordsConfig } from "@/features/data-tables/records-ui-host/recordsUiHost";

import { tryGetEntityInfo } from "@/features/scopes/registry/entityRegistry";
import { useHrContext } from "../../shared/useHrContext";
import { fetchHrCustomFieldRegistry } from "../service";
import { InfoHint } from "@/components/official/InfoHint";
import { HrSettingsShell } from "../HrSettingsShell";
import type { HrCustomFieldTarget } from "../types";

// THE RECORD-TYPE NAMES ARE READ, NOT WRITTEN HERE (DD-097). This file used to
// carry a seven-entry `TOKEN_LABEL` map that matched a seven-entry token list in
// `service.ts`; live `platform.custom_field_target` enables five tokens, three of
// which appeared in neither. `platform.entity_types.label` is the one place a
// token's human name lives, and `fetchHrCustomFieldRegistry` reads it.

/** The AI ceiling's stored values, in words. Sensitivity words come from the records package. */
export const AI_CEILING_LABEL: Record<string, string> = {
  allowed: "AI may read these fields",
  aggregate_only: "AI sees only totals, never a person's value",
  never: "Kept from AI entirely",
};
export const VALIDATION_LABEL: Record<string, string> = {
  advisory: "Warns, never blocks",
  permissive: "Warns, never blocks",
  strict: "Blocks a bad value",
};
const UNRECOGNIZED = "Not recognized";
const sensitivityWords = (v: string | null | undefined) =>
  v ? ((FIELD_SENSITIVITY_LABEL as Record<string, string>)[v] ?? UNRECOGNIZED) : "Not set";
/** The ceiling's own vocabulary (`platform.custom_field_target.sensitivity_ceiling`): the most sensitive a field may be. */
const CEILING_SENSITIVITY: Record<string, string> = {
  standard: FIELD_SENSITIVITY_LABEL.internal,
  confidential: FIELD_SENSITIVITY_LABEL.confidential,
  restricted: FIELD_SENSITIVITY_LABEL.restricted,
};
const wordsFrom = (map: Record<string, string>, v: string | null | undefined) =>
  v ? (map[v] ?? UNRECOGNIZED) : "Not set";

export function HrFieldsPanel() {
  const { active } = useHrContext();
  const organizationId = active?.organization_id ?? null;

  const [targets, setTargets] = useState<HrCustomFieldTarget[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  // Derived, never set synchronously in an effect body (react-hooks/set-state-in-effect).
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    (async () => {
      const result = await fetchHrCustomFieldRegistry({ organizationId });
      if (cancelled) return;
      if (result.ok) {
        setTargets(result.data.targets);
        setLabels(result.data.labels);
        setError(null);
      } else {
        setError(result);
      }
      setLoadedFor(organizationId);
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId, reload]);

  // The record type's own name: the live registry label, else the entity registry's. A token is an
  // identifier, never a name a person reads — one with neither says so, plainly.
  const labelFor = (token: string | null) =>
    token ? (labels[token] ?? tryGetEntityInfo(token)?.label ?? "Unnamed record type") : "—";
  const enabledTargets = targets.filter((row) => row.is_enabled);
  const recordsConfig = useAppRecordsConfig(organizationId);

  return (
    <HrSettingsShell
      section="fields"
      title="Custom fields"
      description="Extra fields on HR records, and how sensitive each one is."
      loading={organizationId !== null && loadedFor !== organizationId}
      error={error}
      operation="This employer's custom-field registry"
      onRetry={() => setReload((n) => n + 1)}
    >
      <div className="space-y-6 p-4 sm:p-6">
        {/* What each record type allows */}
        <section className="rounded-lg border border-border bg-card">
          <header className="flex items-start gap-3 border-b border-border p-4">
            <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 space-y-1">
              <h2 className="text-sm font-semibold text-foreground">
                What each record type allows{" "}
                <InfoHint text="Each HR record type that is switched on, and the limits a custom field on it cannot exceed." />
              </h2>
            </div>
          </header>
          {targets.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No HR record type has custom fields switched on — not for this employer,
              and not as a platform default. Until one does, nothing can be added to
              any of them.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {targets.map((target) => {
                // Which of the two this row is. Every live row today is a platform
                // default inherited by every employer; an employer's own row would
                // carry its own organization_id. Saying which is the difference
                // between "we decided this" and "the platform decided this".
                const isOwnRow = target.organization_id === organizationId;
                return (
                  <li key={target.id} className="flex flex-wrap gap-2 p-4 text-sm">
                    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">
                        {labelFor(target.target_token)}
                      </span>
                      <Badge variant={target.is_enabled ? "secondary" : "outline"}>
                        {target.is_enabled ? "Enabled" : "Off"}
                      </Badge>
                      <Badge variant="outline">
                        {isOwnRow ? "Set by this employer" : "Platform default"}
                      </Badge>
                    </span>
                    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                      {[
                        ["Field limit", target.max_fields == null ? "Unlimited" : String(target.max_fields)],
                        ["Most sensitive a field may be, seen by", wordsFrom(CEILING_SENSITIVITY, target.sensitivity_ceiling)],
                        ["AI access", wordsFrom(AI_CEILING_LABEL, target.ai_exposure_ceiling)],
                        ["Checking values", wordsFrom(VALIDATION_LABEL, target.validation_mode)],
                      ].map(([term, value]) => (
                        <div key={term} className="flex gap-1">
                          <dt>{term}</dt>
                          <dd className="font-medium text-foreground">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* The fields themselves — the custom store, one block per switched-on record type */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Fields defined here</h2>
          {enabledTargets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No HR record type is switched on to receive custom fields.
            </p>
          ) : (
            <RecordsProvider config={recordsConfig}>
              <HrFieldsTable
                targets={enabledTargets.map((t) => ({
                  token: t.target_token,
                  label: labelFor(t.target_token),
                }))}
              />
            </RecordsProvider>
          )}
        </section>

        {/* The rules that are not negotiable */}
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            The rules these fields live by
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">
                A field&apos;s key, type and reference target are locked once a value is
                stored.
              </span>{" "}
              <InfoHint text="To change one, archive the field and create a new one." />
            </li>
            <li>
              <span className="font-medium text-foreground">
                Deleting a field never deletes what people put in it.
              </span>{" "}
              <InfoHint text="The values stay and are removed only by an explicit purge, which is logged." />
            </li>
            <li>
              <span className="font-medium text-foreground">
                A field only owners and administrators see is never given to an AI.
              </span>
            </li>
            <li>
              <span className="font-medium text-foreground">
                An archived field keeps its values readable and refuses new writes.
              </span>
            </li>
            <li>
              <span className="font-medium text-foreground">
                Custom fields appear under More at the bottom of their tab.
              </span>{" "}
              <InfoHint text="Kept apart from built-in fields, so reordering one never moves a legally required field." />
            </li>
          </ul>
        </section>
      </div>
    </HrSettingsShell>
  );
}

type FieldLine = Field & { token: string };

const AI_EXPOSURE_LABEL: Record<string, string> = {
  include: "Included",
  on_request: "On request",
  exclude: "Kept out",
};
const aiExposureWords = (f: Field) =>
  f.sensitivity === "restricted" ? "Never" : f.context_policy ? (AI_EXPOSURE_LABEL[f.context_policy] ?? UNRECOGNIZED) : "Not set";

/** Every switched-on record type's custom fields in ONE table, through the custom store's own doors. */
function HrFieldsTable({ targets }: { targets: { token: string; label: string }[] }) {
  const client = useRecordsClient();
  const mutation = useEntityFieldMutation();
  const [lines, setLines] = useState<FieldLine[] | null>(null);
  const recordLabel = (token: string) => targets.find((t) => t.token === token)?.label ?? "Unnamed record type";
  const [loadError, setLoadError] = useState<RecordsError | null>(null);
  const [reload, setReload] = useState(0);
  const [adding, setAdding] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<FieldLine | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<RecordsError | null>(null);
  const key = targets.map((t) => t.token).join("|");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        key.split("|").map(async (token) => ({ token, result: await client.entityFields({ token, include_retired: true }) })),
      );
      if (cancelled) return;
      const failed = results.find((r) => !r.result.ok);
      setLoadError(failed && !failed.result.ok ? failed.result.error : null);
      setLines(
        results.flatMap((r) =>
          r.result.ok
            ? r.result.data.map((f) => ({ ...f, token: r.token }))
            : [],
        ),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [client, key, reload]);

  const retire = async (line: FieldLine) => {
    const done = await mutation.retire({ field_id: line.id });
    setConfirming(null);
    if (done) setReload((n) => n + 1);
  };

  const restore = async (line: FieldLine) => {
    setRestoring(line.id);
    const done = await client.fieldRestore({ field_id: line.id });
    setRestoring(null);
    setRestoreError(done.ok ? null : done.error);
    if (done.ok) setReload((n) => n + 1);
  };

  const liveDefinitions = (lines ?? []).filter((row) => !row.archived_at);
  const archivedDefinitions = (lines ?? []).filter((row) => Boolean(row.archived_at));
  const visibleDefinitions = showArchived ? (lines ?? []) : liveDefinitions;

  const rowItems = (row: FieldLine) =>
    row.archived_at
      ? { id: "restore", icon: ArchiveRestore, label: "Restore field", onClick: () => void restore(row) }
      : { id: "archive", icon: Archive, label: "Archive field", onClick: () => setConfirming(row) };

  const statusColumn: MatrxColumnDef<FieldLine>[] = showArchived
    ? [
        {
          id: "status",
          accessorFn: (row) => (row.archived_at ? "Archived" : "Live"),
          header: "Status",
          filter: "select",
          format: { id: "choice" },
          cell: (row) => (
            <Badge variant={row.archived_at ? "outline" : "secondary"}>{row.archived_at ? "Archived" : "Live"}</Badge>
          ),
        },
      ]
    : [];

  const columns: MatrxColumnDef<FieldLine>[] = [
    { id: "label", accessorKey: "label", header: "Field", filter: "text", frozen: true, width: 220 },
    {
      id: "record",
      accessorFn: (row) => recordLabel(row.token),
      header: "On which record",
      filter: "select",
      format: { id: "choice" },
    },
    {
      id: "type",
      accessorFn: (row) => fieldTypeLabel(row),
      header: "Type",
      filter: "select",
      format: { id: "choice" },
    },
    {
      id: "sensitivity",
      accessorFn: (row) => sensitivityWords(row.sensitivity),
      header: "Sensitivity",
      filter: "select",
      format: { id: "choice" },
      cell: (row) => (
        <Badge variant={row.sensitivity === "restricted" ? "destructive" : row.sensitivity === "confidential" ? "default" : "secondary"}>
          {sensitivityWords(row.sensitivity)}
        </Badge>
      ),
    },
    {
      id: "ai",
      accessorFn: (row) => aiExposureWords(row),
      header: "AI exposure",
      filter: "select",
      format: { id: "choice" },
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-sm text-foreground">
          {row.sensitivity === "restricted" ? <Lock className="h-3.5 w-3.5" /> : <AGENT_ICON className="h-3.5 w-3.5 text-muted-foreground" />}
          {aiExposureWords(row)}
        </span>
      ),
    },
    {
      id: "required",
      accessorFn: (row) => row.required,
      header: "Required",
      filter: "boolean",
      format: { id: "boolean" },
      mobileHidden: true,
    },
    {
      id: "added",
      accessorFn: (row) => row.created_at,
      header: "Added",
      filter: "date",
      format: { id: "datetime" },
      defaultSortDirection: "desc",
    },
    ...statusColumn,
  ];

  return (
    <div className="space-y-3" data-hr-fields-table>
      <div className="flex flex-wrap items-center gap-2">
        <ArchivedDisclosure
          count={archivedDefinitions.length}
          open={showArchived}
          onOpenChange={setShowArchived}
          label="Archived fields"
          keepWhileOpen
          className="w-auto"
        />
        {targets.map((t) => (
          <Button
            key={t.token}
            type="button"
            variant="outline"
            onClick={() => setAdding(adding === t.token ? null : t.token)}
          >
            <Plus className="h-3.5 w-3.5" />
            {targets.length === 1 ? "Add a custom field" : `Add to ${t.label}`}
          </Button>
        ))}
      </div>
      {adding ? (
        <div className="rounded-lg border border-border bg-card p-3">
          <FieldEditor
            entityToken={adding}
            tableLabel={targets.find((t) => t.token === adding)?.label ?? ""}
            onSaved={() => {
              setAdding(null);
              setReload((n) => n + 1);
            }}
            onCancel={() => setAdding(null)}
          />
        </div>
      ) : null}
      {loadError ? <RefusalLine error={loadError} /> : null}
      {mutation.error ? <RefusalLine error={mutation.error} /> : null}
      {restoreError ? <RefusalLine error={restoreError} /> : null}
      <MatrxDataTable<FieldLine>
        tableId="hr-custom-fields"
        data={visibleDefinitions}
        columns={columns}
        getRowId={(row) => row.id}
        pageSize={25}
        toolbar={{ search: true, searchPlaceholder: "Search custom fields" }}
        rowActions={(row) => [{ ...rowItems(row), disabled: restoring === row.id }]}
        contextMenu={{
          sections: (payload) =>
            payload.level === "row" || payload.level === "cell"
              ? [
                  {
                    id: "field",
                    title: "Field",
                    primary: true,
                    items: payload.row.archived_at
                      ? [{ id: "restore", label: "Restore field", onSelect: () => void restore(payload.row) }]
                      : [
                          {
                            id: "archive",
                            label: "Archive field",
                            destructive: true,
                            onSelect: () => setConfirming(payload.row),
                          },
                        ],
                  },
                ]
              : [],
        }}
        read={{
          status: loadError ? "error" : lines === null ? "loading" : "ready",
          error: loadError,
          onRetry: () => setReload((n) => n + 1),
          what: "custom fields",
        }}
        emptyState={
          // Honest empty copy: "none" only when live AND archived are both empty.
          !showArchived && liveDefinitions.length === 0 && archivedDefinitions.length > 0
            ? {
                title: `All ${archivedDefinitions.length} custom ${archivedDefinitions.length === 1 ? "field is" : "fields are"} archived`,
                description: "Open “Archived fields” to see or restore them.",
              }
            : { title: "No custom fields on HR records" }
        }
      />
      <ConfirmDelete
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title={`Archive ${confirming?.label ?? "field"}?`}
        cost="Its values stay readable on every record, and nobody can add new ones."
        confirmLabel="Archive field"
        busy={mutation.saving}
        onConfirm={() => (confirming ? retire(confirming) : undefined)}
      />
    </div>
  );
}
