"use client";

/**
 * AgentVariablesManager
 *
 * Smart component — manages variable definitions for the active agent.
 * Reads/writes directly through Redux.
 */

import { useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Variable } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectAgentVariableDefinitions } from "@/features/agents/redux/agent-definition/selectors";
import { setAgentVariableDefinitions } from "@/features/agents/redux/agent-definition/slice";
import type { VariableDefinition } from "@/features/agents/redux/agent-definition/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface VariableFormState {
  name: string;
  defaultValue: string;
  helpText: string;
  required: boolean;
}

const EMPTY_FORM: VariableFormState = {
  name: "",
  defaultValue: "",
  helpText: "",
  required: false,
};

function VariableEditorContent({
  form,
  onChange,
  onSave,
  onCancel,
  isEdit,
  existingNames,
}: {
  form: VariableFormState;
  onChange: (patch: Partial<VariableFormState>) => void;
  onSave: () => void;
  onCancel: () => void;
  isEdit: boolean;
  existingNames: string[];
}) {
  const nameTaken =
    !isEdit &&
    existingNames.map((n) => n.toLowerCase()).includes(form.name.toLowerCase());
  const nameValid =
    /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(form.name) && form.name.length > 0;

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="var-name">Variable Name</Label>
        <Input
          id="var-name"
          value={form.name}
          onChange={(e) =>
            onChange({ name: e.target.value.replace(/\s/g, "_") })
          }
          placeholder="variableName"
          style={{ fontSize: "16px" }}
          disabled={isEdit}
        />
        {nameTaken && (
          <p className="text-xs text-destructive">Name already exists.</p>
        )}
        {form.name && !nameValid && (
          <p className="text-xs text-muted-foreground">
            Use letters, numbers, and underscores only. Start with a letter.
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="var-default">Default Value</Label>
        <Textarea
          id="var-default"
          value={form.defaultValue}
          onChange={(e) => onChange({ defaultValue: e.target.value })}
          placeholder="Leave empty for required input..."
          className="min-h-[80px] resize-y"
          style={{ fontSize: "16px" }}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="var-help">Help Text</Label>
        <Input
          id="var-help"
          value={form.helpText}
          onChange={(e) => onChange({ helpText: e.target.value })}
          placeholder="Instructions shown to the user..."
          style={{ fontSize: "16px" }}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="var-required"
          checked={form.required}
          onChange={(e) => onChange({ required: e.target.checked })}
          className="rounded"
        />
        <Label htmlFor="var-required" className="font-normal cursor-pointer">
          Required
        </Label>
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          onClick={onSave}
          disabled={!nameValid || nameTaken}
          className="flex-1"
        >
          {isEdit ? "Save Changes" : "Add Variable"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

interface AgentVariablesManagerProps {
  agentId: string;
}

export function AgentVariablesManager({ agentId }: AgentVariablesManagerProps) {
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();
  const rawVariables = useAppSelector((state) =>
    selectAgentVariableDefinitions(state, agentId),
  );
  const variables = rawVariables ?? [];

  const [editorOpen, setEditorOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState<VariableFormState>(EMPTY_FORM);

  const patchForm = useCallback((patch: Partial<VariableFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const openAdd = () => {
    setEditIndex(null);
    setForm(EMPTY_FORM);
    setEditorOpen(true);
  };

  const openEdit = (idx: number) => {
    const v = variables[idx];
    setEditIndex(idx);
    setForm({
      name: v.name,
      defaultValue: String(v.defaultValue ?? ""),
      helpText: v.helpText ?? "",
      required: v.required ?? false,
    });
    setEditorOpen(true);
  };

  const handleSave = () => {
    const updated: VariableDefinition[] = [...variables];
    const newVar: VariableDefinition = {
      name: form.name,
      defaultValue: form.defaultValue,
      helpText: form.helpText || undefined,
      required: form.required || undefined,
    };
    if (editIndex !== null) {
      updated[editIndex] = newVar;
    } else {
      updated.push(newVar);
    }
    dispatch(
      setAgentVariableDefinitions({
        id: agentId,
        variableDefinitions: updated,
      }),
    );
    setEditorOpen(false);
  };

  const handleDelete = (idx: number) => {
    const updated = variables.filter((_, i) => i !== idx);
    dispatch(
      setAgentVariableDefinitions({
        id: agentId,
        variableDefinitions: updated,
      }),
    );
  };

  const existingNames = variables
    .map((v, i) => (i !== editIndex ? v.name : ""))
    .filter(Boolean);

  const editorContent = (
    <VariableEditorContent
      form={form}
      onChange={patchForm}
      onSave={handleSave}
      onCancel={() => setEditorOpen(false)}
      isEdit={editIndex !== null}
      existingNames={existingNames}
    />
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Variable className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Variables</Label>
          {variables.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({variables.length})
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

      {variables.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">
            No variables yet. Use{" "}
            <code className="bg-muted px-1 rounded">{"{{variableName}}"}</code>{" "}
            in messages, then define variables here.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {variables.map((v, i) => (
            <div
              key={v.name}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent/30 group"
            >
              <code className="text-xs flex-1 font-mono text-primary">{`{{${v.name}}}`}</code>
              {v.required && (
                <Badge variant="secondary" className="text-[10px] h-4">
                  required
                </Badge>
              )}
              {v.defaultValue !== undefined && v.defaultValue !== "" && (
                <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                  default: {String(v.defaultValue).slice(0, 20)}
                </span>
              )}
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
          ))}
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
                {editIndex !== null ? "Edit Variable" : "Add Variable"}
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
                {editIndex !== null ? "Edit Variable" : "Add Variable"}
              </DialogTitle>
              <DialogDescription>
                {editIndex !== null
                  ? "Update this variable's name, value, or settings."
                  : "Define a new variable to use in agent messages with {{variableName}}."}
              </DialogDescription>
            </DialogHeader>
            {editorContent}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
