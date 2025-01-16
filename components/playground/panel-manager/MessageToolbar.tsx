import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { Image, Link, Trash2, Save, Expand, Minimize2, LetterText, Radiation, SquareRadical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MatrxRecordId } from '@/types';
import { UseRecipeMessagesHook } from '../hooks/dev/useMessageWithNew';

interface MessageToolbarProps {
    matrxRecordId: MatrxRecordId;
    role: string;
    isCollapsed: boolean;
    onAddMedia: (matrxRecordId: MatrxRecordId) => void;
    onLinkBroker: (matrxRecordId: MatrxRecordId) => void;
    onDelete: (matrxRecordId: MatrxRecordId) => void;
    onSave: (matrxRecordId: MatrxRecordId) => void;
    onToggleCollapse: (matrxRecordId: MatrxRecordId) => void;
    onShowBrokerContent: (matrxRecordId: MatrxRecordId) => void;
    onTextWithChips: (matrxRecordId: MatrxRecordId) => void;
    onProcessed: (matrxRecordId: MatrxRecordId) => void;
    onRoleChange: (matrxRecordId: MatrxRecordId, newRole: string) => void;
    recipeMessageHook: UseRecipeMessagesHook;
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
    matrxRecordId: MatrxRecordId;
    onRoleChange: (matrxRecordId: MatrxRecordId, newRole: string) => void;
}> = ({ role, matrxRecordId, onRoleChange }) => (
    <DropdownMenu>
        <DropdownMenuTrigger className='text-sm text-muted-foreground hover:text-foreground'>{role.toUpperCase()}</DropdownMenuTrigger>
        <DropdownMenuContent className="bg-elevation2 bg-opacity-100">
            <DropdownMenuItem onClick={() => onRoleChange(matrxRecordId, 'system')}>SYSTEM</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRoleChange(matrxRecordId, 'user')}>USER</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRoleChange(matrxRecordId, 'assistant')}>ASSISTANT</DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
);

const MessageToolbar: React.FC<MessageToolbarProps> = ({
    matrxRecordId,
    role,
    isCollapsed,
    onAddMedia,
    onLinkBroker,
    onDelete,
    onSave,
    onToggleCollapse,
    onShowBrokerContent,
    onTextWithChips,
    onProcessed,
    onRoleChange,
    recipeMessageHook,
}) => {
    const { handleDragDrop } = recipeMessageHook;
    const [isDragOver, setIsDragOver] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const actions = [
        {
            label: 'Add Media',
            icon: <Image className='h-4 w-4' />,
            onClick: () => onAddMedia(matrxRecordId),
        },
        {
            label: 'Link Broker',
            icon: <Link className='h-4 w-4' />,
            onClick: () => onLinkBroker(matrxRecordId),
        },
        {
            label: 'Delete',
            icon: <Trash2 className='h-4 w-4' />,
            onClick: () => onDelete(matrxRecordId),
        },
        {
            label: 'Save',
            icon: <Save className='h-4 w-4' />,
            onClick: () => onSave(matrxRecordId),
        },
        {
            label: isCollapsed ? 'Expand' : 'Collapse',
            icon: isCollapsed ? <Expand className='h-4 w-4' /> : <Minimize2 className='h-4 w-4' />,
            onClick: () => onToggleCollapse(matrxRecordId),
        },
        {
            label: 'Plain Text',
            icon: <LetterText className='h-4 w-4' />,
            onClick: () => onShowBrokerContent(matrxRecordId),
        },
        {
            label: 'Text With Chips',
            icon: <Radiation className='h-4 w-4' />,
            onClick: () => onTextWithChips(matrxRecordId),
        },
        {
            label: 'Processed',
            icon: <SquareRadical className='h-4 w-4' />,
            onClick: () => onProcessed(matrxRecordId),
        },
    ];

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', matrxRecordId.toString());
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
        if (draggedId !== matrxRecordId.toString()) {
            // Convert draggedId back to MatrxRecordId type
            const draggedMatrxId = draggedId as MatrxRecordId;
            handleDragDrop(draggedMatrxId, matrxRecordId);
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
                matrxRecordId={matrxRecordId}
                onRoleChange={onRoleChange}
            />
            <div className='flex gap-1'>
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
