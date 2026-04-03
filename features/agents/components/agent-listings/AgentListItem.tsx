"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Loader2,
  MoreVertical,
  Play,
  Pencil,
  Copy,
  Trash2,
  Share2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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

  const basePath = useAgentsBasePath();
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lastModalCloseTime, setLastModalCloseTime] = useState(0);

  const isDisabled = isNavigating || isAnyNavigating;
  const canEdit =
    isOwner || accessLevel === "admin" || accessLevel === "editor";

  const handleItemClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      window.open(`${basePath}/run/${id}`, "_blank");
      return;
    }
    const timeSinceClose = Date.now() - lastModalCloseTime;
    if (!isDisabled && !isActionModalOpen && timeSinceClose > 300) {
      setIsActionModalOpen(true);
    }
  };

  const handleActionModalClose = () => {
    setIsActionModalOpen(false);
    setLastModalCloseTime(Date.now());
  };

  const handleRun = (e?: React.MouseEvent) => {
    if (e && (e.metaKey || e.ctrlKey)) return;
    e?.stopPropagation();
    if (onNavigate && !isDisabled) onNavigate(id, `${basePath}/run/${id}`);
  };

  const handleEdit = (e?: React.MouseEvent) => {
    if (e && (e.metaKey || e.ctrlKey)) return;
    e?.stopPropagation();
    if (onNavigate && !isDisabled) onNavigate(id, `${basePath}/edit/${id}`);
  };

  const handleDuplicate = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onDuplicate?.(id);
  };

  const handleDelete = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onDelete?.(id, name);
  };

  const handleShareClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsMenuOpen(false);
    setIsShareModalOpen(true);
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 border border-border rounded-lg",
          "transition-all relative bg-card",
          !isDisabled &&
            "hover:bg-accent/50 hover:border-primary/30 cursor-pointer hover:shadow-sm",
          isDisabled && "opacity-50 cursor-not-allowed",
          isArchived && !isDisabled && "opacity-70",
        )}
        onClick={handleItemClick}
        title={
          isDisabled
            ? isNavigating
              ? "Navigating..."
              : "Please wait..."
            : "Click to choose action"
        }
      >
        {isNavigating && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          </div>
        )}

        <div className="flex-shrink-0">
          <div className="w-7 h-7 bg-primary/10 rounded-md flex items-center justify-center">
            <Bot className="w-3 h-3 text-primary" />
          </div>
        </div>

        <FavoriteAgentButton id={id} variant="list" disabled={isDisabled} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-foreground truncate">
              {name}
            </h4>
            {isArchived && (
              <span className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                Archived
              </span>
            )}
            {!isOwner && (
              <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-secondary/20 text-secondary-foreground capitalize">
                {accessLevel}
              </span>
            )}
          </div>
          {(category || tags.length > 0) && (
            <div className="flex gap-1 mt-0.5 flex-wrap">
              {category && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary/10 text-muted-foreground truncate max-w-[80px]">
                  {category}
                </span>
              )}
              {tags.slice(0, 2).map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary truncate max-w-[60px]"
                >
                  {t}
                </span>
              ))}
              {tags.length > 2 && (
                <span className="text-[10px] text-muted-foreground">
                  +{tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={isDisabled}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <Link
                href={`${basePath}/run/${id}`}
                tabIndex={-1}
                onClick={(e) => handleRun(e)}
              >
                <DropdownMenuItem disabled={isDisabled}>
                  <Play className="mr-2 h-4 w-4" />
                  Run
                </DropdownMenuItem>
              </Link>
              {canEdit && (
                <Link
                  href={`${basePath}/edit/${id}`}
                  tabIndex={-1}
                  onClick={(e) => handleEdit(e)}
                >
                  <DropdownMenuItem disabled={isDisabled}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                </Link>
              )}
              {isOwner && (
                <DropdownMenuItem
                  onClick={handleDuplicate}
                  disabled={isDuplicating || isDisabled}
                >
                  {isDuplicating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {isDuplicating ? "Duplicating..." : "Duplicate"}
                </DropdownMenuItem>
              )}
              {isOwner && (
                <DropdownMenuItem
                  onClick={handleShareClick}
                  disabled={isDisabled}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
              )}
              {isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    disabled={isDeleting || isDisabled}
                    className="text-destructive focus:text-destructive"
                  >
                    {isDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    {isDeleting ? "Deleting..." : "Delete"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AgentActionModal
        isOpen={isActionModalOpen}
        onClose={handleActionModalClose}
        agentName={name}
        agentDescription={description ?? undefined}
        onRun={handleRun}
        onEdit={canEdit ? () => handleEdit() : undefined}
        onDuplicate={isOwner ? () => onDuplicate?.(id) : undefined}
        onShare={isOwner ? handleShareClick : undefined}
        onDelete={isOwner ? () => onDelete?.(id, name) : undefined}
        isDuplicating={isDuplicating}
        isDeleting={isDeleting}
      />

      {isShareModalOpen && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          resourceType="agent"
          resourceId={id}
          resourceName={name}
          isOwner={isOwner}
        />
      )}
    </>
  );
}
