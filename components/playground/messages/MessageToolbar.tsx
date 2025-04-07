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
    Code,
    MessageSquare,
    FileText,
} from "lucide-react";
import { RiMarkdownFill } from "react-icons/ri";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MatrxRecordId } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ADMIN_USER_IDS } from "@/components/admin/controls/AdminIndicatorWrapper";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store";

export type DisplayOption = "brokerEditor" | "textChat" | "richText" | "markdown";

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
    onDisplayOptionChange: (messageRecordId: MatrxRecordId, displayOption: DisplayOption) => void;
    currentDisplayOption?: DisplayOption;
}

interface ActionButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}

// Updated ActionButton with tooltip
const ActionButton: React.FC<ActionButtonProps> = ({ onClick, icon, label }) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={onClick}
                    aria-label={label}
                >
                    {icon}
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>{label}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

// New display option button component
interface DisplayOptionButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
}

const DisplayOptionButton: React.FC<DisplayOptionButtonProps> = ({ onClick, icon, label, isActive }) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={`h-6 w-6 p-0 ${
                        isActive
                            ? "text-zinc-900 dark:text-zinc-100 bg-zinc-200 dark:bg-zinc-700 rounded-md"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={onClick}
                    aria-label={label}
                >
                    {icon}
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>{label}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

const RoleSelector: React.FC<{
    role: string;
    messageRecordId: MatrxRecordId;
    onRoleChange: (messageRecordId: MatrxRecordId, newRole: string) => void;
}> = ({ role, messageRecordId, onRoleChange }) => (
    <DropdownMenu>
        <DropdownMenuTrigger className="text-sm text-muted-foreground hover:text-foreground">{role.toUpperCase()}</DropdownMenuTrigger>
        <DropdownMenuContent className="bg-elevation2 bg-opacity-100">
            <DropdownMenuItem onClick={() => onRoleChange(messageRecordId, "system")}>SYSTEM</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRoleChange(messageRecordId, "user")}>USER</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRoleChange(messageRecordId, "assistant")}>ASSISTANT</DropdownMenuItem>
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
    onDisplayOptionChange,
    currentDisplayOption = "textChat",
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const user = useSelector((state: RootState) => state.user);
    const isAdmin = ADMIN_USER_IDS.includes(user.id);

    // Display options configuration
    const displayOptions = [
        {
            value: "brokerEditor",
            label: "Broker Editor",
            icon: <Code className="h-4 w-4" />,
        },
        {
            value: "textChat",
            label: "Text Chat",
            icon: <MessageSquare className="h-4 w-4" />,
        },
        {
            value: "richText",
            label: "Rich Text",
            icon: <FileText className="h-4 w-4" />,
        },
        {
            value: "markdown",
            label: "Markdown",
            icon: <RiMarkdownFill className="h-4 w-4" />,
        },
    ];

    const actions = [
        {
            label: "Delete Message",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => onDelete(messageRecordId),
        },
        {
            label: "Save Message",
            icon: <Save className="h-4 w-4" />,
            onClick: () => onSave(messageRecordId),
        },
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
            label: isCollapsed ? "Expand" : "Collapse",
            icon: isCollapsed ? <Expand className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />,
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
            label: "Broker Names",
            icon: <Eye className="h-4 w-4" />,
            onClick: () => onShowNames(messageRecordId),
        },
    ];

    if (isAdmin) {
        actions.push({
            label: "Visible Encoded Text",
            icon: <SquareRadical className="h-4 w-4" />,
            onClick: () => onShowEncoded(messageRecordId),
        });
    }
    if (isAdmin && debug) {
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
            <div className="flex items-center gap-1">
                <RoleSelector role={role} messageRecordId={messageRecordId} onRoleChange={onRoleChange} />

                {/* New display option buttons */}
                <div className="ml-2 flex gap-1 border-l pl-2">
                    {displayOptions.map((option) => (
                        <DisplayOptionButton
                            key={option.value}
                            onClick={() => onDisplayOptionChange(messageRecordId, option.value as DisplayOption)}
                            icon={option.icon}
                            label={option.label}
                            isActive={currentDisplayOption === option.value}
                        />
                    ))}
                </div>
            </div>

            <div className="flex gap-1">
                {actions.map((action) => (
                    <ActionButton key={action.label} onClick={action.onClick} icon={action.icon} label={action.label} />
                ))}
            </div>
        </div>
    );
};

export default MessageToolbar;
