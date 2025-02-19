import React, { useState } from "react";
import { Button } from "@/components/ui";
import {
  Image,
  Link,
  Trash2,
  Save,
  Expand,
  Minimize2,
  LetterText,
  Radiation,
  SquareRadical,
  Bug,
  Eye,
  SquareAsterisk,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MatrxRecordId } from "@/types";

export interface MessageToolbarProps {
  messageRecordId: MatrxRecordId;
  role: string;
  isCollapsed: boolean;
  onAddMedia: (messageRecordId: MatrxRecordId) => void;
  onLinkBroker: (messageRecordId: MatrxRecordId) => void;
  onDelete: (messageRecordId: MatrxRecordId) => void;
  onSave: (messageRecordId: MatrxRecordId) => void;
  onToggleCollapse: (messageRecordId: MatrxRecordId) => void;
  onShowChips: (messageRecordId: MatrxRecordId) => void;
  onShowEncoded: (messageRecordId: MatrxRecordId) => void;
  onShowNames: (messageRecordId: MatrxRecordId) => void;
  onShowDefaultValue: (messageRecordId: MatrxRecordId) => void;
  onShowEncodedId: (messageRecordId: MatrxRecordId) => void;
  onRoleChange: (messageRecordId: MatrxRecordId, newRole: string) => void;
  onDragDrop: (draggedId: MatrxRecordId, targetId: MatrxRecordId) => void;
  debug?: boolean;
  onDebugClick?: (messageRecordId: MatrxRecordId) => void;
}

interface ActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  icon,
  label,
}) => (
  <Button
    variant="ghost"
    size="sm"
    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
    onClick={onClick}
    aria-label={label}
  >
    {icon}
  </Button>
);

const RoleSelector: React.FC<{
  role: string;
  messageRecordId: MatrxRecordId;
  onRoleChange: (messageRecordId: MatrxRecordId, newRole: string) => void;
}> = ({ role, messageRecordId, onRoleChange }) => (
  <DropdownMenu>
    <DropdownMenuTrigger className="text-sm text-muted-foreground hover:text-foreground">
      {role.toUpperCase()}
    </DropdownMenuTrigger>
    <DropdownMenuContent className="bg-elevation2 bg-opacity-100">
      <DropdownMenuItem onClick={() => onRoleChange(messageRecordId, "system")}>
        SYSTEM
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onRoleChange(messageRecordId, "user")}>
        USER
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => onRoleChange(messageRecordId, "assistant")}
      >
        ASSISTANT
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

