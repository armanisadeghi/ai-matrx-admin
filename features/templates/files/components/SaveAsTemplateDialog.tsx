"use client";

/**
 * File › Save as template (workbooks and documents). Saves the record's latest
 * saved content as a template in the active organization, in the lane picked:
 * Mine (only me), My organization, or Community (everyone on AI Matrx).
 */
import { useState, type ReactNode } from "react";
import { Button, SegmentedControl, Select } from "@ai-matrx/design-system/controls";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProInput } from "@/components/official/ProInput";
import { ProTextarea } from "@/components/official/ProTextarea";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { toast } from "@/lib/toast";
import { TEMPLATE_CATEGORIES, type SaveTemplateLane, type TemplateKind, type TemplateSummary } from "../types";
import { saveAsTemplate } from "../template-service";

const LANES: readonly { value: SaveTemplateLane; label: string }[] = [
  { value: "mine", label: "Only me" },
  { value: "org", label: "My organization" },
  { value: "community", label: "Everyone" },
];

export function SaveAsTemplateDialog({
  kind,
  recordId,
  name: recordName = "",
  onClose,
  onSaved,
}: {
  kind: TemplateKind;
  recordId: string;
  name?: string;
  onClose: () => void;
  onSaved?: (t: TemplateSummary) => void;
}): ReactNode {
  const [name, setName] = useState(recordName);
  const [category, setCategory] = useState<string>(TEMPLATE_CATEGORIES[1]);
  const [description, setDescription] = useState("");
  const [lane, setLane] = useState<SaveTemplateLane>("org");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const t = await saveAsTemplate(kind, recordId, { name, category, description, lane });
      toast.success(`Saved "${t.name}" as a template`);
      onSaved?.(t);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save as template</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Name
            <ProInput value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Category
            <Select
              value={category}
              onValueChange={setCategory}
              options={TEMPLATE_CATEGORIES.map((c) => ({ value: c, label: c }))}
              aria-label="Category"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Description
            <ProTextarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Optional"
            />
          </label>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            Who can use it
            <SegmentedControl value={lane} onValueChange={setLane} data={LANES} fill aria-label="Who can use it" />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
              <ErrorAlchemyMenu error={error} />
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="quiet" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void save()} disabled={busy || !name.trim()}>
            {busy ? "Saving…" : "Save template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
