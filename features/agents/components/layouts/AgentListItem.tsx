"use client";

import Link from "next/link";
import IconButton from "@/components/official/IconButton";
import {
  Play,
  Pencil,
  Copy,
  Trash2,
  Share2,
  Loader2,
  Bot,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAgentById } from "@/features/agents/redux/agent-definition/selectors";
import { ShareModal } from "@/features/sharing";
import { FavoriteAgentButton } from "./FavoriteAgentButton";
import { useState } from "react";

interface AgentListItemProps {
  id: string;
  onDelete?: (id: string, name: string) => void;
  onDuplicate?: (id: string) => void;
  onNavigate?: (id: string, path: string) => void;
  isDeleting?: boolean;
  isDuplicating?: boolean;
  isNavigating?: boolean;
  isAnyNavigating?: boolean;
}

export function AgentListItem({
  id,
  onDelete,
  onDuplicate,
  onNavigate,
  isDeleting,
  isDuplicating,
  isNavigating,
  isAnyNavigating,
}: AgentListItemProps) {
  const record = useAppSelector((state) => selectAgentById(state, id));
  const name = record?.name ?? "Untitled Agent";
  const description = record?.description ?? null;
  const category = record?.category ?? null;
  const tags = record?.tags ?? [];
  const isArchived = record?.isArchived ?? false;
  const isOwner = record?.isOwner ?? true;
  const accessLevel = record?.accessLevel ?? null;

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const isDisabled = isNavigating || isAnyNavigating;
  const canEdit =
    isOwner || accessLevel === "admin" || accessLevel === "editor";

  const handleRun = (e?: React.MouseEvent) => {
    if (e && (e.metaKey || e.ctrlKey)) return;
    e?.preventDefault();
    if (onNavigate && !isAnyNavigating) onNavigate(id, `/ai/agents/run/${id}`);
  };

  const handleEdit = (e?: React.MouseEvent) => {
    if (e && (e.metaKey || e.ctrlKey)) return;
    e?.preventDefault();
    if (onNavigate && !isAnyNavigating) onNavigate(id, `/ai/agents/edit/${id}`);
  };

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 p-3 rounded-lg border border-border bg-card transition-all duration-200",
        isDisabled
          ? "opacity-60 cursor-not-allowed"
          : "hover:border-primary/30 hover:shadow-sm hover:bg-accent/30 group cursor-default",
        isArchived && "opacity-70",
      )}
    >
      {isNavigating && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      )}

      {/* Icon */}
      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-primary" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "text-sm font-medium truncate",
              !isDisabled && "group-hover:text-primary",
            )}
          >
            {name}
          </p>
          {isArchived && (
            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-muted text-muted-foreground shrink-0">
              <Archive className="h-2.5 w-2.5" /> Archived
            </span>
          )}
          {!isOwner && (
            <span className="px-1 py-0.5 rounded text-[10px] bg-secondary/20 text-secondary-foreground shrink-0 capitalize">
              {accessLevel}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {description}
          </p>
        )}
        {(category || tags.length > 0) && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/10 text-muted-foreground">
                {category}
              </span>
            )}
            {tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Favorite */}
      <FavoriteAgentButton id={id} disabled={isDisabled} />

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          href={`/ai/agents/run/${id}`}
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            handleRun(e);
          }}
        >
          <IconButton
            icon={Play}
            tooltip="Run"
            size="sm"
            variant="ghost"
            tooltipSide="top"
            disabled={isDisabled}
          />
        </Link>
        {canEdit && (
          <Link
            href={`/ai/agents/edit/${id}`}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(e);
            }}
          >
            <IconButton
              icon={Pencil}
              tooltip="Edit"
              size="sm"
              variant="ghost"
              tooltipSide="top"
              disabled={isDisabled}
            />
          </Link>
        )}
        {isOwner && (
          <IconButton
            icon={isDuplicating ? Loader2 : Copy}
            tooltip={isDuplicating ? "Duplicating..." : "Duplicate"}
            size="sm"
            variant="ghost"
            tooltipSide="top"
            onClick={() => onDuplicate?.(id)}
            disabled={isDuplicating || isDisabled}
            iconClassName={isDuplicating ? "animate-spin" : ""}
          />
        )}
        {isOwner && (
          <IconButton
            icon={Share2}
            tooltip="Share"
            size="sm"
            variant="ghost"
            tooltipSide="top"
            onClick={() => setIsShareModalOpen(true)}
            disabled={isDisabled}
          />
        )}
        {isOwner && (
          <IconButton
            icon={isDeleting ? Loader2 : Trash2}
            tooltip={isDeleting ? "Deleting..." : "Delete"}
            size="sm"
            variant="ghost"
            tooltipSide="top"
            onClick={() => onDelete?.(id, name)}
            disabled={isDeleting || isDisabled}
            iconClassName={isDeleting ? "animate-spin" : ""}
          />
        )}
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        resourceType="agent"
        resourceId={id}
        resourceName={name}
        isOwner={isOwner}
      />
    </div>
  );
}
