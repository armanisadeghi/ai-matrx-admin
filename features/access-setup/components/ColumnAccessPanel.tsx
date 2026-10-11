"use client";

// features/access-setup/components/ColumnAccessPanel.tsx
//
// WHO CAN SEE AND EDIT ONE COLUMN (access-setup PLAN §12, §12.1). Opened from a Table column's header menu
// through the records-ui host port `columnAccess`. A column in a named PART ("Pay") is edited as the part's seats —
// Table admins, editors, viewers, the person named in a person column on that row, the row's creator, organization
// admins — and saved through the Table setup door (custom.table_access_setup_set: check-gated, audited, archived
// versions with Restore, other admins told when an admin widens their own sight). A column in no part keeps its
// privacy word (custom.field_access_set). Before anything is saved the store says who loses sight. Table admins
// change it (the doors refuse everyone else, and never an agent); others only read it.

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Badge, Button, EmptyState, RegionSkeleton, SegmentedControl } from "@ai-matrx/design-system/controls";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProInput } from "@/components/official/ProInput";
import { toast } from "@/lib/toast";
import { fetchColumnAccess, saveColumnAccess, type ColumnAccess, type ColumnAccessPerson } from "../columnAccessService";
import { PersonRow } from "./SeatParts";
import {
  fetchTableAccess,
  previewTableSetup,
  revertTableSetup,
  saveTableSetup,
  storeSeat,
  type CellLevel,
  type Reach,
  type SetupPreview,
  type TableAccess,
  type TableSetup,
} from "../tableSetupService";

/** The records-ui `ColumnAccessSubject`, named here so this file compiles against any installed version. */
export interface ColumnAccessPanelSubject {
  tableId: string;
  fieldId: string;
  name: string;
  onClose: () => void;
  onChanged?: () => void;
}

const WORD_LABEL: Record<string, string> = {
  public: "Public",
  internal: "Everyone",
  confidential: "Confidential",
  restricted: "Restricted",
};

function personNote(p: ColumnAccessPerson, proposing: boolean): { note: string; tone: "neutral" | "success" | "warning" | "info" } {
  if (proposing && p.sees && p.seesNext === false) return { note: "Loses sight", tone: "warning" };
  if (proposing && p.edits && p.editsNext === false) return { note: "Loses editing", tone: "info" };
  if (proposing && !p.sees && p.seesNext) return { note: "Gains sight", tone: "success" };
  if (p.edits) return { note: "Edits", tone: "neutral" };
  if (p.sees) return { note: "Sees", tone: "neutral" };
  return { note: "Hidden", tone: "neutral" };
}

type StoreSeatInput = Record<string, string>;

