import { Eye, Edit2, Maximize2, Braces, Eraser, X } from "lucide-react";

import {
  ResponsiveIconButtonGroup,
  IconButtonConfig,
} from "@/components/official/ResponsiveIconButtonGroup";
import {
  AddBlockTrigger,
  BlockType,
} from "@/features/agents/components/messages/AddBlockButton";

interface MessageItemButtonsProps {
  isEditing?: boolean;
  hasVariableSupport?: boolean;
  hasFullScreenEditor?: boolean;
  onInsertVariable?: () => void;
  onOpenFullScreenEditor?: () => void;
  onToggleEditing?: () => void;
  onClear?: () => void;
  onDelete?: () => void;
  onAddBlockType?: (type: BlockType) => void;
  sheetTitle?: string;
}

export function MessageItemButtons({
  isEditing = false,
  hasVariableSupport = false,
  hasFullScreenEditor = false,
  onInsertVariable,
  onOpenFullScreenEditor,
  onToggleEditing,
  onClear,
  onDelete,
  onAddBlockType,
  sheetTitle = "Message Actions",
}: MessageItemButtonsProps) {
  const buttons: IconButtonConfig[] = [
    {
      id: "variable",
      icon: Braces,
      tooltip: "Insert Variable",
      mobileLabel: "Insert Variable",
      hidden: !hasVariableSupport,
      onClick: (e) => {
        e?.stopPropagation();
        onInsertVariable?.();
      },
      onMouseDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
    },
    {
      id: "fullscreen",
      icon: Maximize2,
      tooltip: "Open in full screen editor",
      mobileLabel: "Full Screen Editor",
      hidden: !hasFullScreenEditor,
      onClick: (e) => {
        e?.stopPropagation();
        onOpenFullScreenEditor?.();
      },
      onMouseDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
    },
    {
      id: "edit",
      icon: isEditing ? Eye : Edit2,
      tooltip: isEditing ? "View" : "Edit",
      mobileLabel: isEditing ? "View" : "Edit",
      hidden: !onToggleEditing,
      onClick: (e) => {
        e?.stopPropagation();
        onToggleEditing?.();
      },
      onMouseDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
    },
    {
      id: "clear",
      icon: Eraser,
      tooltip: "Clear message",
      mobileLabel: "Clear Message",
      onClick: (e) => {
        e?.stopPropagation();
        onClear?.();
      },
      onMouseDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
    },
    {
      id: "delete",
      icon: X,
      tooltip: "Delete message",
      mobileLabel: "Delete Message",
      onClick: (e) => {
        e?.stopPropagation();
        onDelete?.();
      },
      onMouseDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
      iconClassName: "text-destructive",
      className: "hover:text-destructive",
    },
    {
      id: "add-block",
      icon: undefined,
      tooltip: "Add content block",
      mobileLabel: "Add Block",
      hidden: !onAddBlockType,
      component: onAddBlockType ? (
        <AddBlockTrigger onSelectType={onAddBlockType} />
      ) : undefined,
    },
  ];

  return (
    <ResponsiveIconButtonGroup
      buttons={buttons}
      sheetTitle={sheetTitle}
      size="sm"
    />
  );
}
