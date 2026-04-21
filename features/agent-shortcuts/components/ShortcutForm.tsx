"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Copy, Loader2, Save, Trash2, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import IconInputWithValidation from "@/components/official/icons/IconInputWithValidation.dynamic";
import { ScopeMappingEditor } from "./ScopeMappingEditor";
import type { AgentVariableDefinition } from "./ScopeMappingEditor";
import { ShortcutScopePicker } from "./ShortcutScopePicker";
import { useAgentShortcutCrud } from "../hooks/useAgentShortcutCrud";
import { DEFAULT_AVAILABLE_SCOPES, RESULT_DISPLAY_OPTIONS } from "../constants";
import {
  formatShortcutContextsForInput,
  parseShortcutContextsInput,
} from "../utils/enabled-contexts";
import type {
  AgentScope,
  AgentShortcut,
  AgentShortcutCategory,
  ScopeProps,
  ShortcutFormData,
} from "../types";

export interface ShortcutFormProps extends ScopeProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (id: string | null) => void;
  shortcut?: AgentShortcut | null;
  categories: AgentShortcutCategory[];
  variableDefinitions?: AgentVariableDefinition[];
  allowScopeEdit?: boolean;
  onScopeChange?: (scope: AgentScope, scopeId?: string) => void;
  onDuplicate?: (shortcut: AgentShortcut) => void;
}

function emptyFormData(): ShortcutFormData {
  return {
    categoryId: "",
    label: "",
    description: null,
    iconName: "Sparkles",
    keyboardShortcut: null,
    sortOrder: 0,
    agentId: null,
    agentVersionId: null,
    useLatest: false,
    enabledContexts: [],
    scopeMappings: null,
    // AgentExecutionConfig bundle (matches DEFAULT_AGENT_EXECUTION_CONFIG)
    displayMode: "modal-full",
    showVariablePanel: false,
    variablesPanelStyle: "inline",
    autoRun: true,
    allowChat: true,
    showDefinitionMessages: false,
    showDefinitionMessageContent: false,
    hideReasoning: false,
    hideToolResults: false,
    showPreExecutionGate: false,
    preExecutionMessage: null,
    bypassGateSeconds: 3,
    defaultUserInput: null,
    defaultVariables: null,
    contextOverrides: null,
    llmOverrides: null,
    isActive: true,
    userId: null,
    organizationId: null,
    projectId: null,
    taskId: null,
  };
}

function fromShortcut(shortcut: AgentShortcut): ShortcutFormData {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = shortcut;
  return rest;
}

