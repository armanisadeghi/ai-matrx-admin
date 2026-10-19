"use client";

/**
 * An organization's own value for each curated System context item (lane L3b). Each row shows the
 * platform value beside the organization's own; an owner/admin edits it (saved through the value
 * door) or resets it to the platform value. Everyone else reads the same rows without the editor.
 */

import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";

import { Skeleton } from "@ai-matrx/design-system";
import { Input } from "@ai-matrx/design-system/controls";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import {
  clearOrgSystemValue,
  loadOrgSystemValues,
  saveOrgSystemValue,
  type OrgSystemValueRow,
  type OrgValueClient,
} from "./orgSystemValues";

export interface OrgSystemValuesSectionProps {
  organizationId: string;
  canEdit: boolean;
  /** The supabase client (the page passes the browser one). */
  client: unknown;
}

function show(value: unknown): string {
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

/** Text for a string item; anything else is JSON. */
function parse(valueType: string, text: string): { ok: true; value: unknown } | { ok: false } {
  if (valueType === "string") return { ok: true, value: text };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

function Row({
  row,
  organizationId,
  canEdit,
  client,
  onChanged,
}: {
  row: OrgSystemValueRow;
  organizationId: string;
  canEdit: boolean;
  client: unknown;
  onChanged: () => void;
}) {
  const own = row.orgValue !== undefined;
  const [draft, setDraft] = useState(show(row.orgValue));
  const [busy, setBusy] = useState(false);
  useEffect(() => setDraft(show(row.orgValue)), [row.orgValue]);

  const dirty = draft !== show(row.orgValue);
  const parsed = parse(row.valueType, draft);

  async function run(action: () => ReturnType<typeof saveOrgSystemValue>) {
    setBusy(true);
    try {
      const res = await action();
      if (!res.ok) toast.error(res.message);
      else onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)_minmax(0,1.4fr)] items-center gap-3 border-b border-border py-2 last:border-b-0">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{row.displayName}</div>
        <div className="truncate font-mono text-xs text-muted-foreground">{row.key}</div>
      </div>
      <div className="truncate text-sm text-muted-foreground" title={show(row.defaultValue)}>
        {show(row.defaultValue)}
      </div>
      {canEdit ? (
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            aria-label={`${row.displayName} for this organization`}
            placeholder={show(row.defaultValue)}
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button
            variant="outline"
            icon={<Save />}
            aria-label={`Save ${row.displayName}`}
            disabled={busy || !dirty || draft === "" || !parsed.ok}
            onClick={() =>
              parsed.ok &&
              run(() => saveOrgSystemValue(client, { organizationId, itemId: row.itemId, value: parsed.value }))
            }
          />
          <Button
            variant="outline"
            icon={<RotateCcw />}
            aria-label={`Reset ${row.displayName}`}
            disabled={busy || !own}
            onClick={() => run(() => clearOrgSystemValue(client, { organizationId, itemId: row.itemId }))}
          />
        </div>
      ) : (
        <div className="truncate text-sm" title={show(row.orgValue)}>
          {own ? show(row.orgValue) : "—"}
        </div>
      )}
    </li>
  );
}

export function OrgSystemValuesSection({ organizationId, canEdit, client }: OrgSystemValuesSectionProps) {
  const [rows, setRows] = useState<OrgSystemValueRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadOrgSystemValues(client as OrgValueClient, organizationId)
      .then((r) => !cancelled && (setRows(r), setError(null)))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [client, organizationId, tick]);

  if (error) {
    return (
      <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
        <span>{error}</span>
        <Button variant="outline" onClick={() => setTick((t) => t + 1)}>
          Retry
        </Button>
      </div>
    );
  }
  if (!rows) {
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-10 rounded-md" />
        <Skeleton className="h-10 rounded-md" />
      </div>
    );
  }
  if (rows.length === 0) return <div className="text-sm text-muted-foreground">No System items</div>;

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)_minmax(0,1.4fr)] gap-3 border-b border-border pb-1 text-xs font-medium text-muted-foreground">
        <span>Item</span>
        <span>Platform</span>
        <span>This organization</span>
      </div>
      <ul>
        {rows.map((r) => (
          <Row
            key={r.itemId}
            row={r}
            organizationId={organizationId}
            canEdit={canEdit}
            client={client}
            onChanged={() => setTick((t) => t + 1)}
          />
        ))}
      </ul>
    </div>
  );
}
