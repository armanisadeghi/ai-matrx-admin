// TableActionIcon.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import MatrxTooltip from "@/components/matrx/MatrxTooltip";

export interface ActionDefinition {
    name: string;
    label: string;
    icon: React.ReactNode;
    className?: string;
}

interface TableActionIconProps<T = any> {
    action: ActionDefinition;
    data: T;
    onAction: (actionName: string, data: T) => void;
}

const TableActionIcon = <T,>({ action, data, onAction }: TableActionIconProps<T>) => {
    const { name, label, icon, className } = action;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAction(name, data);
    };

    return (
        <MatrxTooltip content={label} placement="left">
            <Button
                onClick={handleClick}
                size="xs"
                variant="ghost"
                className={`p-1 ${className || "transition-all duration-300 hover:scale-105"}`}
            >
                {React.cloneElement(icon as React.ReactElement, { className: 'w-3 h-3' })}
            </Button>
        </MatrxTooltip>
    );
};


export default TableActionIcon;
