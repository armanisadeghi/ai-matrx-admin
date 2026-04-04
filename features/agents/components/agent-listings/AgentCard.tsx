"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import IconButton from "@/components/official/IconButton";
import {
  Eye,
  Pencil,
  Play,
  Copy,
  Trash2,
  Loader2,
  Share2,
  LayoutPanelTop,
  Settings,
  Globe,
  AppWindow,
  Bot,
  FileText,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RootState } from "@/lib/redux/store";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdmin } from "@/lib/redux/slices/userSlice";
import { selectAgentById } from "@/features/agents/redux/agent-definition/selectors";
import { ShareModal } from "@/features/sharing";
import { AgentActionModal } from "./AgentActionModal";
import { ComingSoonModal } from "./ComingSoonModal";
import { FavoriteAgentButton } from "./FavoriteAgentButton";
import { useAgentsBasePath } from "@/features/agents/hooks/useAgentsBasePath";
import { useState } from "react";
import { toast } from "@/lib/toast-service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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

  const isSystemAdmin = useAppSelector((state: RootState) =>
    selectIsAdmin(state),
  );
  const basePath = useAgentsBasePath();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isCreateAppModalOpen, setIsCreateAppModalOpen] = useState(false);
  const [isConvertToBuiltinModalOpen, setIsConvertToBuiltinModalOpen] =
    useState(false);
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [isConvertingToTemplate, setIsConvertingToTemplate] = useState(false);
  const [lastModalCloseTime, setLastModalCloseTime] = useState(0);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);

  const handleView = (e?: React.MouseEvent) => {
    if (e && (e.metaKey || e.ctrlKey)) return;
    e?.preventDefault();
    if (onNavigate && !isAnyNavigating) {
      onNavigate(id, `${basePath}/${id}/run`);
    }
  };

  const handleEdit = (e?: React.MouseEvent) => {
    if (e && (e.metaKey || e.ctrlKey)) return;
    e?.preventDefault();
    if (onNavigate && !isAnyNavigating) {
      onNavigate(id, `${basePath}/${id}/edit`);
    }
  };

  const handleRun = (e?: React.MouseEvent) => {
    if (e && (e.metaKey || e.ctrlKey)) return;
    e?.preventDefault();
    if (onNavigate && !isAnyNavigating) {
      onNavigate(id, `${basePath}/${id}/run`);
    }
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(id);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(id, name);
    }
  };

  const handleShareClick = () => {
    setIsActionModalOpen(false);
    setIsShareModalOpen(true);
  };

  const handleCreateApp = () => {
    setIsActionModalOpen(false);
    setIsCreateAppModalOpen(true);
  };

  const handleEditDetails = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsActionModalOpen(false);
    setIsMetadataModalOpen(true);
  };

  const handleShareClickInline = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDisabled) {
      setIsShareModalOpen(true);
    }
  };

  const handleShareModalClose = () => {
    setIsShareModalOpen(false);
  };

  const handleConvertToTemplate = async () => {
    if (!isSystemAdmin || isConvertingToTemplate) return;
    setIsConvertingToTemplate(true);
    try {
      toast.info("Convert to Template is coming soon for agents.");
    } finally {
      setIsConvertingToTemplate(false);
    }
  };

  const handleMakeGlobalBuiltin = async () => {
    if (!isSystemAdmin) return;
    setIsAdminMenuOpen(false);
    setIsConvertToBuiltinModalOpen(true);
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
      !isCreateAppModalOpen &&
      !isConvertToBuiltinModalOpen &&
      !isMetadataModalOpen &&
      timeSinceClose > 300
    ) {
      setIsActionModalOpen(true);
    }
  };

  const isDisabled = isNavigating || isAnyNavigating || isConvertingToTemplate;

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

      <div className="absolute top-3 left-3 z-10">
        <div
          className={`w-7 h-7 bg-primary rounded-lg flex items-center justify-center shadow-sm transition-all duration-200 ${
            !isDisabled &&
            "group-hover:bg-primary/90 group-hover:shadow-md group-hover:scale-105"
          }`}
        >
          <Bot
            className={`w-4 h-4 text-primary-foreground transition-transform duration-200 ${
              !isDisabled && "group-hover:scale-110"
            }`}
          />
        </div>
      </div>

      <FavoriteAgentButton id={id} disabled={isDisabled} />

      {isArchived && (
        <div className="absolute top-3 right-8 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          <Archive className="h-3 w-3" />
          <span className="text-[10px] font-medium">Archived</span>
        </div>
      )}

      <div className="p-4 pl-12 pr-8 flex-1 flex flex-col items-center justify-center gap-1.5">
        <h3
          className={`text-md font-medium text-foreground text-center line-clamp-3 break-words transition-colors duration-200 ${
            !isDisabled && "group-hover:text-primary"
          }`}
        >
          {name || "Untitled Agent"}
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
          <Link
            href={`${basePath}/${id}/run`}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              handleView(e);
            }}
          >
            <IconButton
              icon={Eye}
              tooltip={isDisabled ? "Please wait..." : "View"}
              size="sm"
              variant="ghost"
              tooltipSide="top"
              tooltipAlign="center"
              disabled={isDisabled}
            />
          </Link>
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
            onClick={handleDuplicate}
            disabled={isDuplicating || isDisabled}
            iconClassName={isDuplicating ? "animate-spin" : ""}
          />
          <IconButton
            icon={Share2}
            tooltip="Share"
            size="sm"
            variant="ghost"
            tooltipSide="top"
            tooltipAlign="center"
            onClick={handleShareClickInline}
            disabled={isDisabled}
          />
          <IconButton
            icon={FileText}
            tooltip={isDisabled ? "Please wait..." : "Edit Details"}
            size="sm"
            variant="ghost"
            tooltipSide="top"
            tooltipAlign="center"
            onClick={handleEditDetails}
            disabled={isDisabled}
          />
          <IconButton
            icon={AppWindow}
            tooltip={isDisabled ? "Please wait..." : "Create App"}
            size="sm"
            variant="ghost"
            tooltipSide="top"
            tooltipAlign="center"
            onClick={handleCreateApp}
            disabled={isDisabled}
          />
          <div
            className={
              isSystemAdmin ? undefined : "invisible pointer-events-none"
            }
          >
            <DropdownMenu
              open={isAdminMenuOpen}
              onOpenChange={setIsAdminMenuOpen}
            >
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <div>
                  <IconButton
                    icon={Settings}
                    tooltip="Admin Actions"
                    size="sm"
                    variant="ghost"
                    tooltipSide="top"
                    tooltipAlign="center"
                    disabled={isDisabled || !isSystemAdmin}
                  />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAdminMenuOpen(false);
                    handleConvertToTemplate();
                  }}
                  disabled={isConvertingToTemplate || isDisabled}
                  className="cursor-pointer"
                >
                  {isConvertingToTemplate ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LayoutPanelTop className="mr-2 h-4 w-4" />
                  )}
                  <span>Convert to Template</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAdminMenuOpen(false);
                    handleMakeGlobalBuiltin();
                  }}
                  disabled={isDisabled}
                  className="cursor-pointer"
                >
                  <Globe className="mr-2 h-4 w-4" />
                  <span>Convert to Agent Builtin</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
            onClick={handleDelete}
            disabled={isDeleting || isDisabled}
            iconClassName={isDeleting ? "animate-spin" : ""}
          />
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
        onEdit={handleEdit}
        onView={handleView}
        onDuplicate={handleDuplicate}
        onShare={handleShareClick}
        onDelete={handleDelete}
        onCreateApp={handleCreateApp}
        isDeleting={isDeleting}
        isDuplicating={isDuplicating}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={handleShareModalClose}
        resourceType="agent"
        resourceId={id}
        resourceName={name}
        isOwner={isOwner}
      />

      <ComingSoonModal
        isOpen={isCreateAppModalOpen}
        onClose={() => {
          setIsCreateAppModalOpen(false);
          setLastModalCloseTime(Date.now());
        }}
        featureName="Create App from Agent"
      />

      <ComingSoonModal
        isOpen={isConvertToBuiltinModalOpen}
        onClose={() => {
          setIsConvertToBuiltinModalOpen(false);
          setLastModalCloseTime(Date.now());
        }}
        featureName="Convert to Agent Builtin"
      />

      <ComingSoonModal
        isOpen={isMetadataModalOpen}
        onClose={() => {
          setIsMetadataModalOpen(false);
          setLastModalCloseTime(Date.now());
        }}
        featureName="Edit Agent Details"
      />
    </Card>
  );
}
