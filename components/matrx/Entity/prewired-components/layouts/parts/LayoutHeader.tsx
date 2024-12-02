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

export const LayoutHeader: React.FC<LayoutHeaderProps> = (
    {
        title,
        tooltip,
        density,
        actions
    }) => (
    <CardHeader className="space-y-1.5">
        <div className="flex items-center justify-between">
            <CardTitle className={cn(
                "flex items-center gap-2",
                densityConfig[density].fontSize
            )}>
                {title}
                {tooltip && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <HelpCircle className={cn(
                                    "text-muted-foreground",
                                    densityConfig[density].iconSize
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

LayoutHeader.displayName = 'LayoutHeader';

export default LayoutHeader;
