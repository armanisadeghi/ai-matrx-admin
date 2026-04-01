import {
  Eye,
  Edit2,
  Maximize2,
  Braces,
  Wand2,
  Eraser,
  FileText,
} from "lucide-react";

import {
  ResponsiveIconButtonGroup,
  IconButtonConfig,
} from "@/components/official/ResponsiveIconButtonGroup";
import {
  AddBlockTrigger,
  BlockType,
} from "@/features/agents/components/messages/AddBlockButton";

interface SystemMessageButtonsProps {
  isEditing?: boolean;
  hasVariableSupport?: boolean;
  hasFullScreenEditor?: boolean;
  onInsertVariable?: () => void;
  onOpenTemplates?: () => void;
  onOptimize?: () => void;
  onOpenFullScreenEditor?: () => void;
  onToggleEditing?: () => void;
  onClear?: () => void;
  onAddBlockType?: (type: BlockType) => void;
}

export function SystemMessageButtons({
  isEditing = false,
  hasVariableSupport = false,
  hasFullScreenEditor = false,
  onInsertVariable,
  onOpenTemplates,
  onOptimize,
  onOpenFullScreenEditor,
  onToggleEditing,
  onClear,
  onAddBlockType,
}: SystemMessageButtonsProps) {
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
      id: "template",
      icon: FileText,
      tooltip: "Templates",
      mobileLabel: "Templates",
      onClick: (e) => {
        e?.stopPropagation();
        onOpenTemplates?.();
      },
      onMouseDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
    },
    {
      id: "optimize",
      icon: Wand2,
      tooltip: "Optimize with AI",
      mobileLabel: "Optimize with AI",
      onClick: (e) => {
        e?.stopPropagation();
        onOptimize?.();
      },
      onMouseDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
      iconClassName: "text-purple-400",
      className: "hover:text-purple-300",
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
      sheetTitle="System Message Actions"
      size="sm"
    />
  );
}
