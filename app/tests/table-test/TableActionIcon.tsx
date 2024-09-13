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
}

const TableActionIcon = <T,>({ action, data }: TableActionIconProps<T>) => {
    const { name, label, icon, className } = action;

    const handlerName = `handle${name.charAt(0).toUpperCase() + name.slice(1)}`;
    const handler = (window as any)[handlerName];

    if (typeof handler !== 'function') {
        console.warn(`Handler "${handlerName}" not found`);
        return null;
    }

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        handler(data);
    };

    return (
        <MatrxTooltip content={label} placement="left">
            <Button
                onClick={handleClick}
                size="sm"
                variant="outline"
                className={className || "transition-all duration-300 hover:scale-105"}
            >
                {icon}
            </Button>
        </MatrxTooltip>
    );
};

export default TableActionIcon;
