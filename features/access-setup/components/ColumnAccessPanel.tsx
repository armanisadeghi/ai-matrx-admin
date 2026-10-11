"use client";

// features/access-setup/components/ColumnAccessPanel.tsx
//
// WHO CAN SEE AND EDIT ONE COLUMN (access-setup PLAN §12, Store Tables, phase 1). Opened from a Table
// column's header menu through the records-ui host port `columnAccess`. It reads ONE door
// (custom.field_access_setup) and writes ONE door (custom.field_access_set): the column's part (a name
// like "Pay"; every column in a part answers one way) and how private the part is. Before anything is
// saved it asks the same read door with the proposal and shows who loses sight or editing. Table admins
// change it (the doors refuse everyone else, and never let an agent write a part); others only read it.

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Badge, Button, EmptyState, RegionSkeleton, SegmentedControl } from "@ai-matrx/design-system/controls";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProInput } from "@/components/official/ProInput";
import { toast } from "@/lib/toast";
import { fetchColumnAccess, saveColumnAccess, type ColumnAccess, type ColumnAccessPerson } from "../columnAccessService";
import { PersonRow } from "./SeatParts";

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
  internal: "Everyone on the table",
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
          </div>
        )}
        <DialogFooter className="items-center gap-2">
          {lose ? (
            <span className="mr-auto text-sm text-muted-foreground">
              {lose.losesSight} lose sight · {lose.losesEdit} lose editing
            </span>
          ) : null}
          <Button variant="quiet" onClick={subject.onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!view?.mayChange || !changed || saving} onClick={() => void save()}>
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
