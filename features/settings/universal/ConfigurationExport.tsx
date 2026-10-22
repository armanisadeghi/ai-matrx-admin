"use client";

// features/settings/universal/ConfigurationExport.tsx
//
// "Copy configuration" and "Compare" for an organization's effective settings —
// platform value + the organization's own value + where the answer came from —
// read from `platform.knob_configuration` (lib/scoped-config/history.ts). Compare
// answers against another organization the person belongs to, or against the same
// organization at an earlier moment, replayed from the settings change log.

import { useState } from "react";
import { ClipboardCopy, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateTimeField } from "@ai-matrx/design-system/controls";
import { MatrxComparisonTable, type ComparisonRow } from "@ai-matrx/design-system/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import { openClipboardFallback } from "@ai-matrx/kit/clipboard-fallback-opener";
import { extractErrorMessage } from "@/utils/errors";
import { OrganizationChooser } from "@/features/organizations/components/OrganizationChooser";
import { formatKnobValue } from "@/lib/scoped-config/ladder";
import {
  diffConfigurations,
  fetchOrganizationConfiguration,
  type ConfigurationDifference,
} from "@/lib/scoped-config/history";
import { copyText } from "@ai-matrx/kit/clipboard";
import { copyNotify } from "@/lib/clipboard/copy-notify";

async function copyConfiguration(text: string, title: string) {
  // The manual-copy dialog is the failure surface here, so no error toast is injected.
  if (await copyText(text)) {
    copyNotify(`${title} copied.`, "success");
    return;
  }
  void openClipboardFallback(text, { title, description: "Your browser blocked the clipboard; copy it from here." });
}

export function ConfigurationExport(props: {
  organizationId: string;
  organizationName: string;
}) {
  const { organizationId, organizationName } = props;
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"date" | "organization">("date");
  const [otherOrg, setOtherOrg] = useState<string>("");
  const [asOf, setAsOf] = useState<string>("");
  const [result, setResult] = useState<{
    leftName: string;
    rightName: string;
    rows: ConfigurationDifference[];
    note: string | null;
  } | null>(null);
  const [otherName, setOtherName] = useState<string>("");

  const copy = async () => {
    setBusy(true);
    try {
      const config = await fetchOrganizationConfiguration(organizationId);
      await copyConfiguration(
        JSON.stringify({ organization: organizationName, ...config }, null, 2),
        `${organizationName}'s configuration`,
      );
    } catch (err) {
      toast.error(`The configuration could not be read: ${extractErrorMessage(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const compare = async () => {
    setBusy(true);
    setResult(null);
    try {
      const now = await fetchOrganizationConfiguration(organizationId);
      if (mode === "organization") {
        if (!otherOrg) return;
        const other = { id: otherOrg, name: otherName };
        const theirs = await fetchOrganizationConfiguration(other.id);
        setResult({
          leftName: organizationName,
          rightName: other.name,
          rows: diffConfigurations(now, theirs),
          note: null,
        });
      } else {
        if (!asOf) return;
        const at = new Date(asOf).toISOString();
        const then = await fetchOrganizationConfiguration(organizationId, at);
        const since = then.history_covers_platform_since;
        setResult({
          leftName: `On ${new Date(asOf).toLocaleString()}`,
          rightName: "Now",
          rows: diffConfigurations(then, now),
          note:
            since && new Date(at) < new Date(since)
              ? `History starts ${new Date(since).toLocaleDateString()}; earlier values show as they are now.`
              : null,
        });
      }
    } catch (err) {
      toast.error(`The comparison could not be made: ${extractErrorMessage(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const canCompare = mode === "organization" ? Boolean(otherOrg) : Boolean(asOf);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button icon={<ClipboardCopy />} variant="outline" disabled={busy} onClick={() => void copy()}>
        Copy configuration
      </Button>
      <Button icon={<GitCompareArrows />} variant="outline" disabled={busy} onClick={() => setOpen(true)}>
        Compare
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compare {organizationName}&rsquo;s configuration</DialogTitle>
            <DialogDescription>
              Every setting whose value in effect differs, against an earlier moment or another organization you belong to.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-end gap-2">
            <Select value={mode} onValueChange={(v) => setMode(v as "date" | "organization")}>
              <SelectTrigger className="w-56" aria-label="Compare against">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">This organization at an earlier moment</SelectItem>
                <SelectItem value="organization">Another organization</SelectItem>
              </SelectContent>
            </Select>
            {mode === "date" ? (
              <DateTimeField
                aria-label="Moment to compare against"
                className="w-56"
                value={asOf}
                onValueChange={(v) => setAsOf(v ?? "")}
              />
            ) : (
              <OrganizationChooser
                className="w-56"
                value={otherOrg || null}
                valueName={otherName || null}
                excludeId={organizationId}
                placeholder="Pick an organization"
                onChange={(org) => {
                  setOtherOrg(org.id);
                  setOtherName(org.name);
                }}
              />
            )}
            <Button variant="primary" disabled={busy || !canCompare} onClick={() => void compare()}>
              {busy ? "Comparing…" : "Compare"}
            </Button>
          </div>
          {result && (
            <div className="max-h-[50vh] overflow-y-auto rounded-md border border-border">
              {result.note && <p className="border-b border-border px-3 py-2 text-xs text-muted-foreground">{result.note}</p>}
              {result.rows.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">No differences — every setting has the same value in effect.</p>
              ) : (
                // read-gate-exempt: rows of the comparison the person just ran; result is cleared when it starts and set only when both reads returned
                <MatrxComparisonTable
                  title="Settings that differ"
                  hideTitle
                  location="Settings — compare organizations"
                  cornerLabel={`Setting (${result.rows.length} differ)`}
                  subjects={[
                    { id: "left", label: result.leftName },
                    { id: "right", label: result.rightName },
                  ]}
                  rows={result.rows.map((row): ComparisonRow => ({
                    id: row.key,
                    label: row.label,
                    header: (
                      <span className="flex flex-col">
                        <span className="font-medium">{row.label}</span>
                        <code className="text-[10px] text-muted-foreground">{row.key}</code>
                      </span>
                    ),
                    cell: (subject) => {
                      const value = subject.id === "left" ? row.left : row.right;
                      const own = (subject.id === "left" ? row.leftOrigin : row.rightOrigin) === "organization";
                      if (value === undefined) return null;
                      const shown = formatKnobValue(value);
                      return {
                        text: own ? `${shown} (own)` : shown,
                        node: (
                          <span>
                            {shown}
                            {own && <span className="ml-1 text-muted-foreground">(own)</span>}
                          </span>
                        ),
                      };
                    },
                  }))}
                  rowHeaderWidth={240}
                  subjectWidth={200}
                  aiContext="Every setting whose value in effect differs between two organizations."
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
