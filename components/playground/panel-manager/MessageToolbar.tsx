import React from 'react';
import { Button } from '@/components/ui';
import { Image, Link, Trash2, Save, Expand, Minimize2, LetterText, Radiation, SquareRadical } from 'lucide-react';

interface MessageToolbarProps {
    id: string;
    role: string;
    isCollapsed: boolean;
    onAddMedia: (id: string) => void;
    onLinkBroker: (id: string) => void;
    onDelete: (id: string) => void;
    onSave: (id: string) => void;
    onToggleCollapse: (id: string) => void;
    onShowBrokerContent: (id: string) => void;
    onTextWithChips: (id: string) => void;
    onProcessed: (id: string) => void;
}

interface ActionButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, icon, label }) => (
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

const MessageToolbar: React.FC<MessageToolbarProps> = ({
    id,
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
}) => {
    const actions = [
        {
            label: 'Add Media',
            icon: <Image className="h-4 w-4" />,
            onClick: () => onAddMedia(id),
        },
        {
            label: 'Link Broker',
            icon: <Link className="h-4 w-4" />,
            onClick: () => onLinkBroker(id),
        },
        {
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => onDelete(id),
        },
        {
            label: 'Save',
            icon: <Save className="h-4 w-4" />,
            onClick: () => onSave(id),
        },
        {
            label: isCollapsed ? 'Expand' : 'Collapse',
            icon: isCollapsed ? <Expand className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />,
            onClick: () => onToggleCollapse(id),
        },
        {
            label: 'Plain Text',
            icon: <LetterText className="h-4 w-4" />,
            onClick: () => onShowBrokerContent(id),
        },
        {
            label: 'Text With Chips',
            icon: <Radiation  className="h-4 w-4" />,
            onClick: () => onTextWithChips(id),
        },
        {
            label: 'Processed',
            icon: <SquareRadical className="h-4 w-4" />,
            onClick: () => onProcessed(id),
        },
    ];

    return (
        <div className="flex justify-between items-center px-2 py-1 border-b">
            <div className="text-sm text-muted-foreground">
                {role.toUpperCase()}
            </div>
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