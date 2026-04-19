"use client";

import React, { useEffect, useState } from "react";
import { Plus, Loader2, ExternalLink, Link2 } from "lucide-react";
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
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useAssociateTask } from "@/features/tasks/hooks/useAssociateTask";
import {
  clearPendingSource,
  selectPendingSource,
  selectProjects,
  setSelectedTaskId,
} from "@/features/tasks/redux";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

type Priority = "low" | "medium" | "high" | "";

/**
 * Singleton dialog that opens whenever something is staged on
 * `tasksUi.pendingSource`. Widgets set pendingSource with:
 *   - entity_type + entity_id (the thing the task comes FROM)
 *   - label (preview text shown on the task's attachments panel)
 *   - prePopulate (title / description / priority seeded into the form)
 *
 * The dialog lets the user name/refine the task, pick a project + priority,
 * and save. On save: writes the task + the association + optionally chains
 * a second association to a parent entity (e.g. conversation around a
 * message) so the resulting task shows both links.
 *
 * Mounted once in Providers. Zero props needed at call sites.
 */
export default function CreateTaskFromSourceDialog() {
  const dispatch = useAppDispatch();
  const source = useAppSelector(selectPendingSource);
  const projects = useAppSelector(selectProjects);
  const { createAndAssociate, associate, isBusy } = useAssociateTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState<string>("");

  const open = source !== null;

  useEffect(() => {
    if (source) {
      setTitle(source.prePopulate?.title ?? "");
      setDescription(source.prePopulate?.description ?? "");
      setPriority((source.prePopulate?.priority as Priority) ?? "");
      setDueDate("");
      setProjectId("");
    }
  }, [source]);

  const close = () => {
    dispatch(clearPendingSource());
  };

  const handleSave = async () => {
    if (!source) return;
    const finalTitle = title.trim() || "Untitled task";
    const taskId = await createAndAssociate({
      title: finalTitle,
      description: description.trim() || null,
      priority: (priority || null) as Priority extends "" ? null : Priority,
      due_date: dueDate || null,
      project_id: projectId || undefined,
      source: {
        entity_type: source.entity_type,
        entity_id: source.entity_id,
        label: source.label,
        metadata: source.metadata,
      },
    });
    if (!taskId) {
      toast.error("Could not create task");
      return;
    }

    // Optional secondary link — chain a second association when the
    // pendingSource's metadata includes a parent reference. Example:
    // creating from a cx_message also records the cx_conversation so the
    // task is reachable from the whole chat, not just one message.
    const parent = source.metadata?.parent as
      | { entity_type: string; entity_id: string; label?: string }
      | undefined;
    if (parent?.entity_type && parent.entity_id) {
      try {
        await associate(taskId, {
          entity_type: parent.entity_type,
          entity_id: parent.entity_id,
          label: parent.label,
        });
      } catch {
        /* parent link is best-effort */
      }
    }

    dispatch(setSelectedTaskId(taskId));
    toast.success("Task created", {
      description: source.label
        ? `Linked to: ${source.label.slice(0, 80)}`
        : undefined,
      action: {
        label: "Open",
        onClick: () => {
          window.location.href = `/tasks?task=${taskId}`;
        },
      },
    });
    close();
  };

  if (!source) return null;

  const sourceBadge = entityTypeLabel(source.entity_type);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription className="text-xs flex items-center gap-1.5">
            <Link2 className="w-3 h-3" />
            Will be linked to{" "}
            <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-medium">
              {sourceBadge}
            </span>
          </DialogDescription>
        </DialogHeader>

        {source.label && (
          <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground max-h-24 overflow-y-auto whitespace-pre-wrap">
            {source.label}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Title
          </label>
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSave();
              }
            }}
            placeholder="What do you want to do?"
            className="h-9"
            style={{ fontSize: "16px" }}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional — more detail"
            className="text-sm min-h-[80px] resize-y"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Field label="Project">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-8 w-full bg-card border border-border rounded-md px-2 text-xs outline-none hover:border-foreground/30"
            >
              <option value="">Auto</option>
              {projects
                .filter((p) => p.id !== "__unassigned__")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Priority">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="h-8 w-full bg-card border border-border rounded-md px-2 text-xs outline-none hover:border-foreground/30"
            >
              <option value="">None</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </Field>
          <Field label="Due">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-8 w-full bg-card border border-border rounded-md px-2 text-xs outline-none hover:border-foreground/30"
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={close} disabled={isBusy}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isBusy}>
            {isBusy ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5 mr-1.5" />
            )}
            Create & link
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-right">
          ⌘+Enter to save, Esc to cancel
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function entityTypeLabel(t: string): string {
  const map: Record<string, string> = {
    cx_message: "AI message",
    cx_conversation: "AI conversation",
    message: "message",
    conversation: "conversation",
    agent_conversation: "agent conversation",
    note: "note",
    user_file: "file",
    chat_block: "chat block",
  };
  return map[t] ?? t;
}
