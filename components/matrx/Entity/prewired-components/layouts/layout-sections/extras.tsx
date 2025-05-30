import React from "react";
import {CardHeader, CardTitle, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui";
import {cn} from "@/lib/utils";
import {HelpCircle} from "lucide-react";
import {ComponentDensity} from "@/types/componentConfigTypes";
import {densityConfig} from "@/config/ui/entity-layout-config";


export const LayoutHeader: React.FC<{
    title: string;
    tooltip?: string;
    density: ComponentDensity;
    actions?: React.ReactNode;
}> = ({title, tooltip, density, actions}) => (
    <CardHeader className="space-y-0.5">
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
