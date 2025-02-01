import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Save, Expand, Minimize2, Bug, Copy, Check } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export interface ToolbarAction {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
}

export interface DraggableToolbarProps {
    id: string;
    currentLabel: string;
    isCollapsed: boolean;
    labelOptions?: string[];
    onLabelChange: (id: string, newLabel: string) => void;
    onDragDrop: (draggedId: string, targetId: string) => void;
    onDelete?: (id: string) => void;
    onSave?: (id: string) => void;
    onCopy?: (id: string) => void;
    onToggleCollapse?: (id: string) => void;
    actions?: ToolbarAction[];
    debug?: boolean;
    onDebugClick?: (id: string) => void;
}

interface ActionButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    showSuccess?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, icon, label, showSuccess }) => (
    <Button
        variant="ghost"
        size="sm"
        className={`h-6 w-6 p-0 transition-colors duration-200 ${
            showSuccess 
                ? 'text-green-500 hover:text-green-600' 
                : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={onClick}
        aria-label={label}
    >
        {showSuccess ? <Check className="h-4 w-4" /> : icon}
    </Button>
);

const LabelSelector: React.FC<{
    currentLabel: string;
    labelOptions?: string[];
    id: string;
    onLabelChange: (id: string, newLabel: string) => void;
}> = ({ currentLabel, labelOptions, id, onLabelChange }) => {
    if (!labelOptions?.length) {
        return <span className="text-sm text-muted-foreground">{currentLabel.toUpperCase()}</span>;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-foreground">
                    {currentLabel.toUpperCase()}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                {labelOptions.map((option) => (
                    <DropdownMenuItem
                        key={option}
                        onClick={() => onLabelChange(id, option)}
                    >
                        {option.toUpperCase()}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

const DraggableToolbar: React.FC<DraggableToolbarProps> = ({
    id,
    currentLabel,
    labelOptions,
    isCollapsed,
    onLabelChange,
    onDragDrop,
    // Base actions
    onDelete,
    onSave,
    onCopy,
    onToggleCollapse,
    // Custom actions
    actions = [],
    // Debug
    debug = false,
    onDebugClick,
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [showCopySuccess, setShowCopySuccess] = useState(false);

    const handleCopy = useCallback(() => {
        if (onCopy) {
            onCopy(id);
            setShowCopySuccess(true);
            setTimeout(() => {
                setShowCopySuccess(false);
            }, 1500);
        }
    }, [id, onCopy]);

    // Combine default actions with custom actions
    const defaultActions: ToolbarAction[] = [
        ...(onDelete ? [{
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => onDelete(id),
        }] : []),
        ...(onSave ? [{
            label: 'Save',
            icon: <Save className="h-4 w-4" />,
            onClick: () => onSave(id),
        }] : []),
        ...(onCopy ? [{
            label: 'Copy',
            icon: <Copy className="h-4 w-4" />,
            onClick: handleCopy,
        }] : []),
        ...(onToggleCollapse ? [{
            label: isCollapsed ? 'Expand' : 'Collapse',
            icon: isCollapsed ? <Expand className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />,
            onClick: () => onToggleCollapse(id),
        }] : []),
    ];

    const allActions = [
        ...defaultActions,
        ...actions,
        ...(debug && onDebugClick ? [{
            label: 'Debug',
            icon: <Bug className="h-4 w-4" />,
            onClick: () => onDebugClick(id),
        }] : []),
    ];

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
        setIsDragging(true);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!isDragging) {
            setIsDragOver(true);
        }
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);

        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId !== id) {
            onDragDrop(draggedId, id);
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
                ${isDragOver ? 'border-t-2 border-t-primary' : ''}
                ${isDragging ? 'opacity-50' : ''}`}
        >
            <LabelSelector
                currentLabel={currentLabel}
                id={id}
                labelOptions={labelOptions}
                onLabelChange={onLabelChange}
            />
            <div className="flex gap-1">
                {allActions.map((action) => (
                    <ActionButton
                        key={action.label}
                        onClick={action.onClick}
                        icon={action.icon}
                        label={action.label}
                        showSuccess={action.label === 'Copy' && showCopySuccess}
                    />
                ))}
            </div>
        </div>
    );
};

export default DraggableToolbar;