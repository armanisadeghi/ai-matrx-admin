'use client';

import React from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    placement?: 'top' | 'right' | 'bottom' | 'left';
    style?: 'dark' | 'light';
    trigger?: 'hover' | 'click';
    offset?: number;
}

const MatrxTooltip: React.FC<TooltipProps> = (
    {
        content,
        children,
        placement = 'top',
        style = 'dark',
        trigger = 'hover', // Although trigger is not used in this implementation
        offset = 8 // sideOffset equivalent
    }) => {

    // Mapping `placement` to `side` for the new tooltip.
    const sideMapping: Record<string, 'top' | 'bottom' | 'left' | 'right'> = {
        top: 'top',
        bottom: 'bottom',
        left: 'left',
        right: 'right'
    };

    const side = sideMapping[placement] || 'top';

    // Apply styling based on `style` prop.
    const tooltipClass = style === 'light'
        ? 'text-gray-900 bg-white border-border'
        : 'text-white bg-gray-900 dark:bg-gray-700';

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    {children}
                </TooltipTrigger>
                <TooltipContent side={side} sideOffset={offset} className={tooltipClass}>
                    {content}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export default MatrxTooltip;
