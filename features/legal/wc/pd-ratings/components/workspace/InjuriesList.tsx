"use client";

import * as React from "react";
import { Plus, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { InjuryCard } from "./InjuryCard";
import { InjuryEditor } from "./InjuryEditor";
import { useImpairmentDefinition } from "./ImpairmentSearch";
import type { InjuryDraft } from "../../state/types";
import type { StatelessRatingResponse, WcImpairmentDefinitionRead } from "../../api/types";

interface InjuriesListProps {
  injuries: InjuryDraft[];
  onAdd: (seed?: Partial<InjuryDraft>) => string;
  onUpdate: (tmpId: string, patch: Partial<InjuryDraft>) => void;
  onRemove: (tmpId: string) => void;
  liveResult?: StatelessRatingResponse | null;
  className?: string;
}

export function InjuriesList({
  injuries,
  onAdd,
  onUpdate,
  onRemove,
  liveResult,
  className,
}: InjuriesListProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [newlyAddedId, setNewlyAddedId] = React.useState<string | null>(null);

  const editing = injuries.find((i) => i.tmpId === editingId);

  const warningsByIndex = React.useMemo(() => {
    const map = new Map<number, string[]>();
    if (!liveResult?.injuries) return map;
    liveResult.injuries.forEach((inj, idx) => {
      if (inj.warnings.length > 0) map.set(idx, inj.warnings);
    });
    return map;
  }, [liveResult]);

  const handleAdd = () => {
    const id = onAdd();
    setNewlyAddedId(id);
    setEditingId(id);
  };

  const handleClose = () => {
    setEditingId(null);
    setNewlyAddedId(null);
  };

  const handleDelete = () => {
    if (editingId) onRemove(editingId);
    setEditingId(null);
    setNewlyAddedId(null);
  };

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-sm",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 ring-1 ring-primary/15">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              Injuries
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {injuries.length === 0
                ? "Add the impairments from the medical evaluation."
                : `${injuries.length} ${injuries.length === 1 ? "injury" : "injuries"} on this report.`}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add injury
        </Button>
      </header>

      {injuries.length === 0 ? (
        <EmptyInjuries onAdd={handleAdd} />
      ) : (
        <div className="space-y-2.5">
          {injuries.map((injury, idx) => (
            <InjuryCard
              key={injury.tmpId}
              index={idx}
              injury={injury}
              onEdit={() => setEditingId(injury.tmpId)}
              onDelete={() => onRemove(injury.tmpId)}
              warnings={warningsByIndex.get(idx) ?? []}
            />
          ))}
        </div>
      )}

      {editing && (
        <InjuryEditorWrapper
          injury={editing}
          isNew={editing.tmpId === newlyAddedId}
          onChange={(patch) => onUpdate(editing.tmpId, patch)}
          onClose={handleClose}
          onDelete={editing.tmpId === newlyAddedId ? undefined : handleDelete}
        />
      )}
    </section>
  );
}

function InjuryEditorWrapper({
  injury,
  isNew,
  onChange,
  onClose,
  onDelete,
}: {
  injury: InjuryDraft;
  isNew: boolean;
  onChange: (patch: Partial<InjuryDraft>) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const resolvedDefinition = useImpairmentDefinition(injury.impairment_definition_id);

  return (
    <InjuryEditor
      open
      injury={injury}
      onChange={onChange}
      onClose={onClose}
      onDelete={onDelete}
      onSelectImpairment={(def: WcImpairmentDefinitionRead | null) => {
        if (!def?.id) {
          onChange({ impairment_definition_id: null });
          return;
        }
        const patch: Partial<InjuryDraft> = {
          impairment_definition_id: def.id,
        };
        if (!def.attributes.wpi) patch.wpi = null;
        if (!def.attributes.ue) patch.ue = null;
        if (!def.attributes.le) patch.le = null;
        if (!def.attributes.digit) patch.digit = null;
        if (!def.attributes.side) patch.side = "default";
        onChange(patch);
      }}
      resolvedDefinition={resolvedDefinition}
      isNew={isNew}
    />
  );
}

function EmptyInjuries({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className={cn(
        "w-full rounded-xl border border-dashed border-border bg-muted/30",
        "px-6 py-10 text-center transition-colors",
        "hover:border-primary/50 hover:bg-primary/5",
      )}
    >
      <Plus className="h-5 w-5 mx-auto text-muted-foreground" />
      <p className="mt-2 text-sm font-medium text-foreground">
        Add your first injury
      </p>
      <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
        Search the AMA Guides catalog and enter the percentages from the medical
        evaluation.
      </p>
    </button>
  );
}
