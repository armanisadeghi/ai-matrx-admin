// LayoutHeader.tsx (completed)
import React from 'react';
import {CardHeader, CardTitle} from '@/components/ui/card';
import {HelpCircle} from 'lucide-react';
import {TooltipProvider, Tooltip, TooltipTrigger, TooltipContent} from "@/components/ui/tooltip";
import {cn} from '@/lib/utils';
import {densityConfig} from "@/config/ui/entity-layout-config";
import { ComponentDensity } from '@/types/componentConfigTypes';

interface LayoutHeaderProps {
    title: string;
    tooltip?: string;
    density: ComponentDensity;
    actions?: React.ReactNode;
}

const getCompactHeaderStyling = (density: ComponentDensity) => {
    const configs = {
        compact: {
            headerPadding: 'px-2 py-1.5',
            fontSize: 'text-xs',
            iconSize: 'h-3 w-3',
            spacing: 'space-y-0'
        },
        normal: {
            headerPadding: 'px-3 py-2',
            fontSize: 'text-sm',
            iconSize: 'h-4 w-4',
            spacing: 'space-y-0'
        },
        comfortable: {
            headerPadding: 'px-4 py-3',
            fontSize: 'text-base',
            iconSize: 'h-4 w-4',
            spacing: 'space-y-1'
        }
    };
    return configs[density];
};

export const LayoutHeader: React.FC<LayoutHeaderProps> = (
    {
        title,
        tooltip,
        density,
        actions
    }) => {
    const styling = getCompactHeaderStyling(density);
    
    return (
        <CardHeader className={cn(styling.headerPadding, styling.spacing)}>
            <div className="flex items-center justify-between">
                <CardTitle className={cn(
                    "flex items-center gap-1.5 font-medium",
                    styling.fontSize
                )}>
                    {title}
                    {tooltip && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <HelpCircle className={cn(
                                        "text-muted-foreground",
                                        styling.iconSize
                                    )}/>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{tooltip}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </CardTitle>
                {actions}
            </div>
        </CardHeader>
    );
};

LayoutHeader.displayName = 'LayoutHeader';

export default LayoutHeader;
