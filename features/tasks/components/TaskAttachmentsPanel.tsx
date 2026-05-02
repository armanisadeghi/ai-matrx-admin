"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Paperclip,
  MessageSquare,
  MessagesSquare,
  Bot,
  Layers,
  X,
  ExternalLink,
  Loader2,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  fetchTaskAssociations,
  dissociateFromTask,
  selectAssociations,
  selectAssociationCount,
  selectAssociationsLoading,
} from "@/features/tasks/redux/taskAssociationsSlice";
import { cn } from "@/utils/cn";

interface TaskAttachmentsPanelProps {
  taskId: string;
  className?: string;
}

export default function TaskAttachmentsPanel({
  taskId,
  className,
}: TaskAttachmentsPanelProps) {
  const dispatch = useAppDispatch();
  const bundle = useAppSelector(selectAssociations(taskId));
  const count = useAppSelector(selectAssociationCount(taskId));
  const isLoading = useAppSelector(selectAssociationsLoading(taskId));

  useEffect(() => {
    dispatch(fetchTaskAssociations(taskId));
  }, [dispatch, taskId]);

  const handleRemove = (entityType: string, entityId: string) => {
    dispatch(dissociateFromTask({ taskId, entityType, entityId }));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Paperclip className="w-3 h-3" />
        <span>Attachments</span>
        <span className="tabular-nums text-muted-foreground/60">({count})</span>
        {isLoading && (
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/60" />
        )}
      </div>

      {count === 0 && !isLoading ? (
        <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center">
          <p className="text-xs text-muted-foreground">Nothing attached yet.</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            Link notes, messages, files and more from anywhere in the app.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
          <Section
            icon={FileText}
            label="Notes"
            count={bundle.notes.length}
            items={bundle.notes.map((n) => ({
              key: n.id,
              primary: n.label,
              secondary: n.folder_name || undefined,
              href: `/notes?active=${n.id}`,
              onRemove: () => handleRemove("note", n.id),
            }))}
          />
          <Section
            icon={Paperclip}
            label="Files"
            count={bundle.files.length}
            items={bundle.files.map((f) => ({
              key: f.id,
              primary: f.filename,
              secondary: f.mime_type ?? undefined,
              onRemove: () => handleRemove("user_file", f.id),
            }))}
          />
          {/* AI messages from cx_message — linked back to the conversation */}
          <Section
            icon={Sparkles}
            label="AI Messages"
            count={bundle.cx_messages.length}
            items={bundle.cx_messages.map((m) => ({
              key: m.id,
              primary: m.preview || "AI message",
              secondary: `${m.role ?? "message"} · ${new Date(m.created_at).toLocaleString()}`,
              href: `/ssr/chat/c/${m.conversation_id}#m-${m.id}`,
              onRemove: () => handleRemove("cx_message", m.id),
            }))}
          />
          {/* AI conversations from cx_conversation */}
          <Section
            icon={MessagesSquare}
            label="AI Conversations"
            count={bundle.cx_conversations.length}
            items={bundle.cx_conversations.map((c) => ({
              key: c.id,
              primary: c.title,
              href: `/ssr/chat/c/${c.id}`,
              onRemove: () => handleRemove("cx_conversation", c.id),
            }))}
          />
          {/* Generic messages (other messaging systems) */}
          <Section
            icon={MessageSquare}
            label="Messages"
            count={bundle.messages.length}
            items={bundle.messages.map((m) => ({
              key: m.id,
              primary: m.preview || "Message",
              secondary: new Date(m.created_at).toLocaleString(),
              onRemove: () => handleRemove("message", m.id),
            }))}
          />
          <Section
            icon={MessagesSquare}
            label="Conversations"
            count={bundle.conversations.length}
            items={bundle.conversations.map((c) => ({
              key: c.id,
              primary: c.name || "Conversation",
              secondary: c.type,
              onRemove: () => handleRemove("conversation", c.id),
            }))}
          />
          <Section
            icon={Bot}
            label="Agent Conversations"
            count={bundle.agent_conversations.length}
            items={bundle.agent_conversations.map((a) => ({
              key: a.id,
              primary: a.title || "Untitled agent chat",
              onRemove: () => handleRemove("agent_conversation", a.id),
            }))}
          />
          <Section
            icon={Layers}
            label="Chat Blocks"
            count={bundle.blocks.length}
            items={bundle.blocks.map((b) => ({
              key: b.id,
              primary: b.preview || "Chat block",
              secondary: `Block #${b.block_index}`,
              onRemove: () => handleRemove("chat_block", b.message_id),
            }))}
          />
          {bundle.other.length > 0 && (
            <Section
              icon={PlusCircle}
              label="Other"
              count={bundle.other.length}
              items={bundle.other.map((o) => ({
                key: `${o.entity_type}:${o.entity_id}`,
                primary: o.label || o.entity_id,
                secondary: o.entity_type,
                onRemove: () => handleRemove(o.entity_type, o.entity_id),
              }))}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface SectionItem {
  key: string;
  primary: string;
  secondary?: string;
  href?: string;
  onRemove?: () => void;
}

function Section({
  icon: Icon,
  label,
  count,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  items: SectionItem[];
}) {
  const [open, setOpen] = React.useState(count > 0);
  useEffect(() => {
    if (count > 0) setOpen(true);
  }, [count]);
  if (count === 0) return null;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors border-b border-border/30 last:border-b-0"
      >
        <Icon className="w-3 h-3" />
        <span>{label}</span>
        <span className="text-muted-foreground/60 tabular-nums">({count})</span>
      </button>
      {open && (
        <div>
          {items.map((it, i) => {
            const rowContent = (
              <>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-foreground">{it.primary}</p>
                  {it.secondary && (
                    <p className="truncate text-[10px] text-muted-foreground">
                      {it.secondary}
                    </p>
                  )}
                </div>
                {it.href && (
                  <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                )}
                {it.onRemove && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      it.onRemove?.();
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                    title="Remove link"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </>
            );

            const rowClass = cn(
              "group flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-accent/30",
              i !== items.length - 1 && "border-b border-border/20",
            );

            return it.href ? (
              <Link key={it.key} href={it.href} className={rowClass}>
                {rowContent}
              </Link>
            ) : (
              <div key={it.key} className={rowClass}>
                {rowContent}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
