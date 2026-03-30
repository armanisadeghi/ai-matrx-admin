"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { updateItemAction } from "../actions/list-actions";
import { useToastManager } from "@/hooks/useToastManager";
import type { GroupedItem } from "../types";

interface EditItemDialogProps {
  item: GroupedItem | null;
  listId: string;
  existingGroups?: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function EditItemForm({
  item,
  listId,
  existingGroups,
  onSuccess,
  onCancel,
}: {
  item: GroupedItem;
  listId: string;
  existingGroups?: string[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [description, setDescription] = useState(item.description ?? "");
  const [helpText, setHelpText] = useState(item.help_text ?? "");
  const [isPending, startTransition] = useTransition();
  const toast = useToastManager("user-lists");

  useEffect(() => {
    setLabel(item.label);
    setDescription(item.description ?? "");
    setHelpText(item.help_text ?? "");
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    startTransition(async () => {
      try {
        await updateItemAction({
          itemId: item.id,
          listId,
          label: label.trim(),
          description: description.trim() || null,
          helpText: helpText.trim() || null,
        });
        toast.success("Item updated");
        onSuccess();
      } catch (err) {
        toast.error(err);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-0.5">
      <div className="space-y-1.5">
        <Label htmlFor="edit-item-label" className="text-sm font-medium">
          Label <span className="text-destructive">*</span>
        </Label>
        <Input
          id="edit-item-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
          autoFocus
          disabled={isPending}
          className="text-base"
          style={{ fontSize: "16px" }}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-item-description" className="text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="edit-item-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          disabled={isPending}
          className="resize-none text-base"
          style={{ fontSize: "16px" }}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-item-help" className="text-sm font-medium">
          Help text
        </Label>
        <Input
          id="edit-item-help"
          value={helpText}
          onChange={(e) => setHelpText(e.target.value)}
          disabled={isPending}
          className="text-base"
          style={{ fontSize: "16px" }}
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={isPending || !label.trim()}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save
        </Button>
      </div>
    </form>
  );
}

export function EditItemDialog({
  item,
  listId,
  existingGroups,
  open,
  onOpenChange,
  onSuccess,
}: EditItemDialogProps) {
  const isMobile = useIsMobile();

  if (!item) return null;

  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85dvh]">
          <DrawerTitle className="px-4 pt-4 text-base font-semibold">
            Edit Item
          </DrawerTitle>
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-safe">
            <EditItemForm
              item={item}
              listId={listId}
              existingGroups={existingGroups}
              onSuccess={handleSuccess}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>
        <EditItemForm
          item={item}
          listId={listId}
          existingGroups={existingGroups}
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