export function ColumnAccessPanel({ subject }: { subject: ColumnAccessPanelSubject }) {
  const [view, setView] = useState<ColumnAccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [part, setPart] = useState("");
  const [word, setWord] = useState<string | null>(null);
  const [preview, setPreview] = useState<ColumnAccess | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    void fetchColumnAccess(subject.fieldId, null).then((r) => {
      if (!live) return;
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setView(r.data);
      setPart(r.data.field.part ?? "");
      setWord(r.data.field.word);
    });
    return () => {
      live = false;
    };
  }, [subject.fieldId]);

  const changed = view !== null && word !== null && (word !== view.field.word || part.trim() !== (view.field.part ?? ""));

  // WHO LOSES SIGHT, asked of the store before anything is saved (never worked out in the browser).
  useEffect(() => {
    if (!view || !changed || word === null) {
      setPreview(null);
      return;
    }
    let live = true;
    const t = setTimeout(() => {
      void fetchColumnAccess(subject.fieldId, { word, part: part.trim() || null }).then((r) => {
        if (live && r.ok) setPreview(r.data);
      });
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [view, changed, word, part, subject.fieldId]);

  const save = async () => {
    if (!view || word === null) return;
    setSaving(true);
    const r = await saveColumnAccess(subject.fieldId, part.trim() || null, word);
    setSaving(false);
    if (!r.ok) {
      toast.error(r.message);
      return;
    }
    toast.success(`${subject.name}: saved.`);
    subject.onChanged?.();
    subject.onClose();
  };

  // ── PART MODE: the column sits in a named part; its seats are the Table setup's cells on that part ──
  const [table, setTable] = useState<TableAccess | null>(null);
  const [cells, setCells] = useState<Record<string, CellLevel | "hidden">>({});
  const [setupPreview, setSetupPreview] = useState<SetupPreview | null>(null);
  const partName = part.trim();
  const partKey = partName ? `part:${partName.toLowerCase()}` : "";

  useEffect(() => {
    let live = true;
    void fetchTableAccess(subject.tableId).then((r) => {
      if (live && r.ok) setTable(r.data);
    });
    return () => {
      live = false;
    };
  }, [subject.tableId]);

  const seatRows: Array<{ key: string; label: string; seat: StoreSeatInput; levels: Array<CellLevel | "hidden"> }> = table
    ? [
        { key: "editors", label: "Editors", seat: { kind: "row_level", min: "editor" }, levels: ["hidden", "viewer", "editor"] },
        { key: "viewers", label: "Viewers and commenters", seat: { kind: "row_level", min: "viewer" }, levels: ["hidden", "viewer"] },
        ...table.columns
          .filter((c) => c.person)
          .map((c) => ({
            key: `row_${c.key}`,
            label: `${c.label} on that row`,
            seat: { kind: "row_field", field_id: c.id } as StoreSeatInput,
            levels: ["hidden", "viewer", "editor"] as Array<CellLevel | "hidden">,
          })),
        { key: "row_creator", label: "Who made the row", seat: { kind: "row_creator" }, levels: ["hidden", "viewer"] },
        { key: "org_admins", label: "Organization admins", seat: { kind: "org_role", role: "admin" }, levels: ["hidden", "viewer", "editor"] },
      ]
    : [];

  // the part's current cells, read from the setup whenever the part name changes
  useEffect(() => {
    if (!table || !partKey) return;
    const g = table.setup?.grid ?? {};
    const next: Record<string, CellLevel | "hidden"> = {};
    for (const [seatKey, row] of Object.entries(g)) {
      const lvl = row[partKey]?.level;
      if (lvl && seatKey !== "table_admin") next[seatKey] = lvl;
    }
    setCells(next);
  }, [table, partKey]);

  const proposedSetup = (): TableSetup => {
    const base: TableSetup = table?.setup
      ? { admin_seats: [...table.setup.admin_seats], seats: [...table.setup.seats], grid: structuredClone(table.setup.grid) }
      : { admin_seats: ["table_admin"], seats: [], grid: {} };
    const ensure = (key: string, seat: StoreSeatInput, required = false) => {
      if (!base.seats.some((x) => x.key === key)) base.seats.push(storeSeat(key, seat, required));
    };
    ensure("table_admin", { kind: "row_level", min: "admin" }, true);
    if (!base.admin_seats.includes("table_admin")) base.admin_seats.push("table_admin");
    base.grid.table_admin = { ...(base.grid.table_admin ?? {}), [partKey]: { level: "editor" } };
    for (const row of seatRows) {
      const lvl = cells[row.key] ?? "hidden";
      const g = { ...(base.grid[row.key] ?? {}) };
      if (lvl === "hidden") delete g[partKey];
      else {
        ensure(row.key, row.seat);
        g[partKey] = { level: lvl };
      }
      if (Object.keys(g).length > 0) base.grid[row.key] = g;
      else delete base.grid[row.key];
    }
    return base;
  };

  const partChanged = Boolean(table && partKey) && (JSON.stringify(proposedSetup()) !== JSON.stringify(table?.setup) || partName !== (view?.field.part ?? ""));

  useEffect(() => {
    if (!table || !partKey || !partChanged) {
      setSetupPreview(null);
      return;
    }
    let live = true;
    const t = setTimeout(() => {
      void previewTableSetup(subject.tableId, proposedSetup(), { [subject.fieldId]: partName }).then((r) => {
        if (live && r.ok) setSetupPreview(r.data);
      });
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [table, partKey, partChanged, cells, partName, subject.tableId, subject.fieldId]);

  const savePart = async () => {
    if (!table) return;
    setSaving(true);
    const r = await saveTableSetup(subject.tableId, proposedSetup(), { [subject.fieldId]: partName }, `Who can see and edit ${partName}`);
    setSaving(false);
    if (!r.ok) {
      toast.error(r.message);
      return;
    }
    toast.success(r.data.notified > 0 ? `${partName}: saved. The other table admins were told.` : `${partName}: saved.`);
    subject.onChanged?.();
    subject.onClose();
  };

  const restore = async (auditId: string) => {
    const r = await revertTableSetup(subject.tableId, auditId);
    if (!r.ok) {
      toast.error(r.message);
      return;
    }
    toast.success("Restored the earlier version.");
    subject.onChanged?.();
    subject.onClose();
  };

  const reachNote = (now: Reach, next: Reach | null): { note: string; tone: "neutral" | "success" | "warning" | "info" } => {
    const words: Record<Reach, string> = { all: "Sees", own_rows: "Own rows", none: "Hidden" };
    if (next && now !== "none" && (next === "none" || (now === "all" && next === "own_rows"))) return { note: next === "none" ? "Loses sight" : "Own rows only", tone: "warning" };
    if (next && ((now === "none" && next !== "none") || (now === "own_rows" && next === "all"))) return { note: "Gains sight", tone: "success" };
    return { note: words[now], tone: "neutral" };
  };

  const people = preview?.people ?? view?.people ?? [];
  const lose = preview?.proposed;

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : subject.onClose())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            Who can see and edit {subject.name}
          </DialogTitle>
        </DialogHeader>
        {error ? (
          <EmptyState icon={<Lock className="h-5 w-5" />} title="Could not load who sees this column" line={error} />
        ) : !view ? (
          <RegionSkeleton shape="rows" />
        ) : (
          <div className="flex flex-col gap-3">
            {!view.mayChange && view.whyNot ? <p className="text-sm text-muted-foreground">{view.whyNot}</p> : null}
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Part</span>
              <ProInput
                value={part}
                onChange={(e) => setPart(e.target.value)}
                placeholder="Pay"
                maxLength={40}
                disabled={!view.mayChange}
                list="column-access-parts"
              />
              <datalist id="column-access-parts">
                {view.parts.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </label>
            {view.partColumns.length > 0 ? (
              <p className="text-xs text-muted-foreground">Also in this part: {view.partColumns.join(", ")}</p>
            ) : null}
            {partKey && table ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span>Table admins</span>
                    <span className="text-xs text-muted-foreground">Always edit</span>
                  </div>
                  {seatRows.map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">{row.label}</span>
                      <SegmentedControl<CellLevel | "hidden">
                        aria-label={row.label}
                        value={cells[row.key] ?? "hidden"}
                        onValueChange={(v) => (view.mayChange ? setCells((c) => ({ ...c, [row.key]: v })) : undefined)}
                        data={row.levels.map((l) => ({ value: l, label: l === "hidden" ? "Hidden" : l === "viewer" ? "Read" : "Edit", disabled: !view.mayChange }))}
                      />
                    </div>
                  ))}
                </div>
                {setupPreview && setupPreview.problems.length > 0 ? (
                  <p className="text-xs text-destructive">{setupPreview.problems[0]}</p>
                ) : null}
                <div className="max-h-56 overflow-y-auto rounded-md border border-border">
                  {(setupPreview?.people ?? []).map((p) => {
                    const c = p.columns[view.field.key];
                    const { note, tone } = c ? reachNote(c.sees, c.seesNext) : { note: "Hidden", tone: "neutral" as const };
                    return (
                      <div key={p.userId} className="border-b border-border px-2 py-1 last:border-b-0">
                        <PersonRow person={{ userId: p.userId, name: p.name, email: p.email, avatarUrl: null }} note={note} tone={tone} />
                      </div>
                    );
                  })}
                </div>
                {table.versions.length > 0 && view.mayChange ? (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Last change {new Date(table.versions[0].at).toLocaleString()}</span>
                    <Button variant="quiet" onClick={() => void restore(table.versions[0].auditId)}>
                      Restore earlier
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <>
            <SegmentedControl<string>
              aria-label="How private"
              fill
              value={word}
              onValueChange={(w) => (view.mayChange ? setWord(w) : undefined)}
              data={view.words.map((w) => ({
                value: w.word,
                label: WORD_LABEL[w.word] ?? w.word,
                title: `Reads: ${w.readNeeds} · Edits: ${w.editNeeds}`,
                disabled: !view.mayChange,
              }))}
            />
            <div className="max-h-72 overflow-y-auto rounded-md border border-border">
              {people.map((p) => {
                const { note, tone } = personNote(p, Boolean(preview));
                return (
                  <div key={p.userId} className="border-b border-border px-2 py-1 last:border-b-0">
                    <PersonRow person={{ userId: p.userId, name: p.name, email: p.email, avatarUrl: null }} note={note} tone={tone} />
                  </div>
                );
              })}
            </div>
              </>
            )}
          </div>
        )}
        <DialogFooter className="items-center gap-2">
          {partKey && setupPreview ? (
            <span className="mr-auto text-sm text-muted-foreground">
              {setupPreview.losesSight} lose sight · {setupPreview.losesEdit} lose editing
            </span>
          ) : lose ? (
            <span className="mr-auto text-sm text-muted-foreground">
              {lose.losesSight} lose sight · {lose.losesEdit} lose editing
            </span>
          ) : null}
          <Button variant="quiet" onClick={subject.onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!view?.mayChange || saving || (partKey && table ? !partChanged || (setupPreview?.problems.length ?? 0) > 0 : !changed)}
            onClick={() => void (partKey && table ? savePart() : save())}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The records-ui host port: `columnAccess: recordStoreColumnAccess`. */
export function recordStoreColumnAccess(subject: ColumnAccessPanelSubject) {
  return <ColumnAccessPanel subject={subject} />;
}