const MessageToolbar: React.FC<MessageToolbarProps> = ({
  messageRecordId,
  role,
  isCollapsed,
  onAddMedia,
  onLinkBroker,
  onDelete,
  onSave,
  onToggleCollapse,
  onShowChips,
  onShowEncoded,
  onShowNames,
  onShowDefaultValue,
  onShowEncodedId,
  onRoleChange,
  onDragDrop,
  debug = false,
  onDebugClick,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const actions = [
    {
      label: "Add Media",
      icon: <Image className="h-4 w-4" />,
      onClick: () => onAddMedia(messageRecordId),
    },
    {
      label: "Link Broker",
      icon: <Link className="h-4 w-4" />,
      onClick: () => onLinkBroker(messageRecordId),
    },
    {
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => onDelete(messageRecordId),
    },
    {
      label: "Save",
      icon: <Save className="h-4 w-4" />,
      onClick: () => onSave(messageRecordId),
    },
    {
      label: isCollapsed ? "Expand" : "Collapse",
      icon: isCollapsed ? (
        <Expand className="h-4 w-4" />
      ) : (
        <Minimize2 className="h-4 w-4" />
      ),
      onClick: () => onToggleCollapse(messageRecordId),
    },
    {
      label: "Standard Text With Chips",
      icon: <Radiation className="h-4 w-4" />,
      onClick: () => onShowChips(messageRecordId),
    },
    {
      label: "Plain Text With Broker Default Values",
      icon: <LetterText className="h-4 w-4" />,
      onClick: () => onShowDefaultValue(messageRecordId),
    },
    {
      label: "Visible Encoded ID",
      icon: <SquareAsterisk className="h-4 w-4" />,
      onClick: () => onShowEncodedId(messageRecordId),
    },
    {
      label: "Visible Encoded Text",
      icon: <SquareRadical className="h-4 w-4" />,
      onClick: () => onShowEncoded(messageRecordId),
    },
    {
      label: "Broker Names",
      icon: <Eye className="h-4 w-4" />,
      onClick: () => onShowNames(messageRecordId),
    },
  ];

  // Primary actions that will always be visible
  const primaryActions = [
    {
      label: "Add Media",
      icon: <Image className="h-4 w-4" />,
      onClick: () => onAddMedia(messageRecordId),
    },
    {
      label: isCollapsed ? "Expand" : "Collapse",
      icon: isCollapsed ? (
        <Expand className="h-4 w-4" />
      ) : (
        <Minimize2 className="h-4 w-4" />
      ),
      onClick: () => onToggleCollapse(messageRecordId),
    },
    {
      label: "Save",
      icon: <Save className="h-4 w-4" />,
      onClick: () => onSave(messageRecordId),
    },
  ];

  // Secondary actions that will go in the overflow menu
  const overflowActions = [
    {
      label: "Link Broker",
      icon: <Link className="h-4 w-4" />,
      onClick: () => onLinkBroker(messageRecordId),
    },
    {
      label: "Standard Text With Chips",
      icon: <Radiation className="h-4 w-4" />,
      onClick: () => onShowChips(messageRecordId),
    },
    {
      label: "Plain Text With Broker Values",
      icon: <LetterText className="h-4 w-4" />,
      onClick: () => onShowDefaultValue(messageRecordId),
    },
    {
      label: "Visible Encoded ID",
      icon: <SquareAsterisk className="h-4 w-4" />,
      onClick: () => onShowEncodedId(messageRecordId),
    },
    {
      label: "Visible Encoded Text",
      icon: <SquareRadical className="h-4 w-4" />,
      onClick: () => onShowEncoded(messageRecordId),
    },
    {
      label: "Broker Names",
      icon: <Eye className="h-4 w-4" />,
      onClick: () => onShowNames(messageRecordId),
    },
    {
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => onDelete(messageRecordId),
      isDanger: true,
    },
  ];

  if (debug) {
    actions.push({
      label: "Debug",
      icon: <Bug className="h-4 w-4" />,
      onClick: () => onDebugClick?.(messageRecordId),
    });
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", messageRecordId.toString());
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId !== messageRecordId.toString()) {
      const draggedMatrxId = draggedId as MatrxRecordId;
      onDragDrop(draggedMatrxId, messageRecordId);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex justify-between items-center px-2 py-1 border-b cursor-move transition-all
            ${isDragOver ? "border-t-4 border-t-primary" : ""}
            ${isDragging ? "opacity-50" : ""}`}
    >
      <RoleSelector
        role={role}
        messageRecordId={messageRecordId}
        onRoleChange={onRoleChange}
      />
      <div className="flex items-center gap-1">
        {primaryActions.map((action) => (
          <Button
            key={action.label}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={action.onClick}
            aria-label={action.label}
          >
            {action.icon}
          </Button>
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {overflowActions.map((action) => (
              <React.Fragment key={action.label}>
                <DropdownMenuItem
                  onClick={action.onClick}
                  className={`flex items-center ${
                    action.isDanger ? "text-destructive" : ""
                  }`}
                >
                  <span className="flex items-center">
                    {action.icon}
                    <span className="ml-2">{action.label}</span>
                  </span>
                </DropdownMenuItem>
                {action.isDanger}
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default MessageToolbar;
