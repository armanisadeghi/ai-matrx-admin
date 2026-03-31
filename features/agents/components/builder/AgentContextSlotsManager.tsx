"use client";

/**
 * AgentContextSlotsManager
 *
 * Smart component — manages context slots for the active agent.
 * Context slots define dynamic content that can be injected at runtime
 * (e.g. clipboard content, selected text, note content).
 */

import { useState, useCallback } from "react";
import { Plus, Trash2, Pencil, LayoutPanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectActiveAgentId,
  selectAgentContextSlots,
} from "@/features/agents/redux/agent-definition/selectors";
import { setAgentContextSlots } from "@/features/agents/redux/agent-definition/slice";
import type { ContextSlot } from "@/features/agents/types/agent-api-types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

interface SlotFormState {
  id: string;
  label: string;
  description: string;
  required: boolean;
}

const EMPTY_FORM: SlotFormState = {
  id: "",
  label: "",
  description: "",
  required: false,
};

function SlotEditorContent({
  form,
  onChange,
  onSave,
  onCancel,
  isEdit,
}: {
  form: SlotFormState;
  onChange: (patch: Partial<SlotFormState>) => void;
  onSave: () => void;
  onCancel: () => void;
  isEdit: boolean;
}) {
  const valid = form.id.trim().length > 0 && form.label.trim().length > 0;
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="slot-id">Slot ID</Label>
        <Input
          id="slot-id"
          value={form.id}
          onChange={(e) =>
            onChange({ id: e.target.value.replace(/\s/g, "_").toLowerCase() })
          }
          placeholder="clipboard_content"
          disabled={isEdit}
          style={{ fontSize: "16px" }}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="slot-label">Display Label</Label>
        <Input
          id="slot-label"
          value={form.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Clipboard Content"
          style={{ fontSize: "16px" }}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="slot-desc">Description</Label>
        <Textarea
          id="slot-desc"
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What content this slot provides..."
          className="min-h-[80px] resize-y"
          style={{ fontSize: "16px" }}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="slot-required"
          checked={form.required}
          onChange={(e) => onChange({ required: e.target.checked })}
          className="rounded"
        />
        <Label htmlFor="slot-required" className="font-normal cursor-pointer">
          Required
        </Label>
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={onSave} disabled={!valid} className="flex-1">
          {isEdit ? "Save Changes" : "Add Context Slot"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function AgentContextSlotsManager() {
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();
  const agentId = useAppSelector(selectActiveAgentId);
  const slots = useAppSelector((state) =>
    selectAgentContextSlots(state, agentId),
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState<SlotFormState>(EMPTY_FORM);

  const patchForm = useCallback((patch: Partial<SlotFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const openAdd = () => {
    setEditIndex(null);
    setForm(EMPTY_FORM);
    setEditorOpen(true);
  };

  const openEdit = (idx: number) => {
    const s = slots[idx] as unknown as Record<string, unknown>;
    setEditIndex(idx);
    setForm({
      id: String(s.id ?? ""),
      label: String(s.label ?? ""),
      description: String(s.description ?? ""),
      required: Boolean(s.required ?? false),
    });
    setEditorOpen(true);
  };

  const handleSave = () => {
    if (!agentId) return;
    const updated = [...slots] as unknown as SlotFormState[];
    const newSlot = {
      id: form.id,
      label: form.label,
      description: form.description,
      required: form.required,
    };
    if (editIndex !== null) {
      updated[editIndex] = newSlot as unknown as SlotFormState;
    } else {
      updated.push(newSlot as unknown as SlotFormState);
    }
    dispatch(
      setAgentContextSlots({
        id: agentId,
        contextSlots: updated as unknown as ContextSlot[],
      }),
    );
    setEditorOpen(false);
  };

  const handleDelete = (idx: number) => {
    if (!agentId) return;
    dispatch(
      setAgentContextSlots({
        id: agentId,
        contextSlots: slots.filter((_, i) => i !== idx),
      }),
    );
  };

  if (!agentId) return null;

  const editorContent = (
    <SlotEditorContent
      form={form}
      onChange={patchForm}
      onSave={handleSave}
      onCancel={() => setEditorOpen(false)}
      isEdit={editIndex !== null}
    />
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutPanelLeft className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Context Slots</Label>
          {slots.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({slots.length})
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={openAdd}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add
        </Button>
      </div>

      {slots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">
            No context slots. Slots let the agent receive external content
            (clipboard, selections, notes) at runtime.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {slots.map((slot, i) => {
            const s = slot as unknown as Record<string, unknown>;
            return (
              <div
                key={String(s.id ?? i)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent/30 group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {String(s.label ?? s.id)}
                  </p>
                  {s.description && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {String(s.description)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => openEdit(i)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all"
                >
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleDelete(i)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {isMobile ? (
        <Drawer
          open={editorOpen}
          onOpenChange={(o) => !o && setEditorOpen(false)}
        >
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>
                {editIndex !== null ? "Edit Context Slot" : "Add Context Slot"}
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-8">{editorContent}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          open={editorOpen}
          onOpenChange={(o) => !o && setEditorOpen(false)}
        >
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>
                {editIndex !== null ? "Edit Context Slot" : "Add Context Slot"}
              </DialogTitle>
            </DialogHeader>
            {editorContent}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
