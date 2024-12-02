// ExpandButton.tsx
import React from 'react';
import {Button} from '@/components/ui/button';
import {Maximize2, Minimize2} from 'lucide-react';
import {TooltipProvider, Tooltip, TooltipTrigger, TooltipContent} from "@/components/ui/tooltip";
import {densityConfig} from "@/config/ui/entity-layout-config";
import {ComponentDensity} from "@/types/componentConfigTypes";

interface ExpandButtonProps {
    isExpanded: boolean;
    onClick: () => void;
    density: ComponentDensity;
}

export const SmartExpandButton: React.FC<ExpandButtonProps> = (
    {
        isExpanded,
        onClick,
        density
    }) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClick}
                    className="transition-all duration-200"
                >
                    {isExpanded ?
                     <Minimize2 className={densityConfig[density].iconSize}/> :
                     <Maximize2 className={densityConfig[density].iconSize}/>
                    }
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>{isExpanded ? 'Collapse view' : 'Expand view'}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);
