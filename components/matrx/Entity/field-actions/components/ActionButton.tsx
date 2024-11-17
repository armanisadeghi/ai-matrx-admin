// components/base/ActionButton.tsx
import React from 'react';
import {Button} from '@/components/ui/button';
import {ActionConfig} from '../types';

interface ActionButtonProps {
    action: ActionConfig;
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = (
    {
        action,
        onClick,
        loading,
        disabled
    }) => {
    const Icon = action.icon;
    const buttonClass = action.buttonStyle === 'icon'
                        ? "h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-border rounded-md flex items-center justify-center"
                        : "h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-border rounded-md flex items-center gap-2";

    return (
        <Button
            variant="ghost"
            size="sm"
            className={buttonClass}
            onClick={onClick}
            disabled={disabled || loading}
        >
            {loading ? (
                <div className="animate-spin">⏳</div>
            ) : (
                 <>
                     <Icon className="w-4 h-4"/>
                     {action.buttonStyle === 'full' && action.label}
                 </>
             )}
        </Button>
    );
};


