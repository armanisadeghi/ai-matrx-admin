"use client";

/**
 * "Keep these rows" for one Tool answer (lane L6b): the first time a person picks (or makes) a table
 * through the one Save to a table; after that one press adds this run to the same table, and a switch
 * adds every run on its own. Rows already in the table are updated, never copied. The choice is
 * remembered per Tool per person.
 */

import { useEffect, useRef, useState } from "react";
import { Table2 } from "lucide-react";
import { KIND_KEY } from "@ai-matrx/content-ir";
import { Button, Switch } from "@ai-matrx/design-system/controls";

import { getTableMetadata } from "@/features/data-tables/service";
import { isServiceFailure } from "@/features/data-tables/types";
import { useOpenSaveToTable } from "@/features/overlays/definitions/saveToTable.overlay";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";

import { appendResultRows, type AppendOutcome } from "./appendResultRows";
import { asGrid, describeRows } from "./rowsFromKind";
import { useKindSchema } from "./useKindSchema";
import { useToolTableBinding, type ToolTableBinding } from "./toolTableBinding";

type Props = {
  callId: string;
  toolId: string | null;
  toolName: string | null;
  output: unknown;
  /** When the call finished (ISO); "Add every run" only fires for a run that just finished, never for an old call being reopened. */
  finishedAt?: string | null;
};

function sentence(o: AppendOutcome): string {
  if (!o.success) return o.error ?? "That didn't save.";
  const parts = [`${o.inserted} added`];
  if (o.updated > 0) parts.push(`${o.updated} updated`);
  if (o.skipped > 0) parts.push(`${o.skipped} already there`);
  return parts.join(" · ");
}

export function ToolResultTableBar({ callId, toolId, toolName, output, finishedAt }: Props) {
  const userId = useAppSelector(selectUserId) ?? null;
  const marker = output !== null && typeof output === "object" ? (output as Record<string, unknown>)[KIND_KEY] : null;
  const kind = typeof marker === "string" ? marker : null;
  const schema = useKindSchema(kind);
  const described = describeRows(output, schema);
  const { binding, ready, loadFailed, save } = useToolTableBinding(userId, toolId);
  const openSaveToTable = useOpenSaveToTable();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const autoDone = useRef<string | null>(null);

  async function addToBound() {
    if (!binding || !described) return;
    setBusy(true);
    try {
      const outcome = await appendResultRows(binding.tableId, described);
      setNote(sentence(outcome));
      if (outcome.success && outcome.tableName && outcome.tableName !== binding.tableName) {
        await save({ ...binding, tableName: outcome.tableName });
      }
    } catch (err) {
      setNote(err instanceof Error ? err.message : "That didn't save.");
    } finally {
      setBusy(false);
    }
  }

  async function keep(next: ToolTableBinding | null) {
    try {
      await save(next);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "That didn't save.");
    }
  }

  useEffect(() => {
    const fresh = finishedAt ? Date.now() - new Date(finishedAt).getTime() < 90_000 : false;
    if (!ready || !binding?.auto || !described || !fresh || autoDone.current === callId) return;
    autoDone.current = callId;
    void addToBound();
    // one append per finished call
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, binding?.auto, callId, described?.rows.length]);

  if (!described || !userId || !toolId || !ready) return null;
  if (loadFailed) {
    return (
      <div data-tool-table-bar="" className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
        Your saved table could not be read. Reload to try again.
      </div>
    );
  }

  function chooseTable() {
    if (!openSaveToTable || !described) return;
    openSaveToTable({
      grid: { ...asGrid(described), from: "answer" },
      title: toolName ?? "Tool answer",
      onSaved: async (event) => {
        const meta = event.tableName ? null : await getTableMetadata({ tableId: event.tableId });
        const tableName = event.tableName ?? (meta && !isServiceFailure(meta) ? meta.data.table.table_name : null);
        await keep({ tableId: event.tableId, tableName, auto: binding?.auto ?? false });
        setNote("Saved. Next time it's one press.");
      },
    });
  }

  return (
    <div data-tool-table-bar="" className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
      <Table2 className="h-4 w-4 text-muted-foreground" aria-hidden />
      <span className="text-sm text-foreground">
        {described.rows.length} {described.rows.length === 1 ? "row" : "rows"}
      </span>
      {binding ? (
        <>
          <Button onClick={() => void addToBound()} disabled={busy} data-tool-table-add="">
            {busy ? "Adding…" : `Add to ${binding.tableName ?? "your table"}`}
          </Button>
          <Button variant="quiet" onClick={chooseTable}>
            Change table
          </Button>
          <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={binding.auto} onCheckedChange={(auto: boolean) => void keep({ ...binding, auto })} aria-label="Add every run" />
            Add every run
          </label>
        </>
      ) : (
        <Button variant="outline" onClick={chooseTable} data-tool-table-choose="">
          Save to a table
        </Button>
      )}
      {note ? (
        <span className="basis-full text-xs text-muted-foreground" data-tool-table-note="">
          {note}
        </span>
      ) : null}
    </div>
  );
}