export function ShortcutForm({
  scope,
  scopeId,
  isOpen,
  onClose,
  onSuccess,
  shortcut,
  categories,
  variableDefinitions = [],
  allowScopeEdit = false,
  onScopeChange,
  onDuplicate,
}: ShortcutFormProps) {
  const isMobile = useIsMobile();
  const isEditing = !!shortcut;
  const crud = useAgentShortcutCrud({ scope, scopeId });
  const { toast } = useToast();

  const [formData, setFormData] = useState<ShortcutFormData>(() =>
    shortcut ? fromShortcut(shortcut) : emptyFormData(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (shortcut) {
      setFormData(fromShortcut(shortcut));
    } else {
      setFormData({
        ...emptyFormData(),
        categoryId: categories[0]?.id ?? "",
      });
    }
  }, [isOpen, shortcut, categories]);

  const groupedCategories = useMemo(() => {
    const byPlacement = new Map<string, AgentShortcutCategory[]>();
    categories.forEach((cat) => {
      if (!byPlacement.has(cat.placementType)) {
        byPlacement.set(cat.placementType, []);
      }
      byPlacement.get(cat.placementType)!.push(cat);
    });
    return Array.from(byPlacement.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );
  }, [categories]);

  const handleChange = <K extends keyof ShortcutFormData>(
    field: K,
    value: ShortcutFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.label.trim()) {
      setError("Label is required");
      return;
    }
    if (!formData.categoryId) {
      setError("Category is required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isEditing && shortcut) {
        await crud.updateShortcut(shortcut.id, formData);
        toast({ title: "Success", description: "Shortcut updated" });
        onSuccess?.(shortcut.id);
      } else {
        const newId = await crud.createShortcut(formData);
        toast({ title: "Success", description: "Shortcut created" });
        onSuccess?.(newId);
      }
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save shortcut";
      setError(message);
      toast({
        title: "Save failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!shortcut) return;
    setDeleting(true);
    try {
      await crud.deleteShortcut(shortcut.id);
      toast({ title: "Success", description: "Shortcut deleted" });
      setShowDeleteConfirm(false);
      onSuccess?.(null);
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete shortcut";
      toast({
        title: "Delete failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const body = (
    <div className="space-y-4">
      {allowScopeEdit && onScopeChange && (
        <>
          <ShortcutScopePicker
            scope={scope}
            scopeId={scopeId}
            onScopeChange={onScopeChange}
            disabled={saving}
          />
          <Separator />
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="shortcut-label" className="text-sm">
            Label <span className="text-destructive">*</span>
          </Label>
          <Input
            id="shortcut-label"
            value={formData.label}
            onChange={(e) => handleChange("label", e.target.value)}
            placeholder="Shortcut name"
            className="h-9 text-[16px]"
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shortcut-category" className="text-sm">
            Category <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.categoryId}
            onValueChange={(value) => handleChange("categoryId", value)}
            disabled={saving}
          >
            <SelectTrigger id="shortcut-category" className="h-9">
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent>
              {groupedCategories.map(([placementType, placementCategories]) => (
                <SelectGroup key={placementType}>
                  <SelectLabel className="text-xs uppercase">
                    {placementType}
                  </SelectLabel>
                  {placementCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="keyboard-shortcut" className="text-sm">
            Keyboard Shortcut
          </Label>
          <Input
            id="keyboard-shortcut"
            value={formData.keyboardShortcut ?? ""}
            onChange={(e) =>
              handleChange("keyboardShortcut", e.target.value || null)
            }
            placeholder="Ctrl+Shift+K"
            className="h-9 text-[16px]"
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sort-order" className="text-sm">
            Sort Order
          </Label>
          <Input
            id="sort-order"
            type="number"
            value={formData.sortOrder}
            onChange={(e) =>
              handleChange("sortOrder", parseInt(e.target.value, 10) || 0)
            }
            className="h-9 text-[16px]"
            disabled={saving}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="shortcut-description" className="text-sm">
          Description
        </Label>
        <Textarea
          id="shortcut-description"
          value={formData.description ?? ""}
          onChange={(e) => handleChange("description", e.target.value || null)}
          placeholder="Optional description"
          rows={3}
          className="resize-none text-[16px]"
          disabled={saving}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="enabled-contexts" className="text-sm">
          Enabled contexts
        </Label>
        <Input
          id="enabled-contexts"
          value={formatShortcutContextsForInput(formData.enabledContexts)}
          onChange={(e) =>
            handleChange(
              "enabledContexts",
              parseShortcutContextsInput(e.target.value),
            )
          }
          placeholder="e.g. code-editor, note-editor"
          className="h-9 text-[16px]"
          disabled={saving}
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated tags. Leave empty so this shortcut appears in every
          surface. When a host sets a context filter, the shortcut must list
          that tag (or stay empty) to appear.
        </p>
      </div>

      <div className="flex items-center justify-between px-3 py-2 border border-border rounded-md bg-muted/30">
        <Label
          htmlFor="is-active"
          className="text-sm font-normal cursor-pointer"
        >
          Active (visible in menus)
        </Label>
        <Switch
          id="is-active"
          checked={formData.isActive}
          onCheckedChange={(checked) => handleChange("isActive", checked)}
          disabled={saving}
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-sm font-semibold">Agent</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="agent-id" className="text-xs">
              Agent ID
            </Label>
            <Input
              id="agent-id"
              value={formData.agentId ?? ""}
              onChange={(e) => handleChange("agentId", e.target.value || null)}
              placeholder="Agent UUID"
              className="h-9 text-[16px] font-mono"
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agent-version-id" className="text-xs">
              Agent Version ID (pin)
            </Label>
            <Input
              id="agent-version-id"
              value={formData.agentVersionId ?? ""}
              onChange={(e) =>
                handleChange("agentVersionId", e.target.value || null)
              }
              placeholder="agx_version UUID (optional)"
              className="h-9 text-[16px] font-mono"
              disabled={saving || formData.useLatest}
            />
          </div>
        </div>
        <div className="flex items-center justify-between px-3 py-2 border border-border rounded-md bg-muted/30">
          <Label
            htmlFor="use-latest"
            className="text-sm font-normal cursor-pointer"
          >
            Always use the latest agent version
          </Label>
          <Switch
            id="use-latest"
            checked={formData.useLatest}
            onCheckedChange={(checked) => {
              handleChange("useLatest", checked);
              if (checked) handleChange("agentVersionId", null);
            }}
            disabled={saving}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-sm font-semibold">Scope Mappings</Label>
        <ScopeMappingEditor
          availableScopes={
            formData.scopeMappings
              ? Array.from(
                  new Set([
                    ...Object.keys(formData.scopeMappings),
                    ...DEFAULT_AVAILABLE_SCOPES,
                  ]),
                )
              : DEFAULT_AVAILABLE_SCOPES
          }
          scopeMappings={formData.scopeMappings}
          variableDefinitions={variableDefinitions}
          onScopesChange={(_scopes, mappings) =>
            handleChange(
              "scopeMappings",
              Object.keys(mappings).length > 0 ? mappings : null,
            )
          }
          compact
        />
      </div>

      <Separator />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="shortcut-icon" className="text-sm">
            Icon Name
          </Label>
          <IconInputWithValidation
            id="shortcut-icon"
            value={formData.iconName ?? ""}
            onChange={(value) => handleChange("iconName", value || null)}
            placeholder="e.g., Sparkles"
            className="h-9 text-[16px]"
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="result-display" className="text-sm">
            Result Display
          </Label>
          <Select
            value={formData.displayMode}
            onValueChange={(value) =>
              handleChange(
                "displayMode",
                value as ShortcutFormData["displayMode"],
              )
            }
            disabled={saving}
          >
            <SelectTrigger id="result-display" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESULT_DISPLAY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold">Execution Options</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-center justify-between px-3 py-2 border border-border rounded-md bg-muted/30">
            <Label
              htmlFor="auto-run"
              className="text-xs font-normal cursor-pointer"
            >
              Auto Run
            </Label>
            <Switch
              id="auto-run"
              checked={formData.autoRun}
              onCheckedChange={(checked) => handleChange("autoRun", checked)}
              disabled={saving}
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2 border border-border rounded-md bg-muted/30">
            <Label
              htmlFor="allow-chat"
              className="text-xs font-normal cursor-pointer"
            >
              Allow Chat
            </Label>
            <Switch
              id="allow-chat"
              checked={formData.allowChat}
              onCheckedChange={(checked) => handleChange("allowChat", checked)}
              disabled={saving}
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2 border border-border rounded-md bg-muted/30">
            <Label
              htmlFor="show-variables"
              className="text-xs font-normal cursor-pointer"
            >
              Show Variables
            </Label>
            <Switch
              id="show-variables"
              checked={formData.showVariables}
              onCheckedChange={(checked) =>
                handleChange("showVariables", checked)
              }
              disabled={saving}
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2 border border-border rounded-md bg-muted/30">
            <Label
              htmlFor="show-variable-panel"
              className="text-xs font-normal cursor-pointer"
            >
              Show variable panel
            </Label>
            <Switch
              id="show-variable-panel"
              checked={formData.showVariablePanel}
              onCheckedChange={(checked) =>
                handleChange("showVariablePanel", checked)
              }
              disabled={saving}
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2 border border-border rounded-md bg-muted/30 sm:col-span-2">
            <Label
              htmlFor="show-pre-execution-gate"
              className="text-xs font-normal cursor-pointer"
            >
              Show pre-execution gate
            </Label>
            <Switch
              id="show-pre-execution-gate"
              checked={formData.showPreExecutionGate}
              onCheckedChange={(checked) =>
                handleChange("showPreExecutionGate", checked)
              }
              disabled={saving}
            />
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  const leftButtons =
    isEditing && shortcut ? (
      <div className="flex gap-2">
        {onDuplicate && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDuplicate(shortcut)}
            disabled={saving || deleting}
          >
            <Copy className="h-4 w-4 mr-1.5" />
            Duplicate
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={saving || deleting}
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          Delete
        </Button>
      </div>
    ) : (
      <div />
    );

  const rightButtons = (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onClose}
        disabled={saving || deleting}
      >
        <X className="h-4 w-4 mr-1.5" />
        Cancel
      </Button>
      <Button
        size="sm"
        onClick={handleSave}
        disabled={saving || deleting || !formData.label || !formData.categoryId}
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-1.5" />
            {isEditing ? "Save" : "Create"}
          </>
        )}
      </Button>
    </div>
  );

  const footer = (
    <>
      {leftButtons}
      {rightButtons}
    </>
  );

  const deleteConfirm = (
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Shortcut</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{shortcut?.label}&quot;? This
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
          <DrawerContent className="max-h-[92dvh] pb-safe">
            <DrawerHeader>
              <DrawerTitle>
                {isEditing ? `Edit "${shortcut?.label}"` : "Create Shortcut"}
              </DrawerTitle>
              <DrawerDescription>
                {isEditing
                  ? "Update shortcut details"
                  : "Wire an agent into the UI at the selected scope"}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-3 overflow-y-auto">{body}</div>
            <DrawerFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
              {footer}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
        {deleteConfirm}
      </>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-2 border-b border-border">
            <DialogTitle>
              {isEditing ? `Edit "${shortcut?.label}"` : "Create Shortcut"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update shortcut details"
                : "Wire an agent into the UI at the selected scope"}
            </DialogDescription>
          </DialogHeader>
          <div className="px-4 pt-2 pb-2 overflow-y-auto flex-1">{body}</div>
          <DialogFooter className="px-4 py-3 border-t border-border flex items-center justify-between gap-2">
            {footer}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {deleteConfirm}
    </>
  );
}
