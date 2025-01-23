import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { Image, Link, Trash2, Save, Expand, Minimize2, LetterText, Radiation, SquareRadical, Bug } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MatrxRecordId } from '@/types';

interface MessageToolbarProps {
    messageRecordId: MatrxRecordId;
    role: string;
    isCollapsed: boolean;
    onAddMedia?: (messageRecordId: MatrxRecordId) => void;
    onLinkBroker?: (messageRecordId: MatrxRecordId) => void;
    onDelete: (messageRecordId: MatrxRecordId) => void;
    onSave: (messageRecordId: MatrxRecordId) => void;
    onToggleCollapse: (messageRecordId: MatrxRecordId) => void;
    onDefaultValue: (messageRecordId: MatrxRecordId) => void;
    onWithNames: (messageRecordId: MatrxRecordId) => void;
    onWithIds: (messageRecordId: MatrxRecordId) => void;
    onEncoded: (messageRecordId: MatrxRecordId) => void;
    onProcessed: (messageRecordId: MatrxRecordId) => void;
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

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, icon, label }) => (
    <Button
        variant='ghost'
        size='sm'
        className='h-6 w-6 p-0 text-muted-foreground hover:text-foreground'
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
        <DropdownMenuTrigger className='text-sm text-muted-foreground hover:text-foreground'>{role.toUpperCase()}</DropdownMenuTrigger>
        <DropdownMenuContent className="bg-elevation2 bg-opacity-100">
            <DropdownMenuItem onClick={() => onRoleChange(messageRecordId, 'system')}>SYSTEM</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRoleChange(messageRecordId, 'user')}>USER</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRoleChange(messageRecordId, 'assistant')}>ASSISTANT</DropdownMenuItem>
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
    onDefaultValue,
    onWithIds,
    onWithNames,
    onEncoded,
    onProcessed,
    onRoleChange,
    onDragDrop,
    debug = false,
    onDebugClick,
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const actions = [
        {
            label: 'Add Media',
            icon: <Image className='h-4 w-4' />,
            onClick: () => onAddMedia(messageRecordId),
        },
        {
            label: 'Link Broker',
            icon: <Link className='h-4 w-4' />,
            onClick: () => onLinkBroker(messageRecordId),
        },
        {
            label: 'Delete',
            icon: <Trash2 className='h-4 w-4' />,
            onClick: () => onDelete(messageRecordId),
        },
        {
            label: 'Save',
            icon: <Save className='h-4 w-4' />,
            onClick: () => onSave(messageRecordId),
        },
        {
            label: isCollapsed ? 'Expand' : 'Collapse',
            icon: isCollapsed ? <Expand className='h-4 w-4' /> : <Minimize2 className='h-4 w-4' />,
            onClick: () => onToggleCollapse(messageRecordId),
        },
        {
            label: 'Plain Text',
            icon: <LetterText className='h-4 w-4' />,
            onClick: () => onWithIds(messageRecordId),
        },
        {
            label: 'Default Values',
            icon: <Radiation className='h-4 w-4' />,
            onClick: () => onDefaultValue(messageRecordId),
        },
        {
            label: 'Encoded',
            icon: <SquareRadical className='h-4 w-4' />,
            onClick: () => onEncoded(messageRecordId),
        },
        {
            label: 'Text With Names',
            icon: <Radiation className='h-4 w-4' />,
            onClick: () => onWithNames(messageRecordId),
        },
        {
            label: 'Processed',
            icon: <SquareRadical className='h-4 w-4' />,
            onClick: () => onProcessed(messageRecordId),
        },
    ];

    if (debug) {
        actions.push({
            label: 'Debug',
            icon: <Bug className="h-4 w-4" />,
            onClick: () => onDebugClick?.(messageRecordId),
        });
    }

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', messageRecordId.toString());
        e.dataTransfer.effectAllowed = 'move';
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

        const draggedId = e.dataTransfer.getData('text/plain');
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
                ${isDragOver ? 'border-t-4 border-t-primary' : ''}
                ${isDragging ? 'opacity-50' : ''}`}
        >
            <RoleSelector
                role={role}
                messageRecordId={messageRecordId}
                onRoleChange={onRoleChange}
            />
            <div className="flex gap-1">
                {actions.map((action) => (
                    <ActionButton
                        key={action.label}
                        onClick={action.onClick}
                        icon={action.icon}
                        label={action.label}
                    />
                ))}
            </div>
        </div>
    );
};

export default MessageToolbar;
