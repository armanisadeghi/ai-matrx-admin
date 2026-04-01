"use client";

/**
 * AgentContextSlotsManager
 *
 * Smart component — manages context slots for the active agent.
 * UI matches Variables row: compact chips (key only) + Dialog/Drawer editor.
 * Persists `ContextSlot` shape (`key`, `type`, optional label/description).
 */

import { useState, useCallback } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectAgentContextSlots } from "@/features/agents/redux/agent-definition/selectors";
import { setAgentContextSlots } from "@/features/agents/redux/agent-definition/slice";
import type {
  ContextObjectType,
  ContextSlot,
} from "@/features/agents/types/agent-api-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { sanitizeVariableName } from "@/features/prompts/utils/variable-utils";

const CONTEXT_TYPES: ContextObjectType[] = [
  "text",
  "file_url",
  "json",
  "db_ref",
  "user",
  "org",
  "workspace",
  "project",
  "task",
];

interface SlotFormState {
  key: string;
  label: string;
  description: string;
  type: ContextObjectType;
}

const EMPTY_FORM: SlotFormState = {
  key: "",
  label: "",
  description: "",
  type: "text",
};

function getSlotKey(slot: ContextSlot): string {
  if (slot.key) return slot.key;
  const legacy = slot as unknown as { id?: string };
  return legacy.id ?? "";
}

function toContextSlot(form: SlotFormState): ContextSlot {
  const key = form.key.trim() ? sanitizeVariableName(form.key) : "";
  const slot: ContextSlot = {
    key,
    type: form.type,
  };
  if (form.label.trim()) slot.label = form.label.trim();
  if (form.description.trim()) slot.description = form.description.trim();
  return slot;
}

interface SlotEditorFieldsProps {
  form: SlotFormState;
  onChange: (patch: Partial<SlotFormState>) => void;
  isEdit: boolean;
  keyDuplicate: boolean;
  /** False when key is non-empty but fails validation */
  keyRulesOk: boolean;
}

function SlotEditorFields({
  form,
  onChange,
  isEdit,
  keyDuplicate,
  keyRulesOk,
}: SlotEditorFieldsProps) {
  return (
    <div className="space-y-4 py-1">
      <div className="space-y-1.5">
        <Label htmlFor="slot-key">Context key</Label>
        <Input
          id="slot-key"
          value={form.key}
          onChange={(e) => onChange({ key: e.target.value })}
          placeholder="clipboard_content"
          disabled={isEdit}
          style={{ fontSize: "16px" }}
        />
        {keyDuplicate && (
          <p className="text-xs text-destructive">This key already exists.</p>
        )}
        {form.key.trim() && !keyRulesOk && (
          <p className="text-xs text-muted-foreground">
            Use letters, numbers, and underscores only. Start with a letter.
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="slot-type">Type</Label>
        <Select
          value={form.type}
          onValueChange={(v) => onChange({ type: v as ContextObjectType })}
        >
          <SelectTrigger id="slot-type" className="text-base w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTEXT_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="text-xs">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="slot-label">Label (optional)</Label>
        <Input
          id="slot-label"
          value={form.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Clipboard content"
          style={{ fontSize: "16px" }}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="slot-desc">Description (optional)</Label>
        <Textarea
          id="slot-desc"
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What this slot provides at runtime…"
          className="min-h-[80px] resize-y"
          style={{ fontSize: "16px" }}
        />
      </div>
    </div>
  );
}

interface AgentContextSlotsManagerProps {
  agentId: string;
}

export function AgentContextSlotsManager({
  agentId,
}: AgentContextSlotsManagerProps) {
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();
  const slots = useAppSelector((state) =>
    selectAgentContextSlots(state, agentId),
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState<SlotFormState>(EMPTY_FORM);

  const patchForm = useCallback((patch: Partial<SlotFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const sanitizedKey = form.key.trim() ? sanitizeVariableName(form.key) : "";
  const keyValid =
    /^[a-z_][a-z0-9_]*$/.test(sanitizedKey) && sanitizedKey.length > 0;

  const existingKeys = slots
    .map((s, i) => (i !== editIndex ? getSlotKey(s) : ""))
    .filter(Boolean);

  const keyDuplicate =
    editIndex === null &&
    sanitizedKey.length > 0 &&
    existingKeys
      .map((k) => k.toLowerCase())
      .includes(sanitizedKey.toLowerCase());

  const canSave = keyValid && !keyDuplicate;

  const openAdd = () => {
    setEditIndex(null);
    setForm(EMPTY_FORM);
    setEditorOpen(true);
  };

  const openEdit = (idx: number) => {
    const slot = slots[idx];
    if (!slot) return;
    const legacy = slot as unknown as { id?: string };
    setForm({
      key: slot.key || legacy.id || "",
      label: slot.label ?? "",
      description: slot.description ?? "",
      type: slot.type ?? "text",
    });
    setEditIndex(idx);
    setEditorOpen(true);
  };

  const handleSave = () => {
    if (!canSave) return;
    const newSlot = toContextSlot(form);
    const next: ContextSlot[] =
      editIndex === null
        ? [...slots, newSlot]
        : slots.map((s, i) => (i === editIndex ? newSlot : s));

    dispatch(
      setAgentContextSlots({
        id: agentId,
        contextSlots: next,
      }),
    );
    setEditorOpen(false);
  };

  const handleDelete = (idx: number) => {
    dispatch(
      setAgentContextSlots({
        id: agentId,
        contextSlots: slots.filter((_, i) => i !== idx),
      }),
    );
  };

  const title = editIndex === null ? "Add context slot" : "Edit context slot";
  const description =
    editIndex === null
      ? "Define a context key clients can pass in the request `context` object. Keys listed here get typed handling and labels for the model."
      : "Update this slot’s key, type, or metadata.";

  const editorBody = (
    <>
      <SlotEditorFields
        form={form}
        onChange={patchForm}
        isEdit={editIndex !== null}
        keyDuplicate={keyDuplicate}
        keyRulesOk={keyValid}
      />
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={() => setEditorOpen(false)}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!canSave}>
          {editIndex === null ? "Add slot" : "Save changes"}
        </Button>
      </div>
    </>
  );

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-xs text-muted-foreground">Context</Label>

        {slots.map((slot, i) => {
          const key = getSlotKey(slot);
          const detail = slot.label?.trim()
            ? slot.label
            : slot.description?.trim()
              ? slot.description
              : "";
          return (
            <div
              key={`${key}-${i}`}
              className="inline-flex items-center gap-1.5 px-2.5 rounded-md text-xs font-medium bg-muted text-foreground border border-border group"
            >
              <span
                className="cursor-pointer transition-colors hover:text-primary truncate max-w-[160px]"
                onClick={() => openEdit(i)}
                title={detail ? `${key} — ${detail}` : `${key} (click to edit)`}
              >
                {key}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(i)}
                title="Remove context slot"
                className="hover:text-destructive transition-colors shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          onClick={openAdd}
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {isMobile ? (
        <Drawer
          open={editorOpen}
          onOpenChange={(o) => !o && setEditorOpen(false)}
        >
          <DrawerContent className="px-4 pb-safe max-h-[90dvh]">
            <DrawerHeader className="px-0">
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription>{description}</DrawerDescription>
            </DrawerHeader>
            <ScrollArea className="flex-1 overflow-y-auto pb-4">
              {editorBody}
            </ScrollArea>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          open={editorOpen}
          onOpenChange={(o) => !o && setEditorOpen(false)}
        >
          <DialogContent className="sm:max-w-[500px] max-h-[90dvh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 overflow-y-auto pr-1">
              <div className="py-1">{editorBody}</div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
