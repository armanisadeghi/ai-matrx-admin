"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
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
import { AgentActionModal } from "./AgentActionModal";
import { FavoriteAgentButton } from "./FavoriteAgentButton";
import { useAgentsBasePath } from "@/features/agents/hooks/useAgentsBasePath";
import { useState } from "react";

interface AgentCardProps {
  id: string;
  onDelete?: (id: string, name: string) => void;
  onDuplicate?: (id: string) => void;
  onNavigate?: (id: string, path: string) => void;
  isDeleting?: boolean;
  isDuplicating?: boolean;
  isNavigating?: boolean;
  isAnyNavigating?: boolean;
}

export function AgentCard({
  id,
  onDelete,
  onDuplicate,
  onNavigate,
  isDeleting,
  isDuplicating,
  isNavigating,
  isAnyNavigating,
}: AgentCardProps) {
  const record = useAppSelector((state) => selectAgentById(state, id));
  const name = record?.name ?? "Untitled Agent";
  const description = record?.description ?? undefined;
  const isArchived = record?.isArchived ?? false;
  const isOwner = record?.isOwner ?? true;
  const accessLevel = record?.accessLevel ?? null;

  const basePath = useAgentsBasePath();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [lastModalCloseTime, setLastModalCloseTime] = useState(0);

  const isDisabled = isNavigating || isAnyNavigating;

  const handleRun = (e?: React.MouseEvent) => {
    if (e && (e.metaKey || e.ctrlKey)) return;
    e?.preventDefault();
    if (onNavigate && !isAnyNavigating) onNavigate(id, `${basePath}/${id}/run`);
  };

  const handleEdit = (e?: React.MouseEvent) => {
    if (e && (e.metaKey || e.ctrlKey)) return;
    e?.preventDefault();
    if (onNavigate && !isAnyNavigating)
      onNavigate(id, `${basePath}/${id}/edit`);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      window.open(`${basePath}/${id}/run`, "_blank");
      return;
    }
    const timeSinceClose = Date.now() - lastModalCloseTime;
    if (
      !isDisabled &&
      !isShareModalOpen &&
      !isActionModalOpen &&
      timeSinceClose > 300
    ) {
      setIsActionModalOpen(true);
    }
  };

  const handleShareInline = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDisabled) setIsShareModalOpen(true);
  };

  const canEdit =
    isOwner || accessLevel === "admin" || accessLevel === "editor";

  return (
    <Card
      className={cn(
        "flex flex-col h-full bg-card border border-border transition-all duration-200 overflow-hidden relative",
        isDisabled
          ? "opacity-60 cursor-not-allowed"
          : "hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 cursor-pointer hover:scale-[1.02] group",
        isArchived && !isDisabled && "opacity-70",
      )}
      onClick={handleCardClick}
      title={
        isDisabled
          ? isNavigating
            ? "Navigating..."
            : "Please wait..."
          : "Click to choose action"
      }
    >
      {/* Loading Overlay */}
      {isNavigating && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-sm font-medium text-foreground">
              Loading...
            </span>
          </div>
        </div>
      )}

      {/* Agent Icon */}
      <div className="absolute top-3 left-3 z-10">
        <div
          className={cn(
            "w-7 h-7 bg-primary rounded-lg flex items-center justify-center shadow-sm transition-all duration-200",
            !isDisabled &&
              "group-hover:bg-primary/90 group-hover:shadow-md group-hover:scale-105",
          )}
        >
          <Bot
            className={cn(
              "w-4 h-4 text-primary-foreground transition-transform duration-200",
              !isDisabled && "group-hover:scale-110",
            )}
          />
        </div>
      </div>

      {/* Favorite toggle */}
      <FavoriteAgentButton id={id} disabled={isDisabled} />

      {/* Archived badge */}
      {isArchived && (
        <div className="absolute top-3 right-8 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          <Archive className="h-3 w-3" />
          <span className="text-[10px] font-medium">Archived</span>
        </div>
      )}

      {/* Shared badge */}
      {!isOwner && (
        <div className="absolute top-3 right-8 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/20 text-secondary-foreground">
          <Share2 className="h-3 w-3" />
          <span className="text-[10px] font-medium capitalize">
            {accessLevel}
          </span>
        </div>
      )}

      <div className="p-4 pl-12 pr-8 flex-1 flex flex-col items-center justify-center gap-1.5">
        <h3
          className={cn(
            "text-md font-medium text-foreground text-center line-clamp-3 break-words transition-colors duration-200",
            !isDisabled && "group-hover:text-primary",
          )}
        >
          {name}
        </h3>
      </div>

      <div className="border-t border-border p-1 bg-card rounded-b-lg min-h-[36px]">
        <div
          className="flex gap-2 justify-center items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            href={`${basePath}/${id}/run`}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              handleRun(e);
            }}
          >
            <IconButton
              icon={Play}
              tooltip={isDisabled ? "Please wait..." : "Run"}
              size="sm"
              variant="ghost"
              tooltipSide="top"
              tooltipAlign="center"
              disabled={isDisabled}
            />
          </Link>
          {canEdit && (
            <Link
              href={`${basePath}/${id}/edit`}
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(e);
              }}
            >
              <IconButton
                icon={Pencil}
                tooltip={isDisabled ? "Please wait..." : "Edit"}
                size="sm"
                variant="ghost"
                tooltipSide="top"
                tooltipAlign="center"
                disabled={isDisabled}
              />
            </Link>
          )}
          {isOwner && (
            <IconButton
              icon={isDuplicating ? Loader2 : Copy}
              tooltip={
                isDuplicating
                  ? "Duplicating..."
                  : isDisabled
                    ? "Please wait..."
                    : "Duplicate"
              }
              size="sm"
              variant="ghost"
              tooltipSide="top"
              tooltipAlign="center"
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
              tooltipAlign="center"
              onClick={handleShareInline}
              disabled={isDisabled}
            />
          )}
          {isOwner && (
            <IconButton
              icon={isDeleting ? Loader2 : Trash2}
              tooltip={
                isDeleting
                  ? "Deleting..."
                  : isDisabled
                    ? "Please wait..."
                    : "Delete"
              }
              size="sm"
              variant="ghost"
              tooltipSide="top"
              tooltipAlign="center"
              onClick={() => onDelete?.(id, name)}
              disabled={isDeleting || isDisabled}
              iconClassName={isDeleting ? "animate-spin" : ""}
            />
          )}
        </div>
      </div>

      <AgentActionModal
        isOpen={isActionModalOpen}
        onClose={() => {
          setIsActionModalOpen(false);
          setLastModalCloseTime(Date.now());
        }}
        agentName={name}
        agentDescription={description}
        onRun={handleRun}
        onEdit={canEdit ? handleEdit : undefined}
        onDuplicate={isOwner ? () => onDuplicate?.(id) : undefined}
        onShare={isOwner ? () => setIsShareModalOpen(true) : undefined}
        onDelete={isOwner ? () => onDelete?.(id, name) : undefined}
        isDeleting={isDeleting}
        isDuplicating={isDuplicating}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        resourceType="agent"
        resourceId={id}
        resourceName={name}
        isOwner={isOwner}
      />
    </Card>
  );
}
