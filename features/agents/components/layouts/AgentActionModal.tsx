"use client";

import { Play, Pencil, Copy, Trash2, Share2, Loader2, Bot } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface AgentActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentName?: string;
  agentDescription?: string;
  onRun?: (e?: React.MouseEvent) => void;
  onEdit?: (e?: React.MouseEvent) => void;
  onDuplicate?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  isDuplicating?: boolean;
}

function ActionItem({
  icon: Icon,
  label,
  onClick,
  disabled,
  spinning,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  spinning?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      className={`flex items-center gap-3 w-full px-4 py-3 text-sm rounded-lg transition-colors ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : destructive
            ? "hover:bg-destructive/10 text-destructive"
            : "hover:bg-muted"
      }`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <Icon
        className={`w-4 h-4 ${spinning ? "animate-spin" : ""} ${
          destructive ? "text-destructive" : "text-muted-foreground"
        }`}
      />
      <span className={destructive ? "text-destructive" : ""}>{label}</span>
    </button>
  );
}

function ModalBody({
  agentName,
  agentDescription,
  onRun,
  onEdit,
  onDuplicate,
  onShare,
  onDelete,
  isDeleting,
  isDuplicating,
  onClose,
}: Omit<AgentActionModalProps, "isOpen">) {
  return (
    <div className="space-y-1 py-2">
      {agentDescription && (
        <p className="text-xs text-muted-foreground px-4 pb-2 line-clamp-2">
          {agentDescription}
        </p>
      )}
      {onRun && (
        <ActionItem
          icon={Play}
          label="Run Agent"
          onClick={() => {
            onClose?.();
            onRun();
          }}
        />
      )}
      {onEdit && (
        <ActionItem
          icon={Pencil}
          label="Edit Agent"
          onClick={() => {
            onClose?.();
            onEdit();
          }}
        />
      )}
      {onDuplicate && (
        <ActionItem
          icon={isDuplicating ? Loader2 : Copy}
          label={isDuplicating ? "Duplicating..." : "Duplicate"}
          onClick={() => {
            onClose?.();
            onDuplicate?.();
          }}
          disabled={isDuplicating}
          spinning={isDuplicating}
        />
      )}
      {onShare && (
        <ActionItem
          icon={Share2}
          label="Share Agent"
          onClick={() => {
            onClose?.();
            onShare?.();
          }}
        />
      )}
      {onDelete && (
        <ActionItem
          icon={isDeleting ? Loader2 : Trash2}
          label={isDeleting ? "Deleting..." : "Delete Agent"}
          onClick={() => {
            onClose?.();
            onDelete?.();
          }}
          disabled={isDeleting}
          spinning={isDeleting}
          destructive
        />
      )}
    </div>
  );
}

export function AgentActionModal({
  isOpen,
  onClose,
  agentName,
  ...rest
}: AgentActionModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              {agentName || "Agent Actions"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-2 pb-6">
            <ModalBody agentName={agentName} onClose={onClose} {...rest} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[320px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            {agentName || "Agent Actions"}
          </DialogTitle>
        </DialogHeader>
        <ModalBody agentName={agentName} onClose={onClose} {...rest} />
      </DialogContent>
    </Dialog>
  );
}
