"use client";

import React, { useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAssociateTask } from "@/features/tasks/hooks/useAssociateTask";
import { selectProjects, setSelectedTaskId } from "@/features/tasks/redux";
import { useAppDispatch } from "@/lib/redux/hooks";

/**
 * Global ⌘⇧T / Ctrl+Shift+T shortcut to open a quick-create dialog from
 * anywhere in the app. Drop once at the app root. Zero props required.
 */
export default function GlobalTaskShortcut() {
  const dispatch = useAppDispatch();
  const projects = useAppSelector(selectProjects);
  const { createAndAssociate, isBusy } = useAssociateTask();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && (e.key === "t" || e.key === "T")) {
        // Ignore when typing into inputs (but allow the shortcut still)
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setProjectId("");
    }
  }, [open]);

  const submit = async () => {
    const t = title.trim();
    if (!t) return;
    const id = await createAndAssociate({
      title: t,
      description: description.trim() || null,
      project_id: projectId || undefined,
    });
    if (id) {
      dispatch(setSelectedTaskId(id));
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription className="text-xs">
            ⌘⇧T from anywhere. Uses your active app context for project + scopes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Task title..."
            className="h-9"
            style={{ fontSize: "16px" }}
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="text-sm min-h-[80px] resize-y"
            rows={3}
          />
          <div className="flex items-center gap-2">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="flex-1 h-8 bg-card border border-border rounded-md px-2 text-xs outline-none hover:border-foreground/30"
            >
              <option value="">Auto (active project)</option>
              {projects
                .filter((p) => p.id !== "__unassigned__")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <Button
              onClick={submit}
              disabled={!title.trim() || isBusy}
              className="h-8"
            >
              {isBusy ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5 mr-1.5" />
              )}
              Create
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            ⌘+Enter to submit, Esc to cancel
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
